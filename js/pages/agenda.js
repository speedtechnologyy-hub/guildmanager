import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { esc, dayKey, fmtDayLong, every } from '../lib/util.js';
import { empty } from '../lib/ui.js';
import { evRow, bindRsvp } from '../lib/rsvp.js';

export default async function agenda(root) {
  root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Agenda</h1><p>Tudo que está marcado nos próximos 14 dias.</p></div><div class="filters" id="fl"></div><div id="v"></div></div>';
  const v = root.querySelector('#v'), fl = root.querySelector('#fl');
  let filter = 'all', evs = [], mine = {};
  bindRsvp(v, load);
  fl.onclick = (e) => { const c = e.target.closest('[data-f]'); if (c) { filter = c.dataset.f; draw(); } };
  function draw() {
    fl.innerHTML = [['all', 'Tudo'], ...state.types.filter((t) => t.active).map((t) => [t.slug, t.name])].map(([k, n]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${esc(k)}" type="button">${esc(n)}</button>`).join('');
    const list = evs.filter((e) => filter === 'all' || e.event_types?.slug === filter);
    if (!list.length) { v.innerHTML = empty('Nada marcado para esse filtro.'); return; }
    let last = '', html = '';
    for (const e of list) { const k = dayKey(e.starts_at); if (k !== last) { html += `<div class="day">${esc(fmtDayLong(e.starts_at))}</div>`; last = k; } html += evRow(e, mine[e.id]); }
    v.innerHTML = `<div class="stack">${html}</div>`;
  }
  async function load() {
    const from = new Date(Date.now() - 2 * 3600e3).toISOString(), to = new Date(Date.now() + 14 * 864e5).toISOString();
    const [e, r] = await Promise.all([
      q(sb.from('events').select('*, event_types(*)').gte('starts_at', from).lte('starts_at', to).order('starts_at')),
      q(sb.from('event_rsvps').select('event_id,status').eq('user_id', state.user.id)),
    ]);
    evs = e; mine = Object.fromEntries(r.map((x) => [x.event_id, x.status])); draw();
  }
  await load();
  return every(60000, load);
}
