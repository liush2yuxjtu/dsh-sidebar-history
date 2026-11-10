import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
const require = createRequire(join(resolve(process.env.DSH_SOURCE_ROOT), 'apps/web/package.json'));
const { chromium } = require('playwright');
const media = resolve(process.argv[2]);
const bytes = await readFile(media);
const server = createServer((request, response) => {
  if (request.url === '/demo.mp4') {
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
    const headers = { 'Content-Type': 'video/mp4', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
    response.writeHead(range ? 206 : 200, headers);
    response.end(bytes.subarray(start, end + 1));
  } else if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><html lang="en"><title>DSH feature video playback</title><body style="margin:0;background:#111"><video style="width:100%" muted controls src="/demo.mp4"></video></body></html>');
  } else { response.writeHead(204); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  await page.evaluate(async () => { const v = document.querySelector('video'); await v.play(); });
  await page.waitForTimeout(1600);
  const result = await page.evaluate(() => {
    const video = document.querySelector('video');
    return { currentTime: video.currentTime, duration: video.duration, width: video.videoWidth, height: video.videoHeight, error: video.error?.message ?? null, paused: video.paused };
  });
  assert.ok(result.currentTime >= 1);
  const capture = JSON.parse(await readFile(resolve(process.argv[4]), 'utf8'));
  assert.ok(result.duration > 1);
  assert.ok(Math.abs(result.duration - (capture.video ?? capture).duration_s) < 0.25);
  assert.equal(result.width, 1280);
  assert.equal(result.height, 800);
  assert.equal(result.error, null);
  assert.equal(result.paused, false);
  await page.waitForFunction(() => document.querySelector('video').ended, null, { timeout: 40000 });
  await page.locator('video').evaluate(video => { video.currentTime = video.duration - 1.5; });
  await page.waitForFunction(() => !document.querySelector('video').seeking, null, { timeout: 10000 });
  await page.locator('video').evaluate(video => video.play());
  await page.waitForFunction(() => document.querySelector('video').ended, null, { timeout: 10000 });
  await writeFile(resolve(process.argv[3]), JSON.stringify({ status: 'pass', playback: result, reachedEnd: true }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'pass', ...result, reachedEnd: true }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
