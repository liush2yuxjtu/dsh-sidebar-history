import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('native cold reads replace a v1 sidebar checkpoint with v2 without retaining a session', { timeout: 30000 }, async () => {
  assert.ok(process.env.DSH_SOURCE_ROOT, 'DSH_SOURCE_ROOT must point to the built pinned DSH checkout');
  const require = createRequire(join(resolve(process.env.DSH_SOURCE_ROOT), 'apps/cli/package.json'));
  const { Context } = require('@deepseek-ai/cordis');
  const { z } = require('zod');
  const { default: SessionStore, SESSION_FORMAT_VERSION, SessionId, SessionLogOffset } = require('@deepseek-ai/dsh-session');
  const { default: Registry } = require('@deepseek-ai/dsh-session-projection');
  const { default: ProjectionCache, projectionCacheDomainSpec } = require('@deepseek-ai/dsh-session-projection-cache');
  const { default: Storage } = require('@deepseek-ai/dsh-storage');
  const JsonStorage = require('@deepseek-ai/dsh-storage-json');
  const StorageDomain = require('@deepseek-ai/dsh-storage-domain');
  const JsonlPersistence = require('@deepseek-ai/dsh-session-persistence-jsonl');
  const currentPlugin = await import(pathToFileURL(join(pluginRoot, 'index.mjs')).href);
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-sidebar-migration-'));
  const id = SessionId('sidebar-cold-v1-to-v2');
  const header = { version: SESSION_FORMAT_VERSION, id, createdAt: 1000, isSeeded: false, cwd: join(temporary, 'workspace') };
  const todoSchema = z.object({ content: z.string().max(180), status: z.enum(['pending', 'in_progress', 'completed']) });
  const oldSchema = z.object({
    todos: z.object({ total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), items: z.array(todoSchema).max(3) }).nullable(),
    assistant: z.object({ text: z.string().max(360), messageId: z.string() }).nullable(),
  });
  const oldDefinition = {
    key: 'sidebarHistory', stateSchema: oldSchema, stateVersion: 1,
    init: () => ({ todos: null, assistant: null }),
    apply(state, event) {
      if (event.type === 'turn/start') return state.todos === null ? state : { ...state, todos: null };
      if (event.type === 'todo/write') {
        const order = { in_progress: 0, pending: 1, completed: 2 };
        return { ...state, todos: {
          total: event.data.todos.length,
          completed: event.data.todos.filter(item => item.status === 'completed').length,
          items: [...event.data.todos].sort((a, b) => order[a.status] - order[b.status]).slice(0, 3)
            .map(item => ({ status: item.status, content: item.content.slice(0, 180) })),
        } };
      }
      if (event.type === 'assistant/message' && !event.data.interrupted) {
        const text = event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join(' ').replace(/\s+/g, ' ').trim();
        return { ...state, assistant: { text: text.slice(0, 360), messageId: event.data.message.id } };
      }
      return state;
    },
    wire: { viewSchema: oldSchema, view: state => state, summary: true },
  };
  const markdown = '**Saved result**\n\n- Order A: `18`';
  const events = [];
  const append = (type, data, surfaceOp) => events.push({ type, data, seq: events.length, time: 1001 + events.length, ...(surfaceOp ? { surfaceOp } : {}) });
  const message = (turn, messageId, content) => ({ turn, step: 1, stream: [], message: {
    id: messageId, role: 'assistant', content, source: { kind: 'model', provider: 'controlled-history', model: 'migration-regression' },
  } });
  append('turn/start', { turn: 1 });
  append('user/message', { id: 'migration-user-1', role: 'user', content: [{ type: 'text', text: 'Controlled historical migration regression' }], source: { kind: 'user' } }, 'append');
  append('step/start', { turn: 1, step: 1 });
  append('assistant/message', message(1, 'saved-reply', [{ type: 'text', text: markdown }]), 'append');
  append('step/end', { turn: 1, step: 1 });
  append('turn/end', { turn: 1, reason: { kind: 'completed' } });
  append('turn/start', { turn: 2 });
  append('user/message', { id: 'migration-user-2', role: 'user', content: [{ type: 'text', text: 'Inspect again' }], source: { kind: 'user' } }, 'append');
  append('step/start', { turn: 2, step: 1 });
  append('todo/write', { todos: [{ content: 'Verify again', status: 'pending' }] });
  append('assistant/message', message(2, 'tool-only-reply', [{ type: 'tool-call', id: 'migration-read', name: 'read', arguments: '{"path":"orders.json"}' }]), 'append');
  append('tool/call', { turn: 2, step: 1, callId: 'migration-read', name: 'read', arguments: '{"path":"orders.json"}' });
  append('tool/result', { turn: 2, step: 1, message: {
    id: 'migration-read-result', role: 'tool', toolCallId: 'migration-read', isError: false,
    content: [{ type: 'text', text: 'Controlled input read' }], source: { kind: 'tool', callId: 'migration-read' },
  } }, 'append');
  append('step/end', { turn: 2, step: 1 });
  append('turn/end', { turn: 2, reason: { kind: 'aborted', reason: { kind: 'legacy' } } });
  const contexts = new Set();
  const boot = async legacy => {
    const ctx = new Context();
    contexts.add(ctx);
    await ctx.plugin(Storage);
    await ctx.plugin(JsonStorage, { root: join(temporary, 'cache') });
    await ctx.plugin(StorageDomain, { backend: 'json' });
    await ctx.plugin(JsonlPersistence, { root: join(temporary, 'sessions') });
    await ctx.plugin(SessionStore);
    await ctx.plugin(Registry);
    if (legacy) await ctx.sessionProjections.register(oldDefinition);
    else await currentPlugin.apply(ctx);
    await ctx.plugin(ProjectionCache, { writeEveryEvents: 100, writeIntervalMs: 60000 });
    return ctx;
  };
  const coldRead = async (ctx, storedHeader, inheritedEventCount, log) => {
    let stop;
    let timeout;
    const written = new Promise((resolveWritten, reject) => {
      stop = ctx.on('domain/changed', change => {
        if (change.domain === projectionCacheDomainSpec.name && change.table === 'sessions' && change.key === id && change.operation === 'put') resolveWritten();
      });
      timeout = setTimeout(() => reject(new Error('Native cache did not durably refresh')), 10000);
    });
    try {
      const snapshot = ctx.sessionProjectionCache.coldSnapshot(storedHeader, inheritedEventCount, log);
      await written;
      return snapshot;
    } finally {
      clearTimeout(timeout);
      stop();
    }
  };
  const cachePath = join(temporary, 'cache', projectionCacheDomainSpec.name, 'sessions', id + '.json');
  try {
    const legacy = await boot(true);
    const writer = await legacy.sessionPersistence.create(header);
    await writer.append(events);
    await writer.flush();
    await writer.close();
    const stored = await legacy.sessionPersistence.open(id, 'read');
    const durable = await stored.read();
    const old = await coldRead(legacy, stored.header, stored.inheritedEventCount, durable.events);
    assert.equal(old.values.sidebarHistory.assistant.text, '');
    assert.equal(old.values.sidebarHistory.assistant.messageId, 'tool-only-reply');
    assert.equal(JSON.parse(await readFile(cachePath, 'utf8')).record.rows.sidebarHistory.ver, 1);
    assert.deepEqual(legacy.sessions.list(), []);
    await stored.close();
    await legacy.fiber.dispose();
    contexts.delete(legacy);

    const current = await boot(false);
    const reader = await current.sessionPersistence.open(id, 'read');
    const reopened = await reader.read();
    assert.deepEqual(reopened.events, durable.events, 'Migration must not alter the historical JSONL events');
    assert.equal(current.sessionProjectionCache.cachedSnapshot(reader.header), undefined, 'The v1 checkpoint must not be served as a v2 summary');
    const restored = await coldRead(current, reader.header, reader.inheritedEventCount, reopened.events);
    assert.deepEqual(restored.values.sidebarHistory, {
      currentTurn: 2, lastTurnEndKind: 'aborted',
      todos: { total: 1, completed: 0, items: [{ content: 'Verify again', status: 'pending' }] },
      assistant: { text: markdown, messageId: 'saved-reply', turn: 1 },
    });
    const checkpoint = JSON.parse(await readFile(cachePath, 'utf8')).record.rows.sidebarHistory;
    assert.equal(checkpoint.ver, 2);
    assert.equal(checkpoint.seq, events.length - 1);
    assert.deepEqual(current.sessionProjectionCache.cachedSnapshot(reader.header).values.sidebarHistory, restored.values.sidebarHistory);
    assert.deepEqual(current.sessions.list(), [], 'Cold refold must not retain or activate a historical Session');
    assert.equal(current.agents, undefined, 'The migration harness must not install or create an Agent');
    await reader.close();
    console.log(JSON.stringify({ status: 'PASS', surface: 'native-v1-to-v2-cold-projection', storedEvents: events.length, oldVersion: 1, newVersion: 2, retainedSessions: 0, agents: 0, fixtureData: true, liveModel: false }));
  } finally {
    for (const ctx of contexts) await ctx.fiber.dispose();
    await rm(temporary, { recursive: true, force: true });
  }
});
