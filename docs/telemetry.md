# Measure discovery and plan usage telemetry

The maintainer collector reads aggregate repository data from the real GitHub API. The plugin has no analytics SDK, tracking pixel, remote collector, or usage upload. It sends no conversation text, TODO text, search terms, or session identifiers to the maintainer.

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

## Proposed usage events, not implemented

If repository traffic shows demand, the next useful addition is an optional local diagnostic counter. That addition needs a visible control, a readable export, and real DSH browser verification. Remote transmission remains a separate feature.

| Proposed event | Exact meaning | Product question |
| --- | --- | --- |
| `plugin_loaded` | One plugin lifecycle starts after collection is enabled | Does the installed plugin load? This is not a count of installations or people. |
| `card_open_requested` | A user requests a session from a history card | Do people use history cards? The request does not prove the session opened. |
| `native_navigation_selected` | A user selects native navigation | Do users fall back to the original navigation? |
| `history_cards_selected` | A user returns to history cards | Do users return after using native navigation? |
| `search_some` | An uncancelled server search completes with results | Does the server search return results? This excludes local title matches. |
| `search_zero` | An uncancelled server search completes without results | Does the server search miss content? |
| `search_error` | An uncancelled server search returns an error | Is search reliable? Do not record the query or raw error. |
| `projection_ready` | The refreshed session has a usable history projection | Do cold history cards load? |
| `projection_error` | The refreshed projection state is an error | How often does loading fail? A resolved refresh Promise alone does not mean success. |
| `projection_migration_required` | DSH reports that history needs migration | Are old sessions preventing useful previews? |
| `projection_missing` | Refresh finishes without a usable history projection | Are summaries still missing after a read? |

The proposed payload has a schema version, plugin version, and counters keyed by a fixed event enumeration. It has no free-text properties, exact interaction times, user IDs, persistent installation IDs, session IDs, URLs, task text, reply text, or search terms. Rendering, scrolling, cancelled searches, and stale responses do not increase counters.

Collection would be off by default. Turning it off would clear the consent marker and counters. Storage errors would never interrupt the sidebar. Exports would reconstruct the field allowlist rather than copy arbitrary stored JSON. Cumulative exports must not be added together. Without a stable identifier, these counters cannot establish unique users, retention, or an install-to-activation funnel. Multiple browser tabs can also make simple local counters approximate.

## Why this implementation

Two approaches were considered. An owner-side GitHub collector answers the current discovery questions with an existing authorized API and no runtime change. Local usage counters answer interaction questions but need a new control, persistence, consent handling, updated real-API recordings, and browser acceptance. A hosted collector adds a network boundary and storage operations. The current collector keeps these requirements separate and reports its limits.

## Sources

- [GitHub repository traffic API](https://docs.github.com/en/rest/metrics/traffic).
- [GitHub release asset API](https://docs.github.com/en/rest/releases/assets).
- [Discovery and multilingual documentation](discovery.md).
