import assert from 'node:assert/strict';
import { it } from 'node:test';
import { assertRequestedTasks, mediaLocales } from './media-locales.mjs';
it('accepts a localized task status note while retaining the requested task names', () => {
  const tasks = mediaLocales.ja.tasks.map(content => ({ content }));
  tasks[2].content += '（承認待ちのため保留）';
  assert.doesNotThrow(() => assertRequestedTasks(tasks, mediaLocales.ja.tasks, 'ja'));
});
it('rejects a different-language task or a duplicate task', () => {
  const tasks = mediaLocales.ja.tasks.map(content => ({ content }));
  tasks[2].content = 'Publish release';
  assert.throws(() => assertRequestedTasks(tasks, mediaLocales.ja.tasks, 'ja'));
  tasks[2].content = tasks[0].content;
  assert.throws(() => assertRequestedTasks(tasks, mediaLocales.ja.tasks, 'ja'));
});
