# Architecture

```text
Agent / workflow
      │ action intent + idempotency key
      ▼
ActionGuard API ── tenant boundary ── deterministic policy engine
      │                                      │
      │ ALLOW                         REVIEW │ DENY
      ▼                                      ▼
Execute once                         Approval queue / stop
      └──────────────► SHA-256 chained audit evidence
```

The React application demonstrates the full flow in-browser. The Node reference API exposes the same framework-independent core. `ActionGuardService` is the adapter seam: the current in-memory implementation is reproducible locally, while Xano is the target central backend.

## Trust boundaries

1. Callers supply an authenticated actor and organization identifier.
2. The API rejects a body/header organization mismatch and filters every read by organization.
3. The deterministic engine is the only decision authority. AI may draft policy text but cannot publish, approve, or execute.
4. Side effects are simulated and created only after ALLOW or explicit human approval.
5. Each lifecycle event includes the preceding hash; verification recomputes the whole per-action chain.

## Deployment target

The web bundle can run on any static host. The production design places Xano behind `/v1`, with its database tables and functions implementing the contract in `api/actionguard.openapi.yaml`. The local adapter remains the documented fallback and does not imply a live Xano deployment.
