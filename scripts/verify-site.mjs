import assert from 'node:assert/strict';
import { access, mkdir, writeFile, readFile } from 'node:fs/promises';
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
const repositoryUrl = 'https://github.com/liush2yuxjtu/dsh-sidebar-history';
const targets = [
  { path: '', lang: 'en', kind: 'home' },
  { path: 'zh/', lang: 'zh-CN', kind: 'home' },
  { path: 'demo/', lang: 'en', kind: 'watch' },
  { path: 'zh/demo/', lang: 'zh-CN', kind: 'watch' },
];
for (const target of targets) target.media = target.lang === 'en' ? 'media/live' : 'media/localized/zh-CN';
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const output = resolve(process.env.DSH_SITE_OUTPUT || join(root, '.runtime/publication/site'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DSH_CHROMIUM_PATH ? { executablePath: process.env.DSH_CHROMIUM_PATH } : {}) });
const report = { status: 'RUNNING', base, at: new Date().toISOString(), pages: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const target of targets) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const expectedMedia = JSON.parse(await readFile(join(root, 'docs', target.media, 'provenance.json'), 'utf8'));
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
      googleVerification: document.querySelector('meta[name="google-site-verification"]')?.content,
      headings: [...document.querySelectorAll('h1')].map(node => node.textContent.trim()),
      schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => JSON.parse(node.textContent)['@graph'] || []),
      images: [...document.querySelectorAll('img')].filter(node => node.getAttribute('alt') !== '').map(node => ({ src: node.getAttribute('src'), alt: node.alt })),
      anchors: [...document.querySelectorAll('a[href^="#"]')].map(node => ({ href: node.getAttribute('href'), exists: Boolean(document.querySelector(node.getAttribute('href'))) })),
      links: [...document.querySelectorAll('a[href]')].map(node => node.href),
    }));
    assert.equal(facts.language, target.lang);
    assert.match(facts.title, /DSH|DeepSeek Harness/);
    assert.ok(facts.description?.length > 30);
    assert.match(facts.robots, /index/);
    assert.doesNotMatch(facts.robots, /noindex/);
    assert.equal(facts.canonical, canonicalBase + target.path);
    assert.equal(facts.openGraphUrl, facts.canonical);
    assert.equal(facts.openGraphImage, canonicalBase + target.media + '/snapshot.png');
    assert.equal(facts.twitterCard, 'summary_large_image');
    const englishPath = target.kind === 'watch' ? 'demo/' : '';
    const chinesePath = target.kind === 'watch' ? 'zh/demo/' : 'zh/';
    assert.equal(facts.alternates.en, canonicalBase + englishPath);
    assert.equal(facts.alternates['zh-CN'], canonicalBase + chinesePath);
    assert.equal(facts.alternates['x-default'], canonicalBase + englishPath);
    assert.equal(facts.headings.length, 1);
    assert.ok(facts.schemas.some(node => node['@type'] === 'SoftwareSourceCode' && node.codeRepository === 'https://github.com/liush2yuxjtu/dsh-sidebar-history'));
    assert.ok(facts.schemas.some(node => node['@type'] === 'WebPage' && node.inLanguage === target.lang));
    assert.ok(facts.images.every(node => node.alt.length > 10));
    assert.ok(facts.anchors.every(node => node.exists));
    for (const link of facts.links.filter(href => href.startsWith(repositoryUrl + '/blob/main/'))) {
      const file = decodeURIComponent(new URL(link).pathname.split('/blob/main/')[1]);
      await access(join(root, file)).catch(() => { throw new Error('Website links to a missing repository file: ' + file); });
    }
    if (target.kind === 'home') {
      await page.locator('details').first().evaluate(node => { node.open = true; });
      assert.ok(await page.locator('#install code').allTextContents().then(texts => texts.some(text => text.includes('dsh plugin --profile web add "$PWD/dsh-sidebar-history-' + manifest.version + '.tgz"'))), 'Installation includes the executable tarball command');
      assert.ok(facts.links.includes(base + (target.lang === 'en' ? 'demo/' : 'zh/demo/')), 'Homepage links to its localized watch page');
      if (target.lang === 'zh-CN') assert.ok(facts.links.some(href => decodeURI(href) === repositoryUrl + '/blob/main/docs/i18n/README.zh-CN.md#安装侧栏插件'), 'Chinese installation links to the existing translation');
      else assert.ok(facts.googleVerification, 'Google ownership verification is deployed');
    } else {
      const videoSchema = facts.schemas.find(node => node['@type'] === 'VideoObject');
      assert.ok(videoSchema, 'Watch page describes its actual video');
      assert.ok(videoSchema.name && videoSchema.description);
      assert.equal(videoSchema.contentUrl, canonicalBase + target.media + '/demo.mp4');
      assert.deepEqual(videoSchema.thumbnailUrl, [canonicalBase + target.media + '/snapshot.png']);
      assert.ok(Math.abs(Number(videoSchema.duration.slice(2, -1)) - expectedMedia.duration_s) < 0.02);
      assert.ok(Number.isFinite(Date.parse(videoSchema.uploadDate)), 'Video has its actual dated publication metadata');
      assert.equal(videoSchema.inLanguage, target.lang, 'Video pixels and metadata match the page language');
      if (target.lang === 'zh-CN') assert.match(await page.locator('main').innerText(), /简体中文界面原始录屏/);
    }
    await page.evaluate(async () => { await Promise.all([...document.images].map(async image => { image.loading = 'eager'; await image.decode(); })); });
    assert.ok(await page.locator('img').evaluateAll(nodes => nodes.every(node => node.naturalWidth > 0)), 'Every image loads');
    const video = page.locator('video');
    await video.evaluate(node => { node.preload = 'auto'; node.load(); });
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    const duration = await video.evaluate(node => node.duration);
    assert.ok(Math.abs(duration - expectedMedia.duration_s) < 0.25, 'Video preserves the actual recording duration');
    if (target.kind === 'watch') {
      assert.ok(Math.abs(duration - expectedMedia.duration_s) < 0.25, 'VideoObject duration matches the playable recording');
      assert.equal(await video.evaluate(node => node.currentSrc), base + target.media + '/demo.mp4', 'VideoObject points to the actual player content');
      assert.ok(await video.evaluate(node => node.getBoundingClientRect().top < innerHeight), 'Main watch video is visible in the first viewport');
    }
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
      await page.screenshot({ path: join(output, target.lang + '-' + target.kind + '-' + viewport.name + '.png'), fullPage: true });
    }
    await page.locator('nav a[href$="#install"]').click();
    await page.locator('#install').waitFor({ state: 'visible' });
    const homePath = target.lang === 'en' ? '' : 'zh/';
    assert.equal(page.url(), base + homePath + '#install', 'Installation navigation opens the correct language');
    if (target.kind === 'watch') await page.goto(base + target.path, { waitUntil: 'networkidle' });
    await page.locator('nav a[hreflang]').click();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('html').getAttribute('lang'), target.lang === 'en' ? 'zh-CN' : 'en');
    assert.equal(page.url(), base + (target.lang === 'en' ? chinesePath : englishPath), 'Language navigation preserves the page type');
    report.pages.push({ path: target.path, ...facts, videoDuration: duration, responsive: 'desktop and mobile PASS', navigation: 'install and language PASS' });
  }
  const sitemapResponse = await context.request.get(base + 'sitemap.xml');
  assert.equal(sitemapResponse.status(), 200);
  const sitemap = await sitemapResponse.text();
  const sitemapFacts = await page.evaluate(xml => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const namespace = 'http://www.google.com/schemas/sitemap-video/1.1';
    return {
      errors: document.querySelectorAll('parsererror').length,
      videos: [...document.getElementsByTagNameNS(namespace, 'video')].map(node => Object.fromEntries([...node.children].map(child => [child.localName, child.textContent]))),
    };
  }, sitemap);
  assert.equal(sitemapFacts.errors, 0, 'Sitemap is valid XML');
  for (const target of targets) assert.ok(sitemap.includes('<loc>' + canonicalBase + target.path + '</loc>'), 'Sitemap includes ' + target.path);
  assert.equal(sitemapFacts.videos.length, 2, 'Both watch pages have video sitemap entries');
  for (const [index, target] of targets.filter(item => item.kind === 'watch').entries()) {
    const video = sitemapFacts.videos[index];
    assert.ok(video.title && video.description);
    assert.equal(video.thumbnail_loc, canonicalBase + target.media + '/snapshot.png');
    assert.equal(video.content_loc, canonicalBase + target.media + '/demo.mp4');
  }
  const robotsResponse = await context.request.get(base + 'robots.txt');
  assert.equal(robotsResponse.status(), 200);
  assert.ok((await robotsResponse.text()).includes(canonicalBase + 'sitemap.xml'));
  const mediaAssets = ['media/live', 'media/localized/zh-CN'].flatMap(directory => ['snapshot.png', 'feature-8s.gif', 'demo.mp4', 'evidence/result.json'].map(file => directory + '/' + file));
  for (const asset of ['site.css', 'favicon.svg', 'llms.txt', ...mediaAssets]) {
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
