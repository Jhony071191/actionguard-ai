import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_SCENARIOS } from '../src/core/scenarios';

describe('published contract and reproducible dataset', () => {
  const contract = readFileSync(new URL('../api/actionguard.openapi.yaml', import.meta.url), 'utf8');
  it('documents every implemented API family', () => {
    for (const path of ['/health:', '/v1/actions/evaluate:', '/v1/actions:', '/v1/actions/{actionId}:', '/v1/actions/{actionId}/approve:', '/v1/actions/{actionId}/reject:', '/v1/actions/{actionId}/audit:', '/v1/policies:', '/v1/policies/draft:']) expect(contract).toContain(path);
  });
  it('keeps the synthetic dataset aligned with executable scenarios', () => {
    const data = JSON.parse(readFileSync(new URL('../data/demo-scenarios.json', import.meta.url), 'utf8')) as Array<{id:string;expected:string}>;
    expect(data.map(({id,expected})=>({id,expected}))).toEqual(DEMO_SCENARIOS.map(({id,expected})=>({id,expected})));
  });
});
