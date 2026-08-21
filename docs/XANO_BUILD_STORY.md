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

## Verified local status

All 15 XanoScript constructs validate with the official `@xano/developer-mcp` package. The installed Xano CLI is version 1.2.0. No Xano CLI profile exists in this execution environment, so no remote workspace change or deployment is claimed.

The participant previously supplied evidence of one instance named `jhony` with host `xgrz-w2pq-acsr.n7e.xano.io`. No second instance was created.

## Safe deployment sequence

1. Run `npx @xano/cli auth` and select the existing `jhony` instance and intended workspace.
2. Verify with `npm run xano:profile`; never paste the token into source or chat.
3. Run `npm run verify` and commit the known-good snapshot.
4. Run `npx @xano/cli workspace push -d ./xano --dry-run` and inspect every create/update/delete.
5. Apply the push only after reviewing that preview.
6. Create one synthetic organization plus demo users; never load personal or financial data.
7. Configure the browser with the live canonical URL and a demo-only token.
8. Repeat all three scenarios, approval, isolation, idempotency, and hash verification against Xano.
9. Deploy `dist/` using Xano static hosting and record the verified production URL.
