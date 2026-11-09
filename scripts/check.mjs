import assert from 'node:assert/strict';
import { readFile, access, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(manifest.name, 'dsh-sidebar-history');
assert.equal(manifest.exports['./client'], './client.js');
assert.equal(manifest.exports['.'].types, './index.d.ts');
assert.equal(manifest.exports['.'].default, './index.mjs');
assert.equal(manifest.dsh.client.platform, 'web');
for (const file of ['index.mjs', 'client.js', 'src/projection.mjs', 'scripts/browser-test.mjs', 'tests/browser.test.mjs']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  assert.equal(result.status, 0, `Syntax check: ${file}`);
}
for (const file of ['README.md', 'LICENSE', 'AGENTS.md', 'cordis.patch.yml', '.agents/skills/verify/references/surfaces.md']) await access(file);
for (const skill of ['run', 'verify']) assert.equal(await realpath(`.claude/skills/${skill}`), await realpath(`.agents/skills/${skill}`));
await access('.agents/skills/run/references/dsh-source.md');
const client = await readFile('client.js', 'utf8');
assert.ok(client.includes("id: 'dsh-sidebar-history'"));
assert.ok(!client.includes('sessions.retain('), 'History rows must not activate sessions');
assert.ok(!client.includes('innerHTML'), 'Session text must render through React escaping');
console.log('PASS: package entries, JavaScript syntax, guide references and safe client rendering');
