# Devpost submission draft

## Project name

ActionGuard AI

## One-line pitch

The pre-flight control plane that lets AI agents move fast without turning API access into uncontrolled business consequences.

## Project links

- Repository: https://github.com/Jhony071191/actionguard-ai
- Live demo: https://actionguard-ai.netlify.app/

## Inspiration

Business approval software is slow because it was designed for humans filling forms and waiting in ticket queues. AI agents operate at API speed. Giving them direct purchasing, vendor, or customer-data access creates a new gap: the action can become real before a person understands the risk.

## What it does

An agent sends an intended action to ActionGuard before calling the real business API. A deterministic engine checks tenant, actor, policy, amount, permissions, and sensitive fields, then returns:

- `ALLOW`: execute once and record evidence;
- `REVIEW`: pause with no side effect until an authorized person decides;
- `DENY`: block the action with an exact rule and explanation.

Policy Studio converts plain-language governance into an editable draft. AI is advisory: it cannot publish, approve, override, or execute. Every lifecycle event is linked with SHA-256 hashes.

## How we built it

The product uses React, TypeScript, and Vite for the responsive operations console. XanoScript defines six tenant-scoped tables, authenticated APIs, deterministic evaluation, transactional approvals, idempotency constraints, masking, and persisted audit evidence. An adapter lets the same UI run against Xano or a reproducible local fallback. The repository includes OpenAPI, a Node reference server, synthetic data, unit/contract/integration tests, and official XanoScript validation.

## Challenges we ran into

Safety controls can fail through duplicate requests, cross-tenant reads, approval races, sensitive logging, or an unavailable AI provider. We designed explicit invariants for each: tenant-qualified queries, unique idempotency keys, transactional single approval, masking before persistence, fail-closed networking, and deterministic fallback.

## Accomplishments

- Three visibly different outcomes from one reusable API.
- A USD 7,500 vendor payment cannot execute before human approval.
- An unauthorized 10,000-customer export is denied.
- Hash-linked evidence and organization isolation are automated tests.
- Xano is meaningful backend infrastructure rather than a superficial integration.

## What we learned

AI safety for business actions is less about generating better text and more about controlling state transitions. Deterministic policy, identity, idempotency, human judgment, and evidence must work together.

## What's next

Add signed policy bundles, connectors for procurement and CRM systems, configurable separation of duties, external audit anchoring, and policy simulation before activation.

## Built with

Xano, XanoScript, React, TypeScript, Vite, Node.js, Vitest, OpenAPI, Web Crypto API, and Codex.

## Xano challenge answers

- **Software replaced:** rigid procurement approval portals and spreadsheet/ticket controls.
- **Why:** they cannot safely govern autonomous actions at API speed.
- **AI tools:** Codex for implementation, review, tests, and XanoScript development; optional provider-neutral policy drafting at runtime.
- **Build time:** record the final elapsed human time immediately before submission.
- **What AI + Xano accelerated:** tenant data modeling, API/workflow implementation, policy translation, integration adapters, tests, and evidence documentation.

Video URL, final elapsed time, and verified Xano endpoint evidence must be inserted only after those assets exist.
