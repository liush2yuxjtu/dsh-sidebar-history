import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { validateRegistry, assertPixelTerms, normalizeOcr, requiredLocales, parseArguments, inspectPixels, inspectTextLanguages, languageSentence } from '../scripts/check-localized-media.mjs';

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
  assert.throws(() => assertPixelTerms('歷史會話 任务', ['歷史會話'], 'zh-TW', 'mixed-script.png'), /Simplified Chinese remains/);
  assert.throws(() => assertPixelTerms('歷史會話 轨迹', ['歷史會話'], 'zh-TW', 'trajectory.png'), /Simplified Chinese remains/);
  assert.throws(() => assertPixelTerms('歷史會話 并完成', ['歷史會話'], 'zh-TW', 'mixed-conjunction.png'), /Simplified Chinese remains/);
});

test('does not classify short technical labels as prose', () => {
  for (const text of ['Off', 'orders.json', 'quantity * unitPrice + shipping', 'DSH deepseek-flash (real API) Off']) assert.equal(languageSentence(text), false, text);
  assert.equal(languageSentence("I'll start by creating the three tasks, then read the file."), true);
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
