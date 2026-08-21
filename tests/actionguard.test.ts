import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '../src/core/policy';
import { DEMO_SCENARIOS, freshScenario } from '../src/core/scenarios';
import { ActionGuardService, AccessDeniedError } from '../src/core/service';

describe('required scenarios', () => {
  for (const scenario of DEMO_SCENARIOS) it(`${scenario.title} => ${scenario.expected}`, () => expect(evaluatePolicy(scenario.intent).decision).toBe(scenario.expected));
  it('runs each required scenario three times', async () => { const service = new ActionGuardService(); for (let pass=0;pass<3;pass++) for(const scenario of DEMO_SCENARIOS) expect((await service.evaluate(freshScenario(scenario))).record.decision).toBe(scenario.expected); });
});

describe('safety properties', () => {
  it('is idempotent and executes an allowed action once', async () => { const service=new ActionGuardService(); const intent=structuredClone(DEMO_SCENARIOS[0].intent); const first=await service.evaluate(intent); const second=await service.evaluate(intent); expect(second.duplicate).toBe(true); expect(second.record.execution?.executionId).toBe(first.record.execution?.executionId); expect(service.getAudit(first.record.id,'org-demo')).toHaveLength(2); });
  it('requires approval before executing review', async () => { const service=new ActionGuardService(); const result=await service.evaluate(freshScenario(DEMO_SCENARIOS[1])); expect(result.record.execution).toBeUndefined(); const approved=await service.approve(result.record.id,'org-demo','reviewer','Verified vendor documents'); expect(approved.status).toBe('EXECUTED'); expect(service.getAudit(result.record.id,'org-demo').map(e=>e.type)).toEqual(['EVALUATED','APPROVED','EXECUTED']); });
  it('never executes a denied action', async () => { const service=new ActionGuardService(); const result=await service.evaluate(freshScenario(DEMO_SCENARIOS[2])); expect(result.record.status).toBe('DENIED'); expect(result.record.execution).toBeUndefined(); });
  it('masks bank data at rest', async () => { const service=new ActionGuardService(); const result=await service.evaluate(freshScenario(DEMO_SCENARIOS[1])); expect(result.record.maskedPayload.bankAccount).not.toBe(DEMO_SCENARIOS[1].intent.payload.bankAccount); expect(String(result.record.maskedPayload.bankAccount)).toContain('•'); });
  it('verifies chained hashes', async () => { const service=new ActionGuardService(); const result=await service.evaluate(freshScenario(DEMO_SCENARIOS[0])); expect(await service.verifyAudit(result.record.id,'org-demo')).toBe(true); });
  it('isolates organizations', async () => { const service=new ActionGuardService(); const result=await service.evaluate(freshScenario(DEMO_SCENARIOS[0])); expect(()=>service.getAction(result.record.id,'org-other')).toThrow(AccessDeniedError); expect(service.listActions('org-other')).toEqual([]); });
  it('degrades safely when AI is unavailable', async () => { const draft=await new ActionGuardService().draftPolicy('Review payments over $1,000',false); expect(draft.generatedBy).toBe('deterministic-fallback'); expect(draft.warnings).toHaveLength(1); expect(draft.rules[0]?.effect).toBe('REVIEW'); });
  it('keeps effects scoped to their natural-language clauses', async () => { const draft=await new ActionGuardService().draftPolicy('Review payments over $1,000 and deny customer exports.',false); expect(draft.rules.map(({effect,field,value})=>({effect,field,value}))).toEqual([{effect:'REVIEW',field:'amount',value:1000},{effect:'DENY',field:'action',value:'export'}]); });
  it('handles 100 synthetic evaluations inside 1.5 seconds', async () => { const service=new ActionGuardService(); const start=performance.now(); for(let i=0;i<100;i++){ const intent=freshScenario(DEMO_SCENARIOS[i%3]); intent.idempotencyKey=`load-${i}`; await service.evaluate(intent); } expect(performance.now()-start).toBeLessThan(1500); expect(service.listActions('org-demo')).toHaveLength(100); });
});
