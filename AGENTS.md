# Project instructions

Build this external DSH plugin without changing upstream source. Work on main and push verified commits directly. Preserve concurrent changes. Do not open a pull request or issue for routine project work.

Run `.agents/skills/verify/SKILL.md` before every commit. Install the tracked hook with `npm run setup:hooks`. Every final commit, including documentation and media changes, MUST run a fresh real API browser E2E from the exported staged index. The hook runs unit/build checks, controlled browser regression, final-media provenance checks and actual DSH + official DeepSeek E2E. Missing credentials, network failure or failed assertions refuse the commit. Keep receipts in ignored `.runtime/precommit/` and never reuse an old PASS.

Mock adapters and replay fixtures are allowed only for fast debugging and controlled regression coverage. Final release video and screenshots MUST come from a genuine API-driven DSH session. Never seed assistant messages or TODO events for final acceptance. Correlate actual API response IDs, usage and tool-use IDs with native tools, durable session events and visible cards. Verify the published media hashes and README references. Retain prior controlled media only as explicitly labeled debugging history.

Keep runtime data, authentication URLs and credentials out of Git. The package consumes official session projections and slots. Do not activate each historical session to build a card. Keep all rendered session text escaped. Save executable checks with the code so another agent can repeat verification.
