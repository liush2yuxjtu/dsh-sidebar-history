import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { validateRegistry, assertPixelTerms, normalizeOcr, requiredLocales, parseArguments, inspectPixels, inspectTextLanguages, inspectPixelSentence, languageSentence, assertScreenshotManifest, requiredScreenshots } from '../scripts/check-localized-media.mjs';

const root = resolve(import.meta.dirname, '..');
const terms = { en: 'Chat history', 'zh-CN': '历史会话', 'zh-TW': '歷史會話', ja: '履歴', es: 'Historial' };
const entries = Object.fromEntries(requiredLocales.map(locale => [locale, { directory: 'docs/media/' + locale, readme: 'docs/' + locale + '.md', hostLocale: locale, ocrTerms: [terms[locale]] }]));

test('rejects missing languages and shared English capture paths', () => {
  assert.doesNotThrow(() => validateRegistry({ schemaVersion: 1, locales: entries }));
  const missing = structuredClone(entries); delete missing.ja;
  assert.throws(() => validateRegistry({ schemaVersion: 1, locales: missing }), /five public document languages/);
  const shared = structuredClone(entries); shared.ja.directory = shared.en.directory;
  assert.throws(() => validateRegistry({ schemaVersion: 1, locales: shared }), /must not share/);
  const falseTerms = structuredClone(entries); falseTerms.ja.ocrTerms = ['Chat history'];
  assert.throws(() => validateRegistry({ schemaVersion: 1, locales: falseTerms }), /actual document language/);
});

test('uses distinctive pixel text rather than filenames or script names', () => {
  assert.equal(normalizeOcr('CHAT\nHISTORY!'), 'chathistory');
  assert.doesNotThrow(() => assertPixelTerms('Historial de chats', ['Historial'], 'es', 'renamed.png'));
  assert.throws(() => assertPixelTerms('Chat history\nRead order data', ['履歴'], 'ja', 'japanese.png'), /content-language mismatch/);
  assert.throws(() => assertPixelTerms('历史会话', ['歷史會話'], 'zh-TW', 'traditional.png'), /content-language mismatch/);
  assert.throws(() => assertPixelTerms('チャット履歴 New Session', ['履歴'], 'ja', 'mixed.png'), /untranslated English UI/);
  for (const term of ['Workspaces & archives', 'Earlier reply', 'No task list this turn', 'Search incomplete', 'Retry search']) {
    assert.throws(() => assertPixelTerms('Historial de chats ' + term, ['Historial'], 'es', 'mixed-ux.png'), /untranslated English UI/);
  }
  assert.throws(() => assertPixelTerms('歷史會話 任务', ['歷史會話'], 'zh-TW', 'mixed-script.png'), /Simplified Chinese remains/);
  assert.throws(() => assertPixelTerms('歷史會話 轨迹', ['歷史會話'], 'zh-TW', 'trajectory.png'), /Simplified Chinese remains/);
  assert.throws(() => assertPixelTerms('歷史會話 并完成', ['歷史會話'], 'zh-TW', 'mixed-conjunction.png'), /Simplified Chinese remains/);
});

test('does not classify short technical labels as prose', () => {
  for (const text of ['Off', 'orders.json', 'quantity * unitPrice + shipping', 'DSH deepseek-flash (real API) Off']) assert.equal(languageSentence(text), false, text);
  assert.equal(languageSentence("I'll start by creating the three tasks, then read the file."), true);
});

test('requires lifecycle screenshots and covers every published evidence PNG', () => {
  const screenshots = Object.fromEntries(requiredScreenshots.map(name => [name, 'a'.repeat(64)]));
  assert.doesNotThrow(() => assertScreenshotManifest(screenshots, requiredScreenshots));
  const omitted = { ...screenshots }; delete omitted['stopped.png'];
  assert.throws(() => assertScreenshotManifest(omitted, requiredScreenshots), /Missing required original screenshot/);
  assert.throws(() => assertScreenshotManifest(screenshots, [...requiredScreenshots, 'extra.png']), /Every published evidence PNG/);
  assert.throws(() => assertScreenshotManifest({ ...screenshots, 'extra.png': 'invalid' }, [...requiredScreenshots, 'extra.png']), /SHA256/);
});

test('rejects unknown CLI options', () => {
  assert.deepEqual(parseArguments(['--root', '/tmp/checkout', '--only', 'ja']), { root: '/tmp/checkout', only: 'ja' });
  assert.throws(() => parseArguments(['--skip-ocr', 'true']), /Usage:/);
});

test('Vision rejects actual rehashed English pixels presented as Japanese', { skip: process.platform !== 'darwin' }, async () => {
  await mkdir(join(root, '.runtime/localization'), { recursive: true });
  const output = await mkdtemp(join(root, '.runtime/localization/wrong-language-'));
  const source = join(root, 'docs/media/live/snapshot.png');
  const image = join(output, 'japanese-renamed.png');
  const bytes = await readFile(source);
  await writeFile(image, bytes);
  await writeFile(join(output, 'superficial-provenance.json'), JSON.stringify({ locale: 'ja', sha256: createHash('sha256').update(bytes).digest('hex') }));
  const binary = join(output, 'ocr-media');
  execFileSync('swiftc', ['-O', join(root, 'scripts/ocr-media.swift'), '-o', binary, '-framework', 'Vision', '-framework', 'Foundation', '-framework', 'NaturalLanguage'], { timeout: 120000, stdio: 'pipe' });
  await assert.rejects(inspectPixels(binary, image, 'ja', ['履歴'], join(output, 'actual-ocr.json')), /content-language mismatch/);
  await assert.rejects(inspectTextLanguages(binary, ["I'll start by creating the three tasks, then read the file.", 'Let me verify the totals and update tasks.'], 'es', join(output, 'english-intermediate-responses.json')), /English sentence remains/);
  await assert.rejects(inspectTextLanguages(binary, ['我已讀取訂單資料，并完成金額核對。'], 'zh-TW', join(output, 'mixed-traditional-response.json')), /Simplified Chinese remains/);
  await inspectTextLanguages(binary, ['He comprobado los importes y las primeras dos tareas están completas.', 'Off', 'orders.json', 'quantity * unitPrice + shipping'], 'es', join(output, 'spanish-and-technical-labels.json'));
  await inspectTextLanguages(binary, ['已讀取訂單資料，並完成金額核對。'], 'zh-TW', join(output, 'traditional-response.json'));
  const chineseFormula = '已完成读取和核对，金额按 quantity * unitPrice + shipping 计算：';
  const chineseEvidence = join(output, 'chinese-formula-response.json');
  await inspectTextLanguages(binary, [chineseFormula], 'zh-CN', chineseEvidence);
  const chineseAnalysis = JSON.parse(await readFile(chineseEvidence, 'utf8')).texts[0].segments[0];
  assert.equal(chineseAnalysis.text, chineseFormula, 'Keep the original real-model text');
  assert.ok(chineseAnalysis.classificationText.includes('已完成读取和核对'));
  assert.doesNotMatch(chineseAnalysis.classificationText, /quantity|unitPrice|shipping/);
  assert.equal(chineseAnalysis.language, 'zh-Hans');
});


test('requires exact pixel review and real reference OCR for a clipped Spanish line', { skip: process.platform !== 'darwin' }, async () => {
  const output = await mkdtemp(join(root, '.runtime/localization/clipped-ocr-'));
  const binary = join(output, 'ocr-media');
  execFileSync('swiftc', ['-O', join(root, 'scripts/ocr-media.swift'), '-o', binary, '-framework', 'Vision', '-framework', 'Foundation', '-framework', 'NaturalLanguage'], { timeout: 120000, stdio: 'pipe' });
  const mediaRoot = join(root, 'tests/fixtures/clipped-spanish-ocr');
  const review = JSON.parse(await readFile(join(mediaRoot, 'review.json'), 'utf8'));
  assert.ok(review, 'Retain the actual clipped-line pixel review regression');
  const line = {"box":[0.5109374972656251,0.89249999975,0.3453125,0.014999999999999902],"confidence":0.30000001192092896,"segments":[{"classificationText":"rauncar version penaeme porque requiere aprovacion. no eantes mur","hypotheses":{"en":0.004370314534753561,"es":0.06851328164339066,"fi":0.003983217757195234,"nb":0.006741367280483246,"pt":0.9103132486343384},"language":"pt","text":"rauncar version penaeme porque requiere aprovacion. no eantes mur"}],"text":"rauncar version penaeme porque requiere aprovacion. no eantes mur"};
  const context = { asset: review.asset, sha256: review.sha256, mediaRoot, reviews: [review], evidencePath: join(output, 'clipped.ocr.json') };
  await assert.rejects(inspectPixelSentence(binary, line.segments[0], line, 'es', { ...context, reviews: [] }), /BLOCKED: REVIEW_REQUIRED/);
  const accepted = await inspectPixelSentence(binary, line.segments[0], line, 'es', context);
  assert.equal(accepted.observedLocale, 'es');
  assert.equal(accepted.reference.ocrConfidence, 1);
  assert.ok(accepted.reference.correspondence >= 0.7);
  const referenceReceipt = JSON.parse(await readFile(accepted.reference.evidencePath, 'utf8'));
  assert.equal(referenceReceipt.sha256, review.reference.sha256);
  assert.ok(referenceReceipt.lines.some(item => item.text === review.reference.text));
  for (const mutate of [
    item => { item.sha256 = '0'.repeat(64); },
    item => { item.box[1] += 0.01; },
    item => { item.reference.sha256 = '0'.repeat(64); },
    item => { item.observedLocale = 'pt'; },
    item => { item.reference.text = 'Voy a crear las tres tareas y luego leer el archivo de pedidos.'; },
  ]) {
    const invalid = structuredClone(review); mutate(invalid);
    await assert.rejects(inspectPixelSentence(binary, line.segments[0], line, 'es', { ...context, reviews: [invalid] }), /BLOCKED: REVIEW_REQUIRED/);
  }
  const english = { text: "I'll start by creating the three tasks, then read the file.", language: 'en', hypotheses: { en: 0.99 } };
  await assert.rejects(inspectPixelSentence(binary, english, { ...line, text: english.text, confidence: 1 }, 'es', context), /English sentence remains/);
  await assert.rejects(inspectPixelSentence(binary, english, { ...line, text: english.text, confidence: 0.3 }, 'es', context), /English sentence remains/);
  await assert.rejects(inspectPixelSentence(binary, line.segments[0], { ...line, confidence: 1 }, 'es', context), /sentence language mismatch/);
  const actual = await inspectPixels(binary, join(mediaRoot, review.asset), 'es', ['Historial'], join(output, 'actual-clipped.ocr.json'), { mediaRoot, reviews: [review] });
  assert.equal(actual.pixelReviewCount, 1, 'The actual image needs one explicit pixel review; it is not an automatic OCR pass');
});
