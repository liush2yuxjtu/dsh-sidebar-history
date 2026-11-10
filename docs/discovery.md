# Find DSH Sidebar History

DSH Sidebar History is a community DeepSeek Harness sidebar plugin. It adds TODO progress and the latest committed assistant reply to chat-history cards. It is not an official DeepSeek product.

## Repository metadata

Use both `dsh-plugin` and `dsh-plugins` as GitHub topics. The upstream DSH README explicitly recommends `dsh-plugin` for community discovery. The plural topic preserves the ecosystem name requested for this repository.

Related topics describe actual behavior: `deepseek-harness`, `deepseek`, `sidebar`, `chat-history`, `todo`, `task-management`, `ai-agent`, `developer-tools`, and `web-ui`. The package keywords use the same vocabulary. Keywords in a package manifest do not mean the package is published to npm.

The repository description names DeepSeek Harness, the sidebar, TODO progress, assistant reply previews, and session search. A public repository is required for unauthenticated discovery. Search indexing can lag behind a visibility or documentation change. No metadata change guarantees a ranking.

## Language-specific documents

Each language has its own file with links to the other versions. These are documentation translations. The sidebar UI supports the same five languages through DSH's locale service. Traditional Chinese covers the sidebar and demonstrated native screens; other native namespaces may fall back to Simplified Chinese. Each language has an independent real API screenshot, GIF, and video, mapped in [locales.json](media/locales.json). The Traditional Chinese host pack covers 17 namespaces and 1829 keys. Version 0.2.1 includes fresh real API captures verified across all five languages.

| Language | README |
| --- | --- |
| English | [README.md](../README.md) |
| 简体中文 | [README.zh-CN.md](i18n/README.zh-CN.md) |
| 繁體中文 | [README.zh-TW.md](i18n/README.zh-TW.md) |
| 日本語 | [README.ja.md](i18n/README.ja.md) |
| Español | [README.es.md](i18n/README.es.md) |

The root README puts the product name and use case first, then real API media, supported behavior, installation, compatibility, and verification. Each translation keeps the same factual limits and points to its own language-specific assets and preserves their verification status. Generated concepts and controlled adapters do not become live-model evidence through translation.

GitHub controls the rendered README's HTML head. The [public website](https://liush2yuxjtu.github.io/dsh-sidebar-history/) and [Chinese website](https://liush2yuxjtu.github.io/dsh-sidebar-history/zh/) provide descriptive HTML titles, descriptions, self-canonical URLs, reciprocal `hreflang`, structured data, and a linked sitemap. They link to [English](https://liush2yuxjtu.github.io/dsh-sidebar-history/demo/) and [Chinese](https://liush2yuxjtu.github.io/dsh-sidebar-history/zh/demo/) watch pages. The watch pages each describe their own language-specific real API media with `VideoObject` metadata and video sitemap entries. The English recording uses English UI and model text; the Chinese recording uses Simplified Chinese UI and model text. The [llms.txt reference](https://liush2yuxjtu.github.io/dsh-sidebar-history/llms.txt) gives agents the public product facts and evidence links. None of these files establishes search indexing or ranking. Run `npm run verify:site` to check the deployed pages. Do not add hidden keyword blocks or unsupported SEO tags to Markdown.

## Check the changes

Run `npm run verify:docs` to verify the language links, local file references, media references, and package keywords. Run `npm run telemetry:collect` with an authorized GitHub login to record actual repository traffic. Compare equivalent windows and account for maintainer activity.

## Record search results

Use the website's URL-prefix property in Google Search Console. After ownership verification, submit `https://liush2yuxjtu.github.io/dsh-sidebar-history/sitemap.xml`. Read the submitted sitemap status. Inspect each of the four canonical URLs to distinguish a submitted page, a fetched page, and an indexed page. An indexing request is not a confirmation that the URL is indexed.

Record Search Console's report period and data freshness with impressions, clicks, CTR, average position, and indexed-page counts. A new property can have no processed data. Record that state as unavailable rather than zero. Do not attribute the first traffic snapshot to these changes.

Keep dated observations for the exact query `"dsh-sidebar-history"`, the site query `site:liush2yuxjtu.github.io/dsh-sidebar-history`, and GitHub repository search `dsh-sidebar-history in:name`. Record the search service, language or location when known, target URLs returned, and query time. An empty result is a bounded observation, not proof of deindexing. Directory submission and directory listing are separate states.

The project-path `robots.txt` links the sitemap for readers. Crawlers use the origin-root robots file at `https://liush2yuxjtu.github.io/robots.txt`. Do not report the project file as origin-wide crawler control. `llms.txt` is an agent reference, not an indexing submission or a ranking signal.

## Sources

- [DSH upstream community guidance](https://github.com/deepseek-ai/deepseek-harness#community-and-support).
- [GitHub repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics).
- [Google guidance for multilingual content](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
- [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json).

- [Google video structured data](https://developers.google.com/search/docs/appearance/structured-data/video).
