import { chromium, webkit } from 'playwright';
const BASE = 'https://guildmanager.top';
for (const [name, eng, paths] of [['webkit', webkit, ['/', '/']], ['chromium', chromium, ['/#/adminpainel', '/#/entrar']]]) {
  const b = await eng.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });   // mesmo contexto: a 2ª visita usa o cache
  for (const path of paths) {
    const pg = await ctx.newPage(); const log = []; let own = 0, net = 0;
    pg.on('pageerror', (e) => log.push('PAGEERROR ' + e.message));
    pg.on('requestfailed', (r) => log.push(`FAILED ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
    pg.on('response', (r) => { if (r.url().startsWith(BASE)) { own++; if (!r.fromServiceWorker() && r.status() !== 0) net++; } if (r.status() >= 400 && !/challenges\.cloudflare/.test(r.url())) log.push(`RESP ${r.status()} ${r.url().slice(0, 120)}`); });
    try { await pg.goto(BASE + path, { waitUntil: 'load', timeout: 40000 }); } catch (e) { log.push('GOTO ' + e.message.slice(0, 200)); }
    await pg.waitForTimeout(7000);
    const info = await pg.evaluate(() => ({ url: location.href, text: document.body.innerText.slice(0, 140).replace(/\n+/g, ' | '), app: document.getElementById('app')?.innerHTML.slice(0, 110) })).catch((e) => ({ err: e.message }));
    console.log(`\n=== ${name} ${path}  pedidos ao site: ${own}\n`, JSON.stringify(info), '\n', log.slice(0, 12).join('\n '));
    await pg.close();
  }
  await b.close();
}
