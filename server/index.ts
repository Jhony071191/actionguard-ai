import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ActionGuardService, AccessDeniedError, NotFoundError, ValidationError } from '../src/core/service';
import type { ActionIntent, PolicyDraft } from '../src/core/types';

const service = new ActionGuardService();
const hits = new Map<string, { count: number; reset: number }>();
const port = Number(process.env.PORT ?? 8787);

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','access-control-allow-origin':'http://localhost:5173','vary':'origin'});
  res.end(JSON.stringify(body));
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (Buffer.concat(chunks).byteLength > 100_000) throw new ValidationError('Request body is too large');
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
  catch { throw new ValidationError('Invalid JSON body'); }
}
function org(req: IncomingMessage) {
  const value = req.headers['x-organization-id'];
  if (typeof value !== 'string' || !value.trim()) throw new AccessDeniedError('x-organization-id is required');
  return value;
}
function rateLimit(req: IncomingMessage) {
  const key = req.socket.remoteAddress ?? 'unknown'; const now = Date.now(); const prior = hits.get(key);
  if (!prior || prior.reset < now) { hits.set(key,{count:1,reset:now+60_000}); return; }
  prior.count += 1; if (prior.count > 120) throw new ValidationError('Rate limit exceeded');
}

createServer(async (req,res) => {
  try {
    rateLimit(req); const url = new URL(req.url ?? '/', 'http://localhost'); const parts = url.pathname.split('/').filter(Boolean);
    if (req.method === 'OPTIONS') { res.writeHead(204,{'access-control-allow-origin':'http://localhost:5173','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-organization-id'}); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/health') return send(res,200,{status:'ok',mode:'local-adapter'});
    if (req.method === 'POST' && url.pathname === '/v1/actions/evaluate') { const input = await body(req) as ActionIntent; if (input.organizationId !== org(req)) throw new AccessDeniedError('Organization mismatch'); return send(res,201,await service.evaluate(input)); }
    if (req.method === 'GET' && url.pathname === '/v1/actions') return send(res,200,{items:service.listActions(org(req))});
    if (parts[0] === 'v1' && parts[1] === 'actions' && parts[2]) {
      const organizationId = org(req); const id = parts[2];
      if (req.method === 'GET' && parts.length === 3) return send(res,200,service.getAction(id,organizationId));
      if (req.method === 'GET' && parts[3] === 'audit') return send(res,200,{events:service.getAudit(id,organizationId),valid:await service.verifyAudit(id,organizationId)});
      if (req.method === 'POST' && ['approve','reject'].includes(parts[3])) { const input = await body(req) as {reviewedBy?:string;reason?:string}; if(!input.reviewedBy||!input.reason) throw new ValidationError('reviewedBy and reason are required'); return send(res,200,parts[3] === 'approve' ? await service.approve(id,organizationId,input.reviewedBy,input.reason) : await service.reject(id,organizationId,input.reviewedBy,input.reason)); }
    }
    if (req.method === 'POST' && parts[0] === 'v1' && parts[1] === 'demo' && parts[2] === 'scenarios' && parts[4] === 'run') { if (org(req) !== 'org-demo') throw new AccessDeniedError('Demo scenarios require org-demo'); return send(res,201,await service.runScenario(parts[3])); }
    if (req.method === 'GET' && url.pathname === '/v1/policies') return send(res,200,{items:service.listPolicies()});
    if (req.method === 'POST' && url.pathname === '/v1/policies/draft') { const input = await body(req) as {sourceText?:string}; return send(res,201,await service.draftPolicy(input.sourceText ?? '',false)); }
    if (req.method === 'POST' && url.pathname === '/v1/policies') return send(res,201,service.publishPolicy(await body(req) as PolicyDraft));
    return send(res,404,{error:'Route not found'});
  } catch(error) {
    const status = error instanceof AccessDeniedError ? 403 : error instanceof NotFoundError ? 404 : error instanceof ValidationError ? 400 : 500;
    send(res,status,{error: error instanceof Error ? error.message : 'Unexpected error'});
  }
}).listen(port,() => console.log(`ActionGuard API listening on http://localhost:${port}`));
