import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { it } from 'vitest';
import { expect } from 'playwright/test';
import { chromium } from 'playwright';

const source = resolve(process.env.DSH_SOURCE_ROOT);
const require = createRequire(join(source, 'apps/cli/package.json'));
const { LlmAdapter, ToolCallId, createSystemMessage } = require('@deepseek-ai/dsh-llm');
const { SESSION_FORMAT_VERSION, SessionId } = require('@deepseek-ai/dsh-session');
const { Context } = require('@deepseek-ai/cordis');
const JsonlSessionPersistence = require('@deepseek-ai/dsh-session-persistence-jsonl');
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.runtime/browser');
const { launchWebScaffold, seedSession, readPersistedEvents, parseSeedFixture, realizeSeedFixture } = await import(pathToFileURL(join(source, 'apps/web/tests/scaffold.ts')).href);
const { writeComposerDraft } = await import(pathToFileURL(join(source, 'apps/web/tests/support.ts')).href);
const tasks = [
  { content: 'Create independent plugin repository', status: 'completed' },
  { content: 'Connect real TODO events', status: 'completed' },
  { content: 'Show latest assistant reply', status: 'in_progress' },
  { content: 'Verify reload and session isolation', status: 'pending' },
];

function seed(title, reply, todos) {
  let seq = 0;
  const createdAt = Date.now() - 3600000;
  const lines = [{ type: 'session', version: SESSION_FORMAT_VERSION, id: '{{sessionId}}', createdAt, cwd: '{{cwd}}/workspace', isSeeded: false, delegationDepth: 0 }];
  const at = (type, data, surfaceOp) => lines.push({ type, data, seq: seq++, time: createdAt + seq, ...(surfaceOp ? { surfaceOp } : {}) });
  at('turn/start', { turn: 1 });
  at('step/start', { turn: 1, step: 1 });
  at('system/message', { turn: 1, step: 1, message: createSystemMessage('') }, 'append');
  at('user/message', { id: crypto.randomUUID(), role: 'user', content: [{ type: 'text', text: `Controlled browser fixture: ${title}` }], source: { kind: 'user' } }, 'append');
  at('session/title', { title, messageSeqs: [], source: { kind: 'user' } });
  if (todos) at('todo/write', { todos });
  if (reply !== null) at('assistant/message', { turn: 1, step: 1, stream: [], message: {
    id: crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text: reply }],
    source: { kind: 'model', provider: 'sidebar-test', model: 'controlled-ui-fixture' },
  } }, 'append');
  at('step/end', { turn: 1, step: 1 });
  at('turn/end', { turn: 1, reason: { kind: 'completed' } });
  return lines.map(line => JSON.stringify(line)).join('\n') + '\n';
}

it('verifies the installed plugin in real DSH Web, with controlled UI data and no paid model calls', async () => {
  await mkdir(output, { recursive: true });
  const result = { status: 'RUNNING', sourceRevision: 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159', fixtureData: true, liveModel: false, checks: [] };
  assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), result.sourceRevision);
  const hashSources = async () => Object.fromEntries(await Promise.all(['package.json', 'index.mjs', 'client.js', 'src/projection.mjs', 'tests/browser.test.mjs', 'tests/vitest.config.mjs', 'scripts/browser-test.mjs'].map(async file => [file, createHash('sha256').update(await readFile(join(root, file))).digest('hex')])));
  result.candidateSources = await hashSources();
  const scaffold = await launchWebScaffold({ profile: { hmr: false, packages: [{ dir: root, enabled: true }] } });
  let browser;
  let page;
  const errors = [];
  let releaseStream;
  let streamStarted;
  const started = new Promise(resolve => { streamStarted = resolve; });
  const blocked = new Promise(resolve => { releaseStream = resolve; });
  let calls = 0;
  class ControlledUiAdapter extends LlmAdapter {
    async listModels(provider) { return [{ provider, id: 'controlled-ui-fixture', name: 'Controlled UI fixture' }]; }
    async resolveModel(provider, id) { return { provider, id, name: 'Controlled UI fixture' }; }
    async *stream() {
      calls++;
      if (calls === 1) {
        const id = ToolCallId('sidebar-native-todo');
        const args = JSON.stringify({ todos: [{ content: 'Native tool executed', status: 'completed' }, { content: 'Wait for committed reply', status: 'in_progress' }] });
        yield { type: 'block-start', index: 0, blockType: 'tool-call' };
        yield { type: 'tool-call-delta', index: 0, id, name: 'todo_write', argumentsDelta: args };
        yield { type: 'block-end', index: 0, block: { type: 'tool-call', id, name: 'todo_write', arguments: args } };
        yield { type: 'finish', reason: { kind: 'tool-calls' } };
      } else {
        const partial = 'Streaming fixture fragment';
        yield { type: 'block-start', index: 0, blockType: 'text' };
        yield { type: 'text-delta', index: 0, text: partial };
        streamStarted();
        await blocked;
        const text = partial + ' is now a formally committed assistant reply.';
        yield { type: 'text-delta', index: 0, text: text.slice(partial.length) };
        yield { type: 'block-end', index: 0, block: { type: 'text', text } };
        yield { type: 'finish', reason: { kind: 'stop' } };
      }
    }
  }
  try {
    await seedSession(scaffold, seed('DSH Sidebar History', 'I created the plugin and connected the sidebar to committed session events. Browser verification is next.', tasks), 'sidebar-primary');
    await seedSession(scaffold, seed('Fix build error', 'The build error came from a missing type import. The correction is ready for verification.', [{ content: 'Reproduce build error', status: 'completed' }, { content: 'Apply type import fix', status: 'completed' }, { content: 'Run build', status: 'pending' }]), 'sidebar-secondary');
    await seedSession(scaffold, seed('New conversation', null), 'sidebar-empty');
    scaffold.ctx.llm.registerAdapter(['sidebar-test'], new ControlledUiAdapter());
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'sidebar-test', model: 'controlled-ui-fixture' });
    browser = await chromium.launch({ ...(process.env.DSH_CHROMIUM_PATH ? { executablePath: process.env.DSH_CHROMIUM_PATH } : {}), headless: true,
      args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu'] });
    page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, locale: 'en-US', colorScheme: 'dark' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('.dsh-history-card').first().waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Native navigation', exact: true }).click();
    await page.locator('.dsh-history').waitFor({ state: 'detached' });
    await page.getByRole('treeitem').first().click();
    await page.getByRole('treeitem').filter({ hasText: 'DSH Sidebar History' }).click();
    await page.screenshot({ path: join(output, '01-before-native.png') });
    await writeFile(join(output, '01-before-native.aria.txt'), await page.locator('body').innerText());
    await page.getByRole('button', { name: 'History cards', exact: true }).click();
    const primary = page.locator('[data-session-id="sidebar-primary"]');
    await expect(primary).toContainText('2/4 tasks');
    await expect(primary).toContainText('I created the plugin');
    assert.equal(await primary.locator('.dsh-history-task').count(), 3);
    await primary.click();
    await expect(primary).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: join(output, '02-after-history.png') });
    result.checks.push('native-before-and-enhanced-after', 'three-todo-limit-and-real-completion-count');

    const secondary = page.locator('[data-session-id="sidebar-secondary"]');
    await secondary.click();
    await expect(secondary).toHaveAttribute('aria-selected', 'true');
    await expect(secondary).toContainText('2/3 tasks');
    await expect(secondary).not.toContainText('I created the plugin');
    await expect(primary).toContainText('2/4 tasks');
    await primary.click();
    await page.reload({ waitUntil: 'load' });
    await expect(primary).toContainText('2/4 tasks');
    await expect(primary).toHaveAttribute('aria-selected', 'true');
    result.checks.push('session-switch-isolation', 'reload-restores-summary-and-selection');
    await expect(page.locator('[data-session-id="sidebar-empty"]')).toContainText('No assistant reply yet');
    await expect(page.locator('[data-session-id="sidebar-empty"] .dsh-history-todos')).toHaveCount(0);
    result.checks.push('empty-assistant-and-no-fabricated-tasks');

    const composer = page.locator('[data-composer-input][contenteditable="true"]').first();
    await writeComposerDraft(page, composer, 'Exercise the controlled native TODO tool and streaming boundary.');
    const settled = scaffold.whenTurnSettled(45000);
    await composer.press('Enter');
    await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(new Error('Controlled stream did not start')), 20000))]);
    await expect(primary).toContainText('Generating');
    await expect(primary).toContainText('1/2 tasks');
    await expect(primary).toContainText('Native tool executed');
    await expect(primary).not.toContainText('Streaming fixture fragment');
    await page.screenshot({ path: join(output, '03-streaming.png') });
    await secondary.click();
    await expect(secondary).toHaveAttribute('aria-selected', 'true');
    releaseStream();
    await settled;
    await expect(primary).toContainText('formally committed assistant reply');
    await expect(secondary).not.toContainText('Streaming fixture fragment');
    const events = await readPersistedEvents(scaffold, SessionId('sidebar-primary'));
    assert.ok(events.some(event => event.type === 'todo/write' && event.data.todos[0]?.content === 'Native tool executed'));
    await writeFile(join(output, 'native-events.json'), JSON.stringify(events.filter(event => ['todo/write', 'assistant/message', 'turn/start', 'turn/end'].includes(event.type)), null, 2));
    result.checks.push('native-todo-tool-through-agent-loop', 'stream-fragments-hidden-until-commit', 'unopened-session-push-after-switch');

    const search = page.getByRole('searchbox', { name: 'Search sessions' });
    await search.fill('no-such-session-unique');
    await expect(page.getByRole('status').filter({ hasText: 'No matching sessions' })).toBeVisible();
    await search.fill('');
    await primary.focus();
    await page.keyboard.press('Home');
    await expect(page.locator('.dsh-history-card[aria-posinset="1"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    const keyboardTarget = page.locator('.dsh-history-card[aria-posinset="2"]');
    await expect(keyboardTarget).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(keyboardTarget).toHaveAttribute('aria-selected', 'true');
    result.checks.push('search-and-empty-result', 'keyboard-navigation-and-enter');

    await scaffold.ctx.workspaceController.archiveSession({ sessionId: SessionId('sidebar-secondary') });
    await expect(secondary).toHaveCount(0);
    await scaffold.ctx.workspaceController.unarchiveSession({ sessionId: SessionId('sidebar-secondary') });
    await expect(secondary).toBeVisible();
    result.checks.push('host-archive-and-restore-filter');

    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect(page.locator('.dsh-history')).toHaveCount(0);
    await expect(page.locator('.dsh-history-rail')).toBeVisible();
    await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
    await expect(page.locator('.dsh-history')).toBeVisible();
    result.checks.push('sidebar-collapse-and-restore');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await page.locator('.dsh-history').boundingBox())?.x ?? 0).toBeLessThanOrEqual(-260);
    await page.locator('[data-sidebar-opener="true"]').click();
    await expect.poll(async () => (await page.locator('.dsh-history').boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0);
    assert.ok(await page.locator('.dsh-history').evaluate(element => element.getBoundingClientRect().right <= innerWidth));
    assert.ok(await page.locator('.dsh-history-scroll').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    await page.screenshot({ path: join(output, '04-mobile.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.screenshot({ path: join(output, '05-final-desktop.png') });
    result.checks.push('mobile-layout');

    await expect(page.locator('.dsh-history')).toBeVisible();
    const seeder = new Context();
    await seeder.plugin(JsonlSessionPersistence, { root: scaffold.persistenceRoot });
    try {
      for (let index = 0; index < 240; index++) {
        const content = index === 0 ? 'A very long reply <img src=x onerror=alert(1)> ' + 'extended content '.repeat(1000) : `History fixture reply ${index}`;
        const id = SessionId(`history-long-${index}`);
        const decoded = parseSeedFixture(realizeSeedFixture(scaffold, seed(`History fixture ${String(index).padStart(3, '0')} ${index === 0 ? 'Long title '.repeat(30) : ''}`, content), id));
        const handle = await seeder.sessionPersistence.create({ version: SESSION_FORMAT_VERSION, id, createdAt: Date.now() - 60000,
          isSeeded: false, cwd: scaffold.workspaceCwd, delegationDepth: 0 });
        await handle.append(decoded.events);
        await handle.close();
      }
    } finally { await seeder.fiber.dispose(); }
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('.dsh-history-head')).toContainText('243 sessions', { timeout: 15000 });
    await expect(page.locator('.dsh-history-card').first()).toBeVisible();
    result.longHistoryLayout = await page.locator('.dsh-history-scroll').evaluate(element => ({ height: element.clientHeight, scrollHeight: element.scrollHeight, width: element.clientWidth, mounted: element.querySelectorAll('.dsh-history-card').length }));
    assert.ok(await page.locator('.dsh-history-card').count() < 15, `Only the viewport and overscan mount: ${JSON.stringify(result.longHistoryLayout)}`);
    const initialAgents = scaffold.ctx.agents.list().length;
    const scroller = page.locator('.dsh-history-scroll');
    await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(page.locator('.dsh-history-card[aria-posinset="243"]')).toBeVisible();
    assert.ok(await page.locator('.dsh-history-card').count() < 15);
    assert.equal(scaffold.ctx.agents.list().length, initialAgents, 'Scrolling reads projections without creating historical agents');
    const bottom = page.locator('.dsh-history-card[aria-posinset="243"]');
    await bottom.focus();
    await page.keyboard.press('Home');
    await expect(page.locator('.dsh-history-card[aria-posinset="1"]')).toBeFocused();
    await page.keyboard.press('End');
    await expect(bottom).toBeFocused();
    await page.screenshot({ path: join(output, '06-long-history.png') });
    result.mountedCards = await page.locator('.dsh-history-card').count();
    result.historySessions = 243;
    result.activeAgentsAfterScroll = scaffold.ctx.agents.list().length;
    result.checks.push('243-session-history-viewport-rendering', 'scroll-does-not-activate-historical-agents', 'home-end-across-virtualized-rows');

    const chinese = await browser.newPage({ viewport: { width: 1440, height: 1024 }, locale: 'zh-CN', colorScheme: 'light' });
    chinese.on('pageerror', error => errors.push(error.message));
    await chinese.goto(scaffold.authenticatedUrl, { waitUntil: 'load' });
    await expect(chinese.getByRole('searchbox', { name: '搜索会话' })).toBeVisible();
    await chinese.getByRole('searchbox', { name: '搜索会话' }).fill('History fixture 000');
    const longCard = chinese.locator('[data-session-id="history-long-0"]');
    await expect(longCard).toContainText('<img src=x onerror=alert(1)>', { timeout: 20000 });
    assert.equal(await longCard.locator('img').count(), 0, 'Untrusted session text stays text');
    assert.ok(await longCard.locator('.dsh-history-preview p').evaluate(element => element.getBoundingClientRect().height <= 35));
    assert.ok(await longCard.locator('.dsh-history-title').evaluate(element => element.getBoundingClientRect().height >= parseFloat(getComputedStyle(element).lineHeight) * 2 - 1));
    await chinese.screenshot({ path: join(output, '07-chinese-light-long-content.png') });
    await chinese.close();
    result.checks.push('chinese-light-theme', 'long-content-clamping-and-html-escaping');
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.deepEqual(await hashSources(), result.candidateSources, 'Verify one unchanged executable candidate');
    result.status = 'PASS';
    result.consoleErrors = errors;
  } catch (error) {
    result.status = 'FAIL';
    result.error = String(error.stack ?? error);
    result.consoleErrors = errors;
    if (page && !page.isClosed()) {
      try {
        await page.screenshot({ path: join(output, 'failure.png'), timeout: 5000 });
        await writeFile(join(output, 'failure-body.txt'), await page.locator('body').innerText());
      } catch (captureError) { result.failureCaptureError = String(captureError); }
    }
    throw error;
  } finally {
    releaseStream();
    await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2));
    await browser?.close();
    await scaffold.close();
  }
}, 240000);
