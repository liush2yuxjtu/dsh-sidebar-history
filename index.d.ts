import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-session-projection';

export interface SidebarHistory {
  currentTurn: number;
  lastTurnEndKind: string | null;
  todos: null | {
    total: number;
    completed: number;
    items: { content: string; status: 'pending' | 'in_progress' | 'completed' }[];
  };
  assistant: null | { text: string; messageId: string; turn: number };
}
declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap { sidebarHistory: SidebarHistory }
}
export const name: string;
export const inject: string[];
export function apply(ctx: Context): Promise<void>;
