import { sb } from '../supabase.js';
import { state } from '../store.js';
import { esc, fmtTime, relDay, mainChar } from './util.js';
import { toast, errMsg } from './ui.js';

/** open | soon | closed | cancelled */
export function rsvpState(ev) {
  if (ev.status === 'cancelled') return 'cancelled';
  if (ev.status === 'done') return 'closed';
  const now = Date.now();
  const opens = ev.rsvp_opens_at ? +new Date(ev.rsvp_opens_at) : 0;
  const closes = +new Date(ev.rsvp_closes_at || ev.starts_at);
  if (now < opens) return 'soon';
  if (now > closes) return 'closed';
  return 'open';
}

export function rsvpButtons(ev, mine, { compact = false, go = 'Vou', no = 'Não vou' } = {}) {
  if (ev.event_types?.rsvp_enabled === false) return '';
  const st = rsvpState(ev);
  const sm = compact ? 'sm' : '';
  if (st === 'open') {
    return `<button class="btn ${sm} ${mine === 'going' ? 'is-on' : ''}" data-rsvp="going" data-ev="${ev.id}" type="button">${esc(go)}</button>
            <button class="btn ${sm} ${mine === 'not_going' ? 'is-off' : ''}" data-rsvp="not_going" data-ev="${ev.id}" type="button">${esc(no)}</button>`;
  }
  const answer = mine === 'going' ? 'Você vai.' : mine === 'not_going' ? 'Você não vai.' : '';
  if (st === 'soon') return `<span class="muted small">Chamada abre às ${fmtTime(ev.rsvp_opens_at)}. ${answer}</span>`;
  if (st === 'cancelled') return '<span class="muted small">Cancelado.</span>';
  return `<span class="muted small">Chamada encerrada. ${answer}</span>`;
}

export async function setRsvp(eventId, status) {
  const main = mainChar(state.chars);
  const { error } = await sb.from('event_rsvps').upsert({
    event_id: eventId, user_id: state.user.id, character_id: main?.id ?? null, status,
    responded_at: new Date().toISOString(),
  }, { onConflict: 'event_id,user_id' });
  if (error) throw error;
}

/** Liga os botões [data-rsvp] dentro de `root` (chame uma vez por tela). */
export function bindRsvp(root, onDone) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rsvp]');
    if (!b || b.disabled) return;
    b.disabled = true;
    try {
      await setRsvp(b.dataset.ev, b.dataset.rsvp);
      toast(b.dataset.rsvp === 'going' ? 'Presença confirmada. Te vejo lá.' : 'Resposta registrada: você não vai.', 'ok');
      await onDone?.();
    } catch (err) {
      toast(errMsg(err), 'bad');
      b.disabled = false;
    }
  });
}

/** Linha de agenda (usada no lobby e na agenda). */
export function evRow(ev, mine) {
  const t = ev.event_types || {};
  return `<div class="ev ${ev.status === 'cancelled' ? 'cancelled' : ''}" style="--tc:${esc(t.color || '#a52525')}">
    <time>${fmtTime(ev.starts_at)}</time>
    <div><h3>${esc(ev.title)} <span class="tag">${esc(t.name || '')}</span></h3>
      <div class="cd">${new Date(ev.starts_at) > new Date() ? 'Começa em <span data-cd="' + ev.starts_at + '" data-done="agora"></span>' : 'Em andamento ou encerrado'}</div></div>
    <div class="acts">${rsvpButtons(ev, mine, { compact: true })}</div>
  </div>`;
}

/** A peça principal do site: a chamada de guerra com o anel de brasa. */
export function callPlate(ev, mine, tally) {
  const st = rsvpState(ev);
  const close = ev.rsvp_closes_at || ev.starts_at;
  const open = ev.rsvp_opens_at || new Date(Date.parse(close) - 6 * 3600e3).toISOString();
  const startMs = Date.parse(ev.starts_at), cancelled = st === 'cancelled';
  const center = cancelled ? '<span>--</span>' : `<span data-cd="${ev.starts_at}" data-done="É AGORA">--</span>`;
  const label = cancelled ? 'guerra cancelada' : startMs > Date.now() ? 'para a guerra' : 'em andamento';
  const callLine = st === 'open' ? `Chamada aberta, fecha às ${fmtTime(close)}.` : st === 'soon' ? `Chamada abre às ${fmtTime(open)}.` : 'Chamada encerrada.';

  const answered = mine === 'going' ? '<p class="answered go">Você confirmou presença.</p>'
    : mine === 'not_going' ? '<p class="answered no">Você avisou que não vai.</p>'
      : st === 'open' ? '<p class="answered">Você ainda não respondeu.</p>' : '';
  const t = tally ? `<div class="tally">
      <span class="go"><b>${tally.going}</b>vão</span>
      <span class="no"><b>${tally.not_going}</b>não vão</span>
      <span><b>${tally.none}</b>sem resposta</span></div>` : '';

  return `<section class="plate lit call ${st === 'open' ? 'open' : st === 'closed' ? 'closed' : ''}"><span class="sheen"></span>
    <div class="ring" data-ring="${open}|${ev.starts_at}">
      <svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="ringg" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--ember)"/></linearGradient></defs>
        <circle class="track" cx="60" cy="60" r="54"/><circle class="bar" cx="60" cy="60" r="54"/></svg>
      <div class="mid"><b>${center}</b><small>${label}</small></div>
    </div>
    <div>
      <h2>${esc(ev.title)}</h2>
      <p class="when">${relDay(ev.starts_at)}, às ${fmtTime(ev.starts_at)}. ${callLine}</p>
      <div class="actions">${rsvpButtons(ev, mine, { go: 'Eu vou', no: 'Não vou hoje' })}</div>
      ${answered}${t}
    </div>
  </section>`;
}
