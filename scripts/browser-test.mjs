import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { mkdir, lstat, symlink } from 'node:fs/promises';

if (!process.env.DSH_SOURCE_ROOT) throw new Error('Set DSH_SOURCE_ROOT to the built DSH 0.2.2-rc.1 checkout');
const source = resolve(process.env.DSH_SOURCE_ROOT);
const root = resolve(import.meta.dirname, '..');
await mkdir(join(root, 'node_modules'), { recursive: true });
for (const [name, target] of [
  ['vitest', join(source, 'node_modules/vitest')],
  ['playwright', join(source, 'apps/web/node_modules/playwright')],
  ['zod', join(source, 'node_modules/zod')],
]) {
  const local = join(root, 'node_modules', name);
  try { await lstat(local); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await symlink(target, local, 'junction');
  }
}
const config = resolve(import.meta.dirname, '../tests/vitest.config.mjs');
const child = spawn(process.execPath, [join(source, 'node_modules/vitest/vitest.mjs'), 'run', '--config', config], {
  cwd: source, env: { ...process.env, DSH_SOURCE_ROOT: source }, stdio: 'inherit',
});
child.on('exit', code => { process.exitCode = code ?? 1; });
