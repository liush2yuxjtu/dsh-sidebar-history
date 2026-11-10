# Sidebar search, navigation, Markdown, and turn context

Use the built DSH checkout pinned in README.md. Install the locked package dependencies with `npm ci --ignore-scripts --legacy-peer-deps`.

## Fast regressions

Run `DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness npm run verify` for the projection, Markdown presentation, staged-candidate, and native cache-migration checks. The migration check creates a genuine version-1 checkpoint through DSH JSONL and cache services, reopens it under version 2, and verifies durable refold without retaining a Session or installing an Agent. Its historical events are controlled integration inputs.

Run `DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness npm run verify:browser` for the installed plugin's controlled browser regressions. Inspect `.runtime/browser/result.json` and its screenshots. Require explicit search failure beside retained local matches, working retry, accessible card descriptions, individual task status, navigation query and scroll recovery, Earlier reply, compact card geometry, readonly strong/code nodes, no remote image requests, mobile layout, and equivalent zoom reflow.

These commands have run successfully. Their model data is controlled and does not satisfy real-model E2E or release-media acceptance.

## Markdown source and build

Edit `src/client.mjs` and `src/markdown-preview.mjs`. Run `npm run build:client`, then `npm run build`. The second command rejects a stale browser bundle or stale bundled license notices. The generated bundle must contain no `innerHTML` and must continue to render session text through React escaping.

Visual previews preserve strong, emphasis, strikethrough, and code elements. Link labels and image alt text are plain preview content. Do not emit anchors, images, nested controls, raw HTML, or network requests from a history card.

## Real API acceptance

Follow [live-api.md](live-api.md). Capture fresh genuine API responses after runtime changes, and check message IDs, original Markdown source, rendered formatting, native task writes, independent sessions, and reload. Use the real API lane for final screenshots and recording. Review its current receipt before claiming additional interruption, theme, or narrow-screen coverage.

Accessibility API assertions do not establish a complete VoiceOver audit. Effective viewport reflow must be labelled as equivalent zoom coverage unless actual browser zoom was exercised.

## Cleanup

The checks dispose their isolated profile and temporary persistence. Receipts and debugging output remain in ignored `.runtime`. Keep credentials and authentication URLs outside version control.
