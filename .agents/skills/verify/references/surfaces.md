# Verification surfaces

| Surface | Claim and caller boundary | Recipe |
|---|---|---|
| repository-structure | Package entries, project guides, skill aliases and syntax are consistent. | Run `npm run build` and `git diff --check`. |
| history-event-projection | Only real task events and complete committed assistant messages determine bounded per-session summaries. | Run `npm test`; inspect `src/projection.mjs` and `tests/projection.test.mjs`. |
| history-dsh-browser | Installed plugin displays and updates the correct summaries through the real DSH profile, persistence and browser transport. | [Real DSH browser](browser.md). |
| history-live-api | Actual official API responses drive native tools, durable summaries, independent sessions and reload recovery. | [Real API E2E](live-api.md). |
| release-live-media | Final video and screenshots match the genuine API recording, and README references the verified files. | Run `npm run verify:media`. |
| staged-pre-commit | A fresh full E2E runs from the exact staged tree before each final commit. | [Tracked hook](live-api.md). |
| multilingual-discovery | Five README translations have valid language links, real API media references, compatible installation instructions, and package keywords. | [Discovery documentation](discovery-telemetry.md). |
| maintainer-github-telemetry | An existing authorized GitHub login retrieves aggregate metrics without collecting plugin conversation content or reporting API errors as zero. | [Real GitHub collection](discovery-telemetry.md). |

Do not mark the whole feature PASS until every applicable surface passes. Builds and controlled adapters are not evidence of live model behavior.
