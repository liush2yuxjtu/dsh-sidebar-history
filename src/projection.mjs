/** Bounded per-session summary; source logs remain owned by DSH. */
export function emptyHistory() {
  return { todos: null, assistant: null };
}

/** Fold committed DSH events without interpreting prose as task state. */
export function projectHistory(state, event) {
  if (event.type === 'turn/start') {
    return state.todos === null ? state : { ...state, todos: null };
  }
  if (event.type === 'todo/write') {
    const todos = event.data.todos;
    const order = { in_progress: 0, pending: 1, completed: 2 };
    return { ...state, todos: {
      total: todos.length,
      completed: todos.filter(item => item.status === 'completed').length,
      items: [...todos].sort((a, b) => order[a.status] - order[b.status]).slice(0, 3)
        .map(item => ({ status: item.status, content: item.content.slice(0, 180) })),
    } };
  }
  if (event.type === 'assistant/message' && !event.data.interrupted) {
    const text = event.data.message.content.filter(block => block.type === 'text')
      .map(block => block.text).join(' ').replace(/\s+/g, ' ').trim();
    return { ...state, assistant: { text: text.slice(0, 360), messageId: event.data.message.id } };
  }
  return state;
}
