import { useMemo, useState } from 'react';
import { DEMO_SCENARIOS } from './core/scenarios';
import type { AuditEvent, EvaluationRecord, PolicyDraft } from './core/types';
import { actionGateway, policyService } from './services/gateway';

type View = 'command' | 'approvals' | 'policies' | 'evidence';
const tone: Record<string, string> = { ALLOW: 'allow', REVIEW: 'review', DENY: 'deny' };

export function App() {
  const [view, setView] = useState<View>('command');
  const [actions, setActions] = useState<EvaluationRecord[]>([]);
  const [selected, setSelected] = useState<EvaluationRecord>();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [chainValid, setChainValid] = useState<boolean>();
  const [busy, setBusy] = useState<string>();
  const [policyText, setPolicyText] = useState('Review payments over $1,000 and deny customer exports.');
  const [draft, setDraft] = useState<PolicyDraft>();
  const pending = useMemo(() => actions.filter((action) => action.status === 'PENDING_REVIEW'), [actions]);

  const refresh = async () => setActions(await actionGateway.listActions('org-demo'));
  async function run(id: string) {
    setBusy(id);
    const outcome = await actionGateway.runScenario(id);
    await refresh();
    await inspect(outcome.record);
    setBusy(undefined);
  }
  async function inspect(action: EvaluationRecord) {
    setSelected(action);
    setEvents(await actionGateway.getAudit(action.id, 'org-demo'));
    setChainValid(await actionGateway.verifyAudit(action.id, 'org-demo'));
  }
  async function approve(action: EvaluationRecord, accepted: boolean) {
    const updated = accepted
      ? await actionGateway.approve(action.id, 'org-demo', 'reviewer-demo', 'Verified against the synthetic demo policy.')
      : await actionGateway.reject(action.id, 'org-demo', 'reviewer-demo', 'Risk is not acceptable for this demo.');
    await refresh();
    await inspect(updated);
  }
  async function makeDraft() {
    setDraft(await policyService.draftPolicy(policyText, false));
  }

  return <div className="shell">
    <aside>
      <a className="brand" href="#top" aria-label="ActionGuard AI home"><span>AG</span><strong>ActionGuard<em>AI</em></strong></a>
      <nav aria-label="Primary navigation">
        {([['command','Command center'],['approvals','Approvals'],['policies','Policy studio'],['evidence','Evidence']] as const).map(([id,label]) =>
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}{id === 'approvals' && pending.length > 0 ? <b>{pending.length}</b> : null}</button>)}
      </nav>
      <div className="guardrail"><span>● Protected</span><small>Deterministic mode</small><small>{actionGateway.mode === 'xano' ? 'Xano connected' : 'Local fallback'}</small></div>
    </aside>
    <main id="top">
      <header><div><p className="eyebrow">AGENT ACTION CONTROL PLANE</p><h1>{view === 'command' ? 'Every action earns its outcome.' : view === 'approvals' ? 'Human approval queue' : view === 'policies' ? 'Policy Studio' : 'Tamper-evident evidence'}</h1></div><div className="live"><i /> Guardrails live</div></header>

      {view === 'command' && <>
        <section className="hero"><div><span className="kicker">PRE-FLIGHT AUTHORIZATION</span><h2>Stop unsafe agent actions<br/><mark>before they execute.</mark></h2><p>One API call evaluates identity, context, value and sensitive data. Safe work moves; uncertain work pauses; forbidden work stops.</p></div><div className="decision-flow"><div><small>01 · INTENT</small><strong>Agent requests action</strong></div><div><small>02 · POLICY</small><strong>Deterministic evaluation</strong></div><div className="outcomes"><span className="allow">ALLOW</span><span className="review">REVIEW</span><span className="deny">DENY</span></div></div></section>
        <section><div className="section-title"><div><p className="eyebrow">LIVE PLAYGROUND</p><h2>Three actions. Three safety outcomes.</h2></div><span>Synthetic data only</span></div><div className="scenario-grid">
          {DEMO_SCENARIOS.map((scenario, index) => <article key={scenario.id}><div className="number">0{index + 1}</div><div className={`pill ${tone[scenario.expected]}`}>{scenario.expected}</div><h3>{scenario.title}</h3><p>{scenario.subtitle}</p><button disabled={!!busy} onClick={() => void run(scenario.id)}>{busy === scenario.id ? 'Evaluating…' : 'Run evaluation →'}</button></article>)}
        </div></section>
        <section className="metrics"><div><strong>{actions.length}</strong><span>Evaluations</span></div><div><strong>{pending.length}</strong><span>Awaiting people</span></div><div><strong>SHA-256</strong><span>Evidence chain</span></div><div><strong>0</strong><span>Raw secrets stored</span></div></section>
      </>}

      {view === 'approvals' && <section className="panel"><div className="section-title"><div><p className="eyebrow">HUMAN-IN-THE-LOOP</p><h2>Pending decisions</h2></div></div>{pending.length === 0 ? <Empty text="Run the vendor payment scenario to create a review."/> : pending.map(action => <article className="approval" key={action.id}><div><span className="pill review">REVIEW</span><h3>{action.action}</h3><p>{action.explanation}</p><small>{action.resource} · Risk {action.riskScore}</small></div><div><button className="secondary" onClick={() => void approve(action,false)}>Reject</button><button onClick={() => void approve(action,true)}>Approve once</button></div></article>)}</section>}

      {view === 'policies' && <section className="policy-layout"><div className="panel"><p className="eyebrow">AI-ASSISTED, HUMAN-PUBLISHED</p><h2>Turn plain language into a draft</h2><label htmlFor="policy">Policy instruction</label><textarea id="policy" value={policyText} onChange={e => setPolicyText(e.target.value)} /><button onClick={() => void makeDraft()}>Generate safe draft</button><p className="note">The demo intentionally runs without an AI key. A deterministic parser creates an editable draft; AI can never publish or bypass a rule.</p></div><div className="panel code"><p className="eyebrow">DRAFT PREVIEW</p>{draft ? <><div className="pill review">{draft.generatedBy}</div><pre>{JSON.stringify(draft.rules, null, 2)}</pre><button onClick={() => { policyService.publishPolicy(draft); setDraft(undefined); }}>Publish version {policyService.listPolicies().length + 1}</button></> : <Empty text="Generate a policy draft to inspect its exact rules."/>}</div></section>}

      {view === 'evidence' && <section className="evidence-layout"><div className="panel"><p className="eyebrow">ACTION INSPECTOR</p><h2>Decision evidence</h2>{actions.length === 0 ? <Empty text="Run a scenario to produce auditable evidence."/> : <div className="action-list">{actions.map(action => <button key={action.id} onClick={() => void inspect(action)} className={selected?.id === action.id ? 'selected' : ''}><span className={`pill ${tone[action.decision]}`}>{action.decision}</span><div><strong>{action.action}</strong><small>{action.createdAt}</small></div></button>)}</div>}</div><div className="panel code"><div className="chain-head"><p className="eyebrow">HASH CHAIN</p>{selected && <span className={chainValid ? 'valid' : 'invalid'}>{chainValid ? '✓ Verified' : '✕ Invalid'}</span>}</div>{selected ? <><h3>{selected.action}</h3><p>{selected.explanation}</p><pre>{JSON.stringify(selected.maskedPayload, null, 2)}</pre><ol className="timeline">{events.map(event => <li key={event.id}><strong>{event.type}</strong><small>#{event.sequence} · {event.eventHash.slice(0,12)}…</small></li>)}</ol></> : <Empty text="Select an evaluated action."/>}</div></section>}
      <footer><span>ActionGuard AI · Hackathon build</span><span>Fail closed · Execute once · Explain always</span></footer>
    </main>
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="empty"><span>◇</span><p>{text}</p></div>; }
