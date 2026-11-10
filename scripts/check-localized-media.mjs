import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { assertRequestedTasks } from '../tests/media-locales.mjs';
import { assertRealProvenance } from '../tests/live-proof.mjs';

export const requiredLocales = ['en', 'zh-CN', 'zh-TW', 'ja', 'es'];
const languageMarkers = { en: 'Chat history', 'zh-CN': '历史', 'zh-TW': '歷史', ja: '履歴', es: 'Historial' };
const visionLanguages = { en: 'en-US', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', ja: 'ja-JP', es: 'es-ES' };
const essentialAssets = ['demo.mp4', 'raw/gt.mp4', 'feature-8s.gif', 'snapshot.png', 'poster.png', 'contact-sheet.png', 'interaction-strip.png'];
const nativeSessionTerms = { en: 'New Session', 'zh-CN': '新会话', 'zh-TW': '新會話', ja: '新規セッション', es: 'Nueva sesión' };
const sourceFiles = ['package.json', 'index.mjs', 'client.js', 'src/client.mjs', 'src/markdown-preview.mjs', 'src/projection.mjs', 'src/locales.mjs', 'tests/live.test.mjs', 'tests/live-proof.mjs', 'tests/live.config.mjs', 'tests/media-locales.mjs', 'scripts/live-browser.mjs'];
export const requiredScreenshots = ['preflight.png', 'progress.png', 'final.png', 'reloaded.png', 'navigation-restored.png',
  'offline-search.png', 'mobile.png', 'zoom-equivalent-reflow.png', 'light-theme.png', 'dark-theme.png',
  'earlier-reply.png', 'followup.png', 'stopped.png', 'restarted.png', 'lifecycle-reloaded.png'];
const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export const normalizeOcr = text => text.normalize('NFKC').toLocaleLowerCase('en').replace(/[\p{P}\p{Z}\s]/gu, '');

function inside(root, path) {
  assert.equal(typeof path, 'string');
  const full = resolve(root, path);
  const local = relative(root, full);
  assert.ok(local && local !== '..' && !local.startsWith('..' + sep) && !local.startsWith(sep), 'Media path leaves repository: ' + path);
  return full;
}

export function validateRegistry(registry) {
  assert.equal(registry.schemaVersion, 1, 'Localized media registry version');
  assert.deepEqual(Object.keys(registry.locales).sort(), [...requiredLocales].sort(), 'All five public document languages need their own media');
  const directories = new Set();
  const documents = new Set();
  for (const locale of requiredLocales) {
    const entry = registry.locales[locale];
    assert.ok(entry && typeof entry.directory === 'string' && typeof entry.readme === 'string' && typeof entry.hostLocale === 'string');
    assert.ok(!directories.has(entry.directory), 'Languages must not share one capture directory');
    assert.ok(!documents.has(entry.readme), 'Languages must not share one README');
    directories.add(entry.directory); documents.add(entry.readme);
    assert.ok(Array.isArray(entry.ocrTerms) && entry.ocrTerms.length > 0, locale + ' needs distinctive visible OCR terms');
    assert.ok(entry.ocrTerms.every(term => typeof term === 'string' && normalizeOcr(term).length >= 2));
    assert.ok(entry.ocrTerms.some(term => normalizeOcr(term).includes(normalizeOcr(languageMarkers[locale]))), locale + ' OCR terms must identify the actual document language');
  }
  return registry;
}

export function assertScreenshotManifest(screenshots, files) {
  assert.ok(screenshots && typeof screenshots === 'object', 'Retain all original published screenshots');
  for (const name of requiredScreenshots) assert.ok(Object.hasOwn(screenshots, name), 'Missing required original screenshot: ' + name);
  for (const [name, hash] of Object.entries(screenshots)) {
    assert.match(name, /^[a-z0-9-]+\.png$/, 'Original screenshots must be PNG filenames');
    assert.match(hash, /^[a-f0-9]{64}$/, 'Original screenshot SHA256: ' + name);
  }
  assert.deepEqual([...files].sort(), Object.keys(screenshots).sort(), 'Every published evidence PNG needs a screenshot hash and pixel language check');
}

function textList(value, label) {
  const list = Array.isArray(value) ? value : Object.values(value || {});
  assert.ok(list.length && list.every(item => typeof item === 'string' && item.trim()), label);
  return list;
}

export function assertPixelTerms(ocrText, terms, locale, asset) {
  const normalized = normalizeOcr(ocrText);
  for (const term of terms) assert.ok(normalized.includes(normalizeOcr(term)), `${locale} content-language mismatch in ${asset}: OCR did not find ${JSON.stringify(term)}`);
  if (locale !== 'en') {
    for (const term of ['Chat history', 'Search sessions', 'Native navigation', 'Workspaces & archives', 'History cards', 'New session', 'Standard mode',
      'Earlier reply', 'No task list this turn', 'Latest assistant reply', 'Search incomplete', 'Retry search', 'No cached matches',
      'Summary unavailable', 'Content search reached its result limit']) {
      assert.ok(!normalized.includes(normalizeOcr(term)), `${locale} untranslated English UI in ${asset}: ${term}`);
    }
  }
  if (locale === 'zh-TW') assert.ok(!/历史|会话|任务|订单|数据|发布|回复|设置|默认|输入|读取|导览|当前|点击|选择|加载|继续|用户|轨迹|并/u.test(normalized), `${locale} Simplified Chinese remains in ${asset}`);
}

async function ocrBinary(output) {
  assert.equal(process.platform, 'darwin', 'BLOCKED: localized pixel verification requires the Mac mini Vision runtime');
  const swift = join(ownRoot, 'scripts/ocr-media.swift');
  const signature = sha256(await readFile(swift)).slice(0, 16);
  const binary = join(output, 'ocr-media-' + signature);
  try { await access(binary); }
  catch {
    execFileSync('swiftc', ['-O', swift, '-o', binary, '-framework', 'Vision', '-framework', 'Foundation', '-framework', 'NaturalLanguage'], { timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
  }
  return binary;
}

export function assertTextLanguage(text, locale, asset) {
  if (locale === 'zh-TW') assert.ok(!/历史|会话|任务|订单|数据|发布|回复|设置|默认|输入|读取|导览|当前|点击|选择|加载|继续|用户|轨迹|并/u.test(text), `${locale} Simplified Chinese remains in ${asset}`);
}

export function languageSentence(text) {
  const clean = text.normalize('NFKC').replace(/https?:\/\/\S+/gu, ' ')
    .replace(/`[^`]*`/gu, ' ').replace(/\b[A-Za-z0-9_./-]+\.(?:json|mjs|js|ts|png|gif|mp4|txt)\b/gu, ' ')
    .replace(/\b(?:quantity|unitPrice|shipping|todo_write|read|auditId|DeepSeek|DSH)\b/gu, ' ');
  const words = clean.match(/\p{Script=Latin}[\p{Script=Latin}'’]{1,}/gu) || [];
  const latin = words.join('').length;
  const cjk = (clean.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
  return (words.length >= 5 && latin >= 24) || cjk >= 12;
}

export function assertSentenceLanguage(segment, locale, asset) {
  assertTextLanguage(segment.text, locale, asset);
  if (!languageSentence(segment.text)) return;
  const language = segment.language;
  const confidence = segment.hypotheses?.[language] || 0;
  const expected = { en: 'en', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', ja: 'ja', es: 'es' }[locale];
  if (language === 'en' && locale !== 'en' && confidence >= 0.7) {
    assert.fail(`${locale} English sentence remains in ${asset}: ${JSON.stringify(segment.text)}`);
  }
  if (confidence >= 0.9 && language !== 'und') assert.equal(language, expected, `${locale} sentence language mismatch in ${asset}: ${JSON.stringify(segment.text)}`);
}

export async function inspectTextLanguages(binary, texts, locale, evidencePath) {
  assert.ok(Array.isArray(texts) && texts.length > 0 && texts.every(text => typeof text === 'string' && text.trim()), 'Retain all nonempty API response texts');
  const result = JSON.parse(execFileSync(binary, ['--texts', visionLanguages[locale]], { input: JSON.stringify(texts), encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024 }));
  await writeFile(evidencePath, JSON.stringify({ locale, ...result }, null, 2) + '\n');
  assert.equal(result.texts.length, texts.length);
  for (const row of result.texts) {
    assert.equal(row.text, texts[row.index]);
    assertTextLanguage(row.text, locale, evidencePath);
    for (const segment of row.segments) assertSentenceLanguage(segment, locale, evidencePath + '#' + row.index);
  }
  return { responseTexts: texts.length, sentenceSegments: result.texts.reduce((count, row) => count + row.segments.length, 0) };
}


function ocrCorrespondence(left, right) {
  const clean = text => normalizeOcr(text.normalize('NFKD').replace(/\p{M}/gu, ''));
  const a = clean(left), b = clean(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + Number(a[i - 1] !== b[j - 1]));
      diagonal = previous;
    }
  }
  return 1 - row[b.length] / Math.max(a.length, b.length, 1);
}

export async function inspectPixelSentence(binary, segment, line, locale, context = {}) {
  assertTextLanguage(segment.text, locale, context.asset);
  try {
    assertSentenceLanguage(segment, locale, context.asset);
    return null;
  } catch (error) {
    if (!(Number.isFinite(line.confidence) && line.confidence >= 0 && line.confidence <= 0.5
      && segment.language !== 'en' && segment.language !== 'und'
      && (segment.hypotheses?.[segment.language] || 0) >= 0.9)) throw error;
  }
  const { asset, sha256: imageHash, mediaRoot, reviews = [], evidencePath } = context;
  try {
    const matches = reviews.filter(review => review.asset === asset && review.ocrText === line.text);
    assert.equal(matches.length, 1, 'Exactly one actual pixel review is required for this OCR line');
    const review = matches[0];
    assert.equal(review.status, 'VISUALLY_CONFIRMED');
    assert.equal(review.sha256, imageHash, 'Reviewed image SHA256 changed');
    assert.equal(review.observedLocale, locale, 'Reviewed image language');
    assert.ok(Array.isArray(review.box) && review.box.length === 4 && review.box.every((value, index) =>
      Number.isFinite(value) && Math.abs(value - line.box[index]) <= 0.000001), 'Reviewed OCR bounding box changed');
    assert.ok(typeof review.reason === 'string' && review.reason.trim().length >= 30, 'Retain the observed clipping and pixel evidence');
    assert.ok(Number.isFinite(Date.parse(review.reviewedAt)), 'Retain the actual pixel review time');
    const reference = review.reference;
    assert.ok(reference && typeof reference.text === 'string' && languageSentence(reference.text), 'Retain the full corresponding reference sentence');
    assert.notEqual(reference.asset, asset, 'Use an independently captured complete reference line');
    const referencePath = inside(mediaRoot, reference.asset);
    assert.equal(sha256(await readFile(referencePath)), reference.sha256, 'Reference image SHA256 changed');
    const referenceOcr = JSON.parse(execFileSync(binary, [referencePath, visionLanguages[locale]], {
      encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024,
    }));
    const referenceEvidence = evidencePath.replace(/\.ocr\.json$/, '') + '.' + reference.sha256.slice(0, 12) + '.reference.json';
    await writeFile(referenceEvidence, JSON.stringify({ file: referencePath, sha256: reference.sha256, ...referenceOcr }, null, 2) + '\n');
    const referenceLine = referenceOcr.lines.find(candidate => normalizeOcr(candidate.text) === normalizeOcr(reference.text) && candidate.confidence >= 0.9);
    assert.ok(referenceLine, 'Complete reference sentence must be present in high-confidence actual OCR');
    for (const candidate of referenceLine.segments || []) assertSentenceLanguage(candidate, locale, reference.asset);
    const expected = { en: 'en', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', ja: 'ja', es: 'es' }[locale];
    assert.ok(referenceLine.segments.some(candidate => languageSentence(candidate.text) && candidate.language === expected
      && candidate.hypotheses?.[expected] >= 0.9), 'Complete reference sentence must confidently match the document language');
    const correspondence = ocrCorrespondence(line.text, referenceLine.text);
    assert.ok(correspondence >= 0.7, 'Reference text does not correspond to the damaged OCR line');
    return { asset, sha256: imageHash, ocrText: line.text, box: line.box, ocrConfidence: line.confidence,
      observedLocale: locale, reviewedAt: review.reviewedAt, reason: review.reason,
      reference: { asset: reference.asset, sha256: reference.sha256, text: referenceLine.text, box: referenceLine.box,
        ocrConfidence: referenceLine.confidence, correspondence, evidencePath: referenceEvidence } };
  } catch (error) {
    throw new Error('BLOCKED: REVIEW_REQUIRED: ' + locale + ' unreliable OCR in ' + asset + ': ' + error.message);
  }
}

export async function inspectPixels(binary, file, locale, terms, evidencePath, context = {}) {
  const result = JSON.parse(execFileSync(binary, [file, visionLanguages[locale]], { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024 }));
  const receipt = { file, sha256: sha256(await readFile(file)), locale, terms, ...result };
  await writeFile(evidencePath, JSON.stringify(receipt, null, 2) + '\n');
  assertPixelTerms(result.text, terms, locale, file);
  const pixelReviews = [];
  for (const line of result.lines) for (const segment of line.segments || []) {
    const review = await inspectPixelSentence(binary, segment, line, locale, { ...context,
      asset: context.mediaRoot ? relative(context.mediaRoot, file).split(sep).join('/') : file, sha256: receipt.sha256, evidencePath });
    if (review) pixelReviews.push(review);
  }
  if (pixelReviews.length) await writeFile(evidencePath, JSON.stringify({ ...receipt, pixelReviews }, null, 2) + '\n');
  return { sha256: receipt.sha256, language: result.language, matchedTerms: terms, pixelReviewCount: pixelReviews.length, pixelReviews };
}

function localMediaLinks(content, document, root, website) {
  const links = [];
  const matcher = website ? /(?:src|poster|content|href)=["']([^"']+\.(?:png|gif|mp4)(?:[?#][^"']*)?)["']/g : /\]\(([^\s)]+\.(?:png|gif|mp4)(?:[?#][^\s)]*)?)(?:\s+"[^"]*")?\)/g;
  for (const match of content.matchAll(matcher)) {
    let href = match[1].split(/[?#]/)[0];
    if (/^https?:/.test(href)) {
      const url = new URL(href);
      assert.equal(url.origin, 'https://liush2yuxjtu.github.io', 'Unexpected external public media source');
      assert.ok(url.pathname.startsWith('/dsh-sidebar-history/'));
      href = join(relative(root, join(root, 'docs')), decodeURIComponent(url.pathname.slice('/dsh-sidebar-history/'.length)));
      links.push(resolve(root, href));
    } else links.push(resolve(dirname(document), decodeURIComponent(href)));
  }
  return links;
}

export async function verifyLocalizedMedia({ root = ownRoot, only, output } = {}) {
  root = resolve(root);
  output = resolve(output || join(root, '.runtime/localization/verify', randomUUID()));
  await mkdir(output, { recursive: true });
  const report = { status: 'RUNNING', root, at: new Date().toISOString(), locales: {} };
  try {
    const registry = validateRegistry(await readJson(join(root, 'docs/media/locales.json')));
    assert.ok(!only || requiredLocales.includes(only), 'Unknown --only locale');
    const binary = await ocrBinary(output);
    const hashes = new Map();
    for (const locale of only ? [only] : requiredLocales) {
      const entry = registry.locales[locale];
      const media = inside(root, entry.directory);
      const localOutput = join(output, locale);
      await mkdir(localOutput);
      const evidence = await readJson(join(media, 'evidence/result.json'));
      const events = await readJson(join(media, 'evidence/native-events.json'));
      const provenance = await readJson(join(media, 'provenance.json'));
      assert.equal(evidence.status, 'PASS', locale + ' real API E2E');
      assert.equal(evidence.liveModel, true);
      for (const flag of ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents']) assert.equal(evidence[flag], false, locale + ' ' + flag);
      assertRealProvenance(evidence.calls, events, evidence.primarySession);
      assert.equal(evidence.cancellation?.expected, true, 'Retain the actual native Stop response as language evidence');
      const responseTexts = [...evidence.calls, evidence.cancellation.call].filter(call => call?.text?.trim()).map(call => call.text);
      const apiTextChecks = await inspectTextLanguages(binary, responseTexts, locale, join(localOutput, 'api-text-language.json'));
      assert.equal(evidence.mediaLocale, locale, 'Recorded media language must match the document');
      assert.equal(evidence.hostLocale, entry.hostLocale);
      assert.equal(typeof evidence.htmlLang, 'string', 'Retain the actual browser html lang');
      assert.equal(typeof evidence.visibleTextAtProof, 'string', 'Retain the actual browser proof text');
      assert.equal(evidence.htmlLang.toLowerCase(), (entry.htmlLang || entry.hostLocale).toLowerCase(), 'Recorded document locale');
      assert.equal(evidence.languageChecks?.status, 'PASS', 'Runtime language assertions must pass');
      assert.equal(provenance.runId, evidence.runId);
      const qa = await readJson(join(media, 'qa.json'));
      assert.equal(qa.status, 'PASS', locale + ' visual QA is required');
      assert.equal(qa.visual_review?.status, 'PASS', locale + ' actual pixel review is required');
      for (const file of ['snapshot.png', 'contact-sheet.png', 'interaction-strip.png']) assert.equal(qa.visual_review.artifacts?.[file], sha256(await readFile(join(media, file))), locale + ' reviewed pixels changed: ' + file);
      const ui = textList(evidence.expectedUiLabels, 'Retain expected UI labels');
      const tasks = textList(evidence.expectedTaskLabels, 'Retain expected localized task labels');
      assert.equal(tasks.length, 3);
      assertRequestedTasks(evidence.finalTodos, evidence.requestedTaskLabels || tasks, locale);
      const visible = normalizeOcr(evidence.visibleTextAtProof);
      for (const term of [...entry.ocrTerms, ...ui, ...tasks]) assert.ok(visible.includes(normalizeOcr(term)), locale + ' visible browser proof misses ' + term);
      assert.deepEqual([...evidence.finalTodos.map(task => task.content)].sort(), [...tasks].sort(), 'Native tasks must use the requested language');
      for (const name of sourceFiles) assert.equal(sha256(await readFile(join(root, name))), evidence.candidateSources[name], locale + ' media runtime differs from current plugin: ' + name);
      for (const asset of essentialAssets) {
        const path = inside(media, asset);
        assert.ok((await stat(path)).size > 0, 'Empty localized asset');
        const actual = sha256(await readFile(path));
        assert.equal(provenance.artifacts[asset], actual, locale + ' provenance hash: ' + asset);
        if (['demo.mp4', 'feature-8s.gif', 'snapshot.png'].includes(asset)) {
          assert.ok(!hashes.has(asset + ':' + actual), locale + ' reused another language capture for ' + asset);
          hashes.set(asset + ':' + actual, locale);
        }
      }
      for (const [name, expected] of Object.entries(provenance.artifacts)) assert.equal(sha256(await readFile(inside(media, name))), expected, locale + ' artifact hash: ' + name);
      assert.equal(sha256(await readFile(join(media, 'snapshot.png'))), evidence.screenshots['final.png']);
      assert.equal(sha256(await readFile(join(media, 'poster.png'))), evidence.screenshots['final.png']);
      assert.equal(sha256(await readFile(join(media, 'demo.mp4'))), evidence.raw_sha256);
      assert.equal(sha256(await readFile(join(media, 'raw/gt.mp4'))), evidence.raw_sha256);
      const [proofStart, proofEnd] = evidence.proof_interval_s;
      assert.ok(Number.isFinite(proofStart) && proofStart >= 0 && proofEnd - proofStart >= 3, 'Final localized proof needs a readable hold');
      const assets = ['demo.mp4', 'feature-8s.gif'];
      const probes = {};
      for (const asset of assets) probes[asset] = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', join(media, asset)], { encoding: 'utf8' }));
      const stream = probes['demo.mp4'].streams.find(item => item.codec_type === 'video');
      assert.equal(stream.codec_name, 'h264'); assert.equal(stream.pix_fmt, 'yuv420p');
      assert.ok(Number(probes['demo.mp4'].format.duration) >= proofEnd - 0.3);
      const gifDuration = Number(probes['feature-8s.gif'].format.duration);
      assert.ok(Math.abs(gifDuration - 8) <= 0.2, 'Localized GIF must remain an eight-second interval');
      assert.ok((await readFile(join(media, 'feature-8s.gif'))).includes(Buffer.from('NETSCAPE2.0\x03\x01\x00\x00', 'binary')), 'Localized GIF must loop');
      const readme = inside(root, entry.readme);
      const links = localMediaLinks(await readFile(readme, 'utf8'), readme, root, false);
      for (const asset of ['demo.mp4', 'feature-8s.gif', 'snapshot.png']) assert.ok(links.includes(join(media, asset)), locale + ' README missing localized ' + asset);
      assert.ok(links.every(path => path.startsWith(media + sep)), locale + ' README uses another language asset');
      for (const website of [entry.website, ...(entry.websites || [])].filter(Boolean)) {
        const document = inside(root, website);
        const links = localMediaLinks(await readFile(document, 'utf8'), document, root, true);
        for (const asset of ['demo.mp4', 'feature-8s.gif', 'snapshot.png']) assert.ok(links.includes(join(media, asset)), locale + ' website missing localized ' + asset);
        assert.ok(links.every(path => path.startsWith(media + sep)), locale + ' website uses another language asset');
      }
      const pixelChecks = [];
      const pixelContext = { mediaRoot: media, reviews: qa.ocr_reviews || [] };
      assertScreenshotManifest(evidence.screenshots, (await readdir(join(media, 'evidence'))).filter(name => name.endsWith('.png')));
      for (const [name, expected] of Object.entries(evidence.screenshots)) {
        assert.equal(sha256(await readFile(inside(media, 'evidence/' + name))), expected, locale + ' original screenshot hash: ' + name);
      }
      for (const name of Object.keys(evidence.screenshots)) {
        const terms = name === 'preflight.png' ? [nativeSessionTerms[locale]] : entry.ocrTerms;
        pixelChecks.push(await inspectPixels(binary, join(media, 'evidence', name), locale, terms, join(localOutput, name + '.ocr.json'), pixelContext));
      }
      for (const asset of ['snapshot.png', 'poster.png']) pixelChecks.push(await inspectPixels(binary, join(media, asset), locale, entry.ocrTerms, join(localOutput, asset + '.ocr.json'), pixelContext));
      const frames = [{ name: 'video-proof-1.png', source: 'demo.mp4', time: proofStart + 0.7 },
        { name: 'video-proof-2.png', source: 'demo.mp4', time: Math.min(proofEnd - 0.3, proofStart + 2.3) },
        { name: 'gif-proof.png', source: 'feature-8s.gif', time: 7.3 }];
      for (const frame of frames) {
        const path = join(localOutput, frame.name);
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', String(frame.time), '-i', join(media, frame.source), '-frames:v', '1', path], { timeout: 45000 });
        pixelChecks.push(await inspectPixels(binary, path, locale, entry.ocrTerms, path + '.ocr.json', pixelContext));
      }
      report.locales[locale] = { status: 'PASS', runId: evidence.runId, apiResponses: evidence.calls.length, mediaLocale: locale, hostLocale: entry.hostLocale, pixelChecks, apiTextChecks, probes };
    }
    report.status = 'PASS';
    return report;
  } catch (error) {
    report.status = String(error.message).includes('BLOCKED:') ? 'BLOCKED' : 'FAIL';
    report.error = error.message;
    throw error;
  } finally { await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n'); }
}

export function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['--root', '--only', '--output'].includes(args[i]) && args[i + 1], 'Usage: check-localized-media.mjs [--root checkout] [--only locale] [--output directory]');
    options[args[i].slice(2)] = args[i + 1];
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const report = await verifyLocalizedMedia(options);
    console.log(JSON.stringify({ status: report.status, locales: Object.keys(report.locales), pixelSamples: Object.values(report.locales).reduce((count, row) => count + row.pixelChecks.length, 0), reviewedOcrSegments: Object.values(report.locales).reduce((count, row) => count + row.pixelChecks.reduce((sum, check) => sum + check.pixelReviewCount, 0), 0) }));
  } catch (error) { console.error(error.message); process.exitCode = String(error.message).includes('BLOCKED:') ? 2 : 1; }
}
