import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from 'playwright/test';
import { USAGE_ENDPOINT, USAGE_EVENTS } from '../src/usage-telemetry.mjs';
import { USAGE_PUBLIC_KEY } from '../src/usage-config.mjs';

/** Actual DSH UI -> HTTPS Supabase -> accepted response; SQL readback is independent. */
export async function verifyUsageFlow(page, output) {
  const requests = [], responses = [], errors = [], networkFailures = [];
  const failureListener = request => { if(request.url() === USAGE_ENDPOINT) networkFailures.push(request.failure()); };
  page.on('requestfailed', failureListener);
  const requestListener = request => { if (request.url() === USAGE_ENDPOINT && request.method() === 'POST') requests.push(JSON.parse(request.postData())); };
  const responseListener = response => { if (response.url() === USAGE_ENDPOINT && response.request().method() === 'POST') responses.push({ event_id: JSON.parse(response.request().postData()).event_id, status: response.status() }); };
  page.on('request', requestListener); page.on('response', responseListener);
  const result = { status: 'RUNNING', endpoint: USAGE_ENDPOINT, requests, responses, networkFailures, checks: [] };
  const settings = () => page.locator('[data-usage-settings]');
  const dialog = () => page.getByRole('dialog', { name: 'Usage statistics', exact: true });
  const search = () => page.getByRole('searchbox', { name: 'Search sessions', exact: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(settings()).toBeVisible();
    await expect(page.locator('.dsh-history-card').first()).toBeVisible();
    await search().fill('usage-off-sentinel');
    await expect(page.locator('.dsh-history-empty')).toBeVisible();
    await search().fill('');
    await expect(page.locator('.dsh-history-card').first()).toBeVisible();
    assert.equal(requests.length, 0, 'No outgoing telemetry before consent');
    result.checks.push('default-off-no-network');
    await settings().click();
    const consent = dialog().getByRole('checkbox', { name: 'Share usage statistics' });
    await expect(consent).not.toBeChecked();
    await expect(dialog()).toContainText('30 days');
    await consent.check();
    await expect.poll(() => responses.filter(x => x.status === 202).length, { timeout: 30000 }).toBeGreaterThan(0);
    await dialog().getByRole('button', { name: 'Send test event' }).click();
    await expect.poll(() => responses.length, { timeout: 30000 }).toBe(2);
    await page.screenshot({ path: join(output, 'usage-opt-in.png') });
    await dialog().getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('.dsh-history-card').first().click();
    await expect(page.locator('.dsh-history-card[aria-selected="true"]')).toHaveCount(1);
    const searchResponse = page.waitForResponse(r => r.url().endsWith('/api/session/search'));
    await search().fill('usage-zero-sentinel'); await searchResponse;
    await expect.poll(() => requests.some(x => x.event === 'search_zero')).toBe(true);
    await search().fill('');
    await page.getByRole('button', { name: 'Workspaces & archives', exact: true }).click();
    await page.getByRole('button', { name: 'History cards', exact: true }).click();
    await page.route('**/api/session/search', async route => {
      const body = route.request().postDataJSON();
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'server-response',rpcId:body.rpcId,result:{ok:false,error:{code:'gateway/internal',message:'Controlled telemetry search failure',details:{}}}})});
    });
    await search().fill('usage-offline-sentinel');
    await expect(page.getByText('Search incomplete. Some sessions may be missing.', { exact: true })).toBeVisible();
    await expect.poll(() => requests.some(x => x.event === 'search_error')).toBe(true);
    await page.unroute('**/api/session/search'); await search().fill('');
    result.checks.push('actual-card-request', 'zero-result-search', 'controlled-search-error-event', 'native-navigation-round-trip');
    await expect.poll(() => responses.length, { timeout: 30000 }).toBe(requests.length);
    assert.ok(responses.every(response => response.status === 202), 'Every genuine collector response must accept the actual event');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settings().click();
    await expect(dialog().getByRole('checkbox')).toBeChecked();
    await expect.poll(() => responses.length, { timeout: 30000 }).toBe(requests.length);
    result.checks.push('consent-survives-reload');
    await dialog().getByRole('checkbox').uncheck();
    await expect(dialog().getByRole('checkbox')).not.toBeChecked();
    const countAtOff = requests.length;
    await dialog().getByRole('button', { name: 'Close', exact: true }).click();
    await page.locator('.dsh-history-card').first().click();
    const offSearch = page.waitForResponse(r => r.url().endsWith('/api/session/search'));
    await search().fill('after-disable-sentinel'); await offSearch;
    await expect(page.locator('.dsh-history-empty')).toBeVisible();
    assert.equal(requests.length,countAtOff,'Revocation stops real later UI actions from uploading');
    await settings().click();
    await dialog().getByRole('button', { name: 'Turn off and forget' }).click();
    await expect(dialog().getByRole('checkbox')).not.toBeChecked();
    await page.screenshot({ path: join(output, 'usage-disabled.png') });
    await dialog().getByRole('button', { name: 'Close', exact: true }).click();
    await search().fill('');
    result.checks.push('revocation-stops-network', 'forget-consent');
    for (const payload of requests) {
      assert.deepEqual(Object.keys(payload).sort(), ['event','event_id','locale','package','schema_version','version']);
      assert.ok(USAGE_EVENTS.includes(payload.event));
      assert.ok(!JSON.stringify(payload).includes('sentinel'));
    }
    result.checks.push('no-chat-search-or-session-values-in-wire-payload');
    result.receipts = [];
    const acceptedIds = responses.filter(response => response.status === 202).map(response => response.event_id);
    result.revokedInFlight = requests.filter(payload => !acceptedIds.includes(payload.event_id)).map(payload => payload.event_id);
    for (const id of acceptedIds) {
      // Separate uncached GET executes a fresh database SELECT, not the POST reply.
      const response = await page.evaluate(async ({ endpoint, id, key }) => {
        const result = await fetch(`${endpoint}?receipt=${id}`, { headers: { apikey: key, authorization: `Bearer ${key}` }, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) });
        return { status: result.status, body: await result.json() };
      }, { endpoint: USAGE_ENDPOINT, id, key: USAGE_PUBLIC_KEY });
      assert.equal(response.status,200); assert.equal(response.body.stored,true);
      result.receipts.push({event_id:id,stored:true});
    }
    result.checks.push('every-event-independently-read-back-from-supabase');
    result.status = 'PASS';
  } catch (error) { result.status='FAIL'; result.error=String(error); errors.push(String(error)); throw error; }
  finally {
    page.off('requestfailed', failureListener); page.off('request',requestListener); page.off('response',responseListener);
    await writeFile(join(output,'usage-e2e.json'),JSON.stringify(result,null,2)+'\n');
  }
  return result;
}
