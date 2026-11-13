import { sb, q } from '../../supabase.js?v=20261113h';
import { state } from '../../store.js?v=20261113h';
import { esc, can, fmtDayLong, fmtTime, dayKey, zonedToISO } from '../../lib/util.js?v=20261113h';
import { toast, busy, errMsg, empty } from '../../lib/ui.js?v=20261113h';

const num = (n) => Number(n || 0).toLocaleString('pt-BR');
const pad = (n) => String(n).padStart(2, '0');

/** Segunda-feira (AAAA-MM-DD) da semana de uma data local da guild. */
function mondayOf(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: state.settings.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]));
  const base = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  return base;
}
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const br = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;

export default async function fama(el) {
  const owner = can('leader'); // o master libera ou bloqueia sub líderes em Estúdio > Equipe
  let monday = mondayOf(new Date());

  async function load() {
    const sunday = new Date(monday); sunday.setUTCDate(sunday.getUTCDate() + 6);
    const from = zonedToISO(`${iso(monday)}T00:00`);
    const next = new Date(monday); next.setUTCDate(next.getUTCDate() + 7);
    const to = zonedToISO(`${iso(next)}T00:00`);
    const evs = (await q(sb.from('events').select('id,title,starts_at,status,event_types!inner(slug,name)').in('event_types.slug', ['torre', 'cidades']).neq('status', 'cancelled').gte('starts_at', from).lt('starts_at', to).order('starts_at'))).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const ids = evs.map((e) => e.id);
    const res = {};
    if (ids.length) (await q(sb.from('event_results').select('*').in('event_id', ids))).forEach((r) => { res[r.event_id] = r; });
    const towers = evs.filter((e) => e.event_types.slug === 'torre');
    const cityWar = evs.find((e) => e.event_types.slug === 'cidades');
    draw(towers, cityWar, res, sunday);
  }

  function draw(towers, cityWar, res, sunday) {
    const total = () => towers.reduce((a, e) => a + (+res[e.id]?.fame || 0), 0);
    const done = towers.filter((e) => res[e.id]?.fame != null).length;
    let acc = 0;
    el.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><h2>Fama da semana</h2><div class="row" style="gap:8px"><button class="btn sm" data-w="-1" type="button" aria-label="Semana anterior">‹</button><strong style="min-width:150px;text-align:center">${br(monday)} a ${br(sunday)}</strong><button class="btn sm" data-w="1" type="button" aria-label="Próxima semana">›</button></div></div>
      <p class="muted small">Registre a fama de cada dia de torre. O total vai somando e fica pronto para a aposta de sábado.</p>
      <section class="plate lit" style="padding:24px;margin:16px 0;text-align:center"><span class="sheen"></span><div class="muted small" style="letter-spacing:.16em;text-transform:uppercase">Fama acumulada na semana</div>
        <div id="tot" style="font:700 clamp(2.6rem,7vw,4rem)/1.1 var(--font-num,var(--font-head));color:var(--gold-hi,var(--accent))">${num(total())}</div>
        <div class="muted small">${done} de ${towers.length} dias de torre registrados</div></section>
      ${towers.length ? `<div class="rows fama-rows">${towers.map((e) => { acc += +res[e.id]?.fame || 0; const past = new Date(e.starts_at) < Date.now();
        return `<div data-id="${e.id}" style="flex-wrap:wrap;gap:10px"><div style="flex:1 1 180px;min-width:0"><div class="name">${esc(fmtDayLong(e.starts_at))}</div><div class="sub">${esc(e.title)} · ${fmtTime(e.starts_at)} ${past ? '' : '· ainda não aconteceu'}</div></div>
          ${owner ? `<label class="f" style="flex:1 1 140px;max-width:190px;margin:0"><input type="number" min="0" inputmode="numeric" data-fame placeholder="Fama do dia" value="${res[e.id]?.fame ?? ''}"></label><button class="btn sm primary" data-save type="button">Salvar</button>` : `<b>${res[e.id]?.fame != null ? num(res[e.id].fame) : '<span class="muted">-</span>'}</b>`}
          <span class="muted small" style="flex:1 1 100%;text-align:right">soma ${num(acc)}</span></div>`; }).join('')}</div>` : empty('Nenhuma guerra de torre nessa semana. Defina os dias em Agenda > Horário das guerras.')}
      ${cityWar ? `<h3 style="margin-top:30px">Aposta na Guerra de Cidades (${esc(fmtDayLong(cityWar.starts_at))})</h3>
        <div class="kpis"><div><b id="avail">${num(total())}</b><span>fama disponível</span></div><div><b id="bet">${num(res[cityWar.id]?.bet_fame)}</b><span>apostada</span></div><div><b id="left">${num(total() - (+res[cityWar.id]?.bet_fame || 0))}</b><span>sobra</span></div></div>
        ${owner ? `<form id="betf" class="row" style="gap:10px;margin-top:14px" data-id="${cityWar.id}"><label class="f" style="flex:1;margin:0">Fama apostada<input type="number" min="0" name="bet" value="${res[cityWar.id]?.bet_fame ?? ''}"></label><button class="btn primary" type="submit">Salvar aposta</button></form>` : ''}` : ''}`;
    el._ctx = { towers, cityWar, res };
  }

  async function save(id, patch) {
    const old = el._ctx.res[id] || {};
    const row = { event_id: id, fame: old.fame ?? null, bet_fame: old.bet_fame ?? null, note: old.note ?? null, ...patch, updated_by: state.user.id, updated_at: new Date().toISOString() };
    await q(sb.from('event_results').upsert(row, { onConflict: 'event_id' }));
  }

  el.onclick = async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.w) { monday.setUTCDate(monday.getUTCDate() + 7 * +b.dataset.w); await load(); }
      if (b.dataset.save !== undefined) {
        const row = b.closest('[data-id]'); const v = row.querySelector('[data-fame]').value;
        await busy(b, () => save(row.dataset.id, { fame: v === '' ? null : Math.max(0, Math.round(+v)) }));
        toast('Fama do dia salva.', 'ok'); await load();
      }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  el.onsubmit = (ev) => {
    const f = ev.target; if (f.id !== 'betf') return; ev.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      try { await save(f.dataset.id, { bet_fame: f.bet.value === '' ? null : Math.max(0, Math.round(+f.bet.value)) }); toast('Aposta salva.', 'ok'); await load(); } catch (err) { toast(errMsg(err), 'bad'); }
    });
  };
  await load();
}
