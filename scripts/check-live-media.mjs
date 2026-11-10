import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { assertRealProvenance, hash } from '../tests/live-proof.mjs';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '..');
try {
  const media = join(root, 'docs/media/live');
  const evidence = JSON.parse(await readFile(join(media, 'evidence/result.json'), 'utf8'));
  const events = JSON.parse(await readFile(join(media, 'evidence/native-events.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(join(media, 'provenance.json'), 'utf8'));
  assert.equal(evidence.status, 'PASS');
  assert.equal(evidence.liveModel, true);
  for (const key of ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents']) assert.equal(evidence[key], false);
  assertRealProvenance(evidence.calls, events, evidence.primarySession);
  assert.equal(manifest.runId, evidence.runId);
  for (const name of ['index.mjs', 'client.js', 'src/projection.mjs']) {
    assert.equal(hash(await readFile(join(root, name))), evidence.candidateSources[name], 'Published video runtime differs from staged plugin: ' + name);
  }
  for (const [name, expected] of Object.entries(manifest.artifacts)) {
    assert.ok(!name.includes('..') && !name.startsWith('/'));
    assert.equal(hash(await readFile(join(media, name))), expected, 'Real API media hash mismatch: ' + name);
  }
  assert.equal(hash(await readFile(join(media, 'snapshot.png'))), evidence.screenshots['final.png'], 'Snapshot must be the actual live E2E capture');
  assert.equal(hash(await readFile(join(media, 'raw/gt.mp4'))), evidence.raw_sha256);
  assert.equal(hash(await readFile(join(media, 'demo.mp4'))), evidence.raw_sha256, 'Full video must preserve the exact real API recording');
  assert.ok(evidence.proof_interval_s[1] - evidence.proof_interval_s[0] >= 3);
  const readme = await readFile(join(root, 'README.md'), 'utf8');
  const section = readme.split('## Feature video')[1]?.split('\n## ')[0];
  assert.ok(section?.includes('(docs/media/live/demo.mp4)') && section.includes('(docs/media/live/feature-8s.gif)'));
  assert.ok(section.includes('(docs/media/live/snapshot.png)'));
  assert.ok(!section.includes('(docs/media/demo.mp4)') && !section.includes('(docs/media/feature-8s.gif)'));
  console.log(JSON.stringify({ status: 'PASS', realApiRunId: evidence.runId, artifacts: Object.keys(manifest.artifacts).length, mediaAndReadme: 'actual live API recording' }));
} catch (error) {
  console.error('Live media verification failed: ' + error.message);
  process.exitCode = 1;
}
