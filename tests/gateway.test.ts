import { describe, expect, it, vi } from 'vitest';
import { sha256Text } from '../src/core/crypto';
import { XanoGateway, loginToXano } from '../src/services/gateway';

describe('Xano browser adapter', () => {
  it('maps a Xano decision and sends the bearer token', async () => {
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({record:{id:7,created_at:'2026-08-21T00:00:00Z',organization_id:1,idempotency_key:'demo-key-123',actor_id:2,action_name:'software.renew',resource:'subscription/test',masked_payload:{amount:120},decision:'ALLOW',status:'EXECUTED',risk_score:12,risk_factors:[],matched_rules:['allow-approved-renewal-under-500'],explanation:'Allowed',execution:{execution_id:'once',executed_at:'2026-08-21T00:00:00Z',effect:'Simulated'}},duplicate:false}),{status:201,headers:{'content-type':'application/json'}}));
    const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','test-token',fetcher as unknown as typeof fetch);
    const outcome=await gateway.runScenario('safe-renewal');
    expect(outcome.record.action).toBe('software.renew');
    expect(outcome.record.execution?.executionId).toBe('once');
    expect(fetcher).toHaveBeenCalledOnce();
    const firstCall=fetcher.mock.calls[0] as unknown as [RequestInfo|URL,RequestInit?];
    expect(firstCall[1]?.headers).toMatchObject({authorization:'Bearer test-token'});
  });
  it('fails closed on an unsuccessful response',async()=>{const fetcher=vi.fn(async()=>new Response('{}',{status:500}));const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','test-token',fetcher as unknown as typeof fetch);await expect(gateway.listActions('org-demo')).rejects.toThrow('Xano request failed (500)');});
  it('fails closed with a session-specific message when authentication expires',async()=>{const fetcher=vi.fn(async()=>new Response('{}',{status:401}));const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','expired-token',fetcher as unknown as typeof fetch);await expect(gateway.listActions('org-demo')).rejects.toThrow('session is no longer valid');});
  it('binds the browser fetch implementation to the global runtime',async()=>{let invocationContext:unknown;const fetcher=function(this:unknown){invocationContext=this;return Promise.resolve(new Response(JSON.stringify({items:[]}),{status:200,headers:{'content-type':'application/json'}}));} as typeof fetch;const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','test-token',fetcher);await expect(gateway.listActions('org-demo')).resolves.toEqual([]);expect(invocationContext).toBe(globalThis);});
  it('verifies the raw-text hash format produced by Xano',async()=>{const previousHash='0'.repeat(64);const data={decision:'ALLOW',risk_score:12};const eventHash=await sha256Text(`7|1|EVALUATED|${JSON.stringify(data)}|${previousHash}`);const fetcher=vi.fn(async()=>new Response(JSON.stringify({events:[{id:11,action_id:7,organization_id:1,sequence:1,actor_ref:'3',event_type:'EVALUATED',event_data:data,previous_hash:previousHash,event_hash:eventHash,created_at:'2026-08-27T00:00:00Z'}]}),{status:200,headers:{'content-type':'application/json'}}));const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','test-token',fetcher as unknown as typeof fetch);await expect(gateway.verifyAudit('7','org-demo')).resolves.toBe(true);});
  it('reconstructs Xano execution-field order after database JSON normalization',async()=>{const zero='0'.repeat(64);const evaluated={decision:'ALLOW',risk_score:12};const first=await sha256Text(`6|1|EVALUATED|${JSON.stringify(evaluated)}|${zero}`);const returnedExecution={effect:'Simulated software.renew on subscription/atlas-cloud',executed_at:1787866092922,execution_id:'f2acead28d4ab3005671c49438b9e8d5e133b00458bce5c011c19af2a5d00a0c'};const hashedExecution={execution_id:returnedExecution.execution_id,executed_at:returnedExecution.executed_at,effect:returnedExecution.effect};const second=await sha256Text(`6|2|EXECUTED|${JSON.stringify(hashedExecution)}|${first}`);const events=[{id:12,action_id:6,organization_id:1,sequence:1,actor_ref:'3',event_type:'EVALUATED',event_data:evaluated,previous_hash:zero,event_hash:first,created_at:1787866092922},{id:13,action_id:6,organization_id:1,sequence:2,actor_ref:'system',event_type:'EXECUTED',event_data:returnedExecution,previous_hash:first,event_hash:second,created_at:1787866092922}];const fetcher=vi.fn(async()=>new Response(JSON.stringify({events}),{status:200,headers:{'content-type':'application/json'}}));const gateway=new XanoGateway('https://example.xano.io/api:actionguard-v1','test-token',fetcher as unknown as typeof fetch);await expect(gateway.verifyAudit('6','org-demo')).resolves.toBe(true);});
  it('does not attempt a login when the runtime backend is not configured',async()=>{const fetcher=vi.fn();await expect(loginToXano('judge@example.test','not-a-real-password',fetcher as unknown as typeof fetch,'')).rejects.toThrow('not configured');expect(fetcher).not.toHaveBeenCalled();});
  it('authenticates through the configured Xano group without persisting credentials',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({authToken:'short-lived-token',user:{id:3,name:'Demo Judge',role:'admin',organization_id:1}}),{status:200,headers:{'content-type':'application/json'}}));
    const session=await loginToXano(' Demo@ActionGuard.test ','temporary-password',fetcher as unknown as typeof fetch,'https://example.xano.io/api:actionguard-v1/');
    expect(session.user.role).toBe('admin');
    const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe('https://example.xano.io/api:actionguard-v1/auth/login');
    expect(JSON.parse(String(init.body))).toEqual({email:'demo@actionguard.test',password:'temporary-password'});
  });
});
