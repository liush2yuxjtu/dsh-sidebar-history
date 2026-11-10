import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { exportStagedCandidate, assertUnchangedIndex } from './candidate.mjs';

const repository = resolve(import.meta.dirname, '..');
function setting(key) {
  try { return execFileSync('git', ['-C', repository, 'config', '--get', key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}
const runId = randomUUID();
const output = join(repository, '.runtime/precommit', runId);
const temporary = await mkdtemp(join(tmpdir(), 'dsh-sidebar-candidate-'));
let candidate;
try {
  await mkdir(output, { recursive: true });
  candidate = await exportStagedCandidate(repository, temporary);
  const source = process.env.DSH_SOURCE_ROOT || setting('dsh.sourceRoot');
  if (!source) throw new Error('BLOCKED: configure DSH_SOURCE_ROOT before committing.');
  await symlink(join(repository, 'node_modules'), join(temporary, 'node_modules'), 'junction');
  const env = { ...process.env, DSH_SOURCE_ROOT: source,
    DSH_PROVIDER_ENV_FILE: process.env.DSH_PROVIDER_ENV_FILE || setting('dsh.liveEnvFile'),
    DSH_CANDIDATE_TREE: candidate.tree, DSH_LIVE_OUTPUT: join(output, 'live') };
  const gitLocal = execFileSync('git', ['-C', repository, 'rev-parse', '--local-env-vars'], { encoding: 'utf8' }).trim().split('\n');
  for (const name of gitLocal) delete env[name];
  console.log(`Pre-commit real E2E started. Staged tree ${candidate.tree}. Run ${runId}.`);
  const checks = [
    ['unit-build', process.execPath, ['--run', 'verify']],
    ['controlled-browser', process.execPath, ['scripts/browser-test.mjs']],
    ['live-media-provenance', process.execPath, ['scripts/check-live-media.mjs']],
    ['real-api-browser', process.execPath, ['scripts/live-browser.mjs']],
  ];
  for (const [name, command, args] of checks) {
    const result = spawnSync(command, args, { cwd: temporary, env, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
    const log = (result.stdout || '') + (result.stderr || '');
    await writeFile(join(output, name + '.log'), log.replace(/https?:\/\/[^\s\"<>]+/g, url => url.startsWith('https://api.deepseek.com') ? url : '[redacted-url]'));
    if (result.error || result.status !== 0) throw new Error(`${name} failed. Commit refused. Inspect ${join(output, name + '.log')}`);
    console.log(`Pre-commit ${name}: PASS.`);
  }
  const evidence = JSON.parse(await readFile(join(output, 'live/evidence/result.json'), 'utf8'));
  assert.equal(evidence.status, 'PASS');
  assert.equal(evidence.candidateTree, candidate.tree);
  assert.equal(evidence.liveModel, true);
  assert.equal(evidence.mockedService, false);
  assert.equal(evidence.scriptedModel, false);
  assert.equal(evidence.seededAssistantMessages, false);
  assert.equal(evidence.seededTodoEvents, false);
  assert.ok(evidence.calls.length > 0 && evidence.calls.every(call => call.httpStatus === 200 && call.responseId && call.usage.output_tokens > 0));
  assertUnchangedIndex(repository, candidate.tree);
  await writeFile(join(output, 'receipt.json'), JSON.stringify({ status: 'PASS', runId, ...candidate, at: new Date().toISOString(),
    realApiRunId: evidence.runId, apiCalls: evidence.calls.length, checks: checks.map(([name]) => name),
    note: 'Fresh real E2E executed from exported staged files. Index unchanged. Receipt is ignored to avoid changing the validated tree.' }, null, 2) + '\n');
  console.log(`Pre-commit real E2E PASS. ${evidence.calls.length} actual API responses. Staged tree ${candidate.tree}.`);
} catch (error) {
  await writeFile(join(output, 'receipt.json'), JSON.stringify({ status: 'BLOCKED_OR_FAIL', runId, candidate: candidate || null, error: error.message }, null, 2)).catch(() => {});
  console.error(error.message); process.exitCode = 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
