import { createHandler } from './handler.mjs';

// Only these server-provided credentials reach PostgREST. Never return or log them.
const handler = createHandler(async (event: Record<string, unknown>) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('storage unavailable');
  const response = await fetch(`${url}/rest/v1/dsh_sidebar_usage_events?on_conflict=event_id`, {
    method: 'POST', headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ event_id: event.event_id, version: event.version, locale: event.locale, event: event.event }),
    signal: AbortSignal.timeout(4000), redirect: 'error',
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('storage unavailable'); }
  await response.body?.cancel();
}, async (id: string) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('storage unavailable');
  const response = await fetch(`${url}/rest/v1/dsh_sidebar_usage_events?select=event_id&event_id=eq.${id}&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000), redirect: 'error',
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('storage unavailable'); }
  return (await response.json()).length === 1;
});
Deno.serve(handler);
