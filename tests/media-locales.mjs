import assert from 'node:assert/strict';
import { sidebarDictionaries } from '../src/locales.mjs';

export const mediaLocales = {
  en: {
    hostLocale: 'en', htmlLang: 'en', menu: 'English',
    tasks: ['Read order data', 'Verify both totals', 'Publish release'],
    prompt: id => `Audit orders.json. Use English in every visible message, including explanations before tool calls and progress updates. First create exactly three tasks with todo_write: Read order data; Verify both totals; Publish release. Use read to inspect the file. Compute quantity * unitPrice + shipping for each order. Complete the first two tasks and leave Publish release pending because approval is required. Do not edit or publish. Reply in English under 60 words. Name each row Order A or Order B, give its computed total, and include audit ID ${id}.`,
    second: id => `Greet this independent review in one short English sentence, including audit ID ${id}-second. Do not create tasks or call a tool.`,
    beats: ['New order audit', 'Send to DeepSeek', 'Open history cards', 'Native task progress', 'Saved reply verified', 'End of recording', 'Independent session'],
  },
  'zh-CN': {
    hostLocale: 'zh', htmlLang: 'zh-CN', menu: '中文',
    tasks: ['读取订单数据', '核对订单金额', '发布版本'],
    prompt: id => `核对 orders.json。全程使用简体中文，包括工具调用之前的说明、中途进度和最终回复；技术标识保留原文。先使用 todo_write 创建恰好三项任务：读取订单数据；核对订单金额；发布版本。用 read 读取文件，计算每笔订单的 quantity * unitPrice + shipping。完成前两项；发布版本仍待处理，因为需要批准。不要修改文件或发布。用简体中文简短回复，称每笔为“订单 A”和“订单 B”，列出金额，并包含核对编号 ${id}。`,
    second: id => `用一句简体中文问候这个独立会话，并包含核对编号 ${id}-second。不要创建任务或调用工具。`,
    beats: ['开始核对订单', '发送给 DeepSeek', '打开历史卡片', '原生任务进度', '已验证保存的回复', '录制结束', '独立会话'],
  },
  'zh-TW': {
    hostLocale: 'zh-TW', htmlLang: 'zh-TW', menu: '繁體中文',
    tasks: ['讀取訂單資料', '核對訂單金額', '發佈版本'],
    prompt: id => `核對 orders.json。全程使用標準繁體中文，包括工具呼叫前的說明、中途進度及最後回覆，不可混入簡體字；使用「並」、「軌跡」等正體字，技術識別名稱保留原文。先使用 todo_write 建立恰好三項任務：讀取訂單資料；核對訂單金額；發佈版本。用 read 讀取檔案，計算每筆訂單的 quantity * unitPrice + shipping。完成前兩項；發佈版本仍待處理，因為需要核准。不要修改檔案或發佈。用繁體中文簡短回覆，稱每筆為「訂單 A」和「訂單 B」，列出金額，並包含核對編號 ${id}。`,
    second: id => `用一句繁體中文問候這個獨立會話，並包含核對編號 ${id}-second。不要建立任務或呼叫工具。`,
    beats: ['開始核對訂單', '傳送給 DeepSeek', '開啟歷史卡片', '原生任務進度', '已驗證儲存的回覆', '錄製結束', '獨立會話'],
  },
  ja: {
    hostLocale: 'ja', htmlLang: 'ja', menu: '日本語',
    tasks: ['注文データを読む', '合計を確認する', 'リリースを公開する'],
    prompt: id => `orders.json を確認してください。ツールを使う前の説明、途中経過、最終回答を含め、すべて日本語で書いてください。技術的な識別子は原文を保ちます。最初に todo_write で「注文データを読む」「合計を確認する」「リリースを公開する」の3件を作成します。read でファイルを読み、各注文の quantity * unitPrice + shipping を計算してください。最初の2件を完了にし、公開は承認待ちのため保留にします。ファイルの変更や公開はしないでください。日本語の短い文で注文 A と注文 B の合計を説明し、確認番号 ${id} を含めてください。`,
    second: id => `この独立した会話に日本語の短い一文で挨拶し、確認番号 ${id}-second を含めてください。タスクやツールは使わないでください。`,
    beats: ['注文の確認を開始', 'DeepSeek に送信', '履歴カードを開く', 'タスクの進捗', '保存された返信を確認', '録画終了', '独立した会話'],
  },
  es: {
    hostLocale: 'es', htmlLang: 'es', menu: 'Español',
    tasks: ['Leer pedidos', 'Verificar totales', 'Publicar versión'],
    prompt: id => `Revisa orders.json. Usa español en TODOS los mensajes visibles, incluidos los avisos antes de usar herramientas y los mensajes de progreso. No expliques los pasos en inglés. Conserva los identificadores técnicos originales. Primero crea exactamente tres tareas con todo_write: Leer pedidos; Verificar totales; Publicar versión. Usa read para leer el archivo. Calcula quantity * unitPrice + shipping para cada pedido. Completa las dos primeras tareas y deja Publicar versión pendiente porque requiere aprobación. No edites ni publiques. Responde en español en menos de 60 palabras. Usa Pedido A y Pedido B, indica cada total e incluye el identificador ${id}.`,
    second: id => `Saluda esta revisión independiente con una frase breve en español e incluye el identificador ${id}-second. No crees tareas ni uses herramientas.`,
    beats: ['Revisar los pedidos', 'Enviar a DeepSeek', 'Abrir el historial', 'Progreso de las tareas', 'Respuesta guardada verificada', 'Fin de la grabación', 'Sesión independiente'],
  },
};

const nativeLabels = {
  en: { accountMenu: 'Account menu', settings: 'Settings', general: 'General', light: 'Light', dark: 'Dark', stop: 'Stop generating' },
  'zh-CN': { accountMenu: '账号菜单', settings: '设置', general: '通用设置', light: '浅色', dark: '深色', stop: '停止生成' },
  'zh-TW': { accountMenu: '賬號菜單', settings: '設置', general: '通用設置', light: '淺色', dark: '深色', stop: '停止生成' },
  ja: { accountMenu: 'アカウントメニュー', settings: '設定', general: '一般', light: 'ライト', dark: 'ダーク', stop: '生成を停止' },
  es: { accountMenu: 'Menú de cuenta', settings: 'Configuración', general: 'General', light: 'Claro', dark: 'Oscuro', stop: 'Detener generación' },
};
const markdownInstructions = {
  en: id => `Begin with audit ID ${id} in Markdown bold and orders.json in inline code. Use bold for the order labels.`,
  'zh-CN': id => `开头先以 Markdown 粗体写出核对编号 ${id}，再用行内代码写出 orders.json；订单标签使用粗体。`,
  'zh-TW': id => `開頭先以 Markdown 粗體寫出核對編號 ${id}，再以行內程式碼寫出 orders.json；訂單標籤使用粗體。`,
  ja: id => `冒頭に確認番号 ${id} を Markdown の太字で書き、orders.json をインラインコードで示してください。注文のラベルも太字にしてください。`,
  es: id => `Empieza con el identificador ${id} en negrita Markdown y orders.json como código en línea. Pon las etiquetas de los pedidos en negrita.`,
};
const lifecyclePrompts = {
  en: {
    follow: id => `Use English in every visible message. Acknowledge this follow-up briefly in English Markdown, including audit ID ${id}-followup in bold and orders.json in inline code. Do not call tools or create or update a task list.`,
    cancel: id => `For audit ${id}-cancel, write an original numbered checklist of 100 detailed questions for reviewing an order audit. Give each question its own explanation. Use English in every visible message. Do not call tools or create or update a task list.`,
    retry: id => `Use English in every visible message. Resume this review with a short English Markdown acknowledgement of audit ID ${id}-retry in bold and orders.json in inline code. Do not use tools or a task list.`,
  },
  'zh-CN': {
    follow: id => `所有可见消息都使用简体中文。简短确认此后续请求，用 Markdown 粗体写出核对编号 ${id}-followup，并以行内代码写出 orders.json。不要调用工具，不要创建或更新任务列表。`,
    cancel: id => `为核对编号 ${id}-cancel 撰写一份原创编号清单，包含100个详细的订单核对问题，每个问题都附上解释。所有可见消息都使用简体中文。不要调用工具，不要创建或更新任务列表。`,
    retry: id => `所有可见消息都使用简体中文。继续本次核对，简短回复，用 Markdown 粗体写出核对编号 ${id}-retry，并以行内代码写出 orders.json。不要使用工具或任务列表。`,
  },
  'zh-TW': {
    follow: id => `所有可見訊息都使用標準繁體中文，不可混入簡體字。簡短確認此後續請求，以 Markdown 粗體寫出核對編號 ${id}-followup，並以行內程式碼寫出 orders.json。不要呼叫工具，不要建立或更新任務清單。`,
    cancel: id => `為核對編號 ${id}-cancel 撰寫一份原創編號清單，包含100個詳細的訂單核對問題，每個問題都附上解釋。所有可見訊息都使用標準繁體中文，不可混入簡體字。不要呼叫工具，不要建立或更新任務清單。`,
    retry: id => `所有可見訊息都使用標準繁體中文，不可混入簡體字。繼續本次核對，簡短回覆，以 Markdown 粗體寫出核對編號 ${id}-retry，並以行內程式碼寫出 orders.json。不要使用工具或任務清單。`,
  },
  ja: {
    follow: id => `すべての表示メッセージを日本語で書いてください。この追加の依頼に短く答え、確認番号 ${id}-followup を Markdown の太字で、orders.json をインラインコードで示してください。ツールを使わず、タスク一覧の作成や更新もしないでください。`,
    cancel: id => `確認番号 ${id}-cancel の注文確認について、独自の詳しい質問100件を番号付きの一覧にしてください。各質問に説明を付け、すべての表示メッセージを日本語で書いてください。ツールを使わず、タスク一覧の作成や更新もしないでください。`,
    retry: id => `すべての表示メッセージを日本語で書いてください。この確認を再開し、確認番号 ${id}-retry を Markdown の太字で、orders.json をインラインコードで示す短い返答を書いてください。ツールやタスク一覧は使わないでください。`,
  },
  es: {
    follow: id => `Usa español en todos los mensajes visibles. Confirma brevemente esta solicitud adicional en Markdown, con el identificador ${id}-followup en negrita y orders.json como código en línea. No uses herramientas ni crees o actualices una lista de tareas.`,
    cancel: id => `Para la revisión ${id}-cancel, escribe una lista numerada original de 100 preguntas detalladas sobre la revisión de pedidos. Añade una explicación a cada pregunta. Usa español en todos los mensajes visibles. No uses herramientas ni crees o actualices una lista de tareas.`,
    retry: id => `Usa español en todos los mensajes visibles. Reanuda esta revisión con una confirmación breve en Markdown, con el identificador ${id}-retry en negrita y orders.json como código en línea. No uses herramientas ni una lista de tareas.`,
  },
};
for (const [locale, copy] of Object.entries(mediaLocales)) {
  const ui = sidebarDictionaries[copy.hostLocale];
  const prompt = copy.prompt;
  const tasks = copy.tasks;
  Object.assign(copy, ui, nativeLabels[locale], lifecyclePrompts[locale], {
    prompt: id => prompt(id) + ' ' + markdownInstructions[locale](id),
    summary: ui.tasks.replace('{done}', '2').replace('{total}', '3'),
    countTwo: ui.count.replace('{count}', '2'),
    stopped: ui.aborted,
    tasks,
  });
}

export function assertResponseLanguage(text, locale) {
  assert.ok(text.length > 10, 'The actual model response must contain readable text');
  if (locale === 'en') assert.ok(!/[\u3400-\u9fff\u3040-\u30ff]/u.test(text) && /Order/i.test(text), 'Expected English order response');
  if (locale === 'zh-CN') assert.ok(text.includes('订单') && !/[\u3040-\u30ff]/u.test(text), 'Expected Simplified Chinese response');
  if (locale === 'zh-TW') assert.ok(text.includes('訂單') && !/订单|数据|发布|文件|回复/.test(text), 'Expected Traditional Chinese response');
  if (locale === 'ja') assert.ok(/[\u3040-\u30ff]/u.test(text) && text.includes('注文'), 'Expected Japanese response');
  if (locale === 'es') assert.ok(/pedido/i.test(text) && !/[\u3400-\u9fff\u3040-\u30ff]/u.test(text), 'Expected Spanish order response');
}

export function assertAssistantMessageLanguage(text, locale) {
  if (!text.trim()) return;
  if (locale === 'en') assert.ok(!/[\u3400-\u9fff\u3040-\u30ff]/u.test(text), 'English intermediate response contains another script');
  if (locale === 'zh-CN' || locale === 'zh-TW' || locale === 'ja') assert.ok(/[\u3400-\u9fff\u3040-\u30ff]/u.test(text), 'Every visible assistant message must use the requested Asian language');
  if (locale === 'zh-TW') assert.ok(!/并|轨迹|历史|会话|任务|订单|数据|发布|回复|设置|默认|输入|读取|当前|点击|选择|加载|继续|用户/u.test(text), 'Traditional Chinese intermediate response contains Simplified Chinese');
  if (locale !== 'en') assert.ok(!/\b(?:I['’]ll|I will|I have|I need|I am|Let me|Here is|Here are|First I)\b/iu.test(text), 'Non-English intermediate response contains English prose');
}

export function assertRequestedTasks(todos, requested, locale) {
  assert.equal(todos.length, requested.length, 'Requested task count');
  const matched = new Set();
  for (const todo of todos) {
    const index = requested.findIndex(name => todo.content === name || todo.content.startsWith(name + '（') || todo.content.startsWith(name + ' ('));
    assert.ok(index >= 0 && !matched.has(index), 'Native task must retain its requested localized name');
    matched.add(index);
    assertAssistantMessageLanguage(todo.content, locale);
  }
}
