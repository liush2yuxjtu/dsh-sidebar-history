# Discovery documentation and GitHub telemetry

## Documentation

From a complete repository checkout, run `npm run verify:docs` and `npm pack --dry-run --json`. The documentation check covers five README languages, reciprocal language links, local targets, live API media references, compatibility versions, and package keywords. Inspect the package file list for all translations and the telemetry guide. Run `npm run verify:media` to retain the existing real-model media provenance.

The plugin UI still supports English and Simplified Chinese. Five README translations must not be described as five UI languages. README keywords do not establish search-engine indexing or rank.

## Real GitHub collection

Use Node >=24.9, the GitHub CLI, and an existing authorized login with repository traffic access. Fine-grained tokens require Administration read permission. Keep credentials outside the repository.

Run `npm run telemetry:collect`. Read `.runtime/telemetry/latest.json` and `report.md`. Expected results are the real source statuses, GitHub's rolling 14-day views and clones, top referrers and paths, current Stars and forks, and published Release asset download counts. The collector reads all release and asset pages. It does not collect plugin session content or transmit usage events.

Unknown values must be `null` with a `BLOCKED` source status. An incomplete run exits 2 and preserves the successful sources. A repository with no published assets can report zero asset downloads. Never replace a denied API response with zero or claim that clone operations are installations.

Run `node --test tests/telemetry.test.mjs` to check pagination, missing permissions, malformed responses, field filtering, and CLI boundaries. These fixtures verify deterministic collector behavior. Only the authenticated collection establishes real GitHub integration.

Keep snapshots in ignored `.runtime/telemetry`. Do not add unique counts across days or add overlapping snapshots. No recurring collector is installed. Cleanup can remove this collector's output directory after preserving any required report. The required staged-tree pre-commit gate still runs for the final commit.
