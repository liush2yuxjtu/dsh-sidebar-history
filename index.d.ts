import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-session-projection';

export interface SidebarHistory {
  todos: null | {
    total: number;
    completed: number;
    items: { content: string; status: 'pending' | 'in_progress' | 'completed' }[];
  };
  assistant: null | { text: string; messageId: string };
}
declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap { sidebarHistory: SidebarHistory }
}
export const name: string;
export const inject: string[];
export function apply(ctx: Context): Promise<void>;
