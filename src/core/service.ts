import { AuditChain } from './audit';
import { maskSensitive } from './mask';
import { evaluatePolicy } from './policy';
import { DEMO_SCENARIOS, freshScenario } from './scenarios';
import type {
  ActionIntent,
  AuditEvent,
  EvaluationOutcome,
  EvaluationRecord,
  PolicyDraft,
  PolicyRule,
  PublishedPolicy,
} from './types';

export class AccessDeniedError extends Error {}
export class NotFoundError extends Error {}
export class ValidationError extends Error {}

type Clock = () => string;

export class ActionGuardService {
  private readonly actions = new Map<string, EvaluationRecord>();
  private readonly idempotency = new Map<string, string>();
  private readonly audit = new AuditChain();
  private readonly policies: PublishedPolicy[] = [];

  constructor(private readonly now: Clock = () => new Date().toISOString()) {}

  async evaluate(intent: ActionIntent): Promise<EvaluationOutcome> {
    const key = `${intent.organizationId}:${intent.idempotencyKey}`;
    const priorId = this.idempotency.get(key);
    if (priorId) return { record: structuredClone(this.actions.get(priorId)!), duplicate: true };

    const result = evaluatePolicy(intent);
    const record: EvaluationRecord = {
      id: globalThis.crypto.randomUUID(),
      createdAt: this.now(),
      organizationId: intent.organizationId,
      idempotencyKey: intent.idempotencyKey,
      actor: structuredClone(intent.actor),
      action: intent.action,
      resource: intent.resource,
      maskedPayload: maskSensitive(intent.payload) as Record<string, unknown>,
      decision: result.decision,
      status: result.decision === 'ALLOW' ? 'EXECUTED' : result.decision === 'REVIEW' ? 'PENDING_REVIEW' : 'DENIED',
      riskScore: result.riskScore,
      riskFactors: result.riskFactors,
      matchedRules: result.matchedRules,
      explanation: result.explanation,
    };

    if (result.decision === 'ALLOW') record.execution = this.executeEffect(record);
    this.actions.set(record.id, record);
    this.idempotency.set(key, record.id);
    await this.audit.append({
      actionId: record.id,
      organizationId: record.organizationId,
      timestamp: this.now(),
      actorId: record.actor.id,
      type: 'EVALUATED',
      data: { decision: record.decision, rules: record.matchedRules, riskScore: record.riskScore },
    });
    if (record.execution) {
      await this.audit.append({
        actionId: record.id,
        organizationId: record.organizationId,
        timestamp: this.now(),
        actorId: 'system',
        type: 'EXECUTED',
        data: { executionId: record.execution.executionId, effect: record.execution.effect },
      });
    }
    return { record: structuredClone(record), duplicate: false };
  }

  async runScenario(id: string): Promise<EvaluationOutcome> {
    const scenario = DEMO_SCENARIOS.find((candidate) => candidate.id === id);
    if (!scenario) throw new NotFoundError('Demo scenario not found');
    return this.evaluate(freshScenario(scenario));
  }

  listActions(organizationId: string): EvaluationRecord[] {
    return [...this.actions.values()]
      .filter((action) => action.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((action) => structuredClone(action));
  }

  getAction(actionId: string, organizationId: string): EvaluationRecord {
    const action = this.actions.get(actionId);
    if (!action) throw new NotFoundError('Action not found');
    if (action.organizationId !== organizationId) throw new AccessDeniedError('Cross-organization access denied');
    return structuredClone(action);
  }

  async approve(actionId: string, organizationId: string, reviewedBy: string, reason: string): Promise<EvaluationRecord> {
    if (!reason.trim()) throw new ValidationError('Approval reason is required');
    const action = this.mutableAction(actionId, organizationId);
    if (action.decision !== 'REVIEW') throw new ValidationError('Only REVIEW actions can be approved');
    if (action.status === 'EXECUTED') return structuredClone(action);
    if (action.status !== 'PENDING_REVIEW') throw new ValidationError('Action is no longer pending review');

    action.review = { reviewedBy, reviewedAt: this.now(), reason: reason.trim(), outcome: 'APPROVED' };
    await this.audit.append({
      actionId,
      organizationId,
      timestamp: this.now(),
      actorId: reviewedBy,
      type: 'APPROVED',
      data: { reason: reason.trim() },
    });
    action.execution = this.executeEffect(action);
    action.status = 'EXECUTED';
    await this.audit.append({
      actionId,
      organizationId,
      timestamp: this.now(),
      actorId: 'system',
      type: 'EXECUTED',
      data: { executionId: action.execution.executionId, effect: action.execution.effect },
    });
    return structuredClone(action);
  }

  async reject(actionId: string, organizationId: string, reviewedBy: string, reason: string): Promise<EvaluationRecord> {
    if (!reason.trim()) throw new ValidationError('Rejection reason is required');
    const action = this.mutableAction(actionId, organizationId);
    if (action.status !== 'PENDING_REVIEW') throw new ValidationError('Action is no longer pending review');
    action.review = { reviewedBy, reviewedAt: this.now(), reason: reason.trim(), outcome: 'REJECTED' };
    action.status = 'REJECTED';
    await this.audit.append({
      actionId,
      organizationId,
      timestamp: this.now(),
      actorId: reviewedBy,
      type: 'REJECTED',
      data: { reason: reason.trim() },
    });
    return structuredClone(action);
  }

  getAudit(actionId: string, organizationId: string): AuditEvent[] {
    this.getAction(actionId, organizationId);
    return this.audit.list(actionId);
  }

  async verifyAudit(actionId: string, organizationId: string): Promise<boolean> {
    this.getAction(actionId, organizationId);
    return this.audit.verify(actionId);
  }

  async draftPolicy(sourceText: string, aiAvailable = false): Promise<PolicyDraft> {
    if (sourceText.trim().length < 12) throw new ValidationError('Policy text must be at least 12 characters');
    const rules: PolicyRule[] = [];
    const amountMatch = sourceText.match(/(?:over|above|more than|greater than)\s*\$?([\d,]+)/i);
    if (amountMatch) {
      rules.push({
        id: globalThis.crypto.randomUUID(),
        effect: /deny|block/i.test(sourceText) ? 'DENY' : 'REVIEW',
        field: 'amount',
        operator: 'gt',
        value: Number(amountMatch[1].replaceAll(',', '')),
      });
    }
    if (/export/i.test(sourceText)) {
      rules.push({
        id: globalThis.crypto.randomUUID(),
        effect: /deny|block/i.test(sourceText) ? 'DENY' : 'REVIEW',
        field: 'action',
        operator: 'contains',
        value: 'export',
      });
    }
    if (rules.length === 0) {
      rules.push({
        id: globalThis.crypto.randomUUID(),
        effect: 'REVIEW',
        field: 'action',
        operator: 'contains',
        value: sourceText.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase(),
      });
    }
    return {
      id: globalThis.crypto.randomUUID(),
      sourceText: sourceText.trim(),
      generatedBy: aiAvailable ? 'ai' : 'deterministic-fallback',
      rules,
      warnings: aiAvailable ? [] : ['AI provider unavailable: deterministic fallback generated this editable draft.'],
    };
  }

  publishPolicy(draft: PolicyDraft): PublishedPolicy {
    if (draft.rules.length === 0) throw new ValidationError('At least one rule is required');
    const policy: PublishedPolicy = {
      ...structuredClone(draft),
      version: this.policies.length + 1,
      publishedAt: this.now(),
    };
    this.policies.push(policy);
    return structuredClone(policy);
  }

  listPolicies(): PublishedPolicy[] {
    return structuredClone(this.policies);
  }

  private mutableAction(actionId: string, organizationId: string): EvaluationRecord {
    const action = this.actions.get(actionId);
    if (!action) throw new NotFoundError('Action not found');
    if (action.organizationId !== organizationId) throw new AccessDeniedError('Cross-organization access denied');
    return action;
  }

  private executeEffect(record: EvaluationRecord) {
    return {
      executionId: globalThis.crypto.randomUUID(),
      executedAt: this.now(),
      effect: `Simulated ${record.action} on ${record.resource}`,
    };
  }
}

