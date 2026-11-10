import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const client = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const provenance = JSON.parse(await readFile(new URL('../src/zh-tw-host-provenance.json', import.meta.url), 'utf8'));
const examples = [
  { locale: 'en', lang: 'en', history: 'Chat history', search: 'Search sessions', native: 'Workspaces & archives', empty: 'No assistant reply yet' },
  { locale: 'zh', lang: 'zh-CN', history: '历史会话', search: '搜索会话', native: '工作区与归档', empty: '暂无助手回复' },
  { locale: 'zh-TW', lang: 'zh-TW', history: '歷史會話', search: '搜尋會話', native: '工作區與歸檔', empty: '暫無助手回覆' },
  { locale: 'ja', lang: 'ja', history: 'チャット履歴', search: 'セッションを検索', native: 'ワークスペースとアーカイブ', empty: 'アシスタントの返信はまだありません' },
  { locale: 'es', lang: 'es', history: 'Historial de chats', search: 'Buscar sesiones', native: 'Espacios y sesiones archivadas', empty: 'Todavía no hay respuesta del asistente' },
];

function renderPlugin(active, existingTraditional = false) {
  let declaration;
  const dictionaries = new Map();
  const components = new Map();
  const languages = [{ id: 'en' }, { id: 'zh' }, { id: 'ja' }, { id: 'es' }, ...(existingTraditional ? [{ id: 'zh-TW' }] : [])];
  const snapshot = { active, locales: languages };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child !== null && child !== undefined) }),
    useState: value => [value, () => {}],
    useRef: value => ({ current: value }),
    useEffect: () => {},
    useLayoutEffect: () => {},
    useId: () => 'locale-description',
    useSyncExternalStore: (_subscribe, read) => read(),
  };
  vm.runInNewContext(client, { window: { __ModuleLoader__: { load: module => { declaration = module.factory(() => React); } } }, Date, Set, Map });
  const row = { id: 'locale-test', displayTitle: 'Locale example', updatedAt: Date.parse('2000-01-02T15:04:00Z'), retainedBy: { mainView: 1 }, projectionValues: { sidebarHistory: {} } };
  const sessions = { phase: 'ready', ids: [row.id], byId: { [row.id]: row }, projectionsBySession: {} };
  const ctx = {
    effect: effect => effect(),
    locale: {
      getLocale: () => snapshot,
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      addLanguage: language => { languages.push(language); return () => {}; },
      register(namespace, localeOrDictionaries, dictionary) {
        const entries = typeof localeOrDictionaries === 'string' ? [[localeOrDictionaries, dictionary]] : Object.entries(localeOrDictionaries);
        if (!dictionaries.has(namespace)) dictionaries.set(namespace, new Map());
        for (const [locale, content] of entries) dictionaries.get(namespace).set(locale, content);
        return () => {};
      },
    },
    sessions: { list: { subscribe: () => () => {}, getSnapshot: () => sessions } },
    workspaces: { list: { subscribe: () => () => {}, getSnapshot: () => ({ archivedSessionIds: [] }) } },
    uiWorkspace: { openSession: () => {} },
    slots: {
      inject: (_name, mount) => { mount(); return () => {}; },
      register: (options, component) => { components.set(options.name, component); return () => {}; },
    },
  };
  declaration.apply(ctx);
  const t = (key, parameters = {}) => (dictionaries.get('sidebar-history').get(active)?.[key] ?? dictionaries.get('sidebar-history').get('en')[key]).replace(/\{(\w+)\}/g, (_match, parameter) => parameters[parameter] ?? '{' + parameter + '}');
  const section = components.get('sidebar.workspaces')({ wide: true, expandSidebar: () => {}, useSectionScroller: () => ({ bindScrollerRef: () => {} }), t });
  const toggle = components.get('sidebar.footer.action')({ t, wide: true });
  return { dictionaries, languages, section, toggle };
}

function elements(node) {
  if (typeof node !== 'object') return [];
  return [node, ...node.children.flatMap(elements)];
}

for (const example of examples) {
  it(`renders sidebar controls, empty reply and dates in ${example.lang}`, () => {
    const view = renderPlugin(example.locale);
    const nodes = elements(view.section);
    assert.equal(view.section.props.lang, example.lang);
    assert.equal(view.section.props['aria-label'], example.history);
    assert.equal(nodes.find(node => node.type === 'input').props.placeholder, example.search);
    assert.equal(view.toggle.props['aria-label'], example.native);
    assert.equal(nodes.find(node => node.props.className === 'dsh-history-preview-content').children[0], example.empty);
    const date = new Date('2000-01-02T15:04:00Z');
    const time = nodes.find(node => node.type === 'time');
    assert.equal(time.children[0], new Intl.DateTimeFormat(example.lang, { month: 'short', day: 'numeric' }).format(date));
    assert.ok(time.props.title.endsWith(date.toLocaleString(example.lang)));
  });
}

it('keeps every localized sidebar key and interpolation parameter complete', () => {
  const { dictionaries } = renderPlugin('en');
  const locales = dictionaries.get('sidebar-history');
  const english = locales.get('en');
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const locale of ['zh', 'zh-TW', 'ja', 'es']) {
    const dictionary = locales.get(locale);
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      assert.ok(dictionary[key].trim().length > 0, `${locale}: ${key}`);
      assert.deepEqual(parameters(dictionary[key]), parameters(english[key]), `${locale}: ${key}`);
    }
  }
});

it('registers a bounded native Traditional Chinese pack through official locale contributions', () => {
  const { dictionaries, languages } = renderPlugin('zh-TW');
  assert.ok(languages.some(language => language.id === 'zh-TW' && language.label === '繁體中文' && language.fallback === 'zh'));
  for (const source of provenance.sources) {
    const dictionary = dictionaries.get(source.namespace).get('zh-TW');
    assert.equal(Object.keys(dictionary).length, source.keys, source.namespace);
    assert.match(source.sourceSha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(dictionaries.get('common').get('zh-TW')['brand.localBuild'], 'DSH 本地構建');
  assert.equal(dictionaries.get('sidebar').get('zh-TW')['session.new'], '新會話');
  assert.equal(dictionaries.get('conversation').get('zh-TW')['todo.title'], '任務');
  assert.equal(dictionaries.get('chat').get('zh-TW')['view.chat'], '對話');
  assert.equal(dictionaries.get('trajectory').get('zh-TW')['view.trajectory'], '軌跡');
  assert.equal(dictionaries.get('permission.access').get('zh-TW')['preset.workspaceWrite'], '工作區內修改');
  assert.equal(dictionaries.get('schedule.manager').get('zh-TW').panel, '自動化任務');
});

it('preserves a Traditional Chinese language pack already installed by the host', () => {
  const { dictionaries, languages } = renderPlugin('zh-TW', true);
  assert.equal(languages.filter(language => language.id === 'zh-TW').length, 1);
  assert.deepEqual([...dictionaries.keys()], ['sidebar-history']);
});
