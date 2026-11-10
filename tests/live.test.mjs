import { browserOptions } from './browser-options.mjs';
import { verifyUsageFlow } from './usage-browser-flow.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomInt } from 'node:crypto';
import { it } from 'vitest';
import { mediaLocales, assertResponseLanguage, assertAssistantMessageLanguage, assertRequestedTasks } from './media-locales.mjs';
import { chromium, expect } from 'playwright/test';
import { observeOfficialApi, assertRealProvenance, hash, startCapture, installPointer } from './live-proof.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.env.DSH_SOURCE_ROOT);
const output = resolve(process.env.DSH_LIVE_OUTPUT);
const model = process.env.DSH_LIVE_MODEL || 'deepseek-flash';
const recording = process.env.DSH_LIVE_RECORD === '1';
const mediaLocale = process.env.DSH_LIVE_LOCALE || 'en';
const copy = mediaLocales[mediaLocale];
assert.ok(copy, 'Unsupported media locale: ' + mediaLocale);
const require = createRequire(join(source, 'apps/cli/package.json'));
const { SessionId } = require('@deepseek-ai/dsh-session');
const { launchWebScaffold, readPersistedEvents } = await import(pathToFileURL(join(source, 'apps/web/tests/scaffold.ts')).href);
const { connectFreshWorkspace, writeComposerDraft, openSettings } = await import(pathToFileURL(join(source, 'apps/web/tests/support.ts')).href);
const sourcePaths = ['src/usage-telemetry.mjs', 'src/usage-config.mjs', 'tests/usage-browser-flow.mjs', 'tests/browser-options.mjs', 'package.json', 'index.mjs', 'client.js', 'src/client.mjs', 'src/markdown-preview.mjs', 'src/projection.mjs', 'src/locales.mjs', 'tests/live.test.mjs', 'tests/live-proof.mjs', 'tests/live.config.mjs', 'tests/media-locales.mjs', 'scripts/live-browser.mjs'];
const sources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(root, path)))])));
const textOf = message => message.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
const previewOf = message => textOf(message).trim().slice(0, 360);
const meaningfulMessage = events => events.findLast(e => e.type === 'assistant/message' && !e.data.interrupted && textOf(e.data.message).trim())?.data.message;
const literalPattern = text => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

async function openLocalizedSettings(page) {
  const trigger = page.getByRole('button', { name: copy.accountMenu, exact: true, includeHidden: true });
  await trigger.waitFor({ state: 'attached' });
  const collapsed = page.locator('[data-sidebar-drawer][data-sidebar-collapsed]');
  if (await collapsed.count()) {
    await page.locator('[data-sidebar-opener="true"]').click();
    await collapsed.waitFor({ state: 'detached' });
  }
  if (!await trigger.isVisible()) await page.locator('[data-sidebar-opener="true"]').click();
  await trigger.click();
  await page.getByRole('menuitem', { name: copy.settings, exact: true }).click();
}


async function expectPreview(card, message) {
  const preview = card.locator('.dsh-history-preview-content');
  await expect(preview).toHaveAttribute('data-message-id', message.id);
  await expect(preview).toHaveAttribute('title', previewOf(message));
  await expect(preview).not.toBeEmpty();
  await expect(preview.locator('a,img,button,input,textarea,select')).toHaveCount(0);
}

async function previewGeometry(card) {
  return card.evaluate(element => {
    const preview = element.querySelector('.dsh-history-preview-content');
    const cardBox = element.getBoundingClientRect();
    const box = preview.getBoundingClientRect();
    return { height: cardBox.height, fontSize: Number.parseFloat(getComputedStyle(preview).fontSize), previewHeight: box.height,
      fits: box.top >= cardBox.top && box.bottom <= cardBox.bottom + 1 && box.left >= cardBox.left && box.right <= cardBox.right + 1 };
  });
}

it('proves live API responses drive native DSH tasks, persisted history and real browser media', async () => {
  assert.equal(process.env.DSH_SNAPSHOT, 'record');
  assert.ok(process.env.DEEPSEEK_API_KEY, 'BLOCKED: actual API credential required');
  assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  const before = await sources();
  await mkdir(output, { recursive: true });
  await mkdir(join(output, 'evidence'), { recursive: true });
  let observer = observeOfficialApi();
  let cancellationObserver;
  const completedCalls = [];
  const calls = () => [...completedCalls, ...(observer?.receipts || [])];
  const runId = randomUUID();
  const auditId = runId.slice(0, 8);
  const orders = [{ id: 'A', quantity: randomInt(2, 5), unitPrice: randomInt(7, 14), shipping: randomInt(2, 6) },
    { id: 'B', quantity: 0, unitPrice: randomInt(5, 10), shipping: randomInt(3, 7) }];
  const totals = orders.map(o => o.quantity * o.unitPrice + o.shipping);
  const overlay = join(output, 'live-overlay.json');
  await writeFile(overlay, JSON.stringify([{ id: 'llm-deepseek', config: {
    baseURL: 'https://api.deepseek.com/anthropic', models: [{ id: model, name: model }], thinking: 'disabled', reasoningEffort: 'off', maxTokens: 1600,
  } }]));
  let scaffold, browser, page, capture, pendingTurn;
  let clock = Date.now();
  const markers = [];
  const errors = [];
  const usage = [];
  const screenshots = ['preflight.png', 'progress.png', 'final.png', 'reloaded.png'];
  const expectedNetworkErrors = [];
  let blockedSearch = false, blockedSearchRequests = 0, expectedCancellation = false;
  let cancellation, cancellationStreamFailure;
  const shot = async name => {
    await page.screenshot({ path: join(output, 'evidence', name), animations: 'disabled' });
    screenshots.push(name);
  };
  const mark = async label => {
    assert.equal(await page.locator('html').getAttribute('lang'), copy.htmlLang, 'Actual UI language changed during capture');
    markers.push({ label, elapsed_ms: Math.round(Date.now() - clock), at: new Date().toISOString() });
  };
  const moveClick = async (locator, label) => {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1281 && box.y + box.height <= 801, label);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(350);
    await mark(label);
    await locator.click();
  };
  try {
    scaffold = await launchWebScaffold({ profile: { hmr: false, packages: [{ dir: root, enabled: true }] }, extraOverlayPath: overlay });
    scaffold.ctx.on('agent/created', ({ agent }) => agent.ctx.tools.restrict({ allow: ['read', 'todo_write'] }));
    scaffold.ctx.on('llm/stream', async function* (options, next) {
      assert.equal(options.provider, 'deepseek-official');
      assert.equal(options.model, model);
      const call = { provider: options.provider, model: options.model, at: new Date().toISOString(), expectedCancellation };
      usage.push(call);
      for await (const chunk of next()) {
        if (chunk.type === 'usage') call.usage = chunk.usage;
        yield chunk;
      }
    });
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'deepseek-official', model });
    browser = await chromium.launch(browserOptions());
    page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US', colorScheme: 'dark' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (blockedSearch && /\/api\/session\/search$/.test(message.location().url)
        && message.text() === 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED') {
        expectedNetworkErrors.push({ kind: 'deliberately-disconnected-real-search', message: message.text() });
      } else errors.push(message.text());
    });
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Workspaces & archives', exact: true }).click();
    await connectFreshWorkspace(page, scaffold.workspaceCwd, 'sidebar-live-audit');
    const workspace = join(scaffold.workspaceCwd, 'sidebar-live-audit');
    await writeFile(join(workspace, 'orders.json'), JSON.stringify({ auditId, orders }, null, 2));
    if (mediaLocale !== 'en') {
      await openSettings(page, 'en');
      const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
      await settings.getByRole('button', { name: 'English', exact: true }).click();
      await page.getByRole('menuitem', { name: copy.menu, exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(page.locator('html')).toHaveAttribute('lang', copy.htmlLang);
    const prompt = copy.prompt(auditId);
    const composer = page.locator('[data-composer-input][contenteditable="true"]').first();
    const newSessionButton = page.locator('button[class*="newSession"]');
    await expect(newSessionButton).toHaveCount(1);
    await writeComposerDraft(page, composer, prompt);
    await installPointer(page);
    await page.screenshot({ path: join(output, 'evidence/preflight.png') });
    if (recording) {
      assert.equal(process.platform, 'darwin', 'Record only on the confirmed Mac mini');
      capture = await startCapture(page, output); clock = capture.started;
    }
    await mark(copy.beats[0]);
    if (recording) await page.waitForTimeout(1100);
    pendingTurn = scaffold.whenTurnSettled(150000); pendingTurn.catch(() => {});
    await mark(copy.beats[1]);
    await composer.press('Enter');
    await moveClick(page.getByRole('button', { name: copy.cards, exact: true }), copy.beats[2]);
    let primaryId;
    await expect.poll(() => {
      const agent = scaffold.ctx.agents.list().find(a => a.session.snapshotEvents().some(e => e.type === 'user/message' && textOf(e.data).includes(auditId)));
      primaryId = agent?.session.id;
      return Boolean(primaryId);
    }, { timeout: 20000 }).toBe(true);
    const primary = page.locator(`[data-session-id="${primaryId}"]`);
    await expect(primary).toBeVisible({ timeout: 30000 });
    await expect(primary).toContainText(copy.running, { timeout: 15000 });
    await expect(primary.locator('.dsh-history-todos')).toBeVisible({ timeout: 90000 });
    await mark(copy.beats[3]);
    await page.screenshot({ path: join(output, 'evidence/progress.png') });
    await pendingTurn; pendingTurn = undefined;
    const agent = scaffold.ctx.agents.list().find(a => a.session.id === primaryId);
    await agent.whenIdle();
    await scaffold.ctx.sessions.flush(agent.session);
    let events = await readPersistedEvents(scaffold, SessionId(primaryId));
    await observer.settle();
    const provenance = assertRealProvenance(observer.receipts, events, primaryId);
    for (const receipt of observer.receipts) assertAssistantMessageLanguage(receipt.text, mediaLocale);
    const finalMessage = events.findLast(e => e.type === 'assistant/message' && !e.data.interrupted && textOf(e.data.message).trim())?.data.message;
    assert.ok(finalMessage);
    const finalText = textOf(finalMessage);
    assert.ok(finalText.includes(auditId), 'Fresh request nonce must appear in the actual response');
    for (let i = 0; i < orders.length; i++) {
      assert.match(finalText, new RegExp(`\\b${orders[i].id}\\b[^\\n]{0,80}\\b${totals[i]}\\b`), 'Model must compute the input total');
    }
    const todos = events.findLast(e => e.type === 'todo/write').data.todos;
    assert.equal(todos.length, 3);
    assertRequestedTasks(todos, copy.tasks, mediaLocale);
    assertResponseLanguage(finalText, mediaLocale);
    assert.equal(todos.filter(t => t.status === 'completed').length, 2);
    assert.equal(todos.filter(t => t.status === 'pending').length, 1);
    assert.deepEqual(events.filter(e => e.type === 'tool/result' && e.data.message.isError), []);
    await expect(primary).toContainText(copy.summary);
    await expectPreview(primary, finalMessage);
    await expect(primary.locator('.dsh-history-preview-content strong').first()).toBeVisible();
    await expect(primary.locator('.dsh-history-preview-content code').first()).toHaveText('orders.json');
    await expect(primary).toHaveAccessibleDescription(literalPattern(copy.summary));
    await expect(primary).toHaveAccessibleDescription(literalPattern(copy.pending + ': ' + copy.tasks[2]));
    await expect(page.locator('.dsh-history-head span')).toHaveText(copy.countOne);
    const compactLayout = await previewGeometry(primary);
    await writeFile(join(output, 'evidence/compact-layout.json'), JSON.stringify(compactLayout, null, 2) + '\n');
    assert.ok(compactLayout.height <= 200 && compactLayout.fontSize >= 12 && compactLayout.previewHeight <= 36.1 && compactLayout.fits, 'Compact history geometry: ' + JSON.stringify(compactLayout));
    await expect(primary).not.toContainText(copy.running);
    await mark(copy.beats[4]);
    const visibleTextAtProof = await page.locator('body').innerText();
    const expectedUiLabels = [copy.history, copy.native, copy.summary];
    for (const label of [...expectedUiLabels, ...todos.map(todo => todo.content)]) assert.ok(visibleTextAtProof.includes(label), 'Expected visible localized label: ' + label);
    const htmlLang = await page.locator('html').getAttribute('lang');
    const proofStart = (Date.now() - clock) / 1000;
    await page.screenshot({ path: join(output, 'evidence/final.png') });
    if (recording) await page.waitForTimeout(5200);
    const proofEnd = (Date.now() - clock) / 1000;
    await mark(copy.beats[5]);
    let video;
    if (capture) { video = await capture.stop(); capture = undefined; }
    await moveClick(newSessionButton, copy.beats[6]);
    const secondPrompt = copy.second(auditId);
    await writeComposerDraft(page, composer, secondPrompt);
    pendingTurn = scaffold.whenTurnSettled(90000); pendingTurn.catch(() => {});
    await composer.press('Enter'); await pendingTurn; pendingTurn = undefined;
    const secondAgent = scaffold.ctx.agents.list().find(a => a.session.id !== primaryId && a.session.snapshotEvents().some(e => e.type === 'user/message' && textOf(e.data).includes(auditId + '-second')));
    assert.ok(secondAgent);
    await scaffold.ctx.sessions.flush(secondAgent.session);
    const secondEvents = await readPersistedEvents(scaffold, SessionId(secondAgent.session.id));
    assert.equal(secondEvents.filter(e => e.type === 'todo/write').length, 0);
    await observer.settle();
    const secondMessage = secondEvents.findLast(e => e.type === 'assistant/message' && !e.data.interrupted && textOf(e.data.message).trim())?.data.message;
    assert.ok(secondMessage && secondMessage.source.provider === 'deepseek-official');
    assert.ok(observer.receipts.some(r => r.sessionId === secondAgent.session.id && r.text === textOf(secondMessage)));
    const secondary = page.locator(`[data-session-id="${secondAgent.session.id}"]`);
    await expect(secondary).toBeVisible();
    await expect(secondary).toHaveAttribute('aria-selected', 'true');
    await expectPreview(secondary, secondMessage);
    await expect(secondary.locator('.dsh-history-todos')).toHaveCount(0);
    await expect(primary).toContainText(copy.summary);
    await primary.click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(primary).toHaveAttribute('aria-selected', 'true');
    await expect(primary).toContainText(copy.summary);
    await expectPreview(primary, finalMessage);
    await expect(secondary).toBeVisible();
    await expectPreview(secondary, secondMessage);
    await expect(secondary.locator('.dsh-history-todos')).toHaveCount(0);
    await page.screenshot({ path: join(output, 'evidence/reloaded.png') });

    const search = page.getByRole('searchbox', { name: copy.search, exact: true });
    const scroller = page.locator('.dsh-history-scroll');
    await search.fill(auditId);
    await expect(page.locator('.dsh-history-head span')).toHaveText(copy.countTwo);
    await page.setViewportSize({ width: 1280, height: 540 });
    await primary.focus();
    await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
    const savedScroll = await scroller.evaluate(element => element.scrollTop);
    assert.ok(savedScroll > 0, 'Navigation must preserve a nonzero actual history scroll offset');
    await page.getByRole('button', { name: copy.native, exact: true }).click();
    await expect(page.locator('.dsh-history')).toHaveCount(0);
    await page.getByRole('button', { name: copy.cards, exact: true }).click();
    await expect(search).toHaveValue(auditId);
    await expect(primary).toBeFocused();
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeCloseTo(savedScroll, 0);
    await shot('navigation-restored.png');
    await page.setViewportSize({ width: 1280, height: 800 });
    await search.fill('');

    const searchPath = '**/api/session/search';
    blockedSearch = true;
    await page.route(searchPath, async route => {
      blockedSearchRequests++;
      await route.abort('internetdisconnected');
    });
    await search.fill(auditId);
    const retry = page.getByRole('button', { name: copy.retrySearch, exact: true });
    await expect(retry).toBeVisible();
    await expect(primary).toBeVisible();
    await expect(page.locator('.dsh-history-notice')).toContainText(copy.searchError);
    assert.ok(blockedSearchRequests > 0, 'Disconnect must affect an actual first-party search request');
    await shot('offline-search.png');
    await page.unroute(searchPath);
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(page.locator('.dsh-history-head span')).toHaveText(copy.countTwo);
    blockedSearch = false;
    await search.fill('');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-sidebar-opener="true"]').click();
    await expect.poll(async () => (await page.locator('.dsh-history').boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);
    assert.ok(await page.locator('.dsh-history').evaluate(element => element.getBoundingClientRect().right <= innerWidth));
    assert.ok(await scroller.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    await expectPreview(primary, finalMessage);
    const mobileLayout = await previewGeometry(primary);
    assert.ok(mobileLayout.fits && mobileLayout.previewHeight <= 36.1);
    await shot('mobile.png');
    await page.setViewportSize({ width: 640, height: 400 });
    if ((await page.locator('.dsh-history').boundingBox())?.x < 0) await page.locator('[data-sidebar-opener="true"]').click();
    await primary.scrollIntoViewIfNeeded();
    await expect(primary).toBeVisible();
    assert.ok(await scroller.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    await expectPreview(primary, finalMessage);
    await shot('zoom-equivalent-reflow.png');
    await page.setViewportSize({ width: 1280, height: 800 });

    const themeChecks = [];
    for (const [palette, os] of [['light', 'dark'], ['dark', 'light']]) {
      await page.emulateMedia({ colorScheme: os });
      await openLocalizedSettings(page);
      const settings = page.getByRole('dialog', { name: copy.settings, exact: true });
      await settings.getByRole('button', { name: copy.general, exact: true }).click();
      await settings.getByRole('button', { name: copy[palette], exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))).toBe(palette === 'dark');
      await page.keyboard.press('Escape');
      await expect(settings).toBeHidden();
      const colors = await primary.locator('.dsh-history-count').evaluate(element => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        const rgb = (color, backdrop = [255, 255, 255]) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
          return [r, g, b].map((value, index) => value * alpha / 255 + backdrop[index] * (1 - alpha / 255));
        };
        const background = rgb(getComputedStyle(element.closest('.dsh-history-card')).backgroundColor);
        const rendered = getComputedStyle(element).color;
        const foreground = rgb(rendered, background);
        const luminance = color => color.map(value => value / 255)
          .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const levels = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
        return { rendered, foreground, background, contrastRatio: (levels[1] + 0.05) / (levels[0] + 0.05) };
      });
      assert.ok(colors.contrastRatio >= 4.5, 'Task count must retain readable contrast in the app theme independently of OS palette');
      themeChecks.push({ palette, os, ...colors });
      await shot(palette + '-theme.png');
    }
    await page.emulateMedia({ colorScheme: 'dark' });

    const recordedTurn = events.findLast(event => event.type === 'turn/start').data.turn;
    const followPrompt = copy.follow(auditId);
    await writeComposerDraft(page, composer, followPrompt);
    pendingTurn = scaffold.whenTurnSettled(90000); pendingTurn.catch(() => {});
    await composer.press('Enter');
    await expect(primary).toContainText(copy.earlier);
    await expect(primary).toContainText(copy.noTasks);
    await expectPreview(primary, finalMessage);
    await shot('earlier-reply.png');
    await pendingTurn; pendingTurn = undefined;
    await agent.whenIdle();
    await scaffold.ctx.sessions.flush(agent.session);
    events = await readPersistedEvents(scaffold, SessionId(primaryId));
    const followMessage = meaningfulMessage(events);
    assert.ok(followMessage && followMessage.id !== finalMessage.id && textOf(followMessage).includes(auditId + '-followup'));
    const followStart = events.findLast(event => event.type === 'turn/start');
    assert.equal(events.filter(event => event.type === 'todo/write' && event.seq > followStart.seq).length, 0);
    await expectPreview(primary, followMessage);
    await expect(primary).not.toContainText(copy.earlier);
    await expect(primary.locator('.dsh-history-todos')).toHaveCount(0);
    await shot('followup.png');
    await observer.settle();
    completedCalls.push(...observer.receipts);
    observer.restore(); observer = undefined;

    cancellationObserver = observeOfficialApi(1);
    expectedCancellation = true;
    const cancelPrompt = copy.cancel(auditId);
    await writeComposerDraft(page, composer, cancelPrompt);
    pendingTurn = scaffold.whenTurnSettled(90000); pendingTurn.catch(() => {});
    await composer.press('Enter');
    const stop = page.getByRole('button', { name: copy.stop, exact: true });
    await expect(stop).toBeVisible();
    await expect.poll(() => cancellationObserver.receipts.some(receipt => receipt.responseId && receipt.text.length > 16 && !receipt.complete), { timeout: 30000, intervals: [20, 50, 100] }).toBe(true);
    await stop.click();
    await pendingTurn; pendingTurn = undefined;
    await agent.whenIdle();
    await scaffold.ctx.sessions.flush(agent.session);
    events = await readPersistedEvents(scaffold, SessionId(primaryId));
    const aborted = events.findLast(event => event.type === 'turn/end');
    assert.equal(aborted.data.reason.kind, 'aborted');
    let abortError;
    try { await cancellationObserver.settle(); } catch (error) {
      abortError = error;
      cancellationStreamFailure = { name: error?.name, code: error?.code, kind: error?.kind,
        message: typeof error?.message === 'string' ? error.message.replace(/https?:\/\/[^\s\"<>]+/g, '[redacted-url]') : undefined,
        valueType: typeof error };
    }
    assert.equal(cancellationObserver.receipts.length, 1);
    const interruptedCall = cancellationObserver.receipts[0];
    assert.equal(interruptedCall.httpStatus, 200);
    assert.equal(interruptedCall.sessionId, primaryId);
    assert.ok(interruptedCall.responseId && interruptedCall.text.length > 16 && !interruptedCall.complete);
    assert.equal(aborted.data.reason.reason.kind, 'user');
    const interruptedMessage = events.findLast(event => event.type === 'assistant/message'
      && event.data.turn === aborted.data.turn && event.data.interrupted === true);
    assert.ok(interruptedMessage, 'User cancellation must persist an explicitly interrupted assistant anchor');
    const deliveredPrefix = textOf(interruptedMessage.data.message);
    assert.equal(interruptedMessage.data.message.source.provider, 'deepseek-official');
    assert.ok(deliveredPrefix.length > 0 && interruptedCall.text.startsWith(deliveredPrefix), 'Interrupted durable text must be a delivered prefix of the observed actual API text');
    assert.equal(events.filter(event => event.type === 'assistant/message' && event.data.turn === aborted.data.turn
      && !event.data.interrupted && textOf(event.data.message).trim()).length, 0, 'A cancelled turn must not commit a new useful reply');
    const earlyEof = abortError?.code === 'ERR_ASSERTION' && abortError?.expected === true && abortError?.actual !== true
      && abortError?.message?.startsWith('Official API stream did not reach message_stop');
    const abortedReader = abortError?.name === 'AbortError' || abortError?.code === 'ABORT_ERR' || abortError?.kind === 'user';
    assert.ok(earlyEof || abortedReader, 'Expected explicit cancellation or EOF before message_stop after user Stop; observed ' + JSON.stringify(cancellationStreamFailure));
    assert.equal(meaningfulMessage(events).id, followMessage.id, 'Interrupted text must not replace the saved useful reply');
    await expectPreview(primary, followMessage);
    await expect(primary).toContainText(copy.earlier);
    await expect(primary.locator('.dsh-history-running')).toHaveText(copy.stopped);
    await expect(primary.locator('.dsh-history-todos')).toHaveCount(0);
    await shot('stopped.png');
    cancellation = { expected: true, state: 'native-user-cancelled-partial-api-stream', call: interruptedCall, nativeTurn: aborted.data.turn,
      nativeEndKind: aborted.data.reason.kind, nativeAbortReason: aborted.data.reason.reason.kind,
      streamTermination: { kind: earlyEof ? 'eof-before-message_stop' : 'reader-aborted', failure: cancellationStreamFailure },
      deliveredPrefixMessageId: interruptedMessage.data.message.id, deliveredPrefixLength: deliveredPrefix.length, retainedMessageId: followMessage.id };
    cancellationObserver.restore(); cancellationObserver = undefined;
    expectedCancellation = false;
    observer = observeOfficialApi();

    const retryPrompt = copy.retry(auditId);
    await writeComposerDraft(page, composer, retryPrompt);
    pendingTurn = scaffold.whenTurnSettled(90000); pendingTurn.catch(() => {});
    await composer.press('Enter'); await pendingTurn; pendingTurn = undefined;
    await agent.whenIdle();
    await scaffold.ctx.sessions.flush(agent.session);
    events = await readPersistedEvents(scaffold, SessionId(primaryId));
    const retryMessage = meaningfulMessage(events);
    assert.ok(retryMessage && retryMessage.id !== followMessage.id && textOf(retryMessage).includes(auditId + '-retry'));
    assert.equal(events.findLast(event => event.type === 'turn/end').data.reason.kind, 'completed');
    await expectPreview(primary, retryMessage);
    await expect(primary).not.toContainText(copy.earlier);
    await expect(primary).not.toContainText(copy.stopped);
    await expect(primary.locator('.dsh-history-todos')).toHaveCount(0);
    await expectPreview(secondary, secondMessage);
    await shot('restarted.png');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectPreview(primary, retryMessage);
    await expectPreview(secondary, secondMessage);
    await expect(primary.locator('.dsh-history-todos')).toHaveCount(0);
    await shot('lifecycle-reloaded.png');
    if (mediaLocale === 'en' && process.env.DSH_VERIFY_USAGE === '1') await verifyUsageFlow(page, join(output, 'evidence'));
    await observer.settle();
    const lifecycleProvenance = assertRealProvenance(calls(), events, primaryId);
    const responseTexts = [...calls(), cancellation.call].filter(receipt => receipt.text?.trim());
    for (const receipt of responseTexts) assertAssistantMessageLanguage(receipt.text, mediaLocale);
    for (const event of [...events, ...secondEvents].filter(event => event.type === 'assistant/message')) assertAssistantMessageLanguage(textOf(event.data.message), mediaLocale);
    await expect(page.locator('html')).toHaveAttribute('lang', copy.htmlLang);
    assert.deepEqual(await sources(), before, 'Candidate files changed during the real API run');
    assert.deepEqual(errors, [], 'Real browser must not report errors');
    assert.ok(usage.length && usage.filter(call => !call.expectedCancellation).every(call => call.usage?.outputTokens > 0));
    assert.equal(usage.filter(call => call.expectedCancellation).length, 1);
    const safeEvents = events.filter(e => ['user/message', 'todo/write', 'assistant/message', 'tool/call', 'tool/result', 'turn/start', 'turn/end'].includes(e.type)).map(e => {
      if (e.type !== 'assistant/message') return e;
      return { ...e, data: { ...e.data, stream: undefined, message: { ...e.data.message, content: e.data.message.content.filter(b => b.type !== 'reasoning'), replayState: undefined } } };
    });
    const evidence = { status: 'PASS', runId, auditId, candidateTree: process.env.DSH_CANDIDATE_TREE || null,
      mediaLocale, hostLocale: copy.hostLocale, htmlLang, visibleTextAtProof, expectedUiLabels,
      expectedTaskLabels: todos.map(todo => todo.content), requestedTaskLabels: copy.tasks,
      languageChecks: { status: 'PASS', locale: mediaLocale, assistantResponseTexts: responseTexts.length, includesInterruptedResponse: true },
      candidateSources: before, sourceRevision: 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159', provider: 'deepseek-official', model,
      liveModel: true, mockedService: false, scriptedModel: false, seededAssistantMessages: false, seededTodoEvents: false,
      inputData: 'Fresh generated demo order inputs, inspected by native read', orders, expectedTotals: totals,
      primarySession: primaryId, secondSession: secondAgent.session.id, provenance: lifecycleProvenance, recordedTurnProvenance: provenance, calls: calls(), cancellation, usage,
      apiCallCounts: { completed: calls().length, deliberatelyInterrupted: 1, total: calls().length + 1 },
      checks: ['official-api-response-identity-and-usage', 'api-tool-ids-match-durable-events', 'native-read-and-todo-write', 'model-computed-order-totals',
        'requested-language-for-all-visible-api-text-and-native-tasks', 'committed-markdown-source-and-message-id-match-api', 'readonly-bold-and-inline-code-render', 'accessible-task-count-and-statuses',
        'compact-two-line-preview', 'singular-session-label', 'independent-session-has-no-tasks', 'reload-restores-real-summary',
        'native-navigation-retains-query-scroll-and-focus', 'real-search-disconnect-retains-local-matches-and-retry-recovers',
        'real-api-data-in-mobile-drawer', '200-percent-equivalent-effective-viewport-reflow', 'native-light-dark-theme-independent-of-os',
        'earlier-reply-distinguished-during-new-real-turn', 'new-turn-does-not-inherit-tasks',
        'actual-api-cancellation-retains-committed-reply', 'real-retry-after-cancel-commits-and-reloads'],
      consoleErrors: errors, expectedNetworkErrors, searchFault: { kind: 'request-disconnected-without-substitute-response', requests: blockedSearchRequests },
      layout: { compact: compactLayout, mobile: mobileLayout, zoom: { equivalentPercent: 200, effectiveCssViewport: { width: 640, height: 400 }, actualDesktopBrowserZoom: false } },
      themeChecks, navigation: { restoredQuery: auditId, restoredScrollTop: savedScroll, restoredFocusedSession: primaryId },
      proof_interval_s: [proofStart, proofEnd], video: video || null, recordedTurn,
      finalAssistantText: finalText, finalPreview: previewOf(finalMessage), finalTodos: todos,
      latestAfterLifecycle: { messageId: retryMessage.id, text: textOf(retryMessage), tasks: null, endKind: 'completed' },
      screenshots: Object.fromEntries(await Promise.all(screenshots.map(async file => [file, hash(await readFile(join(output, 'evidence', file)))]))),
      ...(video ? { raw_sha256: hash(await readFile(join(output, 'raw/gt.mp4'))) } : {}),
    };
    await writeFile(join(output, 'evidence/result.json'), JSON.stringify(evidence, null, 2) + '\n');
    await writeFile(join(output, 'evidence/native-events.json'), JSON.stringify(safeEvents, null, 2) + '\n');
    await writeFile(join(output, 'evidence/markers.jsonl'), markers.map(m => JSON.stringify(m)).join('\n') + '\n');
    console.log(JSON.stringify({ status: 'PASS', runId, completedApiCalls: calls().length, interruptedApiCalls: 1, ...lifecycleProvenance, recording }));
  } catch (error) {
    await observer?.settle().catch(() => {});
    await cancellationObserver?.settle().catch(() => {});
    if (page) {
      await page.screenshot({ path: join(output, 'evidence/failure.png') }).catch(() => {});
      await writeFile(join(output, 'evidence/failure-visible.txt'), await page.locator('body').innerText()).catch(() => {});
    }
    await writeFile(join(output, 'evidence/failure.json'), JSON.stringify({ status: 'FAIL', error: String(error).replace(/https?:\/\/[^\s\"<>]+/g, '[redacted-url]'), calls: calls(), cancellation: cancellationObserver?.receipts || cancellation, cancellationStreamFailure, usage, consoleErrors: errors, expectedNetworkErrors }, null, 2));
    throw new Error(String(error).replace(/https?:\/\/[^\s\"<>]+/g, '[redacted-url]'));
  } finally {
    await pendingTurn?.catch(() => {});
    if (capture) await capture.stop().catch(() => {});
    await browser?.close();
    await scaffold?.close();
    cancellationObserver?.restore();
    observer?.restore();
  }
}, 240000);
