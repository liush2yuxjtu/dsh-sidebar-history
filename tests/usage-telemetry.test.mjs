import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createUsageTelemetry, USAGE_EVENTS, USAGE_KEY } from '../src/usage-telemetry.mjs';
import { EVENTS, validateEvent, createHandler } from '../supabase/functions/dsh-sidebar-events/handler.mjs';
const delay = () => new Promise(resolve => setTimeout(resolve, 15));
function setup(options = {}) {
  const saved = new Map(), calls = [];
  const storage = { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v), removeItem: k => saved.delete(k) };
  const client = createUsageTelemetry({ storage, fetchImpl: async (url, init) => { calls.push({url,...init,payload:JSON.parse(init.body)}); return {status:202,json:async()=>({accepted:true})}; }, cryptoImpl:{randomUUID}, version:'0.2.2', ...options });
  return { client, saved, calls, storage };
}
test('disabled telemetry touches no network or stored state', async () => {
  const {client,saved,calls} = setup(); for (const event of USAGE_EVENTS) assert.equal(client.emit(event),false);
  await delay(); assert.equal(calls.length,0); assert.equal(saved.size,0); client.dispose();
});
test('opt in sends only the exact six fields and omits credentials and referrer', async () => {
  const {client,calls} = setup({locale:()=> 'zh'}); assert.equal(client.setPreferences(true),true); client.emit('card_open_requested'); await delay();
  assert.deepEqual(calls.map(c=>c.payload.event),['plugin_loaded','card_open_requested']);
  for (const call of calls) { assert.ok(validateEvent(call.payload)); assert.deepEqual(Object.keys(call.payload).sort(),['event','event_id','locale','package','schema_version','version']); assert.equal(call.payload.locale,'zh-CN'); assert.equal(call.credentials,'omit'); assert.equal(call.redirect,'error'); assert.equal(call.referrerPolicy,'no-referrer'); }
  client.dispose();
});
test('unknown events cannot smuggle text; client and server enums agree', async()=> {
  assert.deepEqual(USAGE_EVENTS,EVENTS); const {client,calls}=setup(); client.setPreferences(true); assert.equal(client.emit('secret prompt'),false); await delay(); assert.equal(calls.length,1); client.dispose();
});
test('privacy signals block consent and recheck each event', async()=> {
  const privacy={doNotTrack:'1'}; const {client,calls}=setup({navigatorImpl:privacy}); assert.equal(client.setPreferences(true),false); privacy.doNotTrack='0'; client.setPreferences(true); await delay(); privacy.globalPrivacyControl=true; assert.equal(client.emit('search_zero'),false); assert.equal(calls.length,1); client.dispose();
});
test('corrupt or inaccessible storage never opts in', async()=> {
  const {client}=setup({storage:{getItem:()=>'{broken',setItem:()=>{throw Error('disk');}}}); assert.equal(client.snapshot().enabled,false); assert.equal(client.setPreferences(true),false); assert.equal(client.emit('search_some'),false); client.dispose();
});
test('consent survives reload; forget removes consent', async()=> {
  const original=setup(); original.client.setPreferences(true); await delay(); original.client.dispose(); const next=setup({storage:original.storage}); assert.equal(next.client.snapshot().enabled,true); next.client.clear(); assert.equal(original.saved.has(USAGE_KEY),false); assert.equal(next.client.emit('search_zero'),false); next.client.dispose();
});
test('revocation aborts in-flight work and drops queued events', async()=> {
  const requests=[]; const {client}=setup({fetchImpl:async (_url,init)=>{requests.push(init); return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted'))));}});
  client.setPreferences(true); client.emit('search_some'); assert.equal(client.setPreferences(false),true); await delay(); assert.equal(requests.length,1); assert.equal(requests[0].signal.aborted,true); assert.equal(client.snapshot().pending,0); assert.equal(client.emit('search_zero'),false); client.dispose();
});
test('network rejection and queue bounds cannot block caller', async()=> {
  const {client}=setup({fetchImpl:async()=>{throw Error('offline');}}); client.setPreferences(true); for(let i=0;i<150;i++) client.emit('search_error'); await delay(); assert.ok(client.snapshot().failed>0); assert.ok(client.snapshot().dropped>0); client.dispose();
});
test('collector rejects all unknown fields and bad values before persistence', async()=> {
  const accepted=[]; const handler=createHandler(async e=>accepted.push(e));
  const valid={schema_version:1,event_id:randomUUID(),package:'dsh-sidebar-history',version:'0.2.2',locale:'ja',event:'search_zero'};
  const send = value=>handler(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)}));
  for(const extra of ['prompt','session_id','search','installation_id','ip','user_agent']) assert.equal((await send({...valid,[extra]:'private'})).status,400);
  for(const change of [{event:'arbitrary'},{locale:'xx'},{version:'branch-secret'},{event_id:123},{schema_version:2}]) assert.equal((await send({...valid,...change})).status,400);
  assert.equal((await send(valid)).status,202); assert.equal(accepted.length,1);
  assert.equal((await handler(new Request('https://example.com',{method:'OPTIONS'}))).status,204);
  assert.equal((await handler(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(1100)}))).status,413);
});
test('collector does not report success on storage failure or echo inputs',async()=> {
  const handler=createHandler(async()=>{throw Error('database secret');});
  const response=await handler(new Request('https://example.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema_version:1,event_id:randomUUID(),package:'dsh-sidebar-history',version:'0.2.2',locale:'en',event:'diagnostic_test'})}));
  assert.equal(response.status,503); assert.equal((await response.text()).includes('secret'),false);
});
test('another tab revoking consent prevents later transmission',async()=> {
  const {client,storage,calls}=setup(); client.setPreferences(true); await delay();
  storage.removeItem(USAGE_KEY); assert.equal(client.emit('card_open_requested'),false);
  await delay(); assert.equal(calls.length,1); client.dispose();
});
test('receipt lookup validates its capability and does not expose rows',async()=> {
  const id=randomUUID(),lookups=[]; const handler=createHandler(async()=>{},async value=>{lookups.push(value);return value===id;});
  const response=await handler(new Request('https://example.com?receipt='+id));assert.equal(response.status,200);assert.deepEqual(await response.json(),{stored:true});
  const unknown=await handler(new Request('https://example.com?receipt='+randomUUID()));assert.deepEqual(await unknown.json(),{stored:false});
  assert.equal((await handler(new Request('https://example.com?receipt=bad'))).status,400);assert.equal(lookups.length,2);
});
