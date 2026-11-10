import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export const hash = value => createHash('sha256').update(value).digest('hex');

export function observeOfficialApi(maxRequests = 16) {
  const original = globalThis.fetch;
  const receipts = [];
  const pending = [];
  globalThis.fetch = async function(input, options) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const messages = url.origin === 'https://api.deepseek.com' && url.pathname.endsWith('/messages');
    if (!messages) return original.call(this, input, options);
    assert.ok(receipts.length < maxRequests, 'Real API request limit reached');
    const request = JSON.parse(options.body);
    const headers = new Headers(options.headers);
    const receipt = { endpoint: url.origin + url.pathname, sessionId: headers.get('x-deepseek-harness-session-id'),
      model: request.model, at: new Date().toISOString(), responseId: null, usage: {}, text: '', toolCalls: [] };
    receipts.push(receipt);
    const response = await original.call(this, input, options);
    receipt.httpStatus = response.status;
    receipt.requestId = response.headers.get('request-id') || response.headers.get('x-request-id') || response.headers.get('x-deepseek-request-id');
    const inspect = (async () => {
      const reader = response.clone().body.getReader();
      const decoder = new TextDecoder();
      const digest = createHash('sha256');
      const blocks = new Map();
      let buffer = '';
      const consume = line => {
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') return;
        const event = JSON.parse(payload);
        if (event.type === 'message_start') {
          receipt.responseId = event.message.id;
          Object.assign(receipt.usage, event.message.usage);
        }
        if (event.type === 'message_delta') { Object.assign(receipt.usage, event.usage); receipt.stopReason = event.delta?.stop_reason; }
        if (event.type === 'message_stop') receipt.complete = true;
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') blocks.set(event.index, { id: block.id, name: block.name, input: block.input, json: '' });
          if (block.type === 'text') receipt.text += block.text || '';
        }
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') receipt.text += event.delta.text;
          if (event.delta.type === 'input_json_delta') blocks.get(event.index).json += event.delta.partial_json;
        }
        if (event.type === 'content_block_stop' && blocks.has(event.index)) {
          const block = blocks.get(event.index);
          receipt.toolCalls.push({ id: block.id, name: block.name, arguments: block.json ? JSON.parse(block.json) : block.input });
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        digest.update(value);
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) consume(line.replace(/\r$/, ''));
        if (receipt.complete) break;
      }
      if (buffer) consume(buffer);
      assert.equal(receipt.complete, true, 'Official API stream did not reach message_stop');
      void reader.cancel().catch(() => {});
      receipt.responseSha256 = digest.digest('hex');
      receipt.finishedAt = new Date().toISOString();
    })();
    inspect.catch(() => {});
    pending.push(inspect);
    return response;
  };
  return { receipts, async settle() { await Promise.all(pending); }, restore() { globalThis.fetch = original; } };
}

export function assertRealProvenance(receipts, events, sessionId) {
  assert.ok(receipts.length > 0, 'No actual API responses observed');
  const relevant = receipts.filter(r => r.sessionId === sessionId);
  assert.ok(relevant.length > 0, 'API response must belong to the DSH session');
  for (const receipt of receipts) {
    assert.equal(receipt.httpStatus, 200);
    assert.match(receipt.endpoint, /^https:\/\/api\.deepseek\.com\/.*\/messages$/);
    assert.ok(receipt.responseId && receipt.responseSha256 && receipt.complete);
    assert.ok(receipt.usage.output_tokens > 0);
  }
  const wireCalls = relevant.flatMap(r => r.toolCalls);
  const assistant = events.filter(e => e.type === 'assistant/message' && !e.data.interrupted).map(e => e.data.message);
  const calls = assistant.flatMap(message => message.content.filter(block => block.type === 'tool-call'));
  assert.ok(calls.some(call => call.name === 'todo_write'), 'Real model must choose native todo_write');
  assert.ok(calls.some(call => call.name === 'read'), 'Real model must inspect the input with native read');
  for (const call of calls) {
    const wire = wireCalls.find(item => item.id === call.id);
    assert.ok(wire, 'Persisted tool call ID must occur in the actual API response');
    assert.equal(wire.name, call.name);
    assert.deepEqual(wire.arguments, JSON.parse(call.arguments));
  }
  for (const message of assistant) {
    assert.equal(message.source.provider, 'deepseek-official');
    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    if (text) assert.ok(relevant.some(receipt => receipt.text === text), 'Committed assistant text must match an actual API response');
  }
  const writes = events.filter(e => e.type === 'todo/write');
  assert.ok(writes.length >= 2, 'Native task progress must update during actual work');
  for (const write of writes) assert.ok(wireCalls.some(call => call.name === 'todo_write' && JSON.stringify(call.arguments.todos) === JSON.stringify(write.data.todos)));
  return { apiResponses: relevant.length, nativeToolCalls: calls.length, todoWrites: writes.length };
}

export async function startCapture(page, output) {
  await mkdir(join(output, 'raw/frames'), { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let writes = Promise.resolve(), started;
  let first;
  const ready = new Promise(resolve => { first = resolve; });
  cdp.on('Page.screencastFrame', event => {
    const time = event.metadata.timestamp * 1000;
    if (!frames.length) { started = time; first(); }
    const name = `frame-${String(frames.length).padStart(6, '0')}.jpg`;
    frames.push({ name, elapsed_ms: time - started });
    writes = writes.then(() => writeFile(join(output, 'raw/frames', name), Buffer.from(event.data, 'base64')));
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
  await Promise.race([ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Capture did not start')), 10000))]);
  return { get started() { return started; }, async stop() {
    const elapsed = Date.now() - started;
    await cdp.send('Page.stopScreencast'); await writes;
    const rows = frames.map((frame, i) => `file 'frames/${frame.name}'\nduration ${Math.max(0.001, ((frames[i + 1]?.elapsed_ms ?? elapsed) - frame.elapsed_ms) / 1000).toFixed(6)}`);
    await writeFile(join(output, 'raw/capture.ffconcat'), `ffconcat version 1.0\n${rows.join('\n')}\nfile 'frames/${frames.at(-1).name}'\n`);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', join(output, 'raw/capture.ffconcat'),
      '-t', String(elapsed / 1000), '-vf', 'scale=in_range=pc:out_range=tv,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', join(output, 'raw/gt.mp4')], { timeout: 120000 });
    return { duration_s: elapsed / 1000, frames: frames.length };
  } };
}

export async function installPointer(page) {
  await page.evaluate(() => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 32'); el.id = 'live-demo-pointer';
    el.style.cssText = 'position:fixed;left:1120px;top:90px;width:20px;height:28px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 1px #0008)';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 2 L2 25 L8 19 L13 30 L18 28 L13 18 L22 18 Z');
    path.setAttribute('fill', 'white'); path.setAttribute('stroke', '#111'); path.setAttribute('stroke-width', '1.5');
    el.appendChild(path); document.body.appendChild(el);
    document.addEventListener('mousemove', event => { el.style.left = event.clientX + 'px'; el.style.top = event.clientY + 'px'; });
  });
}
