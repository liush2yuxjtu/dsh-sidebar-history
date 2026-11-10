import assert from 'node:assert/strict';
import { readFile, access, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(manifest.name, 'dsh-sidebar-history');
assert.equal(manifest.exports['./client'], './client.js');
assert.equal(manifest.exports['.'].types, './index.d.ts');
assert.equal(manifest.exports['.'].default, './index.mjs');
assert.equal(manifest.dsh.client.platform, 'web');
for (const file of ['index.mjs', 'client.js', 'src/client.mjs', 'src/markdown-preview.mjs', 'src/projection.mjs', 'scripts/build-client.mjs', 'tests/markdown-preview.test.mjs', 'tests/projection-migration.test.mjs', 'scripts/browser-test.mjs', 'tests/browser.test.mjs', 'tests/live.test.mjs', 'tests/live-proof.mjs', 'tests/live.config.mjs', 'tests/candidate.test.mjs', 'tests/telemetry.test.mjs', 'scripts/collect-telemetry.mjs', 'scripts/check-docs.mjs', 'scripts/verify-site.mjs', 'scripts/live-browser.mjs', 'scripts/candidate.mjs', 'scripts/pre-commit.mjs', 'scripts/install-hooks.mjs', 'scripts/check-live-media.mjs', 'scripts/check-video.mjs']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  assert.equal(result.status, 0, `Syntax check: ${file}`);
}
for (const file of ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.txt', 'AGENTS.md', 'cordis.patch.yml', '.agents/skills/verify/references/surfaces.md']) await access(file);
for (const skill of ['run', 'verify']) assert.equal(await realpath(`.claude/skills/${skill}`), await realpath(`.agents/skills/${skill}`));
await access('.agents/skills/run/references/dsh-source.md');
const client = await readFile('client.js', 'utf8');
assert.ok(/id:\s*['"]dsh-sidebar-history['"]/.test(client));
assert.ok(!client.includes('sessions.retain('), 'History rows must not activate sessions');
assert.ok(!client.includes('innerHTML'), 'Session text must render through React escaping');
console.log('PASS: package entries, JavaScript syntax, guide references and safe client rendering');
