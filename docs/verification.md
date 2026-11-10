# Verification

## 0.2.3 Supabase usage telemetry

Feature and media acceptance: **PASS**. Collection is off by default, with five-language consent controls, browser privacy preferences and revocation. The exact six-field payload has no chat, TODO, search text, session IDs or stable installation IDs.

49 tests and two browser cases passed. Actual DSH operations reached the deployed Supabase function; every accepted event was read back with a separate database query. Owner SQL independently matched all eight receipts from the controlled UI lane, each stored once. The English genuine-model lane repeated the usage flow. Five fresh captures have 31 complete official API responses and five native stops; 100 pixel samples passed with zero OCR exceptions and all MP4s played to the end.

[Actual usage requests and readbacks](evidence/usage-browser-e2e.json) · [real-model usage flow](evidence/usage-live-e2e.json) · [fields and owner reports](telemetry.md) · [verification recipe](../.agents/skills/verify/references/usage-telemetry.md).

Supabase function version 2 keeps gateway JWT validation enabled. Dedicated tables deny direct anonymous access. The daily write cap was tested with transaction rollback. Daily 30-day retention is configured; the first scheduled deletion has not been observed. Counts include acceptance activity and do not measure unique users or retention. The normal user profile has not been opted in. The final staged-tree gate and its new five-language API runs are recorded separately in the release receipt.

## Current 0.2.2 real API release captures (2026-11-10)

**Media validation PASS.** A fresh set of five official API-driven DSH sessions was recorded against `package.json` version `0.2.2`. Each locale (en, zh-CN, zh-TW, ja, es) returned seven actual API responses. Each provides an exact original H.264 MP4, a source-bound eight-second GIF, original screenshots, tool receipts, native session state, and SHA-256 provenance. The validator accepted 100 actual pixel samples and zero manual OCR exceptions. These captures replace the previous published media; the earlier 0.2.1 results below remain historical.

The final commit-time `/verify` gate must separately repeat staged-tree tests, media and API browser E2E before a release is created. Publishing via npm Trusted Publishing remains unverified until the GitHub Actions run completes and anonymous registry installation passes.

## Historical integrated 0.2.1 real API media

**Historical media verdict: PASS for 0.2.1.** The integrated sidebar preserves the search, navigation, task lifecycle, accessibility and safe Markdown fixes. Each of the five README languages now uses its own original API-driven screenshots, GIF and video.

The final captures contain **34 complete official DeepSeek API responses and 5 genuinely stopped streams**. Model replies and native TODO events are not seeded. Each full MP4 is byte-identical to its raw recording; each GIF is a continuous eight-second excerpt.

| Language | Result | Actual API evidence | Full video | Pixel samples | Files |
|---|---|---:|---:|---:|---|
| en | PASS | 7 + 1 stopped stream | 13.8s | 20 | [Media](media/live/README.md) |
| zh-CN | PASS | 6 + 1 stopped stream | 10.4s | 20 | [Media](media/localized/zh-CN/README.md) |
| zh-TW | PASS | 8 + 1 stopped stream | 27.5s | 20 | [Media](media/localized/zh-TW/README.md) |
| ja | PASS | 7 + 1 stopped stream | 10.2s | 20 | [Media](media/localized/ja/README.md) |
| es | PASS | 6 + 1 stopped stream | 9.6s | 20 | [Media](media/localized/es/README.md) |

The Mac gate accepted **100 actual pixel samples** using OCR, strict language classification and image review: all 15 original screenshots per language, snapshot, poster, two MP4 proof frames and one GIF frame. It checks every nonempty actual API text, including intermediate explanations and the stopped stream. The published evidence PNG inventory must exactly match the screenshot receipt. One clipped earlier user-prompt line in Spanish had Vision confidence 0.3 and was misread as Portuguese. Its actual image and the same complete Spanish sentence in an independent frame were reviewed; the review binds the original image hash, precise box, damaged OCR and complete reference image hash. The language thresholds and hard English/Traditional-Chinese negative checks remain unchanged. Independent visual inspection passed all 15 final screenshots, contact sheets and interaction strips. All five MP4 files played to the end in real Chromium without errors. Final MP4 results remain visible for 5.20–5.33 seconds; GIF results for 4.33–4.42 seconds.

The original Spanish English intermediates and Traditional Chinese mixed characters were rejected and replaced through actual locale registration, prompts and fresh API sessions. During the integrated rerun, a Japanese Markdown reply exposed a real mixed-font line-box issue: 37px instead of 36px. A single inline-code line-height fix preserves the original 12px type, 183px cards, body line height and <=36.1px acceptance threshold. The exact failing reply and a CJK inline-code case now run in the standard browser regression.

English and Traditional Chinese GIFs focus on generating to saved Markdown reply while showing existing 2/3 progress. Their full task operations remain in the original MP4. No source capture is accelerated or painted over. A provider HTTP 500 take failed and remains preserved outside the accepted media.

The bounded Traditional Chinese host pack uses 17 official namespaces and 1829 keys. Other host namespaces may fall back to Simplified Chinese. All 18 upstream source/dependency hashes were independently matched. [Source provenance](../src/zh-tw-host-provenance.json) retains the original MIT license.

[Full language, OCR and playback report](media/localization-verification.json) · [Locale registry](media/locales.json) · [Project verifier](../.agents/skills/verify/SKILL.md) · [Repeat localized acceptance](../.agents/skills/verify/references/localized-media.md).

### Repeat current acceptance

Use the built pinned DSH checkout, existing authorized official API credential, Swift Vision/NaturalLanguage, FFmpeg and the shared Mac recorder lock.

```bash
export DSH_SOURCE_ROOT=/path/to/built/deepseek-harness
npm run verify
npm run verify:browser
npm run verify:media
npm run verify:site -- http://127.0.0.1:8768/
npm run setup:hooks
```

The final commit hook exports the exact staged tree and repeats unit/build, both controlled browser cases, genuine media provenance, all localized pixel checks, and a fresh actual API flow in every language. Any failure refuses the commit. Its ignored receipt is attached to the release so writing evidence cannot change the tree being verified. After deployment, `npm run verify:published` downloads every media artifact and all five README files anonymously and compares exact hashes.

## Historical published 0.2.0 verification

**Historical verdict: PASS at `e052161b2ecc12f10139bee6b0b86de7965f2386`.** [Original 0.2.0 report](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/docs/verification.md). These results apply to that revision, not the integrated 0.2.1 candidate.

The selected sidebar fixes and read-only Markdown rendering pass the checks below on pinned DSH `0.2.2-rc.1`. The implementation uses official slots and projections without upstream changes.

| Evidence | Result | Scope |
|---|---|---|
| Unit, Markdown, staged-candidate, native cache-migration, and preserved telemetry tests | 20 PASS | Includes actual JSONL/cache v1-to-v2 refold with no retained historical Session or Agent. |
| Controlled DSH browser regression | 33 checks PASS, no console errors | Fast debugging coverage with controlled model data, including 243 histories. |
| Fresh official API recording | PASS, run `7547cd08-5da0-4472-9e55-9404cf68af6a` | Six complete API responses and one genuinely interrupted API stream. Replies and task events are not seeded. |
| Snapshot and original video | PASS | Exact captured snapshot and raw MP4, with hashes tied to the recording receipt. |
| Video playback | PASS | H.264, 1280×800, 9.867 seconds, 296 decoded frames, played to the end without an error. |

[Actual API receipts](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/docs/media/live/evidence/result.json), [native events](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/docs/media/live/evidence/native-events.json), [media provenance](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/docs/media/live/provenance.json), [visual and playback QA](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/docs/media/live/qa.json), and [executable recipes](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/e052161b2ecc12f10139bee6b0b86de7965f2386/.agents/skills/verify/references/sidebar-ux.md) contain the evidence.

Search failure remains visible beside local matches, retry reaches the real service, content-result limits are explicit, and remote-only results survive a navigation round trip. Deep scrolling also survives collapse and reopen. Card descriptions expose tasks and useful replies. Three-task cards measure 183px with a 12px, two-line preview. Bold and inline code render as elements without nested links, buttons, images, or raw HTML.

New turns clear TODO state under the native lifecycle and identify retained text as Earlier reply. Empty tool-call messages and interrupted prefixes do not replace useful text. The actual API lane verifies user Stop, the durable interrupted message, retained reply identity, a subsequent actual retry, and reload.

The recording's other genuine-data checks cover the 390×844 drawer, equivalent 200% effective-viewport reflow, and app light/dark themes independently of the OS palette. Accessibility API checks do not claim a manual VoiceOver audit. Equivalent reflow does not claim actual desktop browser zoom.

The installed pre-commit hook independently exports and verifies the exact staged tree on every final commit. Its fresh ignored receipt records the candidate tree, check names, and real API run. The recording receipt is not a substitute for that commit-time run.

Task-count contrast also passes against the actual selected card background in the API run: 5.89:1 in the light app theme and 8.09:1 in the dark app theme, with the OS palette set to the opposite. The controlled regression separately measures 6.56:1 and 8.90:1 on unselected cards. These checks do not establish complete accessibility compliance.

## Reproduced debugging failures

Before fixes, eight selected checks failed, including hidden partial-search errors, missing accessible descriptions, lost navigation state, card density, singular copy, and Markdown formatting. Two further failures were reproduced and fixed with the same caller:

- Remote-only search lost scrollTop from 1939 to 0 and rendered no visible row after a navigation round trip. The final repeat preserves scrollTop 1981 and the same first visible session, including the result-limit notice.
- Deep history lost scrollTop from 31495 to 0 after collapse and reopen. The final repeat preserves scrollTop 31495 and the same first visible session.

These RED/GREEN records use controlled historical/model data solely for debugging. They do not replace the actual API receipt above.


## Historical local 0.1.1 candidate — not published

**Historical local verdict: PASS.** This source and its recordings are preserved in local Git commit `828331d09b50c48ca2ce470e8e893a8eeaa9408e`; they were not published. They do not verify the combined 0.2.1 source. Read the old evidence with `git show 828331d:docs/media/locales.json` and the paths below; canonical media paths are scheduled for replacement.

The historical local `0.1.1` candidate has separate real API media for English, Simplified Chinese, Traditional Chinese, Japanese, and Spanish. The actual screen, native TODO text, intermediate model explanations, final answer, and sidebar preview match the document language.

The five captures contain **26 actual official DeepSeek API responses**. All use unscripted model-selected native tools and fresh sessions, with no seeded assistant messages or TODO events. The MP4 files preserve the original recording bytes. Each GIF is a continuous eight-second extract.

| Language | Media result | API responses | Full video | Pixel samples | Evidence |
|---|---|---:|---:|---:|---|
| en | PASS | 5 | 11.3s | 8 | Media (`media/live/README.md` at local commit `828331d`) |
| zh-CN | PASS | 5 | 11.2s | 8 | Media (`media/localized/zh-CN/README.md` at local commit `828331d`) |
| zh-TW | PASS | 5 | 11.8s | 8 | Media (`media/localized/zh-TW/README.md` at local commit `828331d`) |
| ja | PASS | 6 | 12.3s | 8 | Media (`media/localized/ja/README.md` at local commit `828331d`) |
| es | PASS | 5 | 11.2s | 8 | Media (`media/localized/es/README.md` at local commit `828331d`) |

The Mac mini gate passed **40 actual pixel samples**: each language's preflight/progress/reload screenshots, snapshot, poster, two MP4 proof frames, and one GIF frame. All original screenshot hashes match the live receipts. Separate visual inspection passed 15 screenshots, contact sheets, and interaction strips. Decoded MP4 final holds are 5.20–5.37 seconds; GIF final holds are 4.33–4.50 seconds.

The previous Spanish recording contained English intermediate explanations, and the previous Traditional Chinese recording contained `轨迹` and `并`. Those takes failed and remain preserved as debugging evidence. The actual host locale registration and recording prompts were corrected, then fresh API-driven sessions were recorded. No painted translations, DOM replacements, subtitles, or generated screenshots were used.

The historical negative checks rejected renamed/rehashed English pixels, English intermediate prose in Spanish, and Simplified Chinese in Traditional Chinese. Technical field names in a Chinese formula initially caused a classifier false positive; classification now evaluates the prose after excluding code fields while retaining both the original text and classification text.

Traditional Chinese uses the official external locale registration API, with a source-attributed language pack for 14 native namespaces and 1645 keys. Other host namespaces may fall back to Simplified Chinese. The source provenance at local commit `828331d` (`src/zh-tw-host-provenance.json`) retains the upstream files, hashes and license for that historical pack.

Full language and OCR report (`media/localization-verification.json` at local commit `828331d`) · Language-to-media registry (`media/locales.json` at local commit `828331d`) · [Project verifier](../.agents/skills/verify/SKILL.md) · [Language verification recipe](../.agents/skills/verify/references/localized-media.md).

The English and Chinese homepages and watch pages passed real desktop/mobile browser checks, media decode, language-preserving navigation, and corresponding social/video metadata. The Chinese website now uses the Chinese capture throughout.


## Historical 0.1.0 verification

**Historical verdict: PASS.** Verified on 2026-11-10 in ChatGPT Work's Linux computer. The package is `dsh-sidebar-history@0.1.0`. [The canonical Page](https://chatgpt.com/space/page_7a28be26236481918ee65d88725c1d38) holds the real screenshots and original generated concept.

| Surface | Observed result | Evidence |
|---|---|---|
| Event projection | 6 Node tests passed. Counts come from task events; turn reset, full-list replacement, committed-message filtering, interrupted-message exclusion, session isolation and replay bounds passed. | `npm test`, [unit output](evidence/verify.log) |
| Package | Syntax, exported entries, declaration entry, skill aliases and required guide references passed. `npm pack --dry-run` contains 8 distributable files. TypeScript NodeNext resolves `index.d.ts`. | `npm run build`, [package inventory](evidence/package.json) |
| Real DSH browser | All 18 named interaction checks passed in the unchanged executable candidate. No browser console or page errors. | [Raw result and candidate SHA-256 values](evidence/result.json), [runner output](evidence/browser-acceptance.log) |
| Real event path | A controlled adapter called the actual `todo_write` tool through the real agent loop. The persisted `todo/write` and committed assistant message drove the cards. | [Persisted event subset](evidence/native-events.json) |
| Long history | 243 sessions, 7 mounted cards in the measured 763px scroller. Scrolling left the 3 already opened Agents unchanged. Home and End reached the virtual first and last rows. | `result.json`: `longHistoryLayout`, `mountedCards`, `activeAgentsAfterScroll` |
| Visual acceptance | Inspected desktop 1440×1024, mobile 390×844, Chinese light theme, two full title lines, at most two preview lines and escaped HTML-like content. | Real screenshots on the canonical Page |
| Upstream | Official DSH 0.2.2-rc.1, commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Upstream working tree remained clean. | Runtime revision assertion and independent `git status --porcelain` |

### Repeat the check

Use the existing built upstream checkout and its frozen dependencies. The executed command was:

```bash
DSH_SOURCE_ROOT=/workspace/scratch/2e77c18f7a46/dsh-plugins/dsh-src \
DSH_CHROMIUM_PATH=/tmp/chromium npm run verify:browser
npm run verify
npm pack --dry-run --json
git diff --check
```

The runtime was Node 24.22.1 with Chromium 153. The system Chromium 156 could not create its process-singleton socket in the command environment. The available headless executable completed acceptance. Each test owns and closes its browser and isolated official DSH profile.

### Acceptance coverage

The checks cover matching native and enhanced screenshots, the three-task display limit, true completion counts, switching, reload, empty history, the native TODO tool, uncommitted stream exclusion, updates to an unopened card, search, keyboard selection, archive and restore, collapse and reopen, the mobile drawer, 243-session viewport rendering, absence of historical Agent activation, virtual Home and End, Chinese light mode, long content and HTML escaping.

The test data and model adapter are explicitly controlled. This verifies the actual DSH profile, persistence, agent loop, TODO tool, HTTP/WebSocket updates and rendered client. It does not establish the behavior of an external model.

### Concept comparison and corrected defects

| Area | Actual implementation and decision |
|---|---|
| Task and reply cards | Implemented the concept's per-session TODO block and latest Assistant preview. The Page's written specification limits tasks to three; active and pending tasks appear first while the count covers the full list. |
| Native DSH shell | Preserved the real brand, navigation, composer and conversation UI. The generated concept's shell is illustrative. The original workspace browser is available through Native navigation. |
| Cold sessions | Added viewport-only projection reads instead of presenting a missing cache as an empty reply. Loading, read failure and migration-required states are explicit. |
| Long history | Corrected content-sized flex layout so the list is bounded to the sidebar viewport. The regression checks both mounted row count and Agent count. |
| Virtual keyboard focus | Moved focus after React commits the target virtual row. The regression jumps from the last row to the first and back. |
| Long titles and mobile evidence | Prevented title flex shrink and allocated sufficient card height. Mobile acceptance opens the drawer and waits for its full on-screen position before capture. |

Independent comment review found no required removals or suppressions. The main agent inspected the code, raw results and screenshots. No required acceptance item remains open.


### Feature video verification, 2026-11-10

The [26-second feature video](media/demo.mp4) records the actual installed plugin in DSH Web on Mac mini. It shows native navigation, History cards, separate sessions, native TODO updates and the latest committed reply. All displayed task text and adapter responses are controlled English demo data. It makes no external model calls.

The fresh Mac run passed the six unit tests, package checks and all 18 real DSH browser checks. Two test-harness portability fixes preserve the existing assertions. Initial navigation waits for DOM content and then visible cards, instead of waiting for all background requests to stop. The mobile test selects the external drawer opener by its stable attribute because two native controls share the same accessible name.

The accepted third take uses H.264 with limited color range and yuv420p. The first take failed the pixel-format check. The second take exposed a browser reload flash. The final video ends on the saved result. A separate post-capture check verifies reload recovery. Earlier raw recordings remain unchanged on Mac mini.

[Media QA](media/qa.json), [native event evidence](media/evidence/events.json), [runtime markers](media/evidence/markers.jsonl) and the [reproducible script](../examples/0.1.0/record.test.mjs) retain the evidence. The release helper's fixture-only classification remains in the manifest. It does not claim production release, live-model acceptance or anonymous access to this private repository.


### Real API replacement and pre-commit gate

The replacement recording uses official deepseek-flash responses in a fresh DSH profile. It contains no seeded assistant messages or TODO events. The model chose native read and todo_write calls. Actual API response IDs, usage, tool IDs, parameters and text match the durable session log. Two native TODO writes produce 2/3 completed tasks. The real browser preview matches the committed reply. A second real API session remains independent and has no TODO list. Switching and reload preserve both summaries.

The accepted take is 9.3 seconds and retains the exact original MP4 bytes. Actual frame inspection and browser playback pass. The previous live take had an encoder-only duration extension caused by the last concat frame inheriting its long duration. The source capture timeline summed to 9.158 seconds while its MP4 lasted 13.6 seconds. The recorder now bounds encoding to the observed capture interval. The accepted take's 9.3-second MP4 matches its 9.290913-second clock. Both original takes remain unchanged.

The tracked pre-commit hook exports the staged tree and runs unit/build, controlled browser regression, final-media provenance and a fresh real API browser E2E. No old PASS is reused. A changed index, missing credential, bad media hash or failed actual API flow refuses the commit. Candidate unit coverage proves that unstaged code is excluded and an index change is rejected. The project verifier and AGENTS.md require this gate for every final commit.

[Live result](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/f31ce2d3b746992d4044391c5d3effce067eff0f/docs/media/live/evidence/result.json) · [API-linked native events](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/f31ce2d3b746992d4044391c5d3effce067eff0f/docs/media/live/evidence/native-events.json) · [Media provenance](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/f31ce2d3b746992d4044391c5d3effce067eff0f/docs/media/live/provenance.json) · [Verifier recipe](../.agents/skills/verify/references/live-api.md).

The installed Git hook was also exercised with a staged old mock screenshot while the working screenshot remained genuine, and with a missing API credential. Both attempts returned nonzero and refused the commit. The staged tree was restored afterward. [Actual hook rejection results](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/f31ce2d3b746992d4044391c5d3effce067eff0f/docs/media/live/evidence/negative-hooks.json).

A separate later hook-rejection receipt is retained at [the published 4085839 evidence](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/4085839794d55a280529954c0ae623a26070437d/docs/media/live/evidence/negative-hooks.json). Both immutable historical receipts remain distinct.
