# Xano build story

## What software did we replace?

ActionGuard AI replaces slow procurement portals, approval-ticket queues, and spreadsheet controls that were built for humans manually submitting requests. Those tools become a dangerous bottleneck when AI agents can call purchasing, vendor, and customer-data APIs in seconds.

## What is better now?

One pre-flight API call returns `ALLOW`, `REVIEW`, or `DENY`. Safe actions execute once, risky actions wait for a named human and reason, forbidden actions stop, and every transition becomes hash-linked evidence. The same layer works across procurement, finance, privacy, support, and operations.

## How Xano powers the product

Xano is not a decorative proxy. The versioned `xano/` source contains:

- six tenant-scoped tables: `organization`, `user`, `action`, `review`, `audit_event`, and `policy`;
- unique organization + idempotency-key and action + sequence constraints;
- an authenticated API group with evaluate, list, approve, reject, and evidence endpoints;
- deterministic policy logic with three inline Xano unit tests;
- transaction-bound approval and execution workflows;
- bank-field masking before persistence;
- SHA-256 audit-event chaining;
- official CLI/developer-MCP validation;
- a React adapter that activates Xano from runtime environment variables.

## Where AI helps—and where it cannot

AI converts plain-language governance into an editable policy draft and improves explanations. A deterministic fallback keeps Policy Studio functional when an AI provider fails. AI cannot publish a policy, approve a request, override `DENY`, or execute an effect.

## Build acceleration

Codex helped translate the security model into TypeScript, tests, XanoScript, API contracts, and documentation. Without AI plus Xano, building a tenant-safe schema, authenticated APIs, workflow transactions, local adapters, and a polished React console would have taken substantially longer and required separate backend infrastructure.

## Verified live status

All 15 XanoScript constructs validate with the official `@xano/developer-mcp` package. The existing `jhony` instance and workspace were inspected directly: seven total tables, 24 records, and the six-endpoint `ActionGuard` API group are live. No second instance was created.

Three synthetic identities authenticated successfully. The required ALLOW, REVIEW/approval and DENY journeys, idempotency, tenant isolation, redaction, real execution timestamps and independently recomputed hash chains passed against the live API. Credentials and bearer tokens remain outside the repository.

## Reproducible deployment sequence

1. Run `npx @xano/cli auth` and select the existing `jhony` instance and intended workspace.
2. Verify with `npm run xano:profile`; never paste the token into source or chat.
3. Run `npm run verify` and commit the known-good snapshot.
4. Run `npx @xano/cli workspace push -d ./xano --dry-run` and inspect every create/update/delete.
5. Apply the push only after reviewing that preview.
6. Create one synthetic organization plus demo users; never load personal or financial data.
7. Configure the browser build with the canonical public API base URL and obtain a demo-only token through login; never compile a token into the frontend.
8. Repeat all three scenarios, approval, isolation, idempotency, and hash verification against Xano.
9. Deploy `dist/` to the approved static host and record the verified production URL.
