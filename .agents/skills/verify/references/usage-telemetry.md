# Optional remote usage telemetry

Claim: actual DSH interactions emit only fixed-schema events after consent, and the deployed Supabase collector persists them without exposing tables directly to anonymous clients.

Prerequisites: built pinned DSH, Chromium with outbound HTTPS access, active Supabase function `dsh-sidebar-events` with JWT checking enabled and the dedicated RLS-protected schema. Owner-only SQL is used for independent audits. Public anon JWT is allowed in clients; service-role credentials remain only in the function environment. The optional `DSH_BROWSER_PROXY` test setting routes browser traffic in managed environments; it must not disable certificate validation.

Commands:

```sh
export DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness
npm run verify
DSH_VERIFY_USAGE=1 npm run verify:browser
DSH_VERIFY_USAGE=1 DSH_LIVE_LOCALE=en npm run verify:live
```

The controlled browser lane uses labeled session fixtures and one labeled search-error response; the telemetry receiver is the genuine deployed Supabase function. Require default-off zero requests, opt-in and diagnostic acceptance, actual card request, zero-result and error search events, both navigation directions, consent after reload, no network after revocation, forget, and exactly six allowlisted wire fields. Every received event is independently queried by its random receipt through a separate database read. The English real-model lane repeats the same flow after genuine official API/session acceptance; never count controlled messages as real-model output.

Retain `.runtime/browser/usage-e2e.json`, `usage-opt-in.png`, `usage-disabled.png` and the English live run's `evidence/usage-e2e.json`. Both receipts list exact event IDs, requests, response codes and independent persisted readbacks. They contain no provider keys or browser connection URLs. Run `supabase/report.sql` as project owner; compare event IDs with SQL for the final candidate and count duplicate rows. An HTTP 202 alone is insufficient.

Negative acceptance: direct requests with an unknown `prompt` or `session_id`, unsupported locale/event, oversized body and no gateway authentication must fail. Anonymous direct table SELECT/INSERT/UPDATE/DELETE must fail. The unit gate must fail closed on storage errors, preserve UI operation on network failure, enforce queue bounds and check browser DNT/GPC. Inspect security advisors: the dedicated tables intentionally have RLS and no client policies, denying all ordinary users. Do not change unrelated project tables or grants.

The dedicated daily retention job at 03:17 UTC removes records beyond 30 days; up to one daily scheduling interval can elapse after the cutoff. Verify its active schedule and evaluate its expiry predicate with expired and recent timestamps using read-only SQL; report the first scheduled deletion separately. Never delete unrelated production records. The collector's global trigger limits writes to 10,000 attempts/day. Test the limit inside a rollback transaction rather than exhausting the live quota.

Cleanup: the browser test uses an isolated DSH profile, revokes consent, closes its browser and host. Accepted diagnostic events contain fixed metadata only and remain under the normal retention policy. Do not treat acceptance-generated counts as real adoption. Do not enable telemetry for the user's normal profile on their behalf.

Media changes still require genuine five-language recording, existing OCR and provenance gates, and the fresh staged-tree pre-commit hook. Overall PASS requires all applicable gates, not just collector acceptance.
