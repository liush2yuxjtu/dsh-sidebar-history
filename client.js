window.__ModuleLoader__.load({
  id: 'dsh-sidebar-history',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useSyncExternalStore } = React;
    const NS = 'sidebar-history';
    const ROW = 242;
    const en = {
      history: 'Chat history', search: 'Search sessions', empty: 'No sessions yet', noMatch: 'No matching sessions',
      noReply: 'No assistant reply yet', nonText: 'Non-text assistant message', assistant: 'Latest assistant',
      running: 'Generating…', pending: 'Pending', in_progress: 'In progress', completed: 'Completed',
      native: 'Native navigation', cards: 'History cards', more: '+{count} more', updated: 'Updated',
      loading: 'Loading history…', searching: 'Searching…', searchError: 'Search unavailable. Retry your query.', loadError: 'Summary unavailable. Open this session to inspect.', migration: 'Open this session to upgrade its history.', tasks: '{done}/{total} tasks', count: '{count} sessions',
    };
    const zh = {
      history: '历史会话', search: '搜索会话', empty: '暂无历史会话', noMatch: '没有匹配的会话',
      noReply: '暂无 Assistant 回复', nonText: 'Assistant 发送了非文本消息', assistant: '最新 Assistant 回复',
      running: '生成中…', pending: '待处理', in_progress: '进行中', completed: '已完成',
      native: '原生导航', cards: '历史卡片', more: '另有 {count} 项', updated: '更新于',
      loading: '正在加载历史…', searching: '正在搜索…', searchError: '搜索暂不可用，请重试。', loadError: '摘要暂不可用，请打开会话查看。', migration: '请打开会话升级历史数据。', tasks: '{done}/{total} 项任务', count: '{count} 个会话',
    };
    const css = `
      .dsh-history{--hc-line:var(--dsw-alias-border-l2,#d9dde5);--hc-text:var(--dsw-alias-label-primary,#20242c);--hc-muted:var(--dsw-alias-label-secondary,#6d7481);--hc-bg:var(--dsw-specific-input-major,#fff);color:var(--hc-text);display:flex;flex-direction:column;min-height:0;flex:0 0 auto;height:100cqh;max-height:100cqh;overflow:hidden;font-size:12px;padding:8px 8px 0;box-sizing:border-box}
      .dsh-history *{box-sizing:border-box}.dsh-history-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 4px 10px}.dsh-history-head strong{font-size:13px;font-weight:600}.dsh-history-head span{color:var(--hc-muted);font-size:11px}.dsh-history-search{width:100%;border:1px solid var(--hc-line);border-radius:8px;background:transparent;color:inherit;padding:8px 10px;font:inherit;margin-bottom:10px;min-width:0}
      .dsh-history-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}.dsh-history-space{position:relative;width:100%}.dsh-history-card{position:absolute;left:0;right:0;height:214px;display:flex;flex-direction:column;gap:8px;text-align:left;padding:11px;border:1px solid var(--hc-line);border-radius:11px;background:var(--hc-bg);color:inherit;width:100%;font:inherit;cursor:pointer;overflow:hidden}
      .dsh-history-card:hover{border-color:#7999cb}.dsh-history-card[aria-selected=true]{border-color:#377df5;background:color-mix(in srgb,#377df5 9%,var(--hc-bg));box-shadow:inset 0 0 0 1px #377df5}.dsh-history :focus-visible,.dsh-history-toggle:focus-visible{outline:2px solid #377df5;outline-offset:-2px}.dsh-history-title{flex-shrink:0;font-size:13px;line-height:1.4;font-weight:600;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;min-height:18px}.dsh-history-meta{display:flex;align-items:center;gap:7px;color:var(--hc-muted);font-size:10px;min-height:16px}.dsh-history-meta time{margin-left:auto;white-space:nowrap}.dsh-history-count{color:#287b57;font-weight:600}.dsh-history-running{color:#9b6300;max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsh-history-todos{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px}.dsh-history-task{display:flex;align-items:center;gap:7px;line-height:16px;min-width:0}.dsh-history-task .task-mark{flex:none;width:13px;height:13px;border:1px solid var(--hc-muted);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px}.dsh-history-task[data-status=completed] .task-mark{color:white;border-color:#2875e4;background:#2875e4}.dsh-history-task[data-status=in_progress] .task-mark{border:2px solid #377df5;border-radius:50%;border-right-color:transparent}.dsh-history-task .task-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-history-task[data-status=completed] .task-text{color:var(--hc-muted)}.dsh-history-more{color:var(--hc-muted);font-size:10px;margin:0}
      .dsh-history-preview{border-top:1px solid var(--hc-line);padding-top:8px;margin-top:auto;min-height:47px;display:flex;align-items:flex-start;gap:7px}.dsh-history-avatar{color:#377df5;flex:none;font-size:15px;line-height:18px}.dsh-history-preview p{font-size:11px;line-height:17px;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.dsh-history-empty{padding:22px 10px;color:var(--hc-muted);text-align:center}.dsh-history-toggle{border:0;background:transparent;color:inherit;padding:8px;font:inherit;cursor:pointer;font-size:11px}.dsh-history-rail{width:100%;padding:10px 0;display:flex;justify-content:center}
      @media(prefers-color-scheme:dark){.dsh-history{--hc-line:var(--dsw-alias-border-l2,#3a414e);--hc-text:var(--dsw-alias-label-primary,#e7eaf0);--hc-muted:var(--dsw-alias-label-secondary,#9da7b6);--hc-bg:var(--dsw-specific-input-major,#1a1e27)}.dsh-history-count{color:#79cba7}.dsh-history-running{color:#edbd6c}}
    `;

    return {
      inject: ['slots', 'sessions', 'workspaces', 'uiWorkspace', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'sidebar history dictionaries');
        const source = ctx.sessions.list;
        let stopCards;
        let enabled = true;
        const modeListeners = new Set();
        const modeSource = { getSnapshot: () => enabled, subscribe: cb => { modeListeners.add(cb); return () => modeListeners.delete(cb); } };

        function History({ wide, expandSidebar, useSectionScroller, t }) {
          const list = useSyncExternalStore(cb => source.subscribe(cb), () => source.getSnapshot());
          const workspaces = useSyncExternalStore(cb => ctx.workspaces.list.subscribe(cb), () => ctx.workspaces.list.getSnapshot());
          const [query, setQuery] = useState('');
          const [scroll, setScroll] = useState(0);
          const [height, setHeight] = useState(640);
          const [focusedId, setFocusedId] = useState(null);
          const [search, setSearch] = useState({ ids: [], state: 'idle' });
          const scroller = useRef(null);
          const pendingFocus = useRef(null);
          const { bindScrollerRef } = useSectionScroller();
          const archived = new Set(workspaces.archivedSessionIds);
          const rows = list.ids.map(id => list.byId[id]).filter(row => row && row.origin !== 'subagent' && !archived.has(row.id)
            && (search.ids.includes(row.id) || `${row.displayTitle} ${row.projectionValues?.sidebarHistory?.assistant?.text ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())))
            .sort((a, b) => b.updatedAt - a.updatedAt);
          const selected = rows.find(row => row.retainedBy.mainView > 0)?.id;
          const tabId = rows.some(row => row.id === focusedId) ? focusedId : (selected ?? rows[0]?.id);
          useEffect(() => {
            const element = scroller.current;
            if (!element) return;
            const observer = new ResizeObserver(() => setHeight(element.clientHeight));
            observer.observe(element);
            return () => observer.disconnect();
          }, [wide]);
          useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; setScroll(0); }, [query]);
          useEffect(() => {
            if (!query.trim()) { setSearch({ ids: [], state: 'idle' }); return; }
            const controller = new AbortController();
            setSearch({ ids: [], state: 'loading' });
            const timer = setTimeout(async () => {
              try {
                const result = await ctx.sessions.search(query.trim(), controller.signal);
                if (!controller.signal.aborted) setSearch(result.ok ? { ids: result.value.items.map(item => item.sessionId), state: 'ready' } : { ids: [], state: 'error' });
              } catch (error) {
                if (!controller.signal.aborted) setSearch({ ids: [], state: 'error' });
              }
            }, 200);
            return () => { clearTimeout(timer); controller.abort(); };
          }, [query]);
          let totalHeight = 0;
          const positions = rows.map(row => {
            const top = totalHeight;
            const size = row.projectionValues?.sidebarHistory?.todos?.total > 0 ? ROW : 156;
            totalHeight += size;
            return { top, size };
          });
          const first = positions.findIndex(position => position.top + position.size > scroll);
          const start = Math.max(0, first - 2);
          const last = positions.findIndex(position => position.top > scroll + height);
          const end = Math.min(rows.length, (last < 0 ? rows.length : last) + 2);
          const visibleIds = rows.slice(start, end).map(row => row.id).join('\n');
          useEffect(() => {
            if (!wide) return;
            for (const id of visibleIds.split('\n').filter(Boolean)) {
              if (source.getSnapshot().byId[id]?.projectionValues?.sidebarHistory === undefined) {
                void ctx.sessions.refreshProjections(id).catch(error => console.error('Sidebar summary read failed', error));
              }
            }
          }, [visibleIds, wide]);
          useEffect(() => {
            if (!pendingFocus.current || !scroller.current) return;
            const card = Array.from(scroller.current.querySelectorAll('[data-session-id]')).find(element => element.dataset.sessionId === pendingFocus.current);
            if (card) { card.focus({ preventScroll: true }); pendingFocus.current = null; }
          }, [focusedId, start, end, wide]);
          if (!wide) return h('div', { className: 'dsh-history-rail' }, h('button', { className: 'dsh-history-toggle', onClick: expandSidebar, title: t('history'), 'aria-label': t('history') }, '☷'));
          const keyDown = event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = Math.max(0, rows.findIndex(row => row.id === event.target.dataset.sessionId));
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
            if (!rows[next]) return;
            pendingFocus.current = rows[next].id;
            setFocusedId(rows[next].id);
            const element = scroller.current;
            const position = positions[next];
            if (position.top < element.scrollTop) element.scrollTop = position.top;
            else if (position.top + position.size > element.scrollTop + height) element.scrollTop = position.top + position.size - height;
            setScroll(element.scrollTop);
          };
          return h('section', { className: 'dsh-history', 'aria-label': t('history') },
            h('style', null, css),
            h('header', { className: 'dsh-history-head' }, h('strong', null, t('history')), h('span', null, t(search.state === 'loading' ? 'searching' : 'count', { count: rows.length }))),
            h('input', { className: 'dsh-history-search', type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: query, onChange: event => setQuery(event.target.value) }),
            h('div', { className: 'dsh-history-scroll', role: 'listbox', 'aria-label': t('history'), onKeyDown: keyDown,
              ref: element => { scroller.current = element; bindScrollerRef(element); }, onScroll: event => setScroll(event.currentTarget.scrollTop) },
              rows.length === 0 ? h('p', { className: 'dsh-history-empty', role: 'status' }, t(search.state === 'loading' ? 'searching' : search.state === 'error' ? 'searchError' : query ? 'noMatch' : list.phase === 'ready' ? 'empty' : 'loading'))
                : h('div', { className: 'dsh-history-space', style: { height: totalHeight } }, rows.slice(start, end).map((row, offset) => {
                  const view = row.projectionValues?.sidebarHistory;
                  const todos = view?.todos;
                  const load = list.projectionsBySession[row.id];
                  const emptyLabel = view ? 'noReply' : ['ready', 'error'].includes(load?.state) ? 'loadError' : load?.state === 'migration-required' ? 'migration' : 'loading';
                  const date = new Date(row.updatedAt);
                  return h('button', {
                    key: row.id, type: 'button', className: 'dsh-history-card', role: 'option', 'data-session-id': row.id,
                    'aria-selected': selected === row.id, 'aria-posinset': start + offset + 1, 'aria-setsize': rows.length,
                    'aria-label': row.displayTitle, tabIndex: tabId === row.id ? 0 : -1,
                    style: { top: positions[start + offset].top, height: positions[start + offset].size - 8 }, onFocus: () => setFocusedId(row.id), onClick: () => ctx.uiWorkspace.openSession(row.id),
                  },
                  h('span', { className: 'dsh-history-title', title: row.displayTitle }, row.displayTitle),
                  h('span', { className: 'dsh-history-meta' },
                    todos?.total > 0 && h('span', { className: 'dsh-history-count' }, t('tasks', { done: todos.completed, total: todos.total })),
                    row.running && h('span', { className: 'dsh-history-running', role: 'status' }, t('running')),
                    h('time', { dateTime: date.toISOString(), title: `${t('updated')} ${date.toLocaleString()}` }, date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))),
                  todos?.total > 0 && h('ul', { className: 'dsh-history-todos', 'aria-label': t('tasks', { done: todos.completed, total: todos.total }) }, todos.items.map((item, index) => h('li', { key: index, className: 'dsh-history-task', 'data-status': item.status, title: `${t(item.status)}: ${item.content}` }, h('span', { className: 'task-mark', 'aria-hidden': true }, item.status === 'completed' ? '✓' : ''), h('span', { className: 'task-text' }, item.content)))),
                  todos?.total > 3 && h('p', { className: 'dsh-history-more' }, t('more', { count: todos.total - 3 })),
                  h('span', { className: 'dsh-history-preview', 'aria-label': t('assistant') }, h('span', { className: 'dsh-history-avatar', 'aria-hidden': true }, '✦'), h('p', { title: view?.assistant?.text }, view?.assistant ? (view.assistant.text || t('nonText')) : t(emptyLabel))));
                }))));
        }

        const mountCards = () => ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
          name: 'sidebar.workspaces', priority: -10, locale: NS,
          inject: () => ({ hooks: { sectionScroller: (_standard, { useSectionScroller }) => useSectionScroller } }),
        }, History));
        const toggle = () => {
          enabled = !enabled;
          if (enabled) stopCards = mountCards();
          else { stopCards?.(); stopCards = undefined; }
          for (const listener of modeListeners) listener();
        };
        function Toggle({ t, wide }) {
          const cards = useSyncExternalStore(modeSource.subscribe, modeSource.getSnapshot);
          return h('button', { type: 'button', className: 'dsh-history-toggle', style: { border: 0, background: 'transparent', color: 'inherit', padding: 8, fontSize: 11, cursor: 'pointer' }, onClick: toggle, 'aria-label': t(cards ? 'native' : 'cards'), title: t(cards ? 'native' : 'cards') }, wide ? t(cards ? 'native' : 'cards') : '☷');
        }
        stopCards = mountCards();
        ctx.effect(() => () => { stopCards?.(); modeListeners.clear(); }, 'sidebar history navigation cleanup');
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'sidebar-history-toggle', order: 5, locale: NS }, Toggle));
      },
    };
  },
});
