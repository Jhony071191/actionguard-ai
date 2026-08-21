# Verification report — 21 August 2026

All results below were observed in this workspace; unexecuted checks are named separately.

| Check | Result | Evidence |
| --- | --- | --- |
| Strict TypeScript | PASS | `tsc -b --pretty false`, exit 0 |
| Automated suite | PASS | 3 files, 17 tests, 0 failures, 838 ms |
| Required scenarios ×3 | PASS | ALLOW / REVIEW / DENY on every pass |
| Idempotency | PASS | duplicate returned original execution; audit stayed at two events |
| Approval gate | PASS | REVIEW had no effect; approval produced APPROVED then one EXECUTED event |
| Deny safety | PASS | unauthorized 10,000-record export remained DENIED with no execution |
| Audit hashes | PASS | full SHA-256 chain recomputation returned true |
| AI failure mode | PASS | deterministic fallback returned an editable draft with warning and preserved clause-specific effects |
| Tenant isolation | PASS | cross-organization read threw AccessDenied; other tenant list empty |
| 100 evaluations | PASS | 38.25 ms total; 34 ALLOW, 33 REVIEW, 33 DENY |
| API smoke/integration | PASS | health plus all three scenario endpoints and tenant action listing returned successfully |
| Contract alignment | PASS | OpenAPI paths present and JSON dataset aligned to executable scenarios |
| XanoScript validation | PASS | 15/15 constructs valid with official Developer MCP 2.2.5 |
| Xano adapter | PASS | response mapping, bearer header, and fail-closed HTTP error tested |
| Production build | PASS | 23 modules; JS 211.68 kB (66.55 kB gzip); CSS 6.92 kB (2.17 kB gzip) |
| Production dependency audit | PASS | 0 known vulnerabilities across all severities |
| Secret-pattern scan | PASS | no AWS/GitHub/OpenAI key or private-key signature matched outside dependencies/build |
| Public desktop smoke test | PASS | Netlify URL loaded over HTTPS; ALLOW, REVIEW, DENY, approval, execution evidence, masking, hash verification, and fallback policy draft were exercised with no application console errors |

## Correction cycle

The original automated run had 11 passes and one failure: the masking test expected full redaction while the implementation intentionally retained two boundary characters. The test was corrected to assert the security invariant—the original value is absent and the stored value is visibly masked. The suite grew to 16 passing tests after adding the Xano adapter cases.

The API script initially used the `tsx` CLI, whose IPC socket is prohibited in this sandbox. It was changed to `node --import tsx`, and the API smoke test then passed.

The first XanoScript validation found five syntax/type issues. Filters, JSON defaults, and multiline preconditions were corrected; the validator was repeated and all 15 constructs passed.

The public browser pass then exposed a clause-scoping bug in Policy Studio: “review payments over USD 1,000 and deny exports” applied DENY to both clauses. The parser was corrected to derive each effect from its own natural-language clause, a regression test was added, and the full suite passed with 17 tests.

The production dependency tree has zero known vulnerabilities. The official Xano CLI was removed from the project dependency tree and is invoked only on demand. A full development-only audit still reports six high-severity transitive advisories in `lodash-es` through the official Xano Developer MCP language server, with no upstream fix available. That validator is not bundled into the browser build and remains development-only.

## Not claimed

- Desktop browser QA passed against the public HTTPS deployment. The browser did not expose viewport emulation, so no real mobile-browser pass is claimed; responsive breakpoints were reviewed in source.
- No Xano contract run occurred because an authenticated Xano session was unavailable.
- No GitHub push or Devpost submission occurred.
