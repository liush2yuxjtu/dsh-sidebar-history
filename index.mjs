import { z } from 'zod';
import { emptyHistory, projectHistory } from './src/projection.mjs';

export const name = 'sidebar-history';
export const inject = ['sessionProjections'];

const todo = z.object({ content: z.string().max(180), status: z.enum(['pending', 'in_progress', 'completed']) });
const summary = z.object({
  todos: z.object({ total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), items: z.array(todo).max(3) }).nullable(),
  assistant: z.object({ text: z.string().max(360), messageId: z.string() }).nullable(),
});

/** Register one replayable summary for both unopened and active sessions. */
export async function apply(ctx) {
  await ctx.sessionProjections.register({
    key: 'sidebarHistory', stateSchema: summary, init: emptyHistory, apply: projectHistory,
    wire: { viewSchema: summary, view: state => state, summary: true }, stateVersion: 1,
  });
}
