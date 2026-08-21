import type { ActionIntent, Decision, RiskFactor } from './types';
import { hasSensitiveBankData } from './mask';

export interface PolicyEvaluation {
  decision: Decision;
  riskScore: number;
  riskFactors: RiskFactor[];
  matchedRules: string[];
  explanation: string;
}

const KNOWN_ACTIONS = new Set(['software.renew', 'vendor.create_and_pay', 'customer.export']);

function amountOf(intent: ActionIntent): number {
  const value = intent.payload.amount;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function evaluatePolicy(intent: ActionIntent): PolicyEvaluation {
  const risks: RiskFactor[] = [];
  const rules: string[] = [];
  const amount = amountOf(intent);
  const recordCount = intent.context?.recordCount ??
    (typeof intent.payload.recordCount === 'number' ? intent.payload.recordCount : 0);

  if (!intent.organizationId || !intent.idempotencyKey || !intent.actor?.id || !intent.actor.role || !intent.action) {
    return {
      decision: 'DENY',
      riskScore: 100,
      riskFactors: [{ code: 'MISSING_CONTEXT', label: 'Required authorization context is missing', score: 100, severity: 'critical' }],
      matchedRules: ['default-deny-missing-context'],
      explanation: 'The action is blocked because required identity or request context is missing.',
    };
  }

  if (!KNOWN_ACTIONS.has(intent.action)) {
    return {
      decision: 'DENY',
      riskScore: 95,
      riskFactors: [{ code: 'UNKNOWN_ACTION', label: 'Action has no published policy', score: 95, severity: 'critical' }],
      matchedRules: ['default-deny-unknown-action'],
      explanation: 'The action is blocked because no published policy authorizes this operation.',
    };
  }

  if (intent.action === 'customer.export' && recordCount >= 1000 && !['admin', 'privacy_officer'].includes(intent.actor.role)) {
    risks.push({ code: 'BULK_EXPORT', label: `${recordCount.toLocaleString()} customer records requested`, score: 100, severity: 'critical' });
    rules.push('deny-bulk-export-without-privacy-role');
    return {
      decision: 'DENY',
      riskScore: 100,
      riskFactors: risks,
      matchedRules: rules,
      explanation: 'Bulk customer data export is blocked for this role.',
    };
  }

  if (hasSensitiveBankData(intent.payload)) {
    risks.push({ code: 'BANK_DATA', label: 'Sensitive bank data detected', score: 80, severity: 'high' });
    rules.push('review-sensitive-financial-data');
  }
  if (amount > 1000) {
    risks.push({ code: 'HIGH_VALUE', label: `Financial exposure is USD ${amount.toLocaleString()}`, score: 75, severity: 'high' });
    rules.push('review-payment-over-1000');
  }
  if (intent.action === 'vendor.create_and_pay') {
    risks.push({ code: 'NEW_VENDOR', label: 'New vendor creation and payment are combined', score: 70, severity: 'high' });
    rules.push('review-new-vendor');
  }
  if (risks.length > 0) {
    return {
      decision: 'REVIEW',
      riskScore: Math.max(...risks.map((risk) => risk.score)),
      riskFactors: risks,
      matchedRules: rules,
      explanation: 'The action is paused for human approval because it combines material financial or sensitive-data risk.',
    };
  }

  if (
    intent.action === 'software.renew' &&
    intent.context?.approvedProvider === true &&
    amount > 0 &&
    amount <= 500 &&
    ['procurement_agent', 'manager'].includes(intent.actor.role)
  ) {
    return {
      decision: 'ALLOW',
      riskScore: 12,
      riskFactors: [{ code: 'LOW_VALUE', label: 'Low-value renewal with approved supplier', score: 12, severity: 'low' }],
      matchedRules: ['allow-approved-renewal-under-500'],
      explanation: 'The approved low-value renewal can execute automatically.',
    };
  }

  return {
    decision: 'REVIEW',
    riskScore: 50,
    riskFactors: [{ code: 'MANUAL_REVIEW', label: 'Known operation lacks an explicit auto-allow rule', score: 50, severity: 'medium' }],
    matchedRules: ['review-known-action-without-auto-allow'],
    explanation: 'A person must review this known operation because no auto-allow rule applies.',
  };
}

