import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyHistory, projectHistory } from '../src/projection.mjs';

const message = (text, extra = {}) => ({ type: 'assistant/message', data: {
  message: { id: 'message-1', content: [{ type: 'text', text }] }, ...extra,
} });

test('only task events determine counts and preserve active/pending tasks before completed items', () => {
  const state = projectHistory(emptyHistory(), { type: 'todo/write', data: { todos: [
    { content: 'done 1', status: 'completed' }, { content: 'waiting', status: 'pending' },
    { content: 'working', status: 'in_progress' }, { content: 'done 2', status: 'completed' },
  ] } });
  assert.equal(state.todos.total, 4);
  assert.equal(state.todos.completed, 2);
  assert.deepEqual(state.todos.items.map(item => item.content), ['working', 'waiting', 'done 1']);
  assert.equal(projectHistory(state, message('All tasks are complete')).todos.completed, 2);
});
test('starting a new turn clears old tasks but retains the last committed reply', () => {
  let state = projectHistory(emptyHistory(), message('previous complete reply'));
  state = projectHistory(state, { type: 'todo/write', data: { todos: [{ content: 'task', status: 'pending' }] } });
  state = projectHistory(state, { type: 'turn/start' });
  assert.equal(state.todos, null);
  assert.equal(state.assistant.text, 'previous complete reply');
});
test('attempts, streaming fragments, reasoning and tool results never become a committed preview', () => {
  const initial = projectHistory(emptyHistory(), message('finished'));
  for (const type of ['assistant/attempt', 'assistant/chunk', 'tool/result', 'user/message']) {
    assert.equal(projectHistory(initial, { type, data: { text: 'not a reply' } }), initial);
  }
  assert.equal(projectHistory(initial, message('partial cancelled reply', { interrupted: true })), initial);
  const next = message('final');
  next.data.message.content.unshift({ type: 'reasoning', text: 'private reasoning' });
  assert.equal(projectHistory(initial, next).assistant.text, 'final');
});
test('empty committed messages replace the previous reply without inventing text', () => {
  const state = projectHistory(projectHistory(emptyHistory(), message('old')), message(''));
  assert.equal(state.assistant.text, '');
});
test('independent session folds never exchange task or assistant data', () => {
  const a = projectHistory(emptyHistory(), message('Session A'));
  const b = projectHistory(emptyHistory(), { type: 'todo/write', data: { todos: [{ content: 'B task', status: 'completed' }] } });
  assert.equal(a.todos, null);
  assert.equal(b.assistant, null);
  assert.equal(a.assistant.text, 'Session A');
});
test('replay produces the same bounded state and later full-list writes replace earlier tasks', () => {
  const events = [message('x'.repeat(10000)), { type: 'todo/write', data: { todos: Array.from({ length: 1000 }, () => ({ content: 'z'.repeat(900), status: 'pending' })) } }, { type: 'todo/write', data: { todos: [] } }];
  const a = events.reduce(projectHistory, emptyHistory());
  const b = JSON.parse(JSON.stringify(events)).reduce(projectHistory, emptyHistory());
  assert.deepEqual(a, b);
  assert.equal(a.assistant.text.length, 360);
  assert.deepEqual(a.todos, { items: [], completed: 0, total: 0 });
  const large = projectHistory(emptyHistory(), events[1]);
  assert.equal(large.todos.items.length, 3);
  assert.equal(large.todos.items[0].content.length, 180);
});
