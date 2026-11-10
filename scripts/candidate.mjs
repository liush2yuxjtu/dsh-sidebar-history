import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { sep } from 'node:path';
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
export async function exportStagedCandidate(repository, destination) {
  const tree = git(repository, ['write-tree']);
  const head = git(repository, ['rev-parse', 'HEAD']);
  await mkdir(destination, { recursive: true });
  git(repository, ['checkout-index', '--all', '--prefix=' + destination + sep]);
  assertUnchangedIndex(repository, tree);
  return { tree, head };
}
export function assertUnchangedIndex(repository, tree) {
  if (git(repository, ['write-tree']) !== tree) throw new Error('FAIL: staged candidate changed during verification. Commit refused.');
}
