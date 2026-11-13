import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, can, clsBadge, fmtDateTime, mainChar } from '../../lib/util.js';
import { toast, busy, errMsg, empty } from '../../lib/ui.js';

export default async function presenca(el) {
  const evs = await q(sb.from('events').select('id,title,starts_at,status,event_types(name,rsvp_enabled)').neq('status', 'cancelled').lte('starts_at', new Date(Date.now() + 6 * 3600e3).toISOString()).order('starts_at', { ascending: false }).limit(25));
  if (!evs.length) { el.innerHTML = '<h2>Presença</h2>' + empty('Nenhum evento recente para marcar.'); return; }
  el.innerHTML = `<h2>Presença</h2><label class="f" style="margin:14px 0">Evento<select id="ev">${evs.map((e) => `<option value="${e.id}">${esc(e.title)} · ${fmtDateTime(e.starts_at)}${e.status === 'done' ? ' (encerrado)' : ''}</option>`).join('')}</select></label><div id="v"></div>`;
  const v = el.querySelector('#v'); let rows = [], evId;
  async function load() {
    evId = el.querySelector('#ev').value;
    const [people, rs, at] = await Promise.all([
      q(sb.from('profiles').select('id,display_name,characters(*)').eq('status', 'active')),
      q(sb.from('event_rsvps').select('user_id,status').eq('event_id', evId)),
      q(sb.from('event_attendance').select('user_id,attended').eq('event_id', evId)),
    ]);
    const rm = Object.fromEntries(rs.map((r) => [r.user_id, r.status])), am = Object.fromEntries(at.map((a) => [a.user_id, a.attended]));
    rows = people.map((p) => ({ p, ch: mainChar(p.characters), r: rm[p.id], a: am[p.id] ?? false }))
      .sort((x, y) => (y.r === 'going') - (x.r === 'going') || (x.ch?.nick || x.p.display_name).localeCompare(y.ch?.nick || y.p.display_name));
    const ev = evs.find((e) => e.id === evId);
    v.innerHTML = `<div class="row" style="margin-bottom:12px;gap:8px"><button class="btn" id="all" type="button">Marcar todos que confirmaram</button>${can('sub') && ev.status !== 'done' ? '<button class="btn primary" id="done" type="button">Encerrar evento</button>' : ''}<span class="muted small right">${rows.filter((x) => x.a).length} presentes</span></div>
      <div class="rows">${rows.map((x) => `<div><label class="check" style="flex:1">${'<input type="checkbox" data-u="' + x.p.id + '" ' + (x.a ? 'checked' : '') + '>'} ${clsBadge(x.ch?.class_code)} ${esc(x.ch?.nick || x.p.display_name)}</label>
        <span class="muted small">${x.r === 'going' ? 'confirmou' : x.r === 'not_going' ? 'avisou que não vai' : 'sem resposta'}</span></div>`).join('')}</div>`;
  }
  async function mark(uid, val) {
    const x = rows.find((r) => r.p.id === uid);
    await q(sb.from('event_attendance').upsert({ event_id: evId, user_id: uid, character_id: x.ch?.id ?? null, attended: val, marked_by: state.user.id, marked_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' }));
    x.a = val;
  }
  el.querySelector('#ev').onchange = load;
  v.onchange = async (e) => { const u = e.target.dataset.u; if (!u) return; try { await mark(u, e.target.checked); } catch (err) { toast(errMsg(err), 'bad'); e.target.checked = !e.target.checked; } };
  v.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.id === 'all') { await busy(b, async () => { for (const x of rows.filter((r) => r.r === 'going' && !r.a)) await mark(x.p.id, true); }); await load(); toast('Confirmados marcados como presentes.', 'ok'); }
      if (b.id === 'done') { await q(sb.from('events').update({ status: 'done' }).eq('id', evId)); toast('Evento encerrado.', 'ok'); }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  await load();
}
