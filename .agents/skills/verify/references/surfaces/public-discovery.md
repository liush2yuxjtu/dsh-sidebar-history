# Public website verification

The public repository and static website explain the DSH sidebar plugin in English and Chinese. The four targets are the English and Chinese homepages and their localized `demo/` watch pages. The site uses the published real API media. Search metadata must describe actual behavior.

Prerequisites are Node.js, the project's built DSH checkout and its matching Playwright Chromium. Set `DSH_SOURCE_ROOT` or the local Git setting `dsh.sourceRoot`. No model call is needed for this website check. The repository's fresh real API pre-commit gate still applies.

From the repository, serve `docs` with `python3 -m http.server 8767 --bind 127.0.0.1 --directory docs`. Run `npm run verify:site -- http://127.0.0.1:8767/` against the candidate. After deployment, run `npm run verify:site` against the public URL.

The script checks all four HTTP pages, language navigation that preserves page type, installation navigation, executable tarball instructions, existing repository-file links, canonical URLs, reciprocal hreflang, descriptions, Open Graph, Twitter cards, JSON-LD, valid XML sitemap entries, image and video loading, page errors, and desktop/mobile overflow. Watch-page checks compare `VideoObject` content and duration with the actual player and require the video in the first desktop viewport. Each watch page must use its own language-specific recording, poster, social image and VideoObject language. The check also reads the public `llms.txt` reference and the root homepage's Search Console verification marker. It saves screenshots and `result.json` in ignored `.runtime/publication/site`. Use `DSH_SITE_OUTPUT` to retain separate candidate and public evidence. Stop only the local server started for this check.

Read repository visibility and metadata back through the GitHub API. Use a clean anonymous browser context for public access. Scan the complete Git history for possible credentials before changing visibility. A successful scan does not establish that arbitrary private content is suitable for publication. Inspect the actual release media and public instructions too.

GitHub Pages publishes this project under `/dsh-sidebar-history/`. The project's `robots.txt` is informational. Search engines consult `https://liush2yuxjtu.github.io/robots.txt`; do not claim the project file controls origin-wide crawling. The sitemap is linked from the website. Search indexing and ranking remain external outcomes.

For search outcomes, read the Google Search Console URL-prefix property after ownership verification and sitemap submission. Record the report period, freshness, URL Inspection verdicts, sitemap status, and available performance metrics. Keep dated exact-name, site, GitHub, and directory query observations separate. A submitted sitemap, empty search result, `llms.txt`, or valid structured data does not establish indexing, ranking, or traffic growth. Keep maintainer traffic snapshots private.

Keep candidate and deployed evidence per run. A metadata check does not establish plugin runtime acceptance.
