import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, relative, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const defaultRepository = 'liush2yuxjtu/dsh-sidebar-history';
const integer = value => Number.isSafeInteger(value) && value >= 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value);
const requireShape = condition => { if (!condition) throw Object.assign(new Error('Invalid GitHub response.'), { telemetryCode: 'INVALID_RESPONSE' }); };
const count = value => { requireShape(integer(value)); return value; };
const name = value => { requireShape(text(value)); return value; };

function traffic(value, key) {
  requireShape(record(value) && Array.isArray(value[key]));
  return {
    windowDays: 14,
    count: count(value.count),
    uniques: count(value.uniques),
    daily: value[key].map(day => {
      requireShape(record(day) && /^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(day.timestamp));
      return { timestamp: day.timestamp, count: count(day.count), uniques: count(day.uniques) };
    }),
  };
}

function referrerDomain(value) {
  if (value === 'Google') return 'google.com';
  if (typeof value !== 'string') return 'other';
  try {
    const host = new URL(value.includes('://') ? value : 'https://' + value).hostname;
    return /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(host) ? host.toLowerCase() : 'other';
  } catch { return 'other'; }
}

function repositoryPath(value, repository) {
  requireShape(typeof value === 'string');
  const path = value.split(/[?#]/)[0];
  requireShape(text(path) && (path === '/' + repository || path.startsWith('/' + repository + '/')));
  return path;
}

const endpoints = [
  { key: 'repository', path: '', parse(value) {
    requireShape(record(value) && typeof value.private === 'boolean' && Array.isArray(value.topics));
    return { stars: count(value.stargazers_count), forks: count(value.forks_count), visibility: value.private ? 'private' : 'public', topics: value.topics.map(name) };
  } },
  { key: 'views', path: '/traffic/views?per=day', parse: value => traffic(value, 'views') },
  { key: 'clones', path: '/traffic/clones?per=day', parse: value => traffic(value, 'clones') },
  { key: 'referrers', path: '/traffic/popular/referrers', parse(value) {
    requireShape(Array.isArray(value));
    return value.map(item => {
      requireShape(record(item));
      return { domain: referrerDomain(item.referrer), count: count(item.count), uniques: count(item.uniques) };
    });
  } },
  { key: 'paths', path: '/traffic/popular/paths', parse(value, repository) {
    requireShape(Array.isArray(value));
    return value.map(item => {
      requireShape(record(item));
      return { path: repositoryPath(item.path, repository), count: count(item.count), uniques: count(item.uniques) };
    });
  } },
  { key: 'releaseAssets', path: '/releases?per_page=100', paginated: true, async parse(values, repository, request) {
    const published = [];
    for (const release of values) {
      requireShape(record(release) && typeof release.draft === 'boolean');
      if (release.draft) continue;
      requireShape(integer(release.id) && typeof release.prerelease === 'boolean');
      const assets = await request(`/releases/${release.id}/assets?per_page=100`, true);
      published.push({ id: release.id, tag: name(release.tag_name), prerelease: release.prerelease,
        assets: assets.map(asset => {
          requireShape(record(asset));
          return { name: name(asset.name), downloadCount: count(asset.download_count) };
        }) });
    }
    const assetDownloads = published.flatMap(release => release.assets).reduce((sum, asset) => count(sum + asset.downloadCount), 0);
    return { publishedReleases: published.length, assetDownloads, releases: published };
  } },
];

function errorCode(error) {
  if (error.telemetryCode) return error.telemetryCode;
  if (error.code === 'ENOENT') return 'GH_NOT_INSTALLED';
  if (error.killed || error.code === 'ETIMEDOUT') return 'TIMEOUT';
  const status = /HTTP\s+(401|403|404|429)\b/.exec(String(error.stderr || ''))?.[1];
  return ({ 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 429: 'RATE_LIMITED' })[status] || 'GH_REQUEST_FAILED';
}

async function defaultRunGh(args) {
  return (await execute('gh', args, { timeout: 30000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' })).stdout;
}

export async function collectTelemetry({ repository = defaultRepository, runGh = defaultRunGh, now = new Date() } = {}) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository)) throw new Error('Use --repo owner/name.');
  const request = async (path, paginated = false) => {
    const args = ['api', `repos/${repository}${path}`, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
    if (paginated) args.push('--paginate', '--slurp');
    let value;
    try { value = JSON.parse(await runGh(args)); }
    catch (error) {
      if (error instanceof SyntaxError) throw Object.assign(new Error('Invalid GitHub JSON.'), { telemetryCode: 'INVALID_RESPONSE' });
      throw error;
    }
    if (paginated) {
      requireShape(Array.isArray(value) && value.every(Array.isArray));
      return value.flat();
    }
    return value;
  };
  const snapshot = { schemaVersion: 1, capturedAt: new Date(now).toISOString(), repository, status: 'PASS', sources: {}, metrics: {} };
  for (const endpoint of endpoints) {
    const path = `repos/${repository}${endpoint.path}`;
    try {
      snapshot.metrics[endpoint.key] = await endpoint.parse(await request(endpoint.path, endpoint.paginated), repository, request);
      snapshot.sources[endpoint.key] = { status: 'PASS', path };
    } catch (error) {
      snapshot.metrics[endpoint.key] = null;
      snapshot.sources[endpoint.key] = { status: 'BLOCKED', path, errorCode: errorCode(error) };
    }
  }
  const passed = Object.values(snapshot.sources).filter(source => source.status === 'PASS').length;
  snapshot.status = passed === endpoints.length ? 'PASS' : passed ? 'PARTIAL' : 'BLOCKED';
  return snapshot;
}

export function renderReport(snapshot) {
  const metric = (key, field) => snapshot.metrics[key]?.[field] ?? 'BLOCKED';
  const rows = Object.entries(snapshot.sources).map(([key, value]) => `| ${key} | ${value.status} | ${value.errorCode || '—'} |`).join('\n');
  return `# GitHub telemetry\n\nRepository: ${snapshot.repository}\n\nCaptured at: ${snapshot.capturedAt}\n\nStatus: ${snapshot.status}\n\n| Metric | Value | Meaning |\n|---|---|---|\n| Views | ${metric('views', 'count')} | GitHub rolling 14-day page views |\n| Unique viewers | ${metric('views', 'uniques')} | GitHub window-level uniques |\n| Clones | ${metric('clones', 'count')} | GitHub rolling 14-day clone operations |\n| Unique cloners | ${metric('clones', 'uniques')} | GitHub window-level uniques |\n| Stars | ${metric('repository', 'stars')} | Current total |\n| Forks | ${metric('repository', 'forks')} | Current total |\n| Release asset downloads | ${metric('releaseAssets', 'assetDownloads')} | Lifetime downloads of published assets |\n\n| Source | Status | Error |\n|---|---|---|\n${rows}\n\nTraffic includes maintainer, automation, and repeat activity. Clones and downloads are not installations or active users. Source archives are not release asset downloads. GitHub supplies only the top 10 referrers and paths. Do not sum daily uniques or overlapping 14-day windows. A missing source is BLOCKED, not zero. Snapshots are independent observations, not cumulative records. No plugin clicks, search terms, chat content, identifiers, retention, or SEO ranking are measured.\n`;
}

export function parseArguments(args, cwd = process.cwd()) {
  let repository = defaultRepository;
  let output = '.runtime/telemetry';
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!['--repo', '--out'].includes(flag) || !value || value.startsWith('--')) throw new Error('Usage: node scripts/collect-telemetry.mjs [--repo owner/name] [--out directory]');
    if (flag === '--repo') repository = value;
    else output = value;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository)) throw new Error('Use --repo owner/name.');
  output = resolve(cwd, output);
  const inside = relative(root, output);
  if (inside === '' || (!inside.startsWith('..' + sep) && !inside.startsWith(sep) && inside !== '..' && inside !== '.runtime' && !inside.startsWith('.runtime' + sep))) {
    throw new Error('Inside this checkout, save reports only under .runtime.');
  }
  return { repository, output };
}

async function main() {
  const { repository, output } = parseArguments(process.argv.slice(2));
  const snapshot = await collectTelemetry({ repository });
  await mkdir(output, { recursive: true });
  const suffix = snapshot.capturedAt.replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  const json = JSON.stringify(snapshot, null, 2) + '\n';
  await writeFile(join(output, `snapshot-${suffix}.json`), json, { flag: 'wx', mode: 0o600 });
  const temporary = join(output, `.latest-${suffix}.json`);
  await writeFile(temporary, json, { flag: 'wx', mode: 0o600 });
  await rename(temporary, join(output, 'latest.json'));
  await writeFile(join(output, 'report.md'), renderReport(snapshot), { mode: 0o600 });
  console.log(JSON.stringify({ status: snapshot.status, repository, output, sources: snapshot.sources }, null, 2));
  if (snapshot.status !== 'PASS') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Telemetry collection failed. Check CLI arguments, gh authentication, and the output directory. No response or credentials were logged.'); process.exitCode = 2; });
}
