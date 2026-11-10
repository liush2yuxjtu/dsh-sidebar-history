import { readFile, mkdir, lstat, symlink } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
function setting(key) {
  try { return execFileSync('git', ['-C', root, 'config', '--get', key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
try {
  const source = process.env.DSH_SOURCE_ROOT || setting('dsh.sourceRoot');
  if (!source) throw new Error('BLOCKED: set DSH_SOURCE_ROOT to the built pinned DSH checkout.');
  const envFile = process.env.DSH_PROVIDER_ENV_FILE || setting('dsh.liveEnvFile');
  if (!process.env.DEEPSEEK_API_KEY && envFile) {
    const values = Object.fromEntries((await readFile(envFile, 'utf8')).split('\n').flatMap(line => {
      const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
    }));
    if (values.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = values.DEEPSEEK_API_KEY;
    else if (values.ANTHROPIC_AUTH_TOKEN && new URL(values.ANTHROPIC_BASE_URL).origin === 'https://api.deepseek.com') {
      process.env.DEEPSEEK_API_KEY = values.ANTHROPIC_AUTH_TOKEN;
    }
  }
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('BLOCKED: real API credentials are missing. No mock fallback is allowed.');
  const output = resolve(process.env.DSH_LIVE_OUTPUT || join(root, '.runtime/live', String(Date.now())));
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output, { recursive: false });
  await mkdir(join(root, 'node_modules'), { recursive: true });
  for (const [name, target] of [['vitest', 'node_modules/vitest'], ['playwright', 'apps/web/node_modules/playwright'], ['zod', 'node_modules/zod']]) {
    const local = join(root, 'node_modules', name);
    try { await lstat(local); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await symlink(join(source, target), local, 'junction');
    }
  }
  const child = spawn(process.execPath, [join(source, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(root, 'tests/live.config.mjs')], {
    cwd: root,
    env: { ...process.env, DSH_SOURCE_ROOT: source, DSH_LIVE_OUTPUT: output, DSH_SNAPSHOT: 'record', DSH_LIVE_RECORD: process.argv.includes('--record') ? '1' : '0', DSH_TELEMETRY_MODE: 'DISABLED' },
    stdio: 'inherit',
  });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error.code === 'ENOENT' ? 'BLOCKED: configured credential file or DSH prerequisite is missing.' : error.message);
  process.exitCode = 1;
}
