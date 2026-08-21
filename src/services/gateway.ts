import { sha256 } from '../core/crypto';
import { DEMO_SCENARIOS, freshScenario } from '../core/scenarios';
import { ActionGuardService } from '../core/service';
import type { AuditEvent, EvaluationOutcome, EvaluationRecord } from '../core/types';

export interface ActionGateway {
  readonly mode: 'local-adapter' | 'xano';
  runScenario(id: string): Promise<EvaluationOutcome>;
  listActions(organizationId: string): Promise<EvaluationRecord[]>;
  approve(actionId: string, organizationId: string, reviewedBy: string, reason: string): Promise<EvaluationRecord>;
  reject(actionId: string, organizationId: string, reviewedBy: string, reason: string): Promise<EvaluationRecord>;
  getAudit(actionId: string, organizationId: string): Promise<AuditEvent[]>;
  verifyAudit(actionId: string, organizationId: string): Promise<boolean>;
}

export interface XanoUser {
  id: number;
  name: string;
  role: string;
  organization_id: number;
}

export interface XanoSession {
  token: string;
  user: XanoUser;
}

export const policyService = new ActionGuardService();

class LocalGateway implements ActionGateway {
  readonly mode = 'local-adapter' as const;
  constructor(private readonly service: ActionGuardService) {}
  runScenario(id: string) { return this.service.runScenario(id); }
  async listActions(organizationId: string) { return this.service.listActions(organizationId); }
  approve(actionId: string, organizationId: string, reviewedBy: string, reason: string) { return this.service.approve(actionId, organizationId, reviewedBy, reason); }
  reject(actionId: string, organizationId: string, reviewedBy: string, reason: string) { return this.service.reject(actionId, organizationId, reviewedBy, reason); }
  async getAudit(actionId: string, organizationId: string) { return this.service.getAudit(actionId, organizationId); }
  verifyAudit(actionId: string, organizationId: string) { return this.service.verifyAudit(actionId, organizationId); }
}

interface XanoRecord {
  id: number; created_at: string|number; organization_id: number; idempotency_key: string; actor_id: number;
  action_name: string; resource: string; masked_payload: Record<string, unknown>;
  decision: EvaluationRecord['decision']; status: EvaluationRecord['status']; risk_score: number;
  risk_factors: EvaluationRecord['riskFactors']; matched_rules: string[]; explanation: string;
  execution?: { execution_id: string; executed_at: string|number; effect: string } | null;
}

interface XanoAuditEvent {
  id: number; action_id: number; organization_id: number; sequence: number; actor_ref: string;
  event_type: AuditEvent['type']; event_data: Record<string, unknown>; previous_hash: string;
  event_hash: string; created_at: string|number;
}

export class XanoGateway implements ActionGateway {
  readonly mode = 'xano' as const;
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch) {}

  async runScenario(id: string): Promise<EvaluationOutcome> {
    const scenario = DEMO_SCENARIOS.find((candidate) => candidate.id === id);
    if (!scenario) throw new Error('Demo scenario not found');
    const intent = freshScenario(scenario);
    const body = {idempotency_key:intent.idempotencyKey,action_name:intent.action,resource:intent.resource,payload:intent.payload,approved_provider:intent.context?.approvedProvider??false,record_count:intent.context?.recordCount??0};
    const result = await this.request<{record:XanoRecord;duplicate:boolean}>('/actions/evaluate',{method:'POST',body:JSON.stringify(body)});
    return {record:mapRecord(result.record),duplicate:result.duplicate};
  }
  async listActions(_organizationId: string) { const result=await this.request<{items?:XanoRecord[]}>('/actions'); return (result.items??[]).map(mapRecord); }
  async approve(actionId: string, _organizationId: string, _reviewedBy: string, reason: string) { return mapRecord(await this.request<XanoRecord>(`/actions/${actionId}/approve`,{method:'POST',body:JSON.stringify({reason})})); }
  async reject(actionId: string, _organizationId: string, _reviewedBy: string, reason: string) { return mapRecord(await this.request<XanoRecord>(`/actions/${actionId}/reject`,{method:'POST',body:JSON.stringify({reason})})); }
  async getAudit(actionId: string, _organizationId: string) { const result=await this.request<{events:XanoAuditEvent[]}>(`/actions/${actionId}/audit`); return result.events.map(mapEvent); }
  async verifyAudit(actionId: string, organizationId: string) {
    const events=await this.getAudit(actionId,organizationId); let previousHash='0'.repeat(64);
    for(let index=0;index<events.length;index+=1){const event=events[index];if(event.sequence!==index+1||event.previousHash!==previousHash)return false;const canonical=`${event.actionId}|${event.sequence}|${event.type}|${JSON.stringify(event.data)}|${event.previousHash}`;if(await sha256(canonical)!==event.eventHash)return false;previousHash=event.eventHash;}
    return events.length>0;
  }
  private async request<T>(path:string,init:RequestInit={}) {
    const response=await this.fetcher(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${this.token}`,...init.headers}});
    if(!response.ok){
      if(response.status===401||response.status===403) throw new Error('Your Xano session is no longer valid. Sign in again.');
      throw new Error(`Xano request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }
}

function mapRecord(record:XanoRecord):EvaluationRecord{return{id:String(record.id),createdAt:dateText(record.created_at),organizationId:String(record.organization_id),idempotencyKey:record.idempotency_key,actor:{id:String(record.actor_id),role:'authenticated'},action:record.action_name,resource:record.resource,maskedPayload:record.masked_payload,decision:record.decision,status:record.status,riskScore:record.risk_score,riskFactors:record.risk_factors??[],matchedRules:record.matched_rules??[],explanation:record.explanation,execution:record.execution?{executionId:record.execution.execution_id,executedAt:dateText(record.execution.executed_at),effect:record.execution.effect}:undefined};}
function mapEvent(event:XanoAuditEvent):AuditEvent{return{id:String(event.id),actionId:String(event.action_id),organizationId:String(event.organization_id),sequence:event.sequence,timestamp:dateText(event.created_at),actorId:event.actor_ref,type:event.event_type,data:event.event_data,previousHash:event.previous_hash,eventHash:event.event_hash};}
function dateText(value:string|number):string{const date=new Date(typeof value==='string'&&/^\d+$/.test(value)?Number(value):value);return Number.isNaN(date.valueOf())?String(value):date.toISOString();}

const runtimeEnv=(import.meta as ImportMeta&{env?:{VITE_ACTIONGUARD_API_URL?:string}}).env??{};
const apiUrl=runtimeEnv.VITE_ACTIONGUARD_API_URL?.trim();
const sessionKey='actionguard_xano_session';

export function hasXanoRuntime():boolean{return Boolean(apiUrl);}

export function getStoredXanoSession():XanoSession|undefined{
  if(typeof window==='undefined')return undefined;
  const stored=window.sessionStorage.getItem(sessionKey);
  if(!stored)return undefined;
  try{
    const parsed=JSON.parse(stored) as Partial<XanoSession>;
    if(typeof parsed.token!=='string'||!parsed.token||!parsed.user||typeof parsed.user.id!=='number')throw new Error('Invalid session');
    return parsed as XanoSession;
  }catch{
    window.sessionStorage.removeItem(sessionKey);
    return undefined;
  }
}

export async function loginToXano(email:string,password:string,fetcher:typeof fetch=fetch,baseUrl=apiUrl):Promise<XanoSession>{
  if(!baseUrl)throw new Error('The live Xano backend is not configured for this deployment.');
  const response=await fetcher(`${baseUrl.replace(/\/$/,'')}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.trim().toLowerCase(),password})});
  if(!response.ok){
    if(response.status===401||response.status===403)throw new Error('The demo email or password is incorrect.');
    throw new Error(`Xano login failed (${response.status}).`);
  }
  const result=await response.json() as {authToken?:unknown;user?:XanoUser};
  if(typeof result.authToken!=='string'||!result.authToken||!result.user)throw new Error('Xano returned an invalid login response.');
  const session={token:result.authToken,user:result.user};
  if(typeof window!=='undefined')window.sessionStorage.setItem(sessionKey,JSON.stringify(session));
  return session;
}

export function clearXanoSession():void{if(typeof window!=='undefined')window.sessionStorage.removeItem(sessionKey);}

export function createActionGateway(forceLocal=false):ActionGateway{
  const session=getStoredXanoSession();
  return !forceLocal&&apiUrl&&session?new XanoGateway(apiUrl,session.token):new LocalGateway(policyService);
}

export const actionGateway:ActionGateway=createActionGateway();
