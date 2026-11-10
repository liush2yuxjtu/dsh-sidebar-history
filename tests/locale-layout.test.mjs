import { browserOptions } from './browser-options.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { it } from 'vitest';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const source = resolve(process.env.DSH_SOURCE_ROOT);
const root = resolve(import.meta.dirname, '..');
const require = createRequire(join(source, 'apps/cli/package.json'));
const { SESSION_FORMAT_VERSION } = require('@deepseek-ai/dsh-session');
const { createSystemMessage } = require('@deepseek-ai/dsh-llm');
const { launchWebScaffold, seedSession } = await import(pathToFileURL(join(source, 'apps/web/tests/scaffold.ts')).href);
const historicalReply = "**6b08a024**\n\n`orders.json` の内容を確認しました。ファイルの変更や公開は、どれも行っていません。\n\n- **注文 A**：4 × 9 + 2 = 38 です。\n- **注文 B**：0 × 9 + 5 = 5 です。個数が 0 なので、送料の 5 だけが残ります。\n\nリリースの公開は承認待ちのため、保留にしておきました。公開の指示をいただければ、そのときに対応します。";
const cases = [
  { id: 'historical-japanese', code: 'orders.json', reply: historicalReply },
  { id: 'cjk-inline-code', code: '注文一覧.json', reply: historicalReply.replace('orders.json', '注文一覧.json') },
];

function fixture({ code, reply }) {
  let seq = 0;
  const createdAt = Date.now() - 3600000;
  const lines = [{ type: 'session', version: SESSION_FORMAT_VERSION, id: '{{sessionId}}', createdAt, cwd: '{{cwd}}/workspace', isSeeded: false, delegationDepth: 0 }];
  const at = (type, data, surfaceOp) => lines.push({ type, data, seq: seq++, time: createdAt + seq, ...(surfaceOp ? { surfaceOp } : {}) });
  at('turn/start', { turn: 1 });
  at('step/start', { turn: 1, step: 1 });
  at('system/message', { turn: 1, step: 1, message: createSystemMessage('') }, 'append');
  at('user/message', { id: crypto.randomUUID(), role: 'user', content: [{ type: 'text', text: 'Controlled layout regression from an actual API response. No model call.' }], source: { kind: 'user' } }, 'append');
  at('session/title', { title: code + ' を確認してください', messageSeqs: [], source: { kind: 'user' } });
  at('todo/write', { todos: [{ content: '注文データを読む', status: 'completed' }, { content: '合計を確認する', status: 'completed' }, { content: 'リリースを公開する', status: 'pending' }] });
  at('assistant/message', { turn: 1, step: 1, stream: [], message: { id: crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text: reply }], source: { kind: 'model', provider: 'layout-regression', model: 'controlled-historical-reply' } } }, 'append');
  at('step/end', { turn: 1, step: 1 });
  at('turn/end', { turn: 1, reason: { kind: 'completed' } });
  return lines.map(line => JSON.stringify(line)).join('\n') + '\n';
}

async function metrics(card) {
  return card.evaluate(element => {
    const preview = element.querySelector('.dsh-history-preview-content');
    const description = node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      const context = document.createElement('canvas').getContext('2d');
      context.font = style.font;
      const measure = context.measureText(node.textContent);
      return { tag: node.tagName, text: node.textContent, font: style.font, fontSize: style.fontSize, fontFamily: style.fontFamily,
        lineHeight: style.lineHeight, verticalAlign: style.verticalAlign, display: style.display, padding: style.padding,
        rect: { x: box.x, y: box.y, width: box.width, height: box.height },
        glyph: { ascent: measure.actualBoundingBoxAscent, descent: measure.actualBoundingBoxDescent, fontAscent: measure.fontBoundingBoxAscent, fontDescent: measure.fontBoundingBoxDescent } };
    };
    const cardBox = element.getBoundingClientRect(), previewBox = preview.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(preview);
    return { height: cardBox.height, fontSize: Number.parseFloat(getComputedStyle(preview).fontSize), previewHeight: previewBox.height,
      fits: previewBox.top >= cardBox.top && previewBox.bottom <= cardBox.bottom + 1 && previewBox.left >= cardBox.left && previewBox.right <= cardBox.right + 1,
      preview: description(preview), strong: description(preview.querySelector('strong')), code: description(preview.querySelector('code')),
      fragments: [...range.getClientRects()].map(box => ({ x: box.x, y: box.y, width: box.width, height: box.height })) };
  });
}

it('keeps Japanese Markdown and CJK inline code inside two readable preview lines', async () => {
  const output = join(root, '.runtime/locale-layout/regression');
  await mkdir(output, { recursive: true });
  const scaffold = await launchWebScaffold({ profile: { hmr: false, packages: [{ dir: root, enabled: true }] } });
  let browser;
  try {
    for (const item of cases) await seedSession(scaffold, fixture(item), item.id);
    browser = await chromium.launch(browserOptions());
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'ja-JP', colorScheme: 'dark' });
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    const results = { fixtureData: true, liveModel: false, cases: [] };
    for (const item of cases) {
      const card = page.getByRole('option', { name: item.code + ' を確認してください', exact: true });
      await expect(card).toBeVisible();
      await card.click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
      await expect(card.locator('.dsh-history-preview-content strong').first()).toBeVisible();
      await expect(card.locator('.dsh-history-preview-content code').first()).toHaveText(item.code);
      const actual = await metrics(card);
      results.cases.push({ ...item, actual });
      await page.screenshot({ path: join(output, item.id + '.png') });
      await card.screenshot({ path: join(output, item.id + '-card.png') });
      await writeFile(join(output, 'result.json'), JSON.stringify(results, null, 2) + '\n');
      assert.ok(actual.height <= 200 && actual.fontSize >= 12 && actual.previewHeight <= 36.1 && actual.fits,
        'Controlled Japanese preview geometry: ' + JSON.stringify(actual));
      assert.ok(actual.code.rect.y >= actual.preview.rect.y &&
        actual.code.rect.y + actual.code.rect.height <= actual.preview.rect.y + actual.preview.rect.height,
        'Visible inline code remains fully inside the two-line preview: ' + JSON.stringify(actual.code));
    }
  } finally { await browser?.close(); await scaffold.close(); }
}, 120000);
