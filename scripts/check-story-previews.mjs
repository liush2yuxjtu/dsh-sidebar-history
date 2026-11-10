import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectPixels } from './check-localized-media.mjs';

assert.equal(process.platform, 'darwin', 'Story preview OCR requires the Mac mini Vision runtime.');
assert.equal(process.argv.length, 3, 'Usage: node scripts/check-story-previews.mjs NEW_OUTPUT_DIRECTORY');
const root = resolve(import.meta.dirname, '..');
const output = resolve(process.argv[2]);
await mkdir(output); // Preserve prior evidence; do not overwrite an earlier run.
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(join(root, 'docs/media/story-acceptance.json'), 'utf8'));
const swift = join(root, 'scripts/ocr-media.swift');
const engineHash = sha256(await readFile(swift));
const binary = join(output, 'ocr-media-' + engineHash.slice(0, 16));
const terms = {
  en: ['Chat history', 'Read order data', 'Verify both totals', 'Publish release'],
  'zh-CN': ['历史会话', '读取订单数据', '核对订单金额', '发布版本'],
  'zh-TW': ['歷史會話', '讀取訂單資料', '核對訂單金額', '發佈版本'],
  ja: ['チャット履歴', '注文データを読む', '合計を確認する', 'リリースを公開する'],
  es: ['Historial de chats', 'Leer pedidos', 'Verificar totales', 'Publicar versión'],
};
const report = {
  status: 'RUNNING', at: new Date().toISOString(), engine: 'macOS Vision', engine_source_sha256: engineHash,
  scope: 'OCR of the exact 520×612 progress and result frames decoded from each delivered cropped GIF. Independent visual review verifies checkbox states and excerpt clipping.',
  locales: [],
};
try {
  execFileSync('swiftc', ['-O', swift, '-o', binary, '-framework', 'Vision', '-framework', 'Foundation', '-framework', 'NaturalLanguage'], { timeout: 120000 });
  for (const row of manifest.locales) {
    const local = join(output, row.locale);
    await mkdir(local);
    const images = [];
    for (const frame of row.preview.proof_frames.filter(value => !value.path.endsWith('/before.png'))) {
      const file = join(root, frame.path);
      assert.equal(sha256(await readFile(file)), frame.sha256);
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', file], { encoding: 'utf8' }));
      assert.deepEqual(probe.streams.map(({ width, height }) => ({ width, height })), [{ width: 520, height: 612 }]);
      const count = frame.path.endsWith('/progress.png') ? '0/3' : '2/3';
      const evidence = join(local, basename(frame.path, '.png') + '.ocr.json');
      const result = await inspectPixels(binary, file, row.locale, [count, ...terms[row.locale]], evidence);
      images.push({ asset: frame.path, ...result, requested_preview_time_s: frame.requested_preview_time_s, ocr_evidence: row.locale + '/' + basename(evidence) });
    }
    report.locales.push({ locale: row.locale, preview: row.preview.path, preview_sha256: row.preview.sha256, status: 'PASS', images });
  }
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.reason = error.message;
  throw error;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
