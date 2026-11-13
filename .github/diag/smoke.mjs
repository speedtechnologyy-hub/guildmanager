// Teste rápido do site montado (antes de publicar): abre as telas com dados falsos e falha se der erro.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const stub = readFileSync(new URL('./stub.js', import.meta.url), 'utf8');
const BASE = process.env.BASE || 'http://localhost:8799';
const b = await chromium.launch();
let bad = 0;
for (const path of ['/', '/#/ranking', '/#/membros', '/#/guerras', '/#/perfil', '/#/instalar', '/#/admin', '/#/admin/contas', '/#/admin/convites', '/#/admin/agenda', '/#/admin/estudio']) {
  const pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; let own = 0;
  pg.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  pg.on('response', (r) => { if (r.url().startsWith(BASE)) { own++; if (r.status() >= 400) errs.push(`RESP ${r.status()} ${r.url()}`); } });
  await pg.route('**/@supabase/supabase-js**', (r) => r.fulfill({ body: stub, contentType: 'application/javascript' }));
  await pg.route('**/fonts.g*/**', (r) => r.abort());
  await pg.goto(BASE + path); await pg.waitForTimeout(2500);
  const text = (await pg.evaluate(() => document.querySelector('#view')?.innerText || '')).replace(/\s+/g, ' ');
  const ok = !errs.length && text.length > 60 && own <= 15;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'ERRO'} ${path}  pedidos=${own} texto=${text.length} ${errs.slice(0, 4).join(' ; ')}${ok ? '' : ' :: ' + text.slice(0, 120)}`);
  await pg.context().close();
}
await b.close();
if (bad) { console.error(`${bad} tela(s) com problema`); process.exit(1); }
