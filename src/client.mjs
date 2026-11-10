import { parseHistoryMarkdown, renderHistoryMarkdown } from './markdown-preview.mjs';

window.__ModuleLoader__.load({
  id: 'dsh-sidebar-history',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useLayoutEffect, useRef, useId, useSyncExternalStore } = React;
    const NS = 'sidebar-history';
    const layout = { padding: 9, border: 1, gap: 5, title: 36, meta: 16, preview: 42, task: 16, taskGap: 3, context: 16, more: 16, rowGap: 8 };
    const en = {
      history: 'Chat history', search: 'Search sessions', empty: 'No sessions yet', noMatch: 'No matching sessions',
      noReply: 'No assistant reply yet', assistant: 'Latest assistant reply', earlier: 'Earlier reply', noTasks: 'No task list this turn',
      running: 'Generating…', pending: 'Pending', in_progress: 'In progress', completed: 'Completed',
      native: 'Workspaces & archives', cards: 'History cards', more: '+{count} more', updated: 'Updated',
      loading: 'Loading history…', searching: 'Searching…', searchError: 'Search incomplete. Some sessions may be missing.', searchLocalEmpty: 'No cached matches. Retry to search all sessions.', retrySearch: 'Retry search',
      loadError: 'Summary unavailable. Open this session to inspect.', migration: 'Open this session to upgrade its history.', searchLimit: 'Content search reached its result limit. Refine your search.',
      tasks: '{done}/{total} tasks', count: '{count} sessions', countOne: '1 session',
      aborted: 'Stopped', blocked: 'Blocked', error: 'Failed', 'max-tokens': 'Token limit reached', interrupted: 'Interrupted', forked: 'Forked',
    };
    const zh = {
      history: '历史会话', search: '搜索会话', empty: '暂无历史会话', noMatch: '没有匹配的会话',
      noReply: '暂无 Assistant 回复', assistant: '最新 Assistant 回复', earlier: '此前回复', noTasks: '本轮暂无任务列表',
      running: '生成中…', pending: '待处理', in_progress: '进行中', completed: '已完成',
      native: '工作区与归档', cards: '历史卡片', more: '另有 {count} 项', updated: '更新于',
      loading: '正在加载历史…', searching: '正在搜索…', searchError: '搜索未完成，部分会话可能未显示。', searchLocalEmpty: '本地没有匹配，请重试以搜索全部会话。', retrySearch: '重试搜索',
      loadError: '摘要暂不可用，请打开会话查看。', migration: '请打开会话升级历史数据。', searchLimit: '正文搜索已达到结果上限，请缩小搜索范围。',
      tasks: '{done}/{total} 项任务', count: '{count} 个会话', countOne: '1 个会话',
      aborted: '已停止', blocked: '受阻', error: '失败', 'max-tokens': '达到 Token 上限', interrupted: '已中断', forked: '已分支',
    };
    const endingLabels = new Set(['aborted', 'blocked', 'error', 'max-tokens', 'interrupted', 'forked']);
    const contextFor = (row, t) => {
      const view = row.projectionValues?.sidebarHistory;
      const earlier = view?.assistant && view.assistant.turn < view.currentTurn;
      return [earlier && t('earlier'), !view?.todos?.total && (earlier || row.running) && t('noTasks')].filter(Boolean).join(' · ');
    };
    const rowSize = (row, t) => {
      const todos = row.projectionValues?.sidebarHistory?.todos;
      const blocks = [layout.title, layout.meta, layout.preview];
      if (todos?.items.length) blocks.push(todos.items.length * layout.task + (todos.items.length - 1) * layout.taskGap);
      if (todos?.total > 3) blocks.push(layout.more);
      if (contextFor(row, t)) blocks.push(layout.context);
      return blocks.reduce((sum, size) => sum + size, 0) + (blocks.length - 1) * layout.gap + 2 * (layout.padding + layout.border) + layout.rowGap;
    };
    const css = `
      .dsh-history{--hc-line:var(--dsw-alias-border-l2,#d9dde5);--hc-text:var(--dsw-alias-label-primary,#20242c);--hc-muted:var(--dsw-alias-label-secondary,#6d7481);--hc-bg:var(--dsw-specific-input-major,#fff);--hc-success:color-mix(in srgb,var(--dsw-alias-state-success-primary,#287b57) 50%,var(--hc-text));--hc-warn:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#9b6300) 50%,var(--hc-text));--hc-accent:var(--dsw-alias-state-info-primary,#377df5);color:var(--hc-text);display:flex;flex-direction:column;min-height:0;flex:0 0 auto;height:100cqh;max-height:100cqh;overflow:hidden;font-size:12px;padding:8px 8px 0;box-sizing:border-box}
      .dsh-history *{box-sizing:border-box}.dsh-history-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 4px 10px}.dsh-history-head strong{font-size:13px;font-weight:600}.dsh-history-head span{color:var(--hc-muted);font-size:12px}.dsh-history-search{width:100%;border:1px solid var(--hc-line);border-radius:8px;background:transparent;color:inherit;padding:8px 10px;font:inherit;margin-bottom:8px;min-width:0;flex-shrink:0}
      .dsh-history-notice{display:flex;align-items:center;gap:6px;color:var(--hc-warn);font-size:12px;line-height:17px;margin:0 0 8px;padding:0 4px;flex-shrink:0}.dsh-history-notice span{flex:1;min-width:0}.dsh-history-notice button{border:1px solid var(--hc-line);border-radius:6px;padding:5px;background:transparent;color:inherit;font:inherit;cursor:pointer;flex:none}
      .dsh-history-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}.dsh-history-space{position:relative;width:100%}.dsh-history-card{position:absolute;left:0;right:0;display:flex;flex-direction:column;gap:${layout.gap}px;text-align:left;padding:${layout.padding}px;border:${layout.border}px solid var(--hc-line);border-radius:10px;background:var(--hc-bg);color:inherit;width:100%;font:inherit;cursor:pointer;overflow:hidden}
      .dsh-history-card:hover{border-color:var(--hc-accent)}.dsh-history-card[aria-selected=true]{border-color:var(--hc-accent);background:color-mix(in srgb,var(--hc-accent) 9%,var(--hc-bg));box-shadow:inset 0 0 0 1px var(--hc-accent)}.dsh-history :focus-visible,.dsh-history-toggle:focus-visible{outline:2px solid var(--hc-accent);outline-offset:-2px}.dsh-history-title{flex:none;font-size:13px;line-height:18px;height:${layout.title}px;font-weight:600;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.dsh-history-meta{display:flex;align-items:center;gap:6px;color:var(--hc-muted);font-size:12px;line-height:${layout.meta}px;height:${layout.meta}px;flex:none;min-width:0}.dsh-history-meta time{margin-left:auto;white-space:nowrap}.dsh-history-count{color:var(--hc-success);font-weight:600;white-space:nowrap}.dsh-history-running{color:var(--hc-warn);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsh-history-todos{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:${layout.taskGap}px;flex:none}.dsh-history-task{display:flex;align-items:center;gap:7px;line-height:${layout.task}px;height:${layout.task}px;min-width:0}.dsh-history-task .task-mark{flex:none;width:13px;height:13px;border:1px solid var(--hc-muted);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px}.dsh-history-task[data-status=completed] .task-mark{color:white;border-color:var(--hc-accent);background:var(--hc-accent)}.dsh-history-task[data-status=in_progress] .task-mark{border:2px solid var(--hc-accent);border-radius:50%;border-right-color:transparent}.dsh-history-task .task-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-history-task[data-status=completed] .task-text{color:var(--hc-muted)}.dsh-history-more,.dsh-history-context{color:var(--hc-muted);font-size:11px;line-height:16px;height:16px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none}
      .dsh-history-preview{border-top:1px solid var(--hc-line);padding-top:5px;height:${layout.preview}px;display:flex;align-items:flex-start;gap:6px;flex:none;min-width:0}.dsh-history-avatar{color:var(--hc-accent);flex:none;font-size:15px;line-height:18px}.dsh-history-preview-content{font-size:12px;line-height:18px;margin:0;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;white-space:normal}.dsh-history-preview-content code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;border-radius:3px;background:color-mix(in srgb,var(--hc-text) 8%,transparent);padding:0 2px;white-space:pre-wrap}.dsh-history-empty{padding:20px 10px;color:var(--hc-muted);text-align:center}.dsh-history-toggle{border:0;background:transparent;color:inherit;padding:8px;font:inherit;cursor:pointer;font-size:12px}.dsh-history-rail{width:100%;padding:10px 0;display:flex;justify-content:center}.dsh-history-description,.dsh-history-task-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    `;

    return {
      inject: ['slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'sidebar history dictionaries');
        const source = ctx.sessions.list;
        let stopCards;
        let navigation = { cards: true, query: '', scrollTop: 0, focus: null, search: { query: '', ids: [], hasMore: false, state: 'idle' } };
        const listeners = new Set();
        const navigationSource = {
          getSnapshot: () => navigation,
          subscribe: cb => { listeners.add(cb); return () => listeners.delete(cb); },
        };
        const updateNavigation = patch => {
          const next = { ...navigation, ...patch };
          if (Object.keys(next).every(key => Object.is(next[key], navigation[key]))) return;
          navigation = next;
          for (const listener of listeners) listener();
        };

        function History({ wide, expandSidebar, useSectionScroller, t }) {
          const list = useSyncExternalStore(cb => source.subscribe(cb), () => source.getSnapshot());
          const workspaces = useSyncExternalStore(cb => ctx.workspaces.list.subscribe(cb), () => ctx.workspaces.list.getSnapshot());
          const viewState = useSyncExternalStore(navigationSource.subscribe, navigationSource.getSnapshot);
          const [height, setHeight] = useState(640);
          const search = viewState.search;
          const setSearch = next => updateNavigation({ search: next });
          const [retry, setRetry] = useState(0);
          const scroller = useRef(null);
          const searchInput = useRef(null);
          const pendingFocus = useRef(viewState.focus);
          const restoreScroll = useRef(true);
          const descriptionPrefix = useId();
          const { bindScrollerRef } = useSectionScroller();
          const query = viewState.query.trim();
          const currentSearch = search.query === query ? search : { query, ids: [], state: query ? 'loading' : 'idle' };
          const archived = new Set(workspaces.archivedSessionIds);
          const rows = list.ids.map(id => list.byId[id]).filter(row => row && row.origin !== 'subagent' && !archived.has(row.id)
            && (currentSearch.ids.includes(row.id) || `${row.displayTitle} ${row.projectionValues?.sidebarHistory?.assistant?.text ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())))
            .sort((a, b) => b.updatedAt - a.updatedAt);
          const selected = rows.find(row => row.retainedBy.mainView > 0)?.id;
          let totalHeight = 0;
          const positions = rows.map(row => {
            const top = totalHeight;
            const size = rowSize(row, t);
            totalHeight += size;
            return { top, size };
          });
          const first = positions.findIndex(position => position.top + position.size > viewState.scrollTop);
          const start = Math.max(0, first - 2);
          const last = positions.findIndex(position => position.top > viewState.scrollTop + height);
          const end = Math.min(rows.length, (last < 0 ? rows.length : last) + 2);
          const renderedRows = rows.slice(start, end);
          const preferredId = viewState.focus?.kind === 'session' ? viewState.focus.id : selected;
          const tabId = renderedRows.some(row => row.id === preferredId) ? preferredId : renderedRows[0]?.id;
          const visibleIds = renderedRows.map(row => row.id).join('\n');
          useLayoutEffect(() => {
            if (!wide) { restoreScroll.current = true; return; }
            const element = scroller.current;
            if (!element) return;
            const observer = new ResizeObserver(() => setHeight(element.clientHeight));
            setHeight(element.clientHeight);
            observer.observe(element);
            return () => observer.disconnect();
          }, [wide]);
          useLayoutEffect(() => {
            if (!wide || !scroller.current || !restoreScroll.current || list.phase !== 'ready') return;
            scroller.current.scrollTop = viewState.scrollTop;
            restoreScroll.current = false;
          }, [wide, totalHeight, list.phase]);
          useEffect(() => {
            if (!query) { setSearch({ query, ids: [], hasMore: false, state: 'idle' }); return; }
            const controller = new AbortController();
            const retainedIds = navigation.search.query === query ? navigation.search.ids : [];
            const retainedHasMore = navigation.search.query === query && navigation.search.hasMore;
            setSearch({ query, ids: retainedIds, hasMore: retainedHasMore, state: 'loading' });
            const timer = setTimeout(async () => {
              try {
                const result = await ctx.sessions.search(query, controller.signal);
                if (!controller.signal.aborted) setSearch(result.ok ? { query, ids: result.value.items.map(item => item.sessionId), hasMore: result.value.hasMore, state: 'ready' } : { query, ids: retainedIds, hasMore: retainedHasMore, state: 'error' });
              } catch {
                if (!controller.signal.aborted) setSearch({ query, ids: retainedIds, hasMore: retainedHasMore, state: 'error' });
              }
            }, 200);
            return () => { clearTimeout(timer); controller.abort(); };
          }, [query, retry]);
          useEffect(() => {
            if (!wide) return;
            for (const id of visibleIds.split('\n').filter(Boolean)) {
              if (source.getSnapshot().byId[id]?.projectionValues?.sidebarHistory === undefined) {
                void ctx.sessions.refreshProjections(id).catch(error => console.error('Sidebar summary read failed', error));
              }
            }
          }, [visibleIds, wide]);
          useLayoutEffect(() => {
            if (!wide || !pendingFocus.current || !scroller.current) return;
            const target = pendingFocus.current;
            if (target.kind === 'search') {
              searchInput.current?.focus({ preventScroll: true });
              pendingFocus.current = null;
              return;
            }
            const card = Array.from(scroller.current.querySelectorAll('[data-session-id]')).find(element => element.dataset.sessionId === target.id);
            if (card) { card.focus({ preventScroll: true }); pendingFocus.current = null; }
          }, [wide, visibleIds, viewState.focus]);
          if (!wide) return h('div', { className: 'dsh-history-rail' }, h('button', { className: 'dsh-history-toggle', onClick: expandSidebar, title: t('history'), 'aria-label': t('history') }, '☷'));
          const keyDown = event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = Math.max(0, rows.findIndex(row => row.id === event.target.dataset.sessionId));
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
            if (!rows[next]) return;
            pendingFocus.current = { kind: 'session', id: rows[next].id };
            const element = scroller.current;
            const position = positions[next];
            if (position.top < element.scrollTop) element.scrollTop = position.top;
            else if (position.top + position.size > element.scrollTop + height) element.scrollTop = position.top + position.size - height;
            updateNavigation({ focus: pendingFocus.current, scrollTop: element.scrollTop });
          };
          return h('section', { className: 'dsh-history', 'aria-label': t('history') },
            h('style', null, css),
            h('header', { className: 'dsh-history-head' }, h('strong', null, t('history')), h('span', null, t(currentSearch.state === 'loading' ? 'searching' : rows.length === 1 ? 'countOne' : 'count', { count: rows.length }))),
            h('input', { ref: searchInput, className: 'dsh-history-search', type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: viewState.query,
              onFocus: () => updateNavigation({ focus: { kind: 'search' } }),
              onChange: event => { if (scroller.current) scroller.current.scrollTop = 0; updateNavigation({ query: event.target.value, scrollTop: 0 }); } }),
            currentSearch.state === 'error' && h('div', { className: 'dsh-history-notice', role: 'status' }, h('span', null, t('searchError')), h('button', { type: 'button', onClick: () => setRetry(value => value + 1) }, t('retrySearch'))),
            currentSearch.state !== 'error' && currentSearch.hasMore && h('div', { className: 'dsh-history-notice dsh-history-search-limit', role: 'status' }, h('span', null, t('searchLimit'))),
            h('div', { className: 'dsh-history-scroll', role: 'listbox', 'aria-label': t('history'), onKeyDown: keyDown,
              ref: element => { scroller.current = element; bindScrollerRef(element); }, onScroll: event => updateNavigation({ scrollTop: event.currentTarget.scrollTop }) },
              rows.length === 0 ? h('p', { className: 'dsh-history-empty', role: 'status' }, t(currentSearch.state === 'loading' ? 'searching' : currentSearch.state === 'error' ? 'searchLocalEmpty' : query ? 'noMatch' : list.phase === 'ready' ? 'empty' : 'loading'))
                : h('div', { className: 'dsh-history-space', style: { height: totalHeight } }, renderedRows.map((row, offset) => {
                  const view = row.projectionValues?.sidebarHistory;
                  const todos = view?.todos;
                  const load = list.projectionsBySession[row.id];
                  const emptyLabel = view ? 'noReply' : ['ready', 'error'].includes(load?.state) ? 'loadError' : load?.state === 'migration-required' ? 'migration' : 'loading';
                  const preview = parseHistoryMarkdown(view?.assistant?.text || '');
                  const context = contextFor(row, t);
                  const status = row.running ? t('running') : endingLabels.has(view?.lastTurnEndKind) ? t(view.lastTurnEndKind) : '';
                  const taskCount = todos?.total > 0 ? t('tasks', { done: todos.completed, total: todos.total }) : '';
                  const date = new Date(row.updatedAt);
                  const descriptionId = `${descriptionPrefix}-${start + offset}`;
                  const description = [taskCount, ...(todos?.items || []).map(item => `${t(item.status)}: ${item.content}`), status, context,
                    view?.assistant ? `${t(view.assistant.turn < view.currentTurn ? 'earlier' : 'assistant')}: ${preview.text}` : t(emptyLabel)].filter(Boolean).join('. ');
                  return h('button', {
                    key: row.id, type: 'button', className: 'dsh-history-card', role: 'option', 'data-session-id': row.id,
                    'aria-selected': selected === row.id, 'aria-posinset': start + offset + 1, 'aria-setsize': rows.length,
                    'aria-label': row.displayTitle, 'aria-describedby': descriptionId, tabIndex: tabId === row.id ? 0 : -1,
                    style: { top: positions[start + offset].top, height: positions[start + offset].size - layout.rowGap }, onFocus: () => updateNavigation({ focus: { kind: 'session', id: row.id } }), onClick: () => ctx.uiWorkspace.openSession(row.id),
                  },
                  h('span', { className: 'dsh-history-title', title: row.displayTitle }, row.displayTitle),
                  h('span', { className: 'dsh-history-meta' },
                    taskCount && h('span', { className: 'dsh-history-count' }, taskCount),
                    status && h('span', { className: 'dsh-history-running', role: 'status' }, status),
                    h('time', { dateTime: date.toISOString(), title: `${t('updated')} ${date.toLocaleString()}` }, date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))),
                  todos?.total > 0 && h('ul', { className: 'dsh-history-todos', 'aria-label': taskCount }, todos.items.map((item, index) => h('li', { key: index, className: 'dsh-history-task', 'data-status': item.status, title: `${t(item.status)}: ${item.content}` }, h('span', { className: 'task-mark', 'aria-hidden': true }, item.status === 'completed' ? '✓' : ''), h('span', { className: 'dsh-history-task-status' }, `${t(item.status)}: `), h('span', { className: 'task-text' }, item.content)))),
                  todos?.total > 3 && h('p', { className: 'dsh-history-more' }, t('more', { count: todos.total - 3 })),
                  context && h('span', { className: 'dsh-history-context', title: context }, context),
                  h('span', { className: 'dsh-history-preview' }, h('span', { className: 'dsh-history-avatar', 'aria-hidden': true }, '✦'),
                    h('span', { className: 'dsh-history-preview-content', title: view?.assistant?.text, 'data-message-id': view?.assistant?.messageId }, view?.assistant ? renderHistoryMarkdown(preview, h) : t(emptyLabel))),
                  h('span', { id: descriptionId, className: 'dsh-history-description' }, description));
                }))));
        }

        const mountCards = () => ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
          name: 'sidebar.workspaces', priority: -10, locale: NS,
          inject: () => ({ hooks: { sectionScroller: (_standard, { useSectionScroller }) => useSectionScroller } }),
        }, History));
        const toggle = () => {
          updateNavigation({ cards: !navigation.cards });
          if (navigation.cards) stopCards = mountCards();
          else { stopCards?.(); stopCards = undefined; }
        };
        function Toggle({ t, wide }) {
          const state = useSyncExternalStore(navigationSource.subscribe, navigationSource.getSnapshot);
          return h('button', { type: 'button', className: 'dsh-history-toggle', style: { border: 0, background: 'transparent', color: 'inherit', padding: 8, fontSize: 12, cursor: 'pointer' }, onClick: toggle, 'aria-label': t(state.cards ? 'native' : 'cards'), title: t(state.cards ? 'native' : 'cards') }, wide ? t(state.cards ? 'native' : 'cards') : '☷');
        }
        stopCards = mountCards();
        ctx.effect(() => () => { stopCards?.(); listeners.clear(); }, 'sidebar history navigation cleanup');
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'sidebar-history-toggle', order: 5, locale: NS }, Toggle));
      },
    };
  },
});
