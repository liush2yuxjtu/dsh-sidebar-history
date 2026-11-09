# Real DSH browser acceptance

Prerequisites: upstream DSH 0.2.2-rc.1 pinned to fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159, frozen dependencies, built Host and Web artifacts, Node >=24.9, and working Chromium. Set `DSH_SOURCE_ROOT` to that checkout and `DSH_CHROMIUM_PATH` to the executable.

From this repository, run `npm run verify:browser`. The runner mounts this package as an enabled bundle in an isolated official DSH profile. It creates temporary persistence and installs no global configuration. The explicit adapter emits controlled UI fixtures; no real model inference is claimed.

Inspect the actual `.runtime/browser/result.json`, persisted event subset, screenshots and browser errors. Expected behavior: native and enhanced screenshots share a viewport; counts and previews are isolated; reload retains correct data; no-TODO and no-assistant states are honest; the real TODO tool publishes its event; uncommitted stream fragments do not replace the preview; switching during generation still updates the unopened card; keyboard navigation, search, mobile drawer and long history work without relevant errors.

Before declaring PASS, inspect desktop and mobile screenshots and ensure card text is readable, the preview is at most two lines, and there is no clipping or overflow. Compare the generated concept and retain intentional differences in the report.

The test closes its own browser and DSH profile. Preserve raw failed evidence before fixing and rerunning. Missing runtime prerequisites produce BLOCKED, not PASS.
