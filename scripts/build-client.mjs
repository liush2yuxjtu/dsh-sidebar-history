import assert from 'node:assert/strict';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join, parse } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/client.mjs'],
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  target: ['es2022'],
  minifyWhitespace: true,
  legalComments: 'none',
  sourcemap: false,
  metafile: true,
  write: false,
});
const output = resolve(root, 'client.js');
const code = result.outputFiles[0].text;
const packages = new Map();
for (const input of Object.keys(result.metafile.inputs).filter(path => path.includes('node_modules/'))) {
  let directory = dirname(resolve(root, input));
  while (directory !== parse(directory).root) {
    try {
      const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (!packages.has(pkg.name)) {
        const license = (await readdir(directory)).find(name => /^licen[cs]e(?:[.-].*)?$/i.test(name));
        assert.ok(license, 'Bundled dependency needs a license notice: ' + pkg.name);
        packages.set(pkg.name, { version: pkg.version, license: await readFile(join(directory, license), 'utf8') });
      }
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      directory = dirname(directory);
    }
  }
}
let notices = 'Licenses for dependencies bundled into client.js\n\n' + [...packages].sort(([a], [b]) => a.localeCompare(b))
  .map(([name, pkg]) => `${name}@${pkg.version}\n${pkg.license.trim()}\n`).join('\n');
const hostLocale = JSON.parse(await readFile(resolve(root, 'src/zh-tw-host-provenance.json'), 'utf8'));
notices += '\nDeepSeek Harness native Traditional Chinese dictionary contributions\n' + hostLocale.sourceRepository + '\n' + hostLocale.sourceLicenseText.trim() + '\n';
if (process.argv.includes('--check')) {
  assert.equal(await readFile(output, 'utf8'), code, 'client.js is stale. Run npm run build:client.');
  assert.equal(await readFile(resolve(root, 'THIRD_PARTY_NOTICES.txt'), 'utf8'), notices, 'Bundled license notices are stale.');
} else {
  await writeFile(output, code);
  await writeFile(resolve(root, 'THIRD_PARTY_NOTICES.txt'), notices);
}
console.log('PASS: deterministic client bundle ' + (process.argv.includes('--check') ? 'matches source' : 'generated'));
