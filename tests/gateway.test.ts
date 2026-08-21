import { describe, expect, it, vi } from 'vitest';
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
  it('does not attempt a login when the runtime backend is not configured',async()=>{const fetcher=vi.fn();await expect(loginToXano('judge@example.test','not-a-real-password',fetcher as unknown as typeof fetch)).rejects.toThrow('not configured');expect(fetcher).not.toHaveBeenCalled();});
  it('authenticates through the configured Xano group without persisting credentials',async()=>{
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({authToken:'short-lived-token',user:{id:3,name:'Demo Judge',role:'admin',organization_id:1}}),{status:200,headers:{'content-type':'application/json'}}));
    const session=await loginToXano(' Demo@ActionGuard.test ','temporary-password',fetcher as unknown as typeof fetch,'https://example.xano.io/api:actionguard-v1/');
    expect(session.user.role).toBe('admin');
    const [url,init]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe('https://example.xano.io/api:actionguard-v1/auth/login');
    expect(JSON.parse(String(init.body))).toEqual({email:'demo@actionguard.test',password:'temporary-password'});
  });
});
