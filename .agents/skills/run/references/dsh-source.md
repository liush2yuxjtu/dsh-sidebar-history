# DSH source runtime

Use an existing DSH 0.2.2-rc.1 checkout at fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159. Follow its own frozen-install and full-build instructions. Do not edit upstream to load this plugin.

From this plugin checkout, run `DSH_SOURCE_ROOT=/absolute/path/to/built/dsh DSH_CHROMIUM_PATH=/absolute/path/to/chromium npm run verify:browser`. Omit the Chromium override only when upstream Playwright already has a usable installed browser.

The runner starts the official Web profile composition with this package enabled, isolated persistence and a temporary authenticated connection. Its Playwright process runs beside the Host so loopback remains reachable. The controlled adapter tests UI updates through the real loop and TODO tool; it is not a live model. Read `.runtime/browser/result.json` and inspect its screenshots. The runner closes its browser and profile.

To install for normal use, run `npm pack` here and use the supported DSH plugin manager in the desired Web profile. Read `dsh plugin add --help` before using the CLI because its API is pre-stable. Keep authenticated startup URLs and profile credentials private.
