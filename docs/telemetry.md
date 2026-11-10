# Discovery metrics and optional usage telemetry

The maintainer collector reads aggregate repository data from GitHub. The separate, optional Web usage feature sends fixed events to Supabase after explicit consent. It is off by default. No conversation text, TODO text, search terms, session identifiers or stable installation identifiers enter the usage payload.

## Collect a snapshot

Use Node.js 24.9 or later and an existing authenticated GitHub CLI installation. The account needs write access to the repository. A fine-grained token also needs repository Administration read permission for traffic endpoints. Reuse an existing authorized login. Never put a token in a command, report, or commit.

From the repository checkout, run:

```bash
npm run telemetry:collect
```

To select a repository and output directory, run:

```bash
npm run telemetry:collect -- --repo liush2yuxjtu/dsh-sidebar-history --out .runtime/telemetry
```

The collector writes timestamped JSON snapshots, `latest.json`, and `report.md`. The default output directory is ignored by Git. Keep reports private because they include maintainer traffic data. Read the source status before using a number. A failed or malformed source is `BLOCKED`; its value is unknown, not zero. A partial collection keeps the available metrics and exits with code 2.

Run a fresh collection after a documentation change, then compare snapshots after GitHub updates its data. No recurring job is installed by this command.

## Use the metrics for a specific decision

| Question | Available metric | Decision and limit |
| --- | --- | --- |
| Do people reach the repository? | Views and unique visitors during GitHub's last 14 days | Compare the same window length before and after a discovery change. Views do not identify search impressions or plugin users. |
| Where do visits come from? | Top referring sites | Check whether a community link brings traffic. The API returns only the top sources; it is not a complete attribution log. |
| Which repository pages do people read? | Popular paths | Look for translated README paths. A path view does not establish a reader's language or nationality. |
| Do people retrieve the source? | Clones and unique cloners during the last 14 days | Investigate whether installation instructions help. Clones include maintainer and automation activity and do not prove installation. |
| Are published packages downloaded? | Download counters on published Release assets | Compare assets and versions. These counts exclude normal source archive downloads and do not prove activation. No published assets means no asset downloads. |
| Does the project receive interest? | Current Stars and forks | Compare snapshots. These are current totals, not a time series of individual people. |
| Is the sidebar useful after installation? | Not measured by this collector | Requires an explicitly enabled usage feature and separate runtime acceptance. |

GitHub provides daily traffic buckets aligned to UTC and a rolling 14-day total. Do not sum unique visitors across days. Do not add overlapping snapshots or divide clones by views and call the result install conversion. A zero denominator makes a ratio undefined. A private repository's traffic does not measure public demand. Search-engine indexing and rank are separate facts.

The collector uses an allowlist of aggregate fields. It does not fetch individual stargazers, user profiles, raw chat logs, or plugin session data. It does not create a service or purchase a plan. API failures do not change repository permissions or credentials.

## Optional remote usage events

Open **Usage statistics** in the sidebar footer, read the disclosure and enable **Share usage statistics**. **Send test event** checks the real receiver. Accepted, failed and pending counts describe this plugin lifecycle. Turning off stops new sends and aborts pending requests; it cannot retract data already accepted. **Turn off and forget** also removes the local consent setting. Consent is stored per browser origin, not shared across DSH installations. Do Not Track and Global Privacy Control override consent. Unreadable storage fails closed.

| Event | Trigger and meaning |
|---|---|
| `plugin_loaded` | Plugin starts with saved consent, or consent is enabled. Not an installation or user count. |
| `card_open_requested` | User requests a history card. Native navigation returns void; this does not prove successful opening. |
| `card_open_failed` | Native open throws synchronously. Asynchronous host failures are not counted here. |
| `native_navigation_selected`, `history_cards_selected` | User switches navigation modes. |
| `search_some`, `search_zero`, `search_error` | An uncancelled server search settles with results, without results, or with an error. Local filtering and cancelled requests do not count. |
| `projection_ready`, `projection_error`, `projection_missing`, `projection_migration_required` | A cold-summary refresh settles; its resulting native state determines the event. |
| `diagnostic_test` | User explicitly presses the test button. Exclude from feature-use counts. |

The wire body has exactly `schema_version`, a fresh random `event_id`, constant `package`, release `version`, allowlisted interface `locale` and allowlisted `event`. No precise interaction timestamp, stable identifier or arbitrary properties are transmitted. The database assigns receipt time. Hosting infrastructure necessarily sees network metadata; the application does not add IP, User-Agent or location fields. Supabase platform logging is not claimed to be absent.

The browser uses HTTPS directly because ordinary DSH Web does not mount Desktop product telemetry. No new analytics SDK or runtime dependency is needed. Requests omit cookies and referrer, reject redirects, time out after fifteen seconds and never retry. At most 16 events queue and 120 attempts occur per lifecycle. Disabling in another tab is rechecked before each send. Counters can undercount and repeated renders/remounts can overcount loads; do not infer total users, installation conversion or retention.

## Supabase storage and reports

The collector is the project-owned Edge Function `dsh-sidebar-events`, with gateway JWT checking enabled. The public anon JWT is a gateway credential, not a user identity or privileged database credential. Only the function uses a server-side service role. The two dedicated `dsh_sidebar_usage_*` tables enable RLS and deny direct `anon` and `authenticated` access. The strict function rejects unknown fields, wrong enums, oversized bodies and malformed event IDs. The event UUID is the deduplication key.

A trigger limits writes to 10,000 attempts per UTC day across the collector. A daily job at 03:17 UTC deletes rows older than 30 days; deletion can occur up to one daily interval after the cutoff. The cap bounds writes, not function invocation traffic. The endpoint is a public product collector, so counts are not fraud-resistant.

Run [the owner-only aggregation query](../supabase/report.sql) in [Supabase SQL Editor](https://supabase.com/dashboard/project/mezthyaerhhohywcxmqi/sql/new). It groups events by UTC day, version, interface language and event. The report contains event counts, not people. Diagnostic and acceptance traffic is present; test counts are not evidence of real adoption. The readback URL returns only whether one unguessable event receipt exists; it cannot list events or read other application data.

[Schema and retention job](../supabase/schema.sql) · [deployed function source](../supabase/functions/dsh-sidebar-events/index.ts) · [fixed-schema handler](../supabase/functions/dsh-sidebar-events/handler.mjs).

## Verification

`npm test` includes consent, revocation, privacy signals, queue limits, wire-schema and collector-failure coverage. `DSH_VERIFY_USAGE=1 npm run verify:browser` drives the actual DSH controls and the deployed Supabase receiver. Every accepted event is read back separately. The remote E2E does not substitute a mocked collector. Search-error injection remains an explicitly controlled regression.

The final English real-model E2E also runs the usage flow. Final commit acceptance still requires the fresh staged-tree gate and five-language media provenance. See [the usage verification recipe](../.agents/skills/verify/references/usage-telemetry.md).
