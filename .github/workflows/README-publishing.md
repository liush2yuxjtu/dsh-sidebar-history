# Publishing prerequisites

This workflow runs only for GitHub Releases (non-prerelease) and manual runs against tags. It does NOT automatically publish every push.

Prior to creating a Release, run the existing staged pre-commit `/verify` gate with the official live DeepSeek API and all supported locales. Do not bypass the gate. Tag the exact verified commit `v<package.version>`, then create the Release. GitHub Actions checks tag/version and tarball entries before OIDC `npm publish`.

For `dsh-sidebar-history` npm Trusted Publishing, configure GitHub Actions: owner `liush2yuxjtu`, repository `dsh-sidebar-history`, workflow filename `publish.yml`, environment blank, allow direct `npm publish`. Do not enable direct publishing before the workflow is committed and confirmed against a test tag or existing release. npm will require the first successful OIDC publication within 2 days of configuration.

No `NPM_TOKEN` or API credential is required in this publishing workflow. It deliberately does not claim to run fresh model E2E in CI, which is a separate release prerequisite.
