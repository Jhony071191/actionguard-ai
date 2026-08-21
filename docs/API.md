# API guide

Base URL for the local adapter: `http://localhost:8787`. Protected calls require `x-organization-id`; JSON bodies containing `organizationId` must match it.

## Reproducible examples

```bash
curl -s http://localhost:8787/health
curl -s -X POST http://localhost:8787/v1/demo/scenarios/safe-renewal/run \
  -H 'x-organization-id: org-demo'
curl -s http://localhost:8787/v1/actions \
  -H 'x-organization-id: org-demo'
```

Approval and rejection require `reviewedBy` and a non-empty `reason`. Repeating an evaluation with the same organization and idempotency key returns the original action with `duplicate: true`; no second effect is produced.

The machine-readable contract is in [`api/actionguard.openapi.yaml`](../api/actionguard.openapi.yaml).
