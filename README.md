# ActionGuard AI

> The pre-flight control layer for AI agents: verify every business API action before it becomes a real-world consequence.

ActionGuard AI evaluates an agent's intended business action before execution. A deterministic policy engine returns **ALLOW**, **REVIEW**, or **DENY**, while a human approval flow and a SHA-256 audit chain preserve accountability. AI can draft policy rules and explain outcomes, but it cannot bypass published controls.

## Why it matters

Businesses are giving agents access to procurement, customer data, support tooling, and operational APIs. Existing controls are fragmented across gateways, tickets, and spreadsheets. ActionGuard AI combines authorization, risk checks, human review, idempotent execution, and evidence in one reusable layer.

## Demo scenarios

| Scenario | Expected result | Safety property |
| --- | --- | --- |
| Approved software renewal for USD 120 | ALLOW | Low-risk approved purchase executes once |
| New vendor and USD 7,500 payment with bank data | REVIEW | No effect occurs before human approval |
| Export of 10,000 customers by an unauthorized role | DENY | Sensitive bulk export is blocked |

## Architecture

- **Web:** React + TypeScript + Vite, responsive and keyboard accessible.
- **Core:** deterministic, framework-independent TypeScript policy engine.
- **API:** dependency-light Node HTTP reference server with organization scoping and rate limiting.
- **Persistence target:** Xano for authentication, data model, workflows, and API hosting. A local adapter keeps the demo usable until authenticated Xano access is available.
- **AI:** optional policy-drafting adapter with a deterministic fallback.

See [Architecture](docs/ARCHITECTURE.md), [API specification](docs/API.md), [Security](docs/SECURITY.md), and [Xano build story](docs/XANO_BUILD_STORY.md).

## Run locally

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The static demo needs no credentials.

Run the reference API separately:

```bash
npm run api
```

The API listens on `http://localhost:8787`. Send `x-organization-id: org-demo` on protected routes.

## Verify

```bash
npm run verify
```

This runs strict TypeScript checks, the automated suite, and a production build. Exact results from the verified build are recorded in [TEST_REPORT.md](docs/TEST_REPORT.md).

## API surface

- `POST /v1/actions/evaluate`
- `GET /v1/actions`
- `GET /v1/actions/:id`
- `POST /v1/actions/:id/approve`
- `POST /v1/actions/:id/reject`
- `GET /v1/actions/:id/audit`
- `GET /v1/policies`
- `POST /v1/policies/draft`
- `POST /v1/policies`
- `POST /v1/demo/scenarios/:id/run`

## Safety boundaries

- Synthetic data only; no bank, payroll, or production APIs.
- Default deny for missing or unknown context.
- DENY overrides REVIEW and ALLOW.
- AI is advisory and never performs or authorizes an action.
- Sensitive fields are masked before display or logging.
- Secrets belong in runtime environment variables and are excluded from Git.

## Hackathon status

Built from scratch for the DevNetwork [API + Cloud + AI] Hackathon 2026. The local MVP is independently runnable. Xano is the intended central backend, but a live Xano integration is only claimed after authenticated deployment and endpoint verification.

## License

MIT © 2026 Jhony Alexander Mosquera Zapata

