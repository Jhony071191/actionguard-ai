import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_SCENARIOS } from '../src/core/scenarios';

describe('published contract and reproducible dataset', () => {
  const contract = readFileSync(new URL('../api/actionguard.openapi.yaml', import.meta.url), 'utf8');
  const xanoEvaluate = readFileSync(new URL('../xano/api/actionguard/evaluate_post.xs', import.meta.url), 'utf8');
  const xanoApprove = readFileSync(new URL('../xano/api/actionguard/approve_post.xs', import.meta.url), 'utf8');
  const xanoAudit = readFileSync(new URL('../xano/api/actionguard/audit_get.xs', import.meta.url), 'utf8');
  const xanoLogin = readFileSync(new URL('../xano/api/actionguard/login_post.xs', import.meta.url), 'utf8');
  const protectedXanoScripts = [
    'actions_get.xs',
    'approve_post.xs',
    'audit_get.xs',
    'evaluate_post.xs',
    'reject_post.xs',
  ].map((file) => readFileSync(new URL(`../xano/api/actionguard/${file}`, import.meta.url), 'utf8'));
  it('documents every implemented API family', () => {
    for (const path of ['/health:', '/v1/actions/evaluate:', '/v1/actions:', '/v1/actions/{actionId}:', '/v1/actions/{actionId}/approve:', '/v1/actions/{actionId}/reject:', '/v1/actions/{actionId}/audit:', '/v1/policies:', '/v1/policies/draft:']) expect(contract).toContain(path);
  });
  it('keeps the synthetic dataset aligned with executable scenarios', () => {
    const data = JSON.parse(readFileSync(new URL('../data/demo-scenarios.json', import.meta.url), 'utf8')) as Array<{id:string;expected:string}>;
    expect(data.map(({id,expected})=>({id,expected}))).toEqual(DEMO_SCENARIOS.map(({id,expected})=>({id,expected})));
  });
  it('redacts every supported bank identifier before Xano persistence', () => {
    for (const field of ['bankAccount', 'iban', 'routingNumber']) {
      expect(xanoEvaluate).toContain(`set:"${field}":"[REDACTED]"`);
    }
  });
  it('tenant-scopes both the action lookup and its audit events', () => {
    expect(xanoAudit.match(/organization_id == \$current_user\.organization_id/g)).toHaveLength(2);
    expect(xanoAudit).toContain('return = {type: "single"}');
    expect(xanoAudit).toContain('precondition ($allowed != null)');
  });
  it('derives tenant and role from the authenticated user record', () => {
    for (const script of protectedXanoScripts) {
      expect(script).toContain('$db.user.id == $auth.id');
      expect(script).toContain('precondition ($current_user != null)');
      expect(script).not.toContain('$auth.organization_id');
      expect(script).not.toContain('$auth.role');
    }
  });
  it('accepts a sensitive plaintext login input for secure hash comparison', () => {
    expect(xanoLogin).toContain('text password { sensitive = true }');
    expect(xanoLogin).not.toContain('password password');
  });
  it('persists evaluated execution timestamps instead of the literal now marker', () => {
    for (const script of [xanoEvaluate, xanoApprove]) {
      expect(script).toContain('var $executed_at { value = now }');
      expect(script).toContain('executed_at: $executed_at');
      expect(script).not.toContain('executed_at: now');
    }
  });
});
