Current final evidence uses [real API video and screenshots](media/live/README.md). The earlier controlled-adapter reports below are historical debugging coverage. They do not satisfy the final gate.

# Verification

**Verdict: PASS.** Verified on 2026-11-10 in ChatGPT Work's Linux computer. The package is `dsh-sidebar-history@0.1.0`. [The canonical Page](https://chatgpt.com/space/page_7a28be26236481918ee65d88725c1d38) holds the real screenshots and original generated concept.

| Surface | Observed result | Evidence |
|---|---|---|
| Event projection | 6 Node tests passed. Counts come from task events; turn reset, full-list replacement, committed-message filtering, interrupted-message exclusion, session isolation and replay bounds passed. | `npm test`, [unit output](evidence/verify.log) |
| Package | Syntax, exported entries, declaration entry, skill aliases and required guide references passed. `npm pack --dry-run` contains 8 distributable files. TypeScript NodeNext resolves `index.d.ts`. | `npm run build`, [package inventory](evidence/package.json) |
| Real DSH browser | All 18 named interaction checks passed in the unchanged executable candidate. No browser console or page errors. | [Raw result and candidate SHA-256 values](evidence/result.json), [runner output](evidence/browser-acceptance.log) |
| Real event path | A controlled adapter called the actual `todo_write` tool through the real agent loop. The persisted `todo/write` and committed assistant message drove the cards. | [Persisted event subset](evidence/native-events.json) |
| Long history | 243 sessions, 7 mounted cards in the measured 763px scroller. Scrolling left the 3 already opened Agents unchanged. Home and End reached the virtual first and last rows. | `result.json`: `longHistoryLayout`, `mountedCards`, `activeAgentsAfterScroll` |
| Visual acceptance | Inspected desktop 1440×1024, mobile 390×844, Chinese light theme, two full title lines, at most two preview lines and escaped HTML-like content. | Real screenshots on the canonical Page |
| Upstream | Official DSH 0.2.2-rc.1, commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Upstream working tree remained clean. | Runtime revision assertion and independent `git status --porcelain` |

## Repeat the check

Use the existing built upstream checkout and its frozen dependencies. The executed command was:

```bash
DSH_SOURCE_ROOT=/workspace/scratch/2e77c18f7a46/dsh-plugins/dsh-src \
DSH_CHROMIUM_PATH=/tmp/chromium npm run verify:browser
npm run verify
npm pack --dry-run --json
git diff --check
```

The runtime was Node 24.22.1 with Chromium 153. The system Chromium 156 could not create its process-singleton socket in the command environment. The available headless executable completed acceptance. Each test owns and closes its browser and isolated official DSH profile.

## Acceptance coverage

The checks cover matching native and enhanced screenshots, the three-task display limit, true completion counts, switching, reload, empty history, the native TODO tool, uncommitted stream exclusion, updates to an unopened card, search, keyboard selection, archive and restore, collapse and reopen, the mobile drawer, 243-session viewport rendering, absence of historical Agent activation, virtual Home and End, Chinese light mode, long content and HTML escaping.

The test data and model adapter are explicitly controlled. This verifies the actual DSH profile, persistence, agent loop, TODO tool, HTTP/WebSocket updates and rendered client. It does not establish the behavior of an external model.

## Concept comparison and corrected defects

| Area | Actual implementation and decision |
|---|---|
| Task and reply cards | Implemented the concept's per-session TODO block and latest Assistant preview. The Page's written specification limits tasks to three; active and pending tasks appear first while the count covers the full list. |
| Native DSH shell | Preserved the real brand, navigation, composer and conversation UI. The generated concept's shell is illustrative. The original workspace browser is available through Native navigation. |
| Cold sessions | Added viewport-only projection reads instead of presenting a missing cache as an empty reply. Loading, read failure and migration-required states are explicit. |
| Long history | Corrected content-sized flex layout so the list is bounded to the sidebar viewport. The regression checks both mounted row count and Agent count. |
| Virtual keyboard focus | Moved focus after React commits the target virtual row. The regression jumps from the last row to the first and back. |
| Long titles and mobile evidence | Prevented title flex shrink and allocated sufficient card height. Mobile acceptance opens the drawer and waits for its full on-screen position before capture. |

Independent comment review found no required removals or suppressions. The main agent inspected the code, raw results and screenshots. No required acceptance item remains open.


## Feature video verification, 2026-11-10

The [26-second feature video](media/demo.mp4) records the actual installed plugin in DSH Web on Mac mini. It shows native navigation, History cards, separate sessions, native TODO updates and the latest committed reply. All displayed task text and adapter responses are controlled English demo data. It makes no external model calls.

The fresh Mac run passed the six unit tests, package checks and all 18 real DSH browser checks. Two test-harness portability fixes preserve the existing assertions. Initial navigation waits for DOM content and then visible cards, instead of waiting for all background requests to stop. The mobile test selects the external drawer opener by its stable attribute because two native controls share the same accessible name.

The accepted third take uses H.264 with limited color range and yuv420p. The first take failed the pixel-format check. The second take exposed a browser reload flash. The final video ends on the saved result. A separate post-capture check verifies reload recovery. Earlier raw recordings remain unchanged on Mac mini.

[Media QA](media/qa.json), [native event evidence](media/evidence/events.json), [runtime markers](media/evidence/markers.jsonl) and the [reproducible script](../examples/0.1.0/record.test.mjs) retain the evidence. The release helper's fixture-only classification remains in the manifest. It does not claim production release, live-model acceptance or anonymous access to this private repository.


## Real API replacement and pre-commit gate

The replacement recording uses official deepseek-flash responses in a fresh DSH profile. It contains no seeded assistant messages or TODO events. The model chose native read and todo_write calls. Actual API response IDs, usage, tool IDs, parameters and text match the durable session log. Two native TODO writes produce 2/3 completed tasks. The real browser preview matches the committed reply. A second real API session remains independent and has no TODO list. Switching and reload preserve both summaries.

The accepted take is 9.3 seconds and retains the exact original MP4 bytes. Actual frame inspection and browser playback pass. The previous live take had an encoder-only duration extension caused by the last concat frame inheriting its long duration. The source capture timeline summed to 9.158 seconds while its MP4 lasted 13.6 seconds. The recorder now bounds encoding to the observed capture interval. The accepted take's 9.3-second MP4 matches its 9.290913-second clock. Both original takes remain unchanged.

The tracked pre-commit hook exports the staged tree and runs unit/build, controlled browser regression, final-media provenance and a fresh real API browser E2E. No old PASS is reused. A changed index, missing credential, bad media hash or failed actual API flow refuses the commit. Candidate unit coverage proves that unstaged code is excluded and an index change is rejected. The project verifier and AGENTS.md require this gate for every final commit.

[Live result](media/live/evidence/result.json) · [API-linked native events](media/live/evidence/native-events.json) · [Media provenance](media/live/provenance.json) · [Verifier recipe](../.agents/skills/verify/references/live-api.md).

The installed Git hook was also exercised with a staged old mock screenshot while the working screenshot remained genuine, and with a missing API credential. Both attempts returned nonzero and refused the commit. The staged tree was restored afterward. [Actual hook rejection results](media/live/evidence/negative-hooks.json).
