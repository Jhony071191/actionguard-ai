export type Decision = 'ALLOW' | 'REVIEW' | 'DENY';
export type ActionStatus = 'EXECUTED' | 'PENDING_REVIEW' | 'DENIED' | 'REJECTED';

export interface Actor {
  id: string;
  role: string;
}

export interface ActionIntent {
  organizationId: string;
  idempotencyKey: string;
  actor: Actor;
  action: string;
  resource: string;
  payload: Record<string, unknown>;
  context?: {
    approvedProvider?: boolean;
    recordCount?: number;
  };
}

export interface RiskFactor {
  code: string;
  label: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExecutionResult {
  executionId: string;
  executedAt: string;
  effect: string;
}

export interface EvaluationRecord {
  id: string;
  createdAt: string;
  organizationId: string;
  idempotencyKey: string;
  actor: Actor;
  action: string;
  resource: string;
  maskedPayload: Record<string, unknown>;
  decision: Decision;
  status: ActionStatus;
  riskScore: number;
  riskFactors: RiskFactor[];
  matchedRules: string[];
  explanation: string;
  execution?: ExecutionResult;
  review?: {
    reviewedBy: string;
    reviewedAt: string;
    reason: string;
    outcome: 'APPROVED' | 'REJECTED';
  };
}

export interface EvaluationOutcome {
  record: EvaluationRecord;
  duplicate: boolean;
}

export interface AuditEvent {
  id: string;
  actionId: string;
  organizationId: string;
  sequence: number;
  timestamp: string;
  actorId: string;
  type: 'EVALUATED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  data: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
}

export interface PolicyRule {
  id: string;
  effect: Decision;
  field: 'amount' | 'recordCount' | 'action';
  operator: 'gt' | 'gte' | 'eq' | 'contains';
  value: string | number;
}

export interface PolicyDraft {
  id: string;
  sourceText: string;
  generatedBy: 'ai' | 'deterministic-fallback';
  rules: PolicyRule[];
  warnings: string[];
}

export interface PublishedPolicy extends PolicyDraft {
  version: number;
  publishedAt: string;
}

