# Xano build story

## Why Xano is central

ActionGuard needs durable, tenant-scoped state and transactional workflows more than a thin proxy. Xano is designed to own the production data model, API endpoints, approval transactions, idempotency enforcement, and audit-chain persistence. The React client should consume Xano through one adapter.

## Confirmed and unconfirmed state

The participant supplied evidence of an account and a single instance named `jhony` with host `xgrz-w2pq-acsr.n7e.xano.io`; the evidence showed it still provisioning. This execution had no authenticated Xano session and did not probe, modify, or claim that instance as live. No second instance was created.

## Build recipe in the existing `jhony` instance

Create tables `organizations`, `actors`, `policies`, `actions`, `approvals`, `executions`, and `audit_events`. Every business table includes `organization_id`. Add unique indexes on `(organization_id, idempotency_key)` for actions and `(action_id)` for executions.

Implement API group `/v1` matching the OpenAPI file. In `evaluate`:

1. Resolve organization and actor from authentication, never from an untrusted body alone.
2. Start a transaction and return an existing action on idempotency conflict.
3. Evaluate DENY rules first, REVIEW second, explicit ALLOW last, defaulting to DENY.
4. Persist a masked decision and append its canonical SHA-256 audit event.
5. Execute an ALLOW effect once; REVIEW creates no effect.

The approval endpoint locks the action row, confirms `PENDING_REVIEW`, records reviewer and reason, creates exactly one execution, and appends approval and execution events. Add tenant filters to every query and test them with two organizations.

## Connection checklist

- Wait until the existing instance reports active.
- Create the schema and functions above without entering payment details or accepting new legal terms.
- Store the API base URL in `VITE_ACTIONGUARD_API_URL`; keep tokens server-side.
- Run the contract suite and the three demo scenarios against Xano.
- Record endpoint evidence and only then change the README status from local adapter to connected.
