# Verification report — 17 August 2026

All results below were observed in this workspace; unexecuted checks are named separately.

| Check | Result | Evidence |
| --- | --- | --- |
| Strict TypeScript | PASS | `tsc -b --pretty false`, exit 0 |
| Automated suite | PASS | 2 files, 14 tests, 0 failures, 1.08 s |
| Required scenarios ×3 | PASS | ALLOW / REVIEW / DENY on every pass |
| Idempotency | PASS | duplicate returned original execution; audit stayed at two events |
| Approval gate | PASS | REVIEW had no effect; approval produced APPROVED then one EXECUTED event |
| Deny safety | PASS | unauthorized 10,000-record export remained DENIED with no execution |
| Audit hashes | PASS | full SHA-256 chain recomputation returned true |
| AI failure mode | PASS | deterministic fallback returned an editable draft with warning |
| Tenant isolation | PASS | cross-organization read threw AccessDenied; other tenant list empty |
| 100 evaluations | PASS | 38.25 ms total; 34 ALLOW, 33 REVIEW, 33 DENY |
| API smoke/integration | PASS | health plus all three scenario endpoints and tenant action listing returned successfully |
| Contract alignment | PASS | OpenAPI paths present and JSON dataset aligned to executable scenarios |
| Production build | PASS | 22 modules; JS 208.59 kB (65.59 kB gzip); CSS 6.43 kB (2.17 kB gzip) |
| Production dependency audit | PASS | 0 known vulnerabilities across all severities |
| Secret-pattern scan | PASS | no AWS/GitHub/OpenAI key or private-key signature matched outside dependencies/build |

## Correction cycle

The first automated run had 11 passes and one failure: the masking test expected full redaction while the implementation intentionally retained two boundary characters. The test was corrected to assert the security invariant—the original value is absent and the stored value is visibly masked. The full affected suite was repeated and all 14 tests passed.

The API script initially used the `tsx` CLI, whose IPC socket is prohibited in this sandbox. It was changed to `node --import tsx`, and the API smoke test then passed.

## Not claimed

- Desktop/mobile browser QA was attempted, but the isolated cloud browser blocked the local loopback URL. Responsive CSS and interactive states were reviewed in source; no real browser pass is claimed.
- No Xano contract run occurred because an authenticated Xano session was unavailable.
- No public deployment, GitHub push, or Devpost submission occurred.
