import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { it } from 'vitest';
import { chromium, expect } from 'playwright/test';

const source = resolve(process.env.DSH_SOURCE_ROOT);
const require = createRequire(join(source, 'apps/cli/package.json'));
const { LlmAdapter, ToolCallId, createSystemMessage } = require('@deepseek-ai/dsh-llm');
const { SESSION_FORMAT_VERSION, SessionId } = require('@deepseek-ai/dsh-session');
const { launchWebScaffold, seedSession, readPersistedEvents } = await import(pathToFileURL(join(source, 'apps/web/tests/scaffold.ts')).href);
const { writeComposerDraft } = await import(pathToFileURL(join(source, 'apps/web/tests/support.ts')).href);
const root = resolve(import.meta.dirname, '../..');
const recording = process.env.DSH_DEMO_MODE === 'record';
const output = resolve(process.env.DSH_DEMO_OUTPUT ?? join(root, '.runtime/release-demo', recording ? 'take1' : 'rehearsal'));
const tasks = [
  { content: 'Connect TODO events', status: 'completed' },
  { content: 'Show latest assistant reply', status: 'completed' },
  { content: 'Check session isolation', status: 'in_progress' },
  { content: 'Verify reload recovery', status: 'pending' },
];
const previousReply = 'History cards show your task progress and the latest saved reply. Session isolation and reload checks are next.';
const finalReply = 'Sidebar checks complete. Each session keeps its own TODO progress and latest saved reply after reload.';

function seed(title, reply, todos) {
  let seq = 0;
  const createdAt = Date.now() - 3600000;
  const lines = [{ type: 'session', version: SESSION_FORMAT_VERSION, id: '{{sessionId}}', createdAt, cwd: '{{cwd}}/workspace', isSeeded: false, delegationDepth: 0 }];
  const at = (type, data, surfaceOp) => lines.push({ type, data, seq: seq++, time: createdAt + seq, ...(surfaceOp ? { surfaceOp } : {}) });
  at('turn/start', { turn: 1 });
  at('step/start', { turn: 1, step: 1 });
  at('system/message', { turn: 1, step: 1, message: createSystemMessage('') }, 'append');
  at('user/message', { id: crypto.randomUUID(), role: 'user', content: [{ type: 'text', text: `Demo workspace: ${title}.` }], source: { kind: 'user' } }, 'append');
  at('session/title', { title, messageSeqs: [], source: { kind: 'user' } });
  if (todos) at('todo/write', { todos });
  if (reply !== null) at('assistant/message', { turn: 1, step: 1, stream: [], message: {
    id: crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text: reply }],
    source: { kind: 'model', provider: 'sidebar-demo', model: 'controlled-demo-data' },
  } }, 'append');
  at('step/end', { turn: 1, step: 1 });
  at('turn/end', { turn: 1, reason: { kind: 'completed' } });
  return lines.map(line => JSON.stringify(line)).join('\n') + '\n';
}

it('records real DSH UI with explicitly controlled demonstration data', async () => {
  await mkdir(join(output, 'evidence'), { recursive: true });
  await mkdir(join(output, 'raw/frames'), { recursive: true });
  assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159');
  const scaffold = await launchWebScaffold({ profile: { hmr: false, packages: [{ dir: root, enabled: true }] } });
  const markers = [];
  const frames = [];
  const errors = [];
  const discoveries = [];
  let browser, page, cdp, turnSettled, frameWrites = Promise.resolve(), t0 = 0;
  let releaseReply;
  const replyGate = new Promise(resolve => { releaseReply = resolve; });
  let calls = 0;
  class DemoAdapter extends LlmAdapter {
    async listModels(provider) { return [{ provider, id: 'controlled-demo-data', name: 'Controlled demo data' }]; }
    async resolveModel(provider, id) { return { provider, id, name: 'Controlled demo data' }; }
    async *stream() {
      calls++;
      if (calls <= 2) {
        const id = ToolCallId(`sidebar-demo-todo-${calls}`);
        const todos = tasks.map((task, index) => ({ ...task, status: calls === 2 || index < 3 ? 'completed' : 'in_progress' }));
        const args = JSON.stringify({ todos });
        if (calls === 2) await new Promise(resolve => setTimeout(resolve, 1800));
        const text = calls === 1 ? 'Session isolation is checked. Verifying reload recovery.' : 'Task checks complete. Saving the latest reply.';
        yield { type: 'block-start', index: 0, blockType: 'text' };
        yield { type: 'text-delta', index: 0, text };
        yield { type: 'block-end', index: 0, block: { type: 'text', text } };
        yield { type: 'block-start', index: 1, blockType: 'tool-call' };
        yield { type: 'tool-call-delta', index: 1, id, name: 'todo_write', argumentsDelta: args };
        yield { type: 'block-end', index: 1, block: { type: 'tool-call', id, name: 'todo_write', arguments: args } };
        yield { type: 'finish', reason: { kind: 'tool-calls' } };
      } else {
        yield { type: 'block-start', index: 0, blockType: 'text' };
        yield { type: 'text-delta', index: 0, text: finalReply.slice(0, 24) };
        await replyGate;
        for (let i = 24; i < finalReply.length; i += 12) {
          await new Promise(resolve => setTimeout(resolve, 160));
          yield { type: 'text-delta', index: 0, text: finalReply.slice(i, i + 12) };
        }
        yield { type: 'block-end', index: 0, block: { type: 'text', text: finalReply } };
        yield { type: 'finish', reason: { kind: 'stop' } };
      }
    }
  }
  const wait = ms => page.waitForTimeout(ms);
  const mark = async label => {
    const body = await page.locator('body').innerText();
    assert.ok(!/[\u3400-\u9fff]/u.test(body), 'Recording UI must remain English');
    markers.push({ elapsed_ms: Math.max(0, Math.round(Date.now() - t0)), label, fixtureData: true, liveModel: false });
  };
  async function pointer() {
    await page.evaluate(() => {
      document.getElementById('demo-pointer')?.remove();
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.id = 'demo-pointer'; el.setAttribute('viewBox', '0 0 24 32');
      el.style.cssText = 'position:fixed;left:1120px;top:90px;width:20px;height:28px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 1px #0008)';
      el.innerHTML = '<path d="M2 2 L2 25 L8 19 L13 30 L18 28 L13 18 L22 18 Z" fill="white" stroke="#111" stroke-width="1.5"/>';
      document.body.appendChild(el);
      document.addEventListener('mousemove', e => { el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; });
    });
  }
  async function click(locator, label) {
    await expect(locator).toBeVisible();
    const rect = await locator.boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1281 && rect.y + rect.height <= 801, `Framing ${label}`);
    discoveries.push({ label, rect });
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 14 });
    await wait(350);
    await mark(label);
    await locator.click();
    await wait(650);
  }
  try {
    await seedSession(scaffold, seed('Plan next project', 'Start with one small deliverable and verify its result.'), 'demo-plan');
    await seedSession(scaffold, seed('Fix build error', 'The missing type import is fixed. Run the build to finish this task.', [
      { content: 'Reproduce build error', status: 'completed' },
      { content: 'Apply type import fix', status: 'completed' },
      { content: 'Run build', status: 'pending' },
    ]), 'demo-build');
    await seedSession(scaffold, seed('Ship sidebar history', previousReply, tasks), 'demo-sidebar');
    scaffold.ctx.llm.registerAdapter(['sidebar-demo'], new DemoAdapter());
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'sidebar-demo', model: 'controlled-demo-data' });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US', colorScheme: 'dark' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    const primary = page.locator('[data-session-id="demo-sidebar"]');
    const secondary = page.locator('[data-session-id="demo-build"]');
    await primary.waitFor({ timeout: 30000 });
    await primary.click();
    await page.getByRole('button', { name: 'Native navigation', exact: true }).click();
    await page.locator('.dsh-history').waitFor({ state: 'detached' });
    await expect(page.getByRole('button', { name: 'History cards', exact: true })).toBeVisible();
    await pointer();
    await page.screenshot({ path: join(output, 'evidence/preflight.png') });
    await writeFile(join(output, 'evidence/preflight.txt'), await page.locator('body').innerText());
    t0 = Date.now();
    if (recording) {
      cdp = await page.context().newCDPSession(page);
      let firstFrame;
      const first = new Promise(resolve => { firstFrame = resolve; });
      cdp.on('Page.screencastFrame', event => {
        const n = frames.length;
        const time = event.metadata.timestamp * 1000;
        if (n === 0) { t0 = time; firstFrame(); }
        const name = `frame-${String(n).padStart(6, '0')}.jpg`;
        frames.push({ name, elapsed_ms: time - t0 });
        frameWrites = frameWrites.then(() => writeFile(join(output, 'raw/frames', name), Buffer.from(event.data, 'base64')));
        cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
      await Promise.race([first, new Promise((_, reject) => setTimeout(() => reject(new Error('No screencast frame')), 10000))]);
    }
    await mark('Original sidebar');
    await wait(1100);
    await click(page.getByRole('button', { name: 'History cards', exact: true }), 'Open History cards');
    await expect(primary).toContainText('2/4 tasks');
    await expect(primary).toContainText('latest saved reply');
    await mark('TODO and latest reply visible');
    const proofStart = (Date.now() - t0) / 1000;
    await page.screenshot({ path: join(output, 'evidence/history-cards.png') });
    await wait(4400);
    const proofEnd = (Date.now() - t0) / 1000;
    await click(secondary, 'Open Fix build error');
    await expect(secondary).toContainText('2/3 tasks');
    await expect(secondary).toHaveAttribute('aria-selected', 'true');
    await expect(primary).toContainText('2/4 tasks');
    await wait(1600);
    await click(primary, 'Return to Ship sidebar history');
    const composer = page.locator('[data-composer-input][contenteditable="true"]').first();
    await click(composer, 'Complete the remaining checks');
    await writeComposerDraft(page, composer, 'Complete the remaining sidebar checks.');
    await wait(800);
    turnSettled = scaffold.whenTurnSettled(45000);
    turnSettled.catch(() => {});
    await mark('Submit demo task');
    await composer.press('Enter');
    await expect(primary).toContainText('Generating');
    await expect(primary).toContainText('3/4 tasks');
    await expect(primary).toContainText('Session isolation is checked.');
    await mark('Native TODO progress updates');
    await expect(primary).toContainText('4/4 tasks');
    await expect(primary).toContainText('Task checks complete.');
    await expect(primary).not.toContainText('Sidebar checks complete.');
    await page.screenshot({ path: join(output, 'evidence/generating.png') });
    await wait(2400);
    await mark('Commit the assistant reply');
    releaseReply();
    await turnSettled;
    await expect(primary).toContainText(finalReply);
    await expect(primary).not.toContainText('Generating');
    await mark('Latest committed reply updates');
    await wait(4500);
    await page.screenshot({ path: join(output, 'evidence/final.png') });
    await mark('End');
    const end = Date.now() - t0;
    if (recording) {
      await cdp.send('Page.stopScreencast');
      await frameWrites;
      assert.ok(frames.length > 20);
      const concat = frames.map((frame, i) => `file 'frames/${frame.name}'\nduration ${Math.max(0.001, ((frames[i + 1]?.elapsed_ms ?? end) - frame.elapsed_ms) / 1000).toFixed(6)}`).join('\n');
      await writeFile(join(output, 'raw/capture.ffconcat'), `ffconcat version 1.0\n${concat}\nfile 'frames/${frames.at(-1).name}'\n`);
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', join(output, 'raw/capture.ffconcat'), '-vf', 'scale=in_range=pc:out_range=tv,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', join(output, 'raw/gt.mp4')], { timeout: 120000 });
      const rawHash = createHash('sha256').update(await readFile(join(output, 'raw/gt.mp4'))).digest('hex');
      await writeFile(join(output, 'evidence/capture.json'), JSON.stringify({ frames: frames.length, duration_s: end / 1000, raw_sha256: rawHash, method: 'Chromium CDP screencast with original frame timestamps', fixtureData: true, liveModel: false }, null, 2));
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(primary).toHaveAttribute('aria-selected', 'true');
    await expect(primary).toContainText('4/4 tasks');
    await expect(primary).toContainText(finalReply);
    await expect(secondary).toContainText('2/3 tasks');
    await page.screenshot({ path: join(output, 'evidence/reloaded.png') });
    await writeFile(join(output, 'evidence/post-record-checks.json'), JSON.stringify({ reload: 'pass', sessionIsolation: 'pass', note: 'Checked after capture. Browser navigation is outside the feature video.' }, null, 2));
    const events = await readPersistedEvents(scaffold, SessionId('demo-sidebar'));
    assert.ok(events.some(e => e.type === 'todo/write' && e.data.todos.every(t => t.status === 'completed')));
    await writeFile(join(output, 'evidence/events.json'), JSON.stringify(events.filter(e => ['todo/write', 'assistant/message', 'turn/start', 'turn/end'].includes(e.type)), null, 2));
    assert.deepEqual(errors, []);
    await writeFile(join(output, 'evidence/markers.jsonl'), markers.map(row => JSON.stringify(row)).join('\n') + '\n');
    await writeFile(join(output, 'evidence/discovery.json'), JSON.stringify({ viewport: { width: 1280, height: 800 }, discoveries, uiLanguage: 'en', fixtureData: true, liveModel: false }, null, 2));
    await writeFile(join(output, 'evidence/result.json'), JSON.stringify({ status: 'pass', semantics: true, selectors: true, state_transitions: true, framing: true, dependencies: true, fixtureData: true, liveModel: false, proof_interval_s: [proofStart, proofEnd], consoleErrors: errors, mode: recording ? 'record' : 'rehearse' }, null, 2));
    console.log(JSON.stringify({ status: 'pass', output, recording, proof_interval_s: [proofStart, proofEnd] }));
  } catch (error) {
    if (page) await page.screenshot({ path: join(output, 'evidence/failure.png') }).catch(() => {});
    throw error;
  } finally {
    releaseReply();
    await turnSettled?.catch(() => {});
    await browser?.close();
    await scaffold.close();
  }
}, 180000);
