import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { validateRegistry } from './check-localized-media.mjs';

const root = resolve(import.meta.dirname, '..');
const base = (process.argv[2] || 'https://liush2yuxjtu.github.io/dsh-sidebar-history/').replace(/\/?$/, '/');
const output = resolve(process.env.DSH_PUBLISHED_MEDIA_OUTPUT || join(root, '.runtime/publication/media'));
const registry = validateRegistry(JSON.parse(await readFile(join(root, 'docs/media/locales.json'), 'utf8')));
const hash = data => createHash('sha256').update(data).digest('hex');
const jobs = [];
for (const [locale, entry] of Object.entries(registry.locales)) {
  const provenance = JSON.parse(await readFile(join(root, entry.directory, 'provenance.json'), 'utf8'));
  for (const asset of new Set([...Object.keys(provenance.artifacts), 'provenance.json', 'qa.json'])) {
    const local = join(root, entry.directory, asset);
    jobs.push({ locale, local, url: base + entry.directory.slice('docs/'.length) + '/' + asset });
  }
  jobs.push({ locale, local: join(root, entry.readme), url: 'https://raw.githubusercontent.com/liush2yuxjtu/dsh-sidebar-history/main/' + entry.readme });
}
jobs.push({ locale: 'registry', local: join(root, 'docs/media/locales.json'), url: base + 'media/locales.json' });
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', base, at: new Date().toISOString(), files: [] };
let cursor = 0;
try {
  const results = await Promise.allSettled(Array.from({ length: 6 }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const expected = hash(await readFile(job.local));
      const response = await fetch(job.url, { signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status, 200, 'Public asset HTTP: ' + job.url);
      const bytes = Buffer.from(await response.arrayBuffer());
      const actual = hash(bytes);
      const destination = join(output, job.locale, job.url.includes('raw.githubusercontent.com') ? 'README.md' : job.url.slice(base.length).replace(/^media\//, ''));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
      report.files.push({ locale: job.locale, url: job.url, bytes: bytes.length, sha256: actual, expected, status: actual === expected ? 'PASS' : 'FAIL' });
      assert.equal(actual, expected, 'Public bytes differ: ' + job.url);
    }
  }));
  const failed = results.filter(result => result.status === 'rejected');
  assert.deepEqual(failed.map(result => result.reason.message), [], 'Published media mismatch');
  assert.equal(report.files.length, jobs.length);
  report.status = 'PASS';
  console.log(JSON.stringify({ status: report.status, files: report.files.length, languages: Object.keys(registry.locales), output }));
} catch (error) {
  report.status = 'FAIL'; report.error = error.message; throw error;
} finally {
  report.files.sort((a, b) => a.url.localeCompare(b.url));
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
}
