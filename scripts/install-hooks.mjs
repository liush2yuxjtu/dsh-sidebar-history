import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
await chmod(resolve(root, '.githooks/pre-commit'), 0o755);
execFileSync('git', ['-C', root, 'config', 'core.hooksPath', '.githooks']);
assert.equal(execFileSync('git', ['-C', root, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).trim(), '.githooks');
console.log('Installed the repository pre-commit hook. Each commit runs a fresh real API browser E2E.');
