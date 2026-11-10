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
const sourcePaths = ['package.json', 'index.mjs', 'client.js', 'src/projection.mjs', 'tests/live.test.mjs', 'tests/live-proof.mjs', 'tests/live.config.mjs', 'tests/media-locales.mjs', 'scripts/live-browser.mjs'];
const sources = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, hash(await readFile(join(root, path)))])));
const textOf = message => message.content.filter(b => b.type === 'text').map(b => b.text).join(' ');
const previewOf = message => textOf(message).replace(/\s+/g, ' ').trim().slice(0, 360);

it('proves live API responses drive native DSH tasks, persisted history and real browser media', async () => {
  assert.equal(process.env.DSH_SNAPSHOT, 'record');
  assert.ok(process.env.DEEPSEEK_API_KEY, 'BLOCKED: actual API credential required');
  assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  const before = await sources();
  await mkdir(output, { recursive: true });
  await mkdir(join(output, 'evidence'), { recursive: true });
  const observer = observeOfficialApi();
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
      const call = { provider: options.provider, model: options.model, at: new Date().toISOString() };
      usage.push(call);
      for await (const chunk of next()) {
        if (chunk.type === 'usage') call.usage = chunk.usage;
        yield chunk;
      }
    });
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'deepseek-official', model });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US', colorScheme: 'dark' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Native navigation', exact: true }).click();
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
    const events = await readPersistedEvents(scaffold, SessionId(primaryId));
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
    await expect(primary.locator('.dsh-history-preview p')).toHaveText(previewOf(finalMessage));
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
    await expect(secondary.locator('.dsh-history-preview p')).toHaveText(previewOf(secondMessage));
    await expect(secondary.locator('.dsh-history-todos')).toHaveCount(0);
    await expect(primary).toContainText(copy.summary);
    await primary.click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(primary).toHaveAttribute('aria-selected', 'true');
    await expect(primary).toContainText(copy.summary);
    await expect(primary.locator('.dsh-history-preview p')).toHaveText(previewOf(finalMessage));
    await expect(secondary).toBeVisible();
    await expect(secondary.locator('.dsh-history-preview p')).toHaveText(previewOf(secondMessage));
    await expect(secondary.locator('.dsh-history-todos')).toHaveCount(0);
    await page.screenshot({ path: join(output, 'evidence/reloaded.png') });
    await observer.settle();
    assert.deepEqual(await sources(), before, 'Candidate files changed during the real API run');
    assert.deepEqual(errors, [], 'Real browser must not report errors');
    assert.ok(usage.length && usage.every(call => call.usage?.outputTokens > 0));
    const safeEvents = events.filter(e => ['user/message', 'todo/write', 'assistant/message', 'tool/call', 'tool/result', 'turn/start', 'turn/end'].includes(e.type)).map(e => {
      if (e.type !== 'assistant/message') return e;
      return { ...e, data: { ...e.data, stream: undefined, message: { ...e.data.message, content: e.data.message.content.filter(b => b.type !== 'reasoning'), replayState: undefined } } };
    });
    const evidence = { status: 'PASS', runId, auditId, mediaLocale, hostLocale: copy.hostLocale, htmlLang, visibleTextAtProof, expectedUiLabels, expectedTaskLabels: todos.map(todo => todo.content), requestedTaskLabels: copy.tasks, languageChecks: { status: 'PASS', modelResponse: 'all actual assistant messages including tool preambles checked', nativeTaskLabels: 'all three match requested language', uiLabels: 'actual rendered labels checked' }, candidateTree: process.env.DSH_CANDIDATE_TREE || null,
      candidateSources: before, sourceRevision: 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159', provider: 'deepseek-official', model,
      liveModel: true, mockedService: false, scriptedModel: false, seededAssistantMessages: false, seededTodoEvents: false,
      inputData: 'Fresh generated demo order inputs, inspected by native read', orders, expectedTotals: totals,
      primarySession: primaryId, secondSession: secondAgent.session.id, provenance, calls: observer.receipts, usage,
      checks: ['official-api-response-identity-and-usage', 'api-tool-ids-match-durable-events', 'native-read-and-todo-write', 'model-computed-order-totals', 'committed-text-matches-api', 'sidebar-count-and-preview-match-persistence', 'independent-session-has-no-tasks', 'reload-restores-real-summary'],
      consoleErrors: errors, proof_interval_s: [proofStart, proofEnd], video: video || null,
      finalAssistantText: finalText, finalPreview: previewOf(finalMessage), finalTodos: todos,
      screenshots: Object.fromEntries(await Promise.all(['preflight.png', 'progress.png', 'final.png', 'reloaded.png'].map(async file => [file, hash(await readFile(join(output, 'evidence', file)))]))),
      ...(video ? { raw_sha256: hash(await readFile(join(output, 'raw/gt.mp4'))) } : {}),
    };
    await writeFile(join(output, 'evidence/result.json'), JSON.stringify(evidence, null, 2) + '\n');
    await writeFile(join(output, 'evidence/native-events.json'), JSON.stringify(safeEvents, null, 2) + '\n');
    await writeFile(join(output, 'evidence/markers.jsonl'), markers.map(m => JSON.stringify(m)).join('\n') + '\n');
    console.log(JSON.stringify({ status: 'PASS', runId, apiCalls: observer.receipts.length, ...provenance, recording }));
  } catch (error) {
    await observer.settle().catch(() => {});
    if (page) {
      await page.screenshot({ path: join(output, 'evidence/failure.png') }).catch(() => {});
      await writeFile(join(output, 'evidence/failure-visible.txt'), await page.locator('body').innerText()).catch(() => {});
    }
    await writeFile(join(output, 'evidence/failure.json'), JSON.stringify({ status: 'FAIL', error: String(error).replace(/https?:\/\/[^\s\"<>]+/g, '[redacted-url]'), calls: observer.receipts, usage }, null, 2));
    throw new Error(String(error).replace(/https?:\/\/[^\s\"<>]+/g, '[redacted-url]'));
  } finally {
    await pendingTurn?.catch(() => {});
    if (capture) await capture.stop().catch(() => {});
    await browser?.close();
    await scaffold?.close();
    observer.restore();
  }
}, 240000);
