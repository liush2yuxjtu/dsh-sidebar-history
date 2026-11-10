# Verification surfaces

| Surface | Claim and caller boundary | Recipe |
|---|---|---|
| repository-structure | Package entries, generated bundle, project guides, skill aliases, and syntax are consistent. | Run `npm run build` and `git diff --check`. |
| history-event-projection | Real task events and complete text-bearing Assistant messages determine bounded per-session summaries. | Run `npm test`; inspect `src/projection.mjs` and `tests/projection.test.mjs`. |
| history-dsh-browser | Installed plugin displays and updates the correct summaries through the real DSH profile, persistence, and browser transport. | [Real DSH browser](browser.md). |
| history-search-navigation | Failed remote search stays explicit beside local matches, retry recovers, and native navigation preserves search, scroll, and focus. | [Sidebar UX](sidebar-ux.md). |
| history-accessible-layout | Card descriptions expose tasks and replies; compact cards preserve bounded content across narrow and equivalent zoom layouts. | [Sidebar UX](sidebar-ux.md). |
| history-safe-markdown | Markdown formatting renders in read-only previews without HTML execution, nested controls, images, or URL loading. | [Sidebar UX](sidebar-ux.md). |
| history-turn-context | Earlier useful replies remain identifiable across native task resets, tool-only messages, and interruption states. | [Sidebar UX](sidebar-ux.md). |
| history-cold-upgrade | Native v1 checkpoints refold into v2 summaries without changing logs, retaining Sessions, or creating Agents. | [Sidebar UX](sidebar-ux.md). |
| history-live-api | Actual official API responses drive native tools, durable summaries, independent sessions, and reload recovery. | [Real API E2E](live-api.md). |
| release-live-media | Final video and screenshots match the genuine API recording, and README references the verified files. | Run `npm run verify:media`. |
| release-story-provenance | Every story points to its own language's original real API video; the withdrawn fixture is rejected and narrative review stays separate. | Run `node scripts/check-story-media.mjs`; inspect `docs/media/story-acceptance.json` and the independent cold-viewer evidence. |
| staged-pre-commit | A fresh full E2E runs from the exact staged tree before each final commit. | [Tracked hook](live-api.md). |
| multilingual-discovery | Five README translations have valid language links, real API media references, compatible installation instructions, and package keywords. | [Discovery documentation](discovery-telemetry.md). |
| maintainer-github-telemetry | An existing authorized GitHub login retrieves aggregate metrics without collecting plugin conversation content or reporting API errors as zero. | [Real GitHub collection](discovery-telemetry.md). |
| public-discovery | Anonymous readers can reach the bilingual public website, install instructions, real API media and search metadata. | [Public website verification](surfaces/public-discovery.md). |
| localized-release-media | Each published language uses its own real API screenshot, GIF and MP4, and actual pixels contain the expected language. | [Localized media verification](localized-media.md). |
| opt-in-remote-usage | Real DSH controls send only fixed metadata after consent; Supabase independently persists each receipt, and revocation prevents later uploads. | [Usage telemetry](usage-telemetry.md). |

Do not mark the whole feature PASS until every applicable surface passes. Builds and controlled adapters are not evidence of live model behavior.
