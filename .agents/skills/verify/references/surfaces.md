# Verification surfaces

| Surface | Claim and caller boundary | Recipe |
|---|---|---|
| repository-structure | Package entries, project guides, skill aliases and syntax are consistent. | Run `npm run build` and `git diff --check`. |
| history-event-projection | Only real task events and complete committed assistant messages determine bounded per-session summaries. | Run `npm test`; inspect `src/projection.mjs` and `tests/projection.test.mjs`. |
| history-dsh-browser | Installed plugin displays and updates the correct summaries through the real DSH profile, persistence and browser transport. | [Real DSH browser](browser.md). |

Do not mark the whole feature PASS until all three surfaces pass. Builds and controlled adapters are not evidence of live model behavior.
