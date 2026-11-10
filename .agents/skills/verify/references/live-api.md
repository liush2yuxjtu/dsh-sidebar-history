# Real API and final commit verification

Prerequisites: Node >=24.9, built DSH source pinned to fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159, its matching Chromium, and existing official DeepSeek credentials. Set DSH_SOURCE_ROOT and DEEPSEEK_API_KEY. A private DSH_PROVIDER_ENV_FILE may instead supply DEEPSEEK_API_KEY or an existing Anthropic-compatible official DeepSeek token. Never place credentials in Git or logs.

Use `npm run verify:live` for a new real API browser check. The runner uses DSH_SNAPSHOT=record with the shipped official adapter and forces the official HTTPS origin. It creates a fresh empty DSH session and generated demo order inputs. The model chooses native read and todo_write calls. It does not seed model replies, task events, or replay responses.

Acceptance requires actual HTTP response IDs, usage, matching API/native tool-use IDs and parameters, exact committed text, durable task events, matching sidebar counts and previews, a separate real session without tasks, and reload recovery. Browser errors fail. Do not call a direct API ping product E2E.

The sidebar 0.2 lane also checks Markdown source/message identity and actual strong/code elements, accessible task descriptions, compact geometry, navigation context, search disconnect/retry, mobile layout, app themes, earlier replies, user Stop, and real retry/reload. Complete API calls must reach message_stop and include positive output usage. A deliberately stopped stream is separate cancellation evidence: require a real response ID, native user-aborted turn, explicitly interrupted durable text matching the delivered API prefix, and the retained useful reply. An expected cancellation error is not permission to accept an incomplete ordinary response.

The snapshot and video show the recorded first completed task turn. Later lifecycle screenshots show the stopped and retried turns. Keep their turn identities explicit. The effective 640×400 reflow is equivalent 200% zoom coverage, not an actual desktop zoom test. Accessibility API checks do not claim manual VoiceOver validation.

Use `npm run record:live` inside the existing Mac mini recorder lock after rehearsal. Set a new DSH_LIVE_OUTPUT directory for each run. Retain raw/gt.mp4, actual screenshots, markers, native events and sanitized API receipts. No generation of model text or task states is allowed in the recording harness.

Install the checkout hook with `npm run setup:hooks`. It calls scripts/pre-commit.mjs, exports git write-tree with checkout-index to an isolated directory and runs all checks there. Working-copy edits are not substituted for staged files. A changed index, missing credential, failed media hash or unsuccessful actual API flow refuses the commit. Receipts remain ignored so saving one does not mutate the tree it verifies. Local Git hooks are a workflow gate, not a server permission boundary.

Run `npm run verify:media` after assembling docs/media/live. It verifies official API provenance, staged plugin hashes, the original recording hash, exact video bytes, the actual captured screenshot and README references. Replace the snapshot in an isolated media copy with an older controlled screenshot and require a nonzero exit. Restore the valid media before the final commit. Candidate unit checks also prove staged/working-copy isolation and rejection of an index change.

Keep the older controlled adapter tests available through verify:browser for quick debugging. They never satisfy history-live-api or release-live-media.
