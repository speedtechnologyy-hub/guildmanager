import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { esc, fmtDateTime, fmtTime, relDay, can } from '../lib/util.js';
import { plate, empty, modal, closeModal, busy, toast, formData } from '../lib/ui.js';

export default async function bosses(root) {
  root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Bosses</h1><p>Respawn dos bosses e horários fixos. Matou um? Registre para a guild saber.</p></div><div id="v"></div></div>';
  const v = root.querySelector('#v');

  async function load() {
    const [list, next, fixed] = await Promise.all([
      q(sb.from('bosses').select('*').eq('active', true).order('sort')),
      q(sb.from('boss_next_spawn').select('*')),
      q(sb.from('events').select('*, event_types(*)').not('boss_id', 'is', null).eq('status', 'scheduled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(60)),
    ]);
    const nx = Object.fromEntries(next.map((n) => [n.boss_id, n]));
    v.innerHTML = list.length ? `<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px">${list.map((b) => {
      const n = nx[b.id]; const fx = fixed.find((e) => e.boss_id === b.id);
      let big = '<span class="muted">sem registro</span>', sub = 'Ninguém registrou a última morte.';
      if (b.respawn_minutes && n?.next_spawn_at) {
        const up = new Date(n.next_spawn_at) <= new Date();
        big = up ? '<span class="big now">Pode estar vivo</span>' : `<span class="big" data-cd="${n.next_spawn_at}" data-done="Nasceu"></span>`;
        sub = `Morreu ${fmtDateTime(n.last_killed_at)}. Respawn de ${b.respawn_minutes >= 60 ? (b.respawn_minutes / 60) + 'h' : b.respawn_minutes + 'min'}.`;
      } else if (fx) { big = `<span class="big" data-cd="${fx.starts_at}" data-done="Agora"></span>`; sub = `Horário fixo: ${relDay(fx.starts_at)}, ${fmtTime(fx.starts_at)}.`; }
      return plate(`<div class="boss"><h3>${esc(b.name)}</h3><div class="big-w">${big.includes('class="big') ? big : `<div class="big">${big}</div>`}</div><p class="muted small">${esc(sub)}</p>${b.notes ? `<p class="small">${esc(b.notes)}</p>` : ''}${b.respawn_minutes ? `<button class="btn sm" data-kill="${b.id}" data-name="${esc(b.name)}" type="button">Registrei a morte</button>` : ''}</div>`);
    }).join('')}</div>` : empty('Nenhum boss cadastrado ainda.');
  }
  v.onclick = (e) => {
    const b = e.target.closest('[data-kill]'); if (!b) return;
    const m = modal(`<h3>Morte de ${esc(b.dataset.name)}</h3><form class="stack" id="kf" style="margin-top:14px">
      <label class="f">Morreu há quantos minutos?<input type="number" name="ago" min="0" max="600" value="0" required></label>
      <label class="f">Observação<input name="note" maxlength="120"></label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Registrar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#kf');
    f.onsubmit = (ev) => { ev.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const d = formData(f);
      await q(sb.from('boss_kills').insert({ boss_id: b.dataset.kill, killed_at: new Date(Date.now() - (+d.ago || 0) * 60000).toISOString(), reported_by: state.user.id, note: d.note || null }));
      closeModal(); toast('Morte registrada.', 'ok'); await load();
    }); };
  };
  await load();
  const ch = sb.channel('boss-kills').on('postgres_changes', { event: '*', schema: 'public', table: 'boss_kills' }, () => load()).subscribe();
  return () => sb.removeChannel(ch);
}
