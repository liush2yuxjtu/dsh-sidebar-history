# Record the sidebar feature video

This example uses the real DSH Web UI and official profile composition. The session text and adapter responses are controlled English demonstration data. It makes no external model calls. It does not establish production availability or ongoing runtime health.

The recording workflow comes from [record-production-feature](https://github.com/liush2yuxjtu/chatcut-release-skills/blob/3f870219260b09c42df88d3d95a067ca605df842/skills/record-production-feature/SKILL.md). The selected feature is DSH Sidebar History. Read the [story](story/story.md) and [source research](story/research.md) before changing the route.

## Run on Mac mini

Use a built DSH checkout at `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. Its host and browser modules must be built. Use the matching browser for the upstream Playwright version. The successful recording used Playwright 1.61.1 and Chromium revision 1228.

Set `DSH_SOURCE_ROOT` to that checkout. Resolve this package's test dependencies against the upstream installation as in `scripts/browser-test.mjs`. The upstream test scaffold also imports workspace packages from its root. If module resolution fails, restore its workspace dependency links. Do not change upstream tracked files.

From this plugin's root, rehearse through the existing recorder lock.

```bash
chatcut-rec-lock run --owner dsh-sidebar-video --purpose 'DSH Sidebar History rehearsal' --ttl 600 -- env DSH_SOURCE_ROOT="$DSH_SOURCE_ROOT" DSH_DEMO_MODE=rehearse node "$DSH_SOURCE_ROOT/node_modules/vitest/vitest.mjs" run --config examples/0.1.0/vitest.config.mjs
```

Inspect `.runtime/release-demo/rehearsal/evidence/result.json`, discovery geometry and screenshots. All five gates must pass. For a new take, set an unused output directory and record.

```bash
chatcut-rec-lock run --owner dsh-sidebar-video --purpose 'DSH Sidebar History recording' --ttl 600 -- env DSH_SOURCE_ROOT="$DSH_SOURCE_ROOT" DSH_DEMO_MODE=record DSH_DEMO_OUTPUT="$PWD/.runtime/release-demo/take2" node "$DSH_SOURCE_ROOT/node_modules/vitest/vitest.mjs" run --config examples/0.1.0/vitest.config.mjs
```

The script starts Chromium capture after the native UI is ready. It keeps the original screencast frame timestamps and converts them to immutable `raw/gt.mp4`. It captures a standard visible pointer. It adds no explanatory layer or sound. It saves markers, discovered control rectangles, native TODO events, committed assistant messages and browser errors. It checks reload recovery after capture. Each take uses an isolated profile that the script closes.

Use the pinned release helper on the confirmed Mac mini to encode the manifest. This demonstration must use its explicit fixture route because external model responses and production deployment are not verified.

```bash
python3 "$RELEASE_SKILLS_ROOT/skills/record-production-feature/scripts/build_feature_media.py" --manifest "$TAKE/feature.json" --output "$TAKE/edits/v1" --expected-host "$CONFIRMED_MAC_MINI_HOST" --format both --fixture
```

Extract frames and review the take before retaining it. JPEG capture uses an explicit conversion to limited color range before encoding H.264. This avoids full-range yuvj420p flags in the exported MP4. Use the original marker times for chapters. Verify full playback, the three-second result interval, English UI, hashes and GIF duration. The saved [media manifest](../../docs/media/feature.json) records the actual inputs and limits.

## Validation fixes

The Mac run exposed two portable test-harness issues. Initial navigation now waits for DOM content and then the existing visible-card assertions. It no longer waits for all background requests to stop. The mobile drawer test selects the actual external `data-sidebar-opener` button instead of an accessible name shared with the dialog's internal toggle. The existing behavior assertions remain intact.

Playwright [documents the navigation wait options](https://playwright.dev/docs/api/class-page#page-goto-option-wait-until) and discourages using network idle to establish test readiness.
