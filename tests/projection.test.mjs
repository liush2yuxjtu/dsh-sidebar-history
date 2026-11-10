import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyHistory, projectHistory } from '../src/projection.mjs';

const start = turn => ({ type: 'turn/start', data: { turn } });
const end = (turn, reason) => ({ type: 'turn/end', data: { turn, reason } });
const tasks = todos => ({ type: 'todo/write', data: { todos } });
const message = (turn, text, extra = {}) => ({ type: 'assistant/message', data: {
  turn, step: 1, stream: [], message: { id: `message-${turn}`, content: [{ type: 'text', text }] }, ...extra,
} });

test('only task events determine counts and prioritize active and pending tasks', () => {
  const state = [start(1), tasks([
    { content: 'done 1', status: 'completed' }, { content: 'waiting', status: 'pending' },
    { content: 'working', status: 'in_progress' }, { content: 'done 2', status: 'completed' },
  ])].reduce(projectHistory, emptyHistory());
  assert.equal(state.todos.total, 4);
  assert.equal(state.todos.completed, 2);
  assert.deepEqual(state.todos.items.map(item => item.content), ['working', 'waiting', 'done 1']);
  assert.equal(projectHistory(state, message(1, 'All tasks are complete')).todos.completed, 2);
});

test('a new turn clears old tasks and identifies the retained reply as earlier', () => {
  const state = [start(1), tasks([{ content: 'task', status: 'pending' }]),
    message(1, 'previous complete reply'), end(1, { kind: 'completed' }), start(2),
  ].reduce(projectHistory, emptyHistory());
  assert.equal(state.currentTurn, 2);
  assert.equal(state.lastTurnEndKind, null);
  assert.equal(state.todos, null);
  assert.deepEqual(state.assistant, { text: 'previous complete reply', messageId: 'message-1', turn: 1 });
  const next = projectHistory(state, message(2, 'current reply'));
  assert.equal(next.currentTurn, next.assistant.turn);
  assert.equal(next.assistant.text, 'current reply');
});

test('attempts, streaming fragments, reasoning and tool results never replace a committed reply', () => {
  const initial = [start(1), message(1, 'finished'), start(2)].reduce(projectHistory, emptyHistory());
  const ignored = [
    { type: 'assistant/attempt', data: { turn: 2, step: 1, stream: [] } },
    { type: 'assistant/chunk', data: { text: 'streaming' } },
    { type: 'tool/result', data: { message: { content: [{ type: 'text', text: 'tool output' }] } } },
    { type: 'user/message', data: { content: [{ type: 'text', text: 'input' }] } },
    message(2, 'partial cancelled reply', { interrupted: true }),
    message(2, '', { message: { id: 'reasoning-only', content: [{ type: 'reasoning', text: 'private reasoning' }] } }),
  ];
  for (const event of ignored) assert.equal(projectHistory(initial, event), initial);
  const next = message(2, 'final');
  next.data.message.content.unshift({ type: 'reasoning', text: 'private reasoning' });
  assert.equal(projectHistory(initial, next).assistant.text, 'final');
});

test('empty and tool-only commits retain the latest useful reply across multiple turns', () => {
  const old = message(1, 'useful text');
  const toolOnly = message(2, '', { message: { id: 'tool-only', content: [
    { type: 'tool-call', id: 'read-1', name: 'read', arguments: '{"path":"orders.json"}' },
  ] } });
  const state = [start(1), old, end(1, { kind: 'completed' }), start(2),
    toolOnly, message(2, ' \n\t '), end(2, { kind: 'completed' }), start(3),
  ].reduce(projectHistory, emptyHistory());
  assert.equal(state.currentTurn, 3);
  assert.deepEqual(state.assistant, { text: 'useful text', messageId: 'message-1', turn: 1 });
  const firstToolOnly = [start(1), { ...toolOnly, data: { ...toolOnly.data, turn: 1 } }]
    .reduce(projectHistory, emptyHistory());
  assert.equal(firstToolOnly.assistant, null);
});

test('Markdown line breaks, fenced code and indentation survive the bounded projection', () => {
  const markdown = '**Audit**\n\n- Order A: `18`\n- _Order B_: 3\n\n```js\n  const total = 18;\n```';
  const state = [start(1), message(1, `  \n${markdown}\n  `)].reduce(projectHistory, emptyHistory());
  assert.equal(state.assistant.text, markdown);
});

test('separate text blocks keep their Markdown block boundary', () => {
  const event = message(1, '', { message: { id: 'two-blocks', content: [
    { type: 'text', text: '**Result**\n' }, { type: 'text', text: '```\n  18\n```' },
  ] } });
  const state = [start(1), event].reduce(projectHistory, emptyHistory());
  assert.equal(state.assistant.text, '**Result**\n\n```\n  18\n```');
});

test('cancellation, errors and native end kinds stay explicit until the next turn', () => {
  for (const reason of [
    { kind: 'aborted', reason: { kind: 'legacy' } },
    { kind: 'error', error: { message: 'network unavailable', code: 'UNKNOWN' } },
    { kind: 'blocked' }, { kind: 'max-tokens' }, { kind: 'interrupted' },
    { kind: 'forked' }, { kind: 'plugin-specific-end' },
  ]) {
    const state = [start(1), message(1, 'saved'), start(2),
      tasks([{ content: 'still pending', status: 'pending' }]), end(2, reason),
    ].reduce(projectHistory, emptyHistory());
    assert.equal(state.lastTurnEndKind, reason.kind);
    assert.equal(state.todos.completed, 0);
    assert.equal(state.assistant.turn, 1);
    const restarted = projectHistory(state, start(3));
    assert.equal(restarted.lastTurnEndKind, null);
    assert.equal(restarted.todos, null);
    assert.equal(restarted.assistant.text, 'saved');
  }
});

test('independent session folds never exchange turn, task or reply data', () => {
  const a = [start(2), message(2, 'Session A')].reduce(projectHistory, emptyHistory());
  const b = [start(1), tasks([{ content: 'B task', status: 'completed' }]), end(1, { kind: 'aborted', reason: { kind: 'legacy' } })]
    .reduce(projectHistory, emptyHistory());
  assert.equal(a.todos, null);
  assert.equal(a.lastTurnEndKind, null);
  assert.equal(b.currentTurn, 1);
  assert.equal(b.assistant, null);
  assert.equal(b.lastTurnEndKind, 'aborted');
  assert.equal(a.assistant.text, 'Session A');
});

test('historical full-log refold produces current-turn metadata without changing source events', () => {
  const events = [start(1), message(1, '**Prior result**'), end(1, { kind: 'completed' }), start(2),
    tasks([{ content: 'Verify again', status: 'pending' }]),
    end(2, { kind: 'aborted', reason: { kind: 'legacy' } }),
  ];
  const original = JSON.stringify(events);
  const replay = JSON.parse(original).reduce(projectHistory, emptyHistory());
  assert.deepEqual(replay, {
    currentTurn: 2, lastTurnEndKind: 'aborted',
    todos: { total: 1, completed: 0, items: [{ content: 'Verify again', status: 'pending' }] },
    assistant: { text: '**Prior result**', messageId: 'message-1', turn: 1 },
  });
  assert.deepEqual(events.reduce(projectHistory, emptyHistory()), replay);
  assert.equal(JSON.stringify(events), original);
});

test('replay stays bounded and later full-list writes replace earlier tasks', () => {
  const longTasks = tasks(Array.from({ length: 1000 }, () => ({ content: 'z'.repeat(900), status: 'pending' })));
  const events = [start(1), message(1, 'x'.repeat(10000)), longTasks, tasks([])];
  const a = events.reduce(projectHistory, emptyHistory());
  const b = JSON.parse(JSON.stringify(events)).reduce(projectHistory, emptyHistory());
  assert.deepEqual(a, b);
  assert.equal(a.assistant.text.length, 360);
  assert.deepEqual(a.todos, { items: [], completed: 0, total: 0 });
  const large = [start(1), longTasks].reduce(projectHistory, emptyHistory());
  assert.equal(large.todos.total, 1000);
  assert.equal(large.todos.items.length, 3);
  assert.equal(large.todos.items[0].content.length, 180);
});
