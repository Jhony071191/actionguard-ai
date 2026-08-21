import type { ActionIntent } from './types';

export interface DemoScenario {
  id: 'safe-renewal' | 'vendor-payment' | 'bulk-export';
  title: string;
  subtitle: string;
  expected: 'ALLOW' | 'REVIEW' | 'DENY';
  intent: ActionIntent;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'safe-renewal',
    title: 'Approved software renewal',
    subtitle: 'USD 120 · approved supplier',
    expected: 'ALLOW',
    intent: {
      organizationId: 'org-demo',
      idempotencyKey: 'demo-renewal-120',
      actor: { id: 'agent-ops-01', role: 'procurement_agent' },
      action: 'software.renew',
      resource: 'subscription/atlas-cloud',
      payload: { amount: 120, currency: 'USD', supplier: 'Atlas Cloud' },
      context: { approvedProvider: true },
    },
  },
  {
    id: 'vendor-payment',
    title: 'New vendor payment',
    subtitle: 'USD 7,500 · bank data present',
    expected: 'REVIEW',
    intent: {
      organizationId: 'org-demo',
      idempotencyKey: 'demo-vendor-7500',
      actor: { id: 'agent-ops-01', role: 'procurement_agent' },
      action: 'vendor.create_and_pay',
      resource: 'vendor/northstar-parts',
      payload: {
        amount: 7500,
        currency: 'USD',
        supplier: 'Northstar Parts',
        bankAccount: 'ES9121000418450200051332',
      },
    },
  },
  {
    id: 'bulk-export',
    title: 'Bulk customer export',
    subtitle: '10,000 records · unauthorized role',
    expected: 'DENY',
    intent: {
      organizationId: 'org-demo',
      idempotencyKey: 'demo-export-10000',
      actor: { id: 'agent-support-09', role: 'support_agent' },
      action: 'customer.export',
      resource: 'customers/all',
      payload: { format: 'csv', recordCount: 10000 },
      context: { recordCount: 10000 },
    },
  },
];

export function freshScenario(scenario: DemoScenario): ActionIntent {
  return {
    ...structuredClone(scenario.intent),
    idempotencyKey: `${scenario.intent.idempotencyKey}-${globalThis.crypto.randomUUID()}`,
  };
}

