# Find DSH Sidebar History

DSH Sidebar History is a community DeepSeek Harness sidebar plugin. It adds TODO progress and the latest committed assistant reply to chat-history cards. It is not an official DeepSeek product.

## Repository metadata

Use both `dsh-plugin` and `dsh-plugins` as GitHub topics. The upstream DSH README explicitly recommends `dsh-plugin` for community discovery. The plural topic preserves the ecosystem name requested for this repository.

Related topics describe actual behavior: `deepseek-harness`, `deepseek`, `sidebar`, `chat-history`, `todo`, `task-management`, `ai-agent`, `developer-tools`, and `web-ui`. The package keywords use the same vocabulary. Keywords in a package manifest do not mean the package is published to npm.

The repository description names DeepSeek Harness, the sidebar, TODO progress, assistant reply previews, and session search. A public repository is required for unauthenticated discovery. Search indexing can lag behind a visibility or documentation change. No metadata change guarantees a ranking.

## Language-specific documents

Each language has its own file with links to the other versions. These are documentation translations. The current plugin UI supports English and Simplified Chinese through DSH's locale service.

| Language | README |
| --- | --- |
| English | [README.md](../README.md) |
| 简体中文 | [README.zh-CN.md](i18n/README.zh-CN.md) |
| 繁體中文 | [README.zh-TW.md](i18n/README.zh-TW.md) |
| 日本語 | [README.ja.md](i18n/README.ja.md) |
| Español | [README.es.md](i18n/README.es.md) |

The root README puts the product name and use case first, then real API media, supported behavior, installation, compatibility, and verification. Each translation keeps the same factual limits and points to the same verified assets. Generated concepts and controlled adapters do not become live-model evidence through translation.

GitHub controls the rendered page's HTML head. A Markdown README cannot set reliable page-level canonical URLs, `hreflang`, or structured-data scripts. Do not add hidden keyword blocks or unsupported SEO tags. A separate documentation site could provide those controls if the project needs one.

## Check the changes

Run `npm run verify:docs` to verify the language links, local file references, media references, and package keywords. Run `npm run telemetry:collect` with an authorized GitHub login to record actual repository traffic. Compare equivalent windows and account for maintainer activity.

## Sources

- [DSH upstream community guidance](https://github.com/deepseek-ai/deepseek-harness#community-and-support).
- [GitHub repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).
- [Google guidance for multilingual content](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
- [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json).
