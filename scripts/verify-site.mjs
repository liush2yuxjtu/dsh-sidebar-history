import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
let source = process.env.DSH_SOURCE_ROOT;
if (!source) {
  try { source = execFileSync('git', ['-C', root, 'config', '--get', 'dsh.sourceRoot'], { encoding: 'utf8' }).trim(); }
  catch { throw new Error('Set DSH_SOURCE_ROOT to the built DSH checkout used by the browser verification.'); }
}
const require = createRequire(import.meta.url);
const { chromium } = require(join(source, 'apps/web/node_modules/playwright'));
const base = (process.argv[2] || 'https://liush2yuxjtu.github.io/dsh-sidebar-history/').replace(/\/?$/, '/');
const canonicalBase = 'https://liush2yuxjtu.github.io/dsh-sidebar-history/';
const output = resolve(process.env.DSH_SITE_OUTPUT || join(root, '.runtime/publication/site'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DSH_CHROMIUM_PATH ? { executablePath: process.env.DSH_CHROMIUM_PATH } : {}) });
const report = { status: 'RUNNING', base, at: new Date().toISOString(), pages: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const target of [{ path: '', lang: 'en' }, { path: 'zh/', lang: 'zh-CN' }]) {
    const response = await page.goto(base + target.path, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, 'Public page HTTP status');
    const facts = await page.evaluate(() => ({
      language: document.documentElement.lang,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      robots: document.querySelector('meta[name="robots"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      alternates: Object.fromEntries([...document.querySelectorAll('link[hreflang]')].map(node => [node.hreflang, node.href])),
      openGraphUrl: document.querySelector('meta[property="og:url"]')?.content,
      openGraphImage: document.querySelector('meta[property="og:image"]')?.content,
      twitterCard: document.querySelector('meta[name="twitter:card"]')?.content,
      headings: [...document.querySelectorAll('h1')].map(node => node.textContent.trim()),
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => JSON.parse(node.textContent)['@graph'] || []),
      images: [...document.querySelectorAll('img')].filter(node => node.getAttribute('alt') !== '').map(node => ({ src: node.getAttribute('src'), alt: node.alt })),
      anchors: [...document.querySelectorAll('a[href^="#"]')].map(node => ({ href: node.getAttribute('href'), exists: Boolean(document.querySelector(node.getAttribute('href'))) })),
    }));
    assert.equal(facts.language, target.lang);
    assert.match(facts.title, /DSH|DeepSeek Harness/);
    assert.ok(facts.description?.length > 30);
    assert.match(facts.robots, /index/);
    assert.doesNotMatch(facts.robots, /noindex/);
    assert.equal(facts.canonical, canonicalBase + target.path);
    assert.equal(facts.openGraphUrl, facts.canonical);
    assert.equal(facts.openGraphImage, canonicalBase + 'media/live/snapshot.png');
    assert.equal(facts.twitterCard, 'summary_large_image');
    assert.equal(facts.alternates.en, canonicalBase);
    assert.equal(facts.alternates['zh-CN'], canonicalBase + 'zh/');
    assert.equal(facts.alternates['x-default'], canonicalBase);
    assert.equal(facts.headings.length, 1);
    assert.ok(facts.schemas.some(node => node['@type'] === 'SoftwareSourceCode' && node.codeRepository === 'https://github.com/liush2yuxjtu/dsh-sidebar-history'));
    assert.ok(facts.schemas.some(node => node['@type'] === 'WebPage' && node.inLanguage === target.lang));
    assert.ok(facts.images.every(node => node.alt.length > 10));
    assert.ok(facts.anchors.every(node => node.exists));
    await page.locator('details').first().evaluate(node => { node.open = true; });
    await page.evaluate(async () => { await Promise.all([...document.images].map(async image => { image.loading = 'eager'; await image.decode(); })); });
    assert.ok(await page.locator('img').evaluateAll(nodes => nodes.every(node => node.naturalWidth > 0)), 'Every image loads');
    const video = page.locator('video');
    await video.evaluate(node => { node.preload = 'auto'; node.load(); });
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    const duration = await video.evaluate(node => node.duration);
    assert.ok(duration > 8 && duration < 12, 'The real API demo video loads');
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
      await page.screenshot({ path: join(output, target.lang + '-' + viewport.name + '.png'), fullPage: true });
    }
    await page.locator('nav a[href="#install"]').click();
    await page.locator('#install').waitFor({ state: 'visible' });
    await page.locator('nav a[hreflang]').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('html').getAttribute('lang'), target.lang === 'en' ? 'zh-CN' : 'en');
    report.pages.push({ path: target.path, ...facts, videoDuration: duration, responsive: 'desktop and mobile PASS', navigation: 'install and language PASS' });
  }
  const sitemapResponse = await context.request.get(base + 'sitemap.xml');
  assert.equal(sitemapResponse.status(), 200);
  const sitemap = await sitemapResponse.text();
  assert.ok(sitemap.includes('<loc>' + canonicalBase + '</loc>') && sitemap.includes('<loc>' + canonicalBase + 'zh/</loc>'));
  const robotsResponse = await context.request.get(base + 'robots.txt');
  assert.equal(robotsResponse.status(), 200);
  assert.ok((await robotsResponse.text()).includes(canonicalBase + 'sitemap.xml'));
  for (const asset of ['site.css', 'favicon.svg', 'media/live/snapshot.png', 'media/live/feature-8s.gif', 'media/live/demo.mp4', 'media/live/evidence/result.json']) {
    const response = await context.request.get(base + asset);
    assert.equal(response.status(), 200, asset);
    if (asset.endsWith('result.json')) assert.equal((await response.json()).status, 'PASS');
  }
  assert.deepEqual(errors, []);
  report.status = 'PASS';
  report.note = 'Project-path robots.txt is informational. Crawlers consult the origin-root robots.txt.';
  console.log(JSON.stringify({ status: report.status, base, pages: report.pages.length, browserErrors: errors.length, output }));
} catch (error) {
  report.status = 'FAIL';
  report.error = error.message;
  throw error;
} finally {
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
