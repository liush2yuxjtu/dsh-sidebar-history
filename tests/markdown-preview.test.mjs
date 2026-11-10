import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryMarkdown, renderHistoryMarkdown } from '../src/markdown-preview.mjs';

const h = (tag, props, ...children) => ({ tag, props, children });
const elements = nodes => nodes.flatMap(node => typeof node === 'string' ? [] : [node, ...elements(node.children)]);
const visibleText = nodes => nodes.map(node => typeof node === 'string' ? node : visibleText(node.children)).join('');

test('renders actual GFM emphasis, code and strikethrough while preserving readable block text', () => {
  const preview = parseHistoryMarkdown('## **Audit**\n\n_Ready_ with `orders.json` and ~~old~~\n\n```js\nconst total = 44;\n```\n\n- First\n- Second\n\n| Item | Total |\n| --- | --- |\n| A | 44 |');
  const rendered = renderHistoryMarkdown(preview, h);
  const tags = elements(rendered).map(node => node.tag);
  for (const tag of ['strong', 'em', 'code', 'del']) assert.ok(tags.includes(tag), tag);
  assert.equal(preview.text, 'Audit Ready with orders.json and old const total = 44; First Second Item Total A 44');
  assert.equal(visibleText(rendered).replace(/\s+/g, ' ').trim(), preview.text);
});

test('history Markdown never creates navigation, image loading, controls or raw HTML', () => {
  const preview = parseHistoryMarkdown('[safe](https://example.com) [unsafe](javascript:alert(1)) ![diagram](https://example.com/tracker.png) <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n```html\n<button>literal code</button>\n```');
  const rendered = renderHistoryMarkdown(preview, h);
  assert.ok(preview.text.includes('safe unsafe diagram'));
  assert.ok(preview.text.includes('<button>literal code</button>'));
  assert.ok(!preview.text.includes('<img'));
  assert.ok(!preview.text.includes('<script>'));
  const nodes = elements(rendered);
  assert.deepEqual(nodes.map(node => node.tag), ['code']);
  assert.ok(nodes.every(node => !Object.keys(node.props).some(key => ['href', 'src', 'dangerouslySetInnerHTML', 'onClick'].includes(key))));
});

test('handles reference links and partially committed Markdown without interpreting labels as URLs', () => {
  const preview = parseHistoryMarkdown('[report][r] ![graph][g] **unfinished\n\n[r]: https://example.com\n[g]: https://example.com/graph.png');
  assert.equal(preview.text, 'report graph **unfinished');
  assert.deepEqual(elements(renderHistoryMarkdown(preview, h)), []);
});
