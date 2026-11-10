# Public website verification

The public repository and static website explain the DSH sidebar plugin in English and Chinese. The site uses the published real API media. Search metadata must describe actual behavior.

Prerequisites are Node.js, the project's built DSH checkout and its matching Playwright Chromium. Set `DSH_SOURCE_ROOT` or the local Git setting `dsh.sourceRoot`. No model call is needed for this website check. The repository's fresh real API pre-commit gate still applies.

From the repository, serve `docs` with `python3 -m http.server 8767 --bind 127.0.0.1 --directory docs`. Run `npm run verify:site -- http://127.0.0.1:8767/` against the candidate. After deployment, run `npm run verify:site` against the public URL.

The script checks both HTTP pages, language navigation, installation navigation, canonical URLs, reciprocal hreflang, descriptions, Open Graph, Twitter cards, JSON-LD, sitemap entries, image and video loading, page errors, and desktop/mobile overflow. It saves screenshots and `result.json` in ignored `.runtime/publication/site`. Use `DSH_SITE_OUTPUT` to retain separate candidate and public evidence. Stop only the local server started for this check.

Read repository visibility and metadata back through the GitHub API. Use a clean anonymous browser context for public access. Scan the complete Git history for possible credentials before changing visibility. A successful scan does not establish that arbitrary private content is suitable for publication. Inspect the actual release media and public instructions too.

GitHub Pages publishes this project under `/dsh-sidebar-history/`. The project's `robots.txt` is informational. Search engines consult `https://liush2yuxjtu.github.io/robots.txt`; do not claim the project file controls origin-wide crawling. The sitemap is linked from the website. Search indexing and ranking remain external outcomes.

Keep candidate and deployed evidence per run. A metadata check does not establish plugin runtime acceptance.
