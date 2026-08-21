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
  id: number; created_at: string; organization_id: number; idempotency_key: string; actor_id: number;
  action_name: string; resource: string; masked_payload: Record<string, unknown>;
  decision: EvaluationRecord['decision']; status: EvaluationRecord['status']; risk_score: number;
  risk_factors: EvaluationRecord['riskFactors']; matched_rules: string[]; explanation: string;
  execution?: { execution_id: string; executed_at: string; effect: string } | null;
}

interface XanoAuditEvent {
  id: number; action_id: number; organization_id: number; sequence: number; actor_ref: string;
  event_type: AuditEvent['type']; event_data: Record<string, unknown>; previous_hash: string;
  event_hash: string; created_at: string;
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
  private async request<T>(path:string,init:RequestInit={}) { const response=await this.fetcher(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${this.token}`,...init.headers}});if(!response.ok)throw new Error(`Xano request failed (${response.status})`);return response.json() as Promise<T>; }
}

function mapRecord(record:XanoRecord):EvaluationRecord{return{id:String(record.id),createdAt:record.created_at,organizationId:String(record.organization_id),idempotencyKey:record.idempotency_key,actor:{id:String(record.actor_id),role:'authenticated'},action:record.action_name,resource:record.resource,maskedPayload:record.masked_payload,decision:record.decision,status:record.status,riskScore:record.risk_score,riskFactors:record.risk_factors??[],matchedRules:record.matched_rules??[],explanation:record.explanation,execution:record.execution?{executionId:record.execution.execution_id,executedAt:record.execution.executed_at,effect:record.execution.effect}:undefined};}
function mapEvent(event:XanoAuditEvent):AuditEvent{return{id:String(event.id),actionId:String(event.action_id),organizationId:String(event.organization_id),sequence:event.sequence,timestamp:event.created_at,actorId:event.actor_ref,type:event.event_type,data:event.event_data,previousHash:event.previous_hash,eventHash:event.event_hash};}

const runtimeEnv=(import.meta as ImportMeta&{env?:{VITE_ACTIONGUARD_API_URL?:string}}).env??{};
const apiUrl=runtimeEnv.VITE_ACTIONGUARD_API_URL;
const apiToken=typeof window==='undefined'?undefined:(window.sessionStorage.getItem('actionguard_demo_token')??undefined);
export const actionGateway:ActionGateway=apiUrl&&apiToken?new XanoGateway(apiUrl,apiToken):new LocalGateway(policyService);
