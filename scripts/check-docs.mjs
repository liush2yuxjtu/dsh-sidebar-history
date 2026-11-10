import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const languages = ['README.md', ...['zh-CN', 'zh-TW', 'ja', 'es'].map(locale => `docs/i18n/README.${locale}.md`)];
const documents = [...languages, 'docs/telemetry.md', 'docs/discovery.md'];
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const keyword of ['dsh-plugin', 'dsh-plugins', 'deepseek-harness', 'sidebar', 'chat-history', 'todo']) {
  assert.ok(manifest.keywords.includes(keyword), `Missing package keyword: ${keyword}`);
}
assert.ok(manifest.files.includes('docs/i18n'), 'Ship the README translations in the package');
for (const document of documents) {
  const content = await readFile(resolve(root, document), 'utf8');
  assert.equal((content.match(/^# /gm) || []).length, 1, `${document} needs one descriptive H1`);
  assert.ok(!/<(?:script|meta)\b/i.test(content), `Unsupported SEO markup in ${document}`);
  const targets = new Set();
  for (const match of content.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|#)/i.test(href)) continue;
    const path = decodeURIComponent(href.split('#')[0]);
    const target = resolve(dirname(resolve(root, document)), path);
    assert.ok(!relative(root, target).startsWith('..'), `Link leaves repository in ${document}: ${href}`);
    await access(target).catch(() => { throw new Error(`Broken local link in ${document}: ${href}`); });
    targets.add(relative(root, target));
  }
  if (languages.includes(document)) {
    for (const translation of languages) {
      if (translation !== document) assert.ok(targets.has(translation), `Missing language link in ${document}: ${translation}`);
    }
    for (const media of ['demo.mp4', 'feature-8s.gif', 'snapshot.png']) {
      assert.ok(targets.has(`docs/media/live/${media}`), `Missing real API media in ${document}: ${media}`);
    }
    assert.ok(targets.has('docs/telemetry.md'), `Missing telemetry scope in ${document}`);
    assert.ok(content.includes('0.2.2-rc.1') && content.includes('0.1.0'), `Missing compatibility or package version in ${document}`);
  }
}
const english = await readFile(resolve(root, 'README.md'), 'utf8');
assert.ok(english.includes('## Feature video'), 'Preserve the real-media verification section');
console.log(`PASS: ${documents.length} documents, five README languages, local links, live media references, and package keywords`);
