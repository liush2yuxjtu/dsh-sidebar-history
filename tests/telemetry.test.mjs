import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { collectTelemetry, parseArguments, renderReport } from '../scripts/collect-telemetry.mjs';

const repository = 'owner/plugin';
const responses = () => ({
  '': { private: false, stargazers_count: 4, forks_count: 2, topics: ['dsh-plugin'], owner: { login: 'PRIVATE_USER' } },
  '/traffic/views?per=day': { count: 9, uniques: 3, views: [
    { timestamp: '2026-11-09T00:00:00Z', count: 4, uniques: 2 },
    { timestamp: '2026-11-10T00:00:00Z', count: 5, uniques: 2 },
  ] },
  '/traffic/clones?per=day': { count: 3, uniques: 1, clones: [] },
  '/traffic/popular/referrers': [{ referrer: 'https://example.com/private?token=SECRET', count: 2, uniques: 1 }],
  '/traffic/popular/paths': [{ path: '/owner/plugin/blob/main/README.md?token=SECRET', title: 'PRIVATE_TITLE', count: 2, uniques: 1 }],
  '/releases?per_page=100': [[]],
});
const client = (values, calls = []) => async args => {
  calls.push(args);
  const value = values[args[1].slice(`repos/${repository}`.length)];
  if (value instanceof Error) throw value;
  return JSON.stringify(value);
};

test('preserves window uniques and strips fields, referrer details, and URL query strings', async () => {
  const result = await collectTelemetry({ repository, runGh: client(responses()), now: '2026-11-10T10:00:00Z' });
  assert.equal(result.status, 'PASS');
  assert.equal(result.metrics.views.uniques, 3);
  assert.equal(result.metrics.views.daily.reduce((sum, day) => sum + day.uniques, 0), 4);
  assert.equal(result.metrics.referrers[0].domain, 'example.com');
  assert.equal(result.metrics.paths[0].path, '/owner/plugin/blob/main/README.md');
  assert.equal(result.metrics.releaseAssets.assetDownloads, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_USER|PRIVATE_TITLE|SECRET/);
  assert.match(renderReport(result), /not installations or active users/);
});

test('collects all release and asset pages while excluding drafts', async () => {
  const values = responses();
  values['/releases?per_page=100'] = [
    [{ id: 1, tag_name: 'v1', draft: false, prerelease: false }, { id: 2, draft: true }],
    [{ id: 3, tag_name: 'v2-beta', draft: false, prerelease: true }],
  ];
  values['/releases/1/assets?per_page=100'] = [[{ name: 'a.tgz', download_count: 2 }], [{ name: 'b.zip', download_count: 5 }]];
  values['/releases/3/assets?per_page=100'] = [[{ name: 'beta.tgz', download_count: 4 }]];
  const calls = [];
  const result = await collectTelemetry({ repository, runGh: client(values, calls) });
  assert.equal(result.status, 'PASS');
  assert.equal(result.metrics.releaseAssets.publishedReleases, 2);
  assert.equal(result.metrics.releaseAssets.assetDownloads, 11);
  const paginated = calls.filter(args => args[1].includes('per_page='));
  assert.equal(paginated.length, 3);
  for (const args of paginated) assert.deepEqual(args.slice(-2), ['--paginate', '--slurp']);
});

test('keeps accessible data when permissions fail and never replaces a failure with zero', async () => {
  const values = responses();
  values['/traffic/views?per=day'] = Object.assign(new Error('SECRET'), { stderr: 'gh: HTTP 403 SECRET' });
  const result = await collectTelemetry({ repository, runGh: client(values) });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.sources.views.errorCode, 'FORBIDDEN');
  assert.equal(result.metrics.views, null);
  assert.equal(result.metrics.clones.count, 3);
  assert.doesNotMatch(JSON.stringify(result), /SECRET/);
  assert.match(renderReport(result), /Views \| BLOCKED/);
});

test('rejects malformed API data and incomplete pagination instead of reporting healthy totals', async () => {
  const values = responses();
  values['/traffic/clones?per=day'] = { count: '0', uniques: 0, clones: [] };
  values['/releases?per_page=100'] = [{ id: 1, draft: false }];
  const result = await collectTelemetry({ repository, runGh: client(values) });
  assert.equal(result.metrics.clones, null);
  assert.equal(result.sources.clones.errorCode, 'INVALID_RESPONSE');
  assert.equal(result.metrics.releaseAssets, null);
  const blocked = await collectTelemetry({ repository, runGh: async () => 'not json' });
  assert.equal(blocked.status, 'BLOCKED');
  assert.ok(Object.values(blocked.sources).every(source => source.errorCode === 'INVALID_RESPONSE'));
});

test('accepts spaced output paths and rejects unsafe repositories, unknown flags, and tracked destinations', () => {
  const repoRoot = resolve(import.meta.dirname, '..');
  assert.deepEqual(parseArguments(['--repo', repository, '--out', '.runtime/my reports'], repoRoot), { repository, output: resolve(repoRoot, '.runtime/my reports') });
  for (const args of [['--repo', '../unsafe'], ['--mock', 'yes'], ['--out'], ['--out', '.'], ['--out', 'docs']]) {
    assert.throws(() => parseArguments(args, repoRoot));
  }
});
