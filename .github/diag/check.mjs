import { chromium, webkit } from 'playwright';
const BASE = 'https://guildmanager.top';
for (const [name, eng] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await eng.launch();
  for (const path of ['/', '/#/entrar', '/#/adminpainel', '/adminpainel', '/entrar']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await ctx.newPage(); const log = []; const t0 = Date.now(); const started = new Map();
    pg.on('pageerror', (e) => log.push('PAGEERROR ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(m.type().toUpperCase() + ' ' + m.text().slice(0, 300)); });
    pg.on('request', (r) => started.set(r, Date.now()));
    pg.on('requestfailed', (r) => log.push(`FAILED ${r.url().slice(0, 140)} ${r.failure()?.errorText}`));
    pg.on('response', (r) => { const ms = Date.now() - (started.get(r.request()) || t0); if (r.status() >= 400 || ms > 2500) log.push(`RESP ${r.status()} ${ms}ms ${r.url().slice(0, 140)}`); });
    try { await pg.goto(BASE + path, { waitUntil: 'load', timeout: 40000 }); } catch (e) { log.push('GOTO ' + e.message.slice(0, 200)); }
    await pg.waitForTimeout(9000);
    const info = await pg.evaluate(() => ({ url: location.href, text: document.body.innerText.slice(0, 200).replace(/\n+/g, ' | '), app: document.getElementById('app')?.innerHTML.slice(0, 160), font: getComputedStyle(document.documentElement).getPropertyValue('--font-head') })).catch((e) => ({ err: e.message }));
    console.log(`\n=== ${name} ${path}\n`, JSON.stringify(info), '\n', log.slice(0, 25).join('\n '));
    await ctx.close();
  }
  await b.close();
}
