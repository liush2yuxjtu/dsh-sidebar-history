import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportStagedCandidate, assertUnchangedIndex } from '../scripts/candidate.mjs';

it('exports staged content even when the working copy differs, and rejects a later index change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sidebar-gate-test-'));
  const repo = join(root, 'repo'); const snapshot = join(root, 'snapshot');
  const git = args => execFileSync('git', ['-C', repo, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    execFileSync('git', ['init', '-q', repo]);
    git(['config', 'user.name', 'Candidate test']); git(['config', 'user.email', 'candidate@example.invalid']);
    await writeFile(join(repo, 'client.js'), 'staged candidate\n');
    git(['add', 'client.js']); git(['commit', '-qm', 'initial']);
    await writeFile(join(repo, 'client.js'), 'uncommitted working copy\n');
    const candidate = await exportStagedCandidate(repo, snapshot);
    assert.equal(await readFile(join(snapshot, 'client.js'), 'utf8'), 'staged candidate\n');
    assertUnchangedIndex(repo, candidate.tree);
    git(['add', 'client.js']);
    assert.throws(() => assertUnchangedIndex(repo, candidate.tree), /staged candidate changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
