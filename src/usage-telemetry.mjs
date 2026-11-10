/** Explicit opt-in Web analytics. No session object or free text enters this API. */
import { USAGE_PUBLIC_KEY } from './usage-config.mjs';
export const USAGE_ENDPOINT = 'https://mezthyaerhhohywcxmqi.supabase.co/functions/v1/dsh-sidebar-events';
export const USAGE_KEY = 'dsh-sidebar-history.usage.v1';
export const USAGE_EVENTS = Object.freeze(['plugin_loaded', 'card_open_requested', 'card_open_failed', 'native_navigation_selected', 'history_cards_selected', 'search_some', 'search_zero', 'search_error', 'projection_ready', 'projection_error', 'projection_missing', 'projection_migration_required', 'diagnostic_test']);
const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja', 'es'];
const validEndpoint = value => {
  try { const u = new URL(value); return !u.username && !u.password && !u.search && !u.hash && (u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname))); }
  catch { return false; }
};

export function createUsageTelemetry({ storage, fetchImpl, cryptoImpl, navigatorImpl = {}, version, locale = () => 'en', onChange = () => {} }) {
  let preferences = { enabled: false, endpoint: USAGE_ENDPOINT };
  let stopped = false, queued = [], active = null, generation = 0, sent = 0, failed = 0, dropped = 0, attempted = 0;
  const blocked = () => navigatorImpl.doNotTrack === '1' || navigatorImpl.globalPrivacyControl === true;
  try {
    const saved = JSON.parse(storage?.getItem(USAGE_KEY) || 'null');
    if (saved && typeof saved.enabled === 'boolean' && validEndpoint(saved.endpoint)) preferences = { enabled: saved.enabled, endpoint: saved.endpoint };
  } catch { /* Missing or unreadable storage must never opt in. */ }
  const snapshot = () => ({ ...preferences, blocked: blocked(), sent, failed, dropped, pending: queued.length + Number(Boolean(active)) });
  const notify = () => { try { onChange(snapshot()); } catch {} };
  const allowed = () => {
    if (stopped || !preferences.enabled || blocked()) return false;
    try { const current = JSON.parse(storage.getItem(USAGE_KEY) || 'null'); return current?.enabled === true && current.endpoint === preferences.endpoint; }
    catch { return false; }
  };
  async function drain() {
    if (active || !allowed() || !queued.length) return;
    const item = queued.shift(), currentGeneration = generation;
    const controller = new AbortController(); active = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      if (!allowed()) return;
      const response = await fetchImpl(preferences.endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { 'content-type': 'application/json', apikey: USAGE_PUBLIC_KEY, authorization: `Bearer ${USAGE_PUBLIC_KEY}` }, body: JSON.stringify(item), signal: controller.signal });
      if (response.status !== 202 || (await response.json()).accepted !== true) throw new Error('not accepted');
      if (currentGeneration === generation) sent++;
    } catch { if (currentGeneration === generation) failed++; }
    finally {
      clearTimeout(timer);
      if (active === controller) active = null;
      notify(); void drain();
    }
  }
  function emit(event) {
    if (!allowed() || !USAGE_EVENTS.includes(event)) return false;
    // Bound noise and memory per plugin lifecycle. No retry or offline history.
    if (attempted >= 120 || queued.length >= 16) { dropped++; notify(); return false; }
    let id;
    try { id = cryptoImpl.randomUUID(); } catch { return false; }
    const currentLocale = locale() === 'zh' ? 'zh-CN' : locale();
    queued.push({ schema_version: 1, event_id: id, package: 'dsh-sidebar-history', version, locale: LOCALES.includes(currentLocale) ? currentLocale : 'en', event });
    attempted++; void drain(); notify(); return true;
  }
  function setPreferences(enabled, endpoint = preferences.endpoint) {
    if (typeof enabled !== 'boolean' || !validEndpoint(endpoint) || stopped || (enabled && blocked())) return false;
    try { storage.setItem(USAGE_KEY, JSON.stringify({ enabled, endpoint })); }
    catch { return false; }
    generation++; queued = []; active?.abort(); preferences = { enabled, endpoint };
    notify(); if (enabled) emit('plugin_loaded'); return true;
  }
  function clear() {
    generation++; queued = []; active?.abort(); preferences = { enabled: false, endpoint: USAGE_ENDPOINT };
    let saved = true;
    try { storage?.removeItem(USAGE_KEY); }
    catch { saved = false; try { storage.setItem(USAGE_KEY, JSON.stringify(preferences)); saved = true; } catch {} }
    notify(); return saved;
  }
  function dispose() { stopped = true; generation++; queued = []; active?.abort(); }
  return { snapshot, emit, setPreferences, clear, dispose };
}
