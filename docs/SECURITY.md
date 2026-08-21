# Security model

## Implemented controls

- Default deny for missing context and actions without a policy.
- Organization-scoped identifiers, reads, approvals, and audit access.
- Organization plus idempotency-key uniqueness prevents duplicate effects.
- Human reason and reviewer identity required before a REVIEW executes.
- Bank-like fields are replaced with `[REDACTED]` before storage or display.
- Per-action SHA-256 event chain detects alteration, removal, or reordering.
- Bounded JSON body and simple per-client rate limiter in the reference API.
- CORS limited to the local demo origin.
- No secrets, real customers, payment rails, or production side effects.

## Production requirements

The local header is a demonstration boundary, not production authentication. A deployed version must derive tenant and actor claims from a verified identity token, enforce RBAC in Xano, use TLS, encrypt data at rest, set retention rules, centralize security telemetry, protect rate-limit state, rotate secrets, and test backup restoration. Audit hashes provide tamper evidence, not a digital signature; production should anchor or sign chain heads.

Report suspected vulnerabilities privately to the repository owner. Do not include customer data or credentials in a report.
