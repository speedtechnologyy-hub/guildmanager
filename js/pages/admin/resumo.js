import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, can, clsRgb, mainChar, fmtShort } from '../../lib/util.js';
import { attendanceStats } from '../../lib/stats.js';

function donut(parts) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1; let acc = 0; const R = 15.9155;
  return `<svg viewBox="0 0 42 42" role="img" aria-label="Distribuição por classe" style="max-width:220px;margin:auto"><circle cx="21" cy="21" r="${R}" fill="none" stroke="var(--line-soft)" stroke-width="5"/>${parts.map((p) => { const d = (p.n / total) * 100; const o = `<circle cx="21" cy="21" r="${R}" fill="none" stroke="rgb(${p.c})" stroke-width="5" stroke-dasharray="${d} ${100 - d}" stroke-dashoffset="${25 - acc}"/>`; acc += d; return o; }).join('')}<text x="21" y="22.5" text-anchor="middle" fill="var(--text)" style="font:700 7px var(--font-head)">${total === 1 && !parts.some((p) => p.n) ? 0 : total}</text></svg>`;
}
function bars(vals) {
  if (!vals.length) return '<p class="muted small">Sem guerras com presença marcada.</p>';
  const w = 300, h = 120, bw = Math.min(28, (w - 10) / vals.length - 6);
  return `<svg viewBox="0 0 ${w} ${h + 22}" role="img" aria-label="Presença por guerra">${[0, 50, 100].map((g) => `<line x1="0" x2="${w}" y1="${h - g * h / 100}" y2="${h - g * h / 100}" stroke="var(--line-soft)"/>`).join('')}${vals.map((v, i) => { const x = 8 + i * ((w - 10) / vals.length), bh = (v.pct / 100) * h; return `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" fill="var(--accent)" opacity=".85"/><text x="${x + bw / 2}" y="${h - bh - 4}" text-anchor="middle" fill="var(--text)" style="font:600 8px var(--font-body)">${v.pct}</text><text x="${x + bw / 2}" y="${h + 14}" text-anchor="middle" fill="var(--muted)" style="font:8px var(--font-body)">${esc(v.label)}</text>`; }).join('')}</svg>`;
}

export default async function resumo(el) {
  const head = (t) => sb.from(t).select('id', { count: 'exact', head: true });
  const [m, inv, ev, integ, people, wars] = await Promise.all([
    head('profiles').eq('status', 'active'), head('invites').eq('active', true),
    head('events').gte('starts_at', new Date().toISOString()).eq('status', 'scheduled'),
    can('leader') ? sb.from('integration_settings').select('*').eq('id', 1).maybeSingle() : { data: null },
    q(sb.from('profiles').select('id,characters(*)').eq('status', 'active')),
    q(sb.from('events').select('id,starts_at,event_types!inner(kind)').eq('event_types.kind', 'war').lt('starts_at', new Date().toISOString()).order('starts_at', { ascending: false }).limit(8)),
  ]);
  const ids = wars.map((w) => w.id);
  const att = ids.length ? await q(sb.from('event_attendance').select('event_id,attended').in('event_id', ids)) : [];
  const series = wars.slice().reverse().filter((w) => att.some((a) => a.event_id === w.id)).map((w) => ({ label: fmtShort(w.starts_at).replace(/^\S+\s/, ''), pct: Math.round((att.filter((a) => a.event_id === w.id && a.attended).length / Math.max(1, people.length)) * 100) }));
  const parts = state.classes.filter((c) => c.active).map((c) => ({ code: c.code, n: people.filter((p) => mainChar(p.characters)?.class_code === c.code).length, c: clsRgb(c.code) }));
  const noChar = people.filter((p) => !p.characters.length).length;
  const d = state.settings.discord || {}; const i = integ.data;
  const chk = [
    ['Logo e nome da guild', !!state.settings.logo_url, '#/admin/aparencia'],
    ['Tipos de guerra com horários', ev.count > 0, '#/admin/agenda'],
    ['Discord configurado', !!(d.invite_url || d.voice_url), '#/admin/aparencia'],
    ['WhatsApp conectado', !!i?.whatsapp_connected, '#/admin/avisos'],
    ['Envio de avisos ligado', i ? !i.sends_paused : false, '#/admin/avisos'],
  ];
  el.innerHTML = `<h2>Visão geral</h2>
    <div class="kpis"><div><b>${m.count ?? 0}</b><span>membros ativos</span></div><div><b>${ev.count ?? 0}</b><span>eventos na agenda</span></div><div><b>${inv.count ?? 0}</b><span>convites ativos</span></div><div><b>${noChar}</b><span>sem personagem</span></div></div>
    <div class="dash"><div class="card"><h3>Classes (mains)</h3>${donut(parts)}<div class="legend">${parts.map((p) => `<span><i style="--c:${p.c}"></i>${esc(p.code)} ${p.n}</span>`).join('')}</div></div>
      <div class="card"><h3>Presença nas últimas guerras (%)</h3>${bars(series)}</div></div>
    ${can('leader') ? `<h3 style="margin-top:28px">Para deixar tudo pronto</h3><div class="rows" style="margin-top:10px">${chk.map(([t, ok, h]) => `<div><span class="st ${ok ? 'ok' : 'bad'}">${esc(t)}</span><span class="right">${ok ? '' : `<a class="btn sm" href="${h}">Configurar</a>`}</span></div>`).join('')}</div>` : ''}`;
}
