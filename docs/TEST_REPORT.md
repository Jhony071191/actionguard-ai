# Verification report — 21 August 2026

All results below were observed in this workspace; unexecuted checks are named separately.

| Check | Result | Evidence |
| --- | --- | --- |
| Strict TypeScript | PASS | `tsc -b --pretty false`, exit 0 |
| Automated suite | PASS | 3 files, 22 tests, 0 failures, 316 ms |
| Required scenarios ×3 | PASS | ALLOW / REVIEW / DENY on every pass |
| Idempotency | PASS | duplicate returned original execution; audit stayed at two events |
| Approval gate | PASS | REVIEW had no effect; approval produced APPROVED then one EXECUTED event |
| Deny safety | PASS | unauthorized 10,000-record export remained DENIED with no execution |
| Audit hashes | PASS | full SHA-256 chain recomputation returned true |
| AI failure mode | PASS | deterministic fallback returned an editable draft with warning and preserved clause-specific effects |
| Tenant isolation | PASS | cross-organization read threw AccessDenied; other tenant list empty |
| 100 evaluations | PASS | 38.25 ms total; 34 ALLOW, 33 REVIEW, 33 DENY |
| API smoke/integration | PASS | health plus all three scenario endpoints and tenant action listing returned successfully |
| Contract alignment | PASS | OpenAPI paths present; JSON dataset aligned; tenant-scoped Xano audit lookup and all three bank-field redactions covered by regression tests |
| XanoScript validation | PASS | 15/15 constructs valid with official Developer MCP 2.2.5 |
| Xano adapter | PASS | response mapping, bearer header, and fail-closed HTTP error tested |
| Live Xano authentication | PASS | three synthetic users authenticated with HTTP 200; credentials and bearer tokens were never written to the repository or report |
| Live Xano scenarios | PASS | ALLOW executed, REVIEW stayed pending until approval, DENY never executed; banking data returned as `[REDACTED]` |
| Live Xano idempotency | PASS | repeated ALLOW returned `duplicate: true`, the same action ID, and the same execution ID |
| Live Xano audit integrity | PASS | EVALUATED → APPROVED → EXECUTED; all links and SHA-256 hashes independently recomputed successfully |
| Live Xano tenant isolation | PASS | OtherCo list returned 0 records and its read of an ActionGuard Demo Co audit returned HTTP 404; access returned to HTTP 200 after restoring the tenant |
| Live Xano execution timestamps | PASS | automatic and human-approved execution paths returned real millisecond timestamps, not a literal placeholder |
| Production build | PASS | 23 modules; JS 211.68 kB (66.55 kB gzip); CSS 6.92 kB (2.17 kB gzip) |
| Production dependency audit | PASS | 0 known vulnerabilities across all severities |
| Secret-pattern scan | PASS | no AWS/GitHub/OpenAI key or private-key signature matched outside dependencies/build |
| Public desktop smoke test | PASS | Netlify URL loaded over HTTPS; ALLOW, REVIEW, DENY, approval, execution evidence, masking, hash verification, and fallback policy draft were exercised with no application console errors |
| GitHub publication integrity | PASS | all 57 files on `main` matched the local Git blob SHA; public repository and final commit were readable |

## Correction cycle

The original automated run had 11 passes and one failure: the masking test expected full redaction while the implementation intentionally retained two boundary characters. The test was corrected to assert the security invariant—the original value is absent and the stored value is visibly masked. The suite grew to 16 passing tests after adding the Xano adapter cases.

The API script initially used the `tsx` CLI, whose IPC socket is prohibited in this sandbox. It was changed to `node --import tsx`, and the API smoke test then passed.

The first XanoScript validation found five syntax/type issues. Filters, JSON defaults, and multiline preconditions were corrected; the validator was repeated and all 15 constructs passed.

The public browser pass then exposed a clause-scoping bug in Policy Studio: “review payments over USD 1,000 and deny exports” applied DENY to both clauses. The parser was corrected to derive each effect from its own natural-language clause, a regression test was added, and the full suite passed with 17 tests.

The live Xano draft review then exposed two source-parity gaps: the repository only redacted `bankAccount`, while the reviewed remote draft also redacted `iban` and `routingNumber`; and the audit authorization check used an existence result rather than the tenant-scoped action record. The repository was synchronized, two regression tests were added, and the suite passed with 19 tests. Official XanoScript validation remained 15/15.

The first live ActionGuard login returned HTTP 403 even though the same synthetic credentials succeeded against Xano's default authentication endpoint. The custom endpoint had declared a `password` input, causing the value to be transformed before secure comparison. It was changed to required sensitive `text`, published, and all three synthetic identities then authenticated with HTTP 200.

The first protected API call returned HTTP 500 because Xano authentication exposes the user ID in `$auth`, not arbitrary `organization_id` or `role` fields. All five protected endpoints now load the active user by `$auth.id` and derive tenant and role from that record. The five fixes were published and verified with the required scenarios, an HTTP 404 cross-tenant check, and restoration of the original synthetic user scope.

The live evidence pass also found `executed_at` serialized as the literal `"now"` inside nested execution objects. Both automatic and approved paths now evaluate `now` into `$executed_at` before constructing the object. The two drafts were published; fresh calls returned real millisecond timestamps and the resulting three-event hash chain recomputed exactly. Three regression tests cover sensitive login input, authenticated-user scoping, and evaluated timestamps, bringing the suite to 22 passing tests.

The production dependency tree has zero known vulnerabilities. The official Xano CLI was removed from the project dependency tree and is invoked only on demand. A full development-only audit still reports six high-severity transitive advisories in `lodash-es` through the official Xano Developer MCP language server, with no upstream fix available. That validator is not bundled into the browser build and remains development-only.

## Not claimed

- Desktop browser QA passed against the public HTTPS deployment. The browser did not expose viewport emulation, so no real mobile-browser pass is claimed; responsive breakpoints were reviewed in source.
- The public Netlify frontend has not yet been reconfigured and re-tested end-to-end against the live Xano API; the live backend and the public frontend have been verified independently.
- The random passwords used for live synthetic authentication were intentionally not retained. A demo password must be manually rotated and stored outside the repository before the public login journey can be enabled.
- No Devpost submission occurred.
