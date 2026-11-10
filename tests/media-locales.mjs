import assert from 'node:assert/strict';

export const mediaLocales = {
  en: {
    hostLocale: 'en', htmlLang: 'en', menu: 'English', history: 'Chat history', native: 'Native navigation', cards: 'History cards', running: 'Generating…', summary: '2/3 tasks',
    tasks: ['Read order data', 'Verify both totals', 'Publish release'],
    prompt: id => `Audit orders.json. Use English in every visible message, including explanations before tool calls and progress updates. First create exactly three tasks with todo_write: Read order data; Verify both totals; Publish release. Use read to inspect the file. Compute quantity * unitPrice + shipping for each order. Complete the first two tasks and leave Publish release pending because approval is required. Do not edit or publish. Reply in English under 60 words. Name each row Order A or Order B, give its computed total, and include audit ID ${id}.`,
    second: id => `Greet this independent review in one short English sentence, including audit ID ${id}-second. Do not create tasks or call a tool.`,
    beats: ['New order audit', 'Send to DeepSeek', 'Open history cards', 'Native task progress', 'Saved reply verified', 'End of recording', 'Independent session'],
  },
  'zh-CN': {
    hostLocale: 'zh', htmlLang: 'zh-CN', menu: '中文', history: '历史会话', native: '原生导航', cards: '历史卡片', running: '生成中…', summary: '2/3 项任务',
    tasks: ['读取订单数据', '核对订单金额', '发布版本'],
    prompt: id => `核对 orders.json。全程使用简体中文，包括工具调用之前的说明、中途进度和最终回复；技术标识保留原文。先使用 todo_write 创建恰好三项任务：读取订单数据；核对订单金额；发布版本。用 read 读取文件，计算每笔订单的 quantity * unitPrice + shipping。完成前两项；发布版本仍待处理，因为需要批准。不要修改文件或发布。用简体中文简短回复，称每笔为“订单 A”和“订单 B”，列出金额，并包含核对编号 ${id}。`,
    second: id => `用一句简体中文问候这个独立会话，并包含核对编号 ${id}-second。不要创建任务或调用工具。`,
    beats: ['开始核对订单', '发送给 DeepSeek', '打开历史卡片', '原生任务进度', '已验证保存的回复', '录制结束', '独立会话'],
  },
  'zh-TW': {
    hostLocale: 'zh-TW', htmlLang: 'zh-TW', menu: '繁體中文', history: '歷史會話', native: '原生導覽', cards: '歷史卡片', running: '產生中…', summary: '2/3 項任務',
    tasks: ['讀取訂單資料', '核對訂單金額', '發佈版本'],
    prompt: id => `核對 orders.json。全程使用標準繁體中文，包括工具呼叫前的說明、中途進度及最後回覆，不可混入簡體字；使用「並」、「軌跡」等正體字，技術識別名稱保留原文。先使用 todo_write 建立恰好三項任務：讀取訂單資料；核對訂單金額；發佈版本。用 read 讀取檔案，計算每筆訂單的 quantity * unitPrice + shipping。完成前兩項；發佈版本仍待處理，因為需要核准。不要修改檔案或發佈。用繁體中文簡短回覆，稱每筆為「訂單 A」和「訂單 B」，列出金額，並包含核對編號 ${id}。`,
    second: id => `用一句繁體中文問候這個獨立會話，並包含核對編號 ${id}-second。不要建立任務或呼叫工具。`,
    beats: ['開始核對訂單', '傳送給 DeepSeek', '開啟歷史卡片', '原生任務進度', '已驗證儲存的回覆', '錄製結束', '獨立會話'],
  },
  ja: {
    hostLocale: 'ja', htmlLang: 'ja', menu: '日本語', history: 'チャット履歴', native: '標準ナビゲーション', cards: '履歴カード', running: '生成中…', summary: '2/3 件のタスク',
    tasks: ['注文データを読む', '合計を確認する', 'リリースを公開する'],
    prompt: id => `orders.json を確認してください。ツールを使う前の説明、途中経過、最終回答を含め、すべて日本語で書いてください。技術的な識別子は原文を保ちます。最初に todo_write で「注文データを読む」「合計を確認する」「リリースを公開する」の3件を作成します。read でファイルを読み、各注文の quantity * unitPrice + shipping を計算してください。最初の2件を完了にし、公開は承認待ちのため保留にします。ファイルの変更や公開はしないでください。日本語の短い文で注文 A と注文 B の合計を説明し、確認番号 ${id} を含めてください。`,
    second: id => `この独立した会話に日本語の短い一文で挨拶し、確認番号 ${id}-second を含めてください。タスクやツールは使わないでください。`,
    beats: ['注文の確認を開始', 'DeepSeek に送信', '履歴カードを開く', 'タスクの進捗', '保存された返信を確認', '録画終了', '独立した会話'],
  },
  es: {
    hostLocale: 'es', htmlLang: 'es', menu: 'Español', history: 'Historial de chats', native: 'Navegación nativa', cards: 'Tarjetas del historial', running: 'Generando…', summary: '2/3 tareas',
    tasks: ['Leer pedidos', 'Verificar totales', 'Publicar versión'],
    prompt: id => `Revisa orders.json. Usa español en TODOS los mensajes visibles, incluidos los avisos antes de usar herramientas y los mensajes de progreso. No expliques los pasos en inglés. Conserva los identificadores técnicos originales. Primero crea exactamente tres tareas con todo_write: Leer pedidos; Verificar totales; Publicar versión. Usa read para leer el archivo. Calcula quantity * unitPrice + shipping para cada pedido. Completa las dos primeras tareas y deja Publicar versión pendiente porque requiere aprobación. No edites ni publiques. Responde en español en menos de 60 palabras. Usa Pedido A y Pedido B, indica cada total e incluye el identificador ${id}.`,
    second: id => `Saluda esta revisión independiente con una frase breve en español e incluye el identificador ${id}-second. No crees tareas ni uses herramientas.`,
    beats: ['Revisar los pedidos', 'Enviar a DeepSeek', 'Abrir el historial', 'Progreso de las tareas', 'Respuesta guardada verificada', 'Fin de la grabación', 'Sesión independiente'],
  },
};

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
