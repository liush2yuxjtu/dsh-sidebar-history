/** Payload-only collector. Gateway JWT validation remains enabled. */
export const EVENTS = ['plugin_loaded', 'card_open_requested', 'card_open_failed', 'native_navigation_selected', 'history_cards_selected', 'search_some', 'search_zero', 'search_error', 'projection_ready', 'projection_error', 'projection_missing', 'projection_migration_required', 'diagnostic_test'];
const fields = ['schema_version', 'event_id', 'package', 'version', 'locale', 'event'];
export function validateEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== fields.length || Object.keys(value).some(k => !fields.includes(k))) return null;
  if (value.schema_version !== 1 || value.package !== 'dsh-sidebar-history' || typeof value.event_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.event_id) || typeof value.version !== 'string' || !/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value.version) || !['en', 'zh-CN', 'zh-TW', 'ja', 'es'].includes(value.locale) || !EVENTS.includes(value.event)) return null;
  return Object.fromEntries(fields.map(key => [key, value[key]]));
}
export function createHandler(persist, readReceipt = async () => { throw new Error('storage unavailable'); }) {
  return async request => {
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-max-age': '600' };
    const reply = (status, body) => new Response(body === null ? null : JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return reply(204, null);
    if (request.method === 'GET') {
      const id = new URL(request.url).searchParams.get('receipt');
      if (id === null) return reply(200, { service: 'dsh-sidebar-usage', schema_version: 1 });
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) return reply(400, { error: 'invalid_receipt' });
      try { return reply(200, { stored: await readReceipt(id) }); }
      catch { return reply(503, { error: 'storage_unavailable' }); }
    }
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415, { error: 'unsupported_media_type' });
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: 'invalid_json' });
    let bytes = 0; const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 1024) { await reader.cancel(); return reply(413, { error: 'payload_too_large' }); }
        chunks.push(value);
      }
      const all = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
      let value; try { value = JSON.parse(new TextDecoder().decode(all)); } catch { return reply(400, { error: 'invalid_json' }); }
      const event = validateEvent(value);
      if (!event) return reply(400, { error: 'invalid_event' });
      await persist(event);
      return reply(202, { accepted: true });
    } catch { return reply(503, { error: 'storage_unavailable' }); }
    finally { reader.releaseLock(); }
  };
}
