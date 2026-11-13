import { sb, q } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, clsBadge, clsRgb, clsIcon, crown, mainChar, lineageName } from '../lib/util.js?v=20261113h';
import { empty } from '../lib/ui.js?v=20261113h';
import { attendanceStats } from '../lib/stats.js?v=20261113h';

export default async function ranking(root) {
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Ranking</h1><p>Presença nas guerras realizadas. Só conta guerra com chamada marcada pela liderança.</p></div>
    <div class="filters" id="pf"></div><div class="filters" id="cf"></div><div id="v"></div></div>`;
  const people = await q(sb.from('profiles').select('id,display_name,role,characters(*)').eq('status', 'active'));
  let days = 30, cls = 'all';
  const cache = {};
  async function draw() {
    root.querySelector('#pf').innerHTML = [[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [0, 'Sempre']].map(([d, n]) => `<button class="chip ${days === d ? 'on' : ''}" data-d="${d}" type="button">${n}</button>`).join('');
    root.querySelector('#cf').innerHTML = [['all', 'Todas'], ...state.classes.filter((c) => c.active).map((c) => [c.code, c.code])].map(([k, n]) => `<button class="chip ${cls === k ? 'on' : ''}" data-c="${esc(k)}" type="button">${esc(n)}</button>`).join('');
    const att = cache[days] ||= await attendanceStats(days);
    const rows = people.map((p) => ({ p, ch: mainChar(p.characters), n: att.per[p.id] || 0 }))
      .filter((x) => cls === 'all' || x.ch?.class_code === cls).sort((a, b) => b.n - a.n || (a.ch?.nick || a.p.display_name).localeCompare(b.ch?.nick || b.p.display_name));
    const v = root.querySelector('#v');
    if (!att.total) { v.innerHTML = empty('Ainda não há guerra com presença marcada nesse período.'); return; }
    const top = rows.slice(0, 3).filter((x) => x.n > 0);
    const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
    v.innerHTML = `${order.length ? `<div class="podium">${order.map((x) => { const pos = top.indexOf(x) + 1; return `<div class="pl p${pos}" style="--c:${x.ch ? clsRgb(x.ch.class_code) : '163,151,135'}"><span class="medal">${pos}</span>${x.ch ? `<div style="width:30px;height:30px;margin:0 auto;color:rgb(${clsRgb(x.ch.class_code)})">${clsIcon(x.ch.class_code)}</div>` : ''}<div class="nm">${esc(x.ch?.nick || x.p.display_name)}${crown(x.p.role)}</div><div class="pc">${att.pct(x.p.id)}%<small>${x.n} de ${att.total}</small></div></div>`; }).join('')}</div>` : ''}
      <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Guerreiro</th><th>Linhagem</th><th>Presenças</th><th>Taxa</th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td>${clsBadge(x.ch?.class_code)} ${esc(x.ch?.nick || x.p.display_name)}${crown(x.p.role)}</td><td class="muted">${esc(lineageName(x.ch?.lineage_id))}</td><td>${x.n}/${att.total}</td><td><span class="pct"><i style="width:${att.pct(x.p.id)}%"></i></span>${att.pct(x.p.id)}%</td></tr>`).join('')}</tbody></table></div>`;
  }
  root.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.d != null) days = +b.dataset.d; if (b.dataset.c) cls = b.dataset.c; draw(); };
  await draw();
}
