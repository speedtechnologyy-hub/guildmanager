import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, can, dayKey, fmtDayLong, fmtTime, fmtDateTime, zonedToISO } from '../../lib/util.js';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty } from '../../lib/ui.js';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const num = (n) => (n == null ? '' : Number(n).toLocaleString('pt-BR'));
function toLocalInput(iso) {
  if (!iso) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: state.settings.timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default async function calendario(el) {
  const owner = can('owner');
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth(), sel = dayKey(now);
  let evs = [], res = {}, prints = {}, att = {};

  async function load() {
    const from = new Date(Date.UTC(y, m, 1) - 36 * 3600e3).toISOString(), to = new Date(Date.UTC(y, m + 1, 1) + 36 * 3600e3).toISOString();
    evs = (await q(sb.from('events').select('*, event_types(*)').gte('starts_at', from).lt('starts_at', to).neq('status', 'cancelled').order('starts_at')))
      .filter((e) => e.event_types?.kind === 'war' || e.event_types?.has_cities);
    const ids = evs.map((e) => e.id);
    res = {}; prints = {}; att = {};
    if (ids.length) {
      const [r, p, a] = await Promise.all([
        q(sb.from('event_results').select('*').in('event_id', ids)),
        q(sb.from('event_prints').select('event_id').in('event_id', ids)),
        q(sb.from('event_attendance').select('event_id,attended').in('event_id', ids)),
      ]);
      r.forEach((x) => { res[x.event_id] = x; });
      p.forEach((x) => { prints[x.event_id] = (prints[x.event_id] || 0) + 1; });
      a.forEach((x) => { if (x.attended) att[x.event_id] = (att[x.event_id] || 0) + 1; });
    }
    draw();
  }

  function draw() {
    const first = new Date(Date.UTC(y, m, 1)), lead = first.getUTCDay(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const byDay = {}; evs.forEach((e) => { (byDay[dayKey(e.starts_at)] ||= []).push(e); });
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-c off"></div>');
    for (let d = 1; d <= days; d++) {
      const k = dayKey(new Date(Date.UTC(y, m, d, 12)));
      const list = byDay[k] || [];
      cells.push(`<button type="button" class="cal-c ${k === sel ? 'sel' : ''} ${k === dayKey(new Date()) ? 'today' : ''}" data-day="${k}"><b>${d}</b>${list.map((e) => `<span class="cal-e" style="--tc:${esc(e.event_types.color)}">${esc(e.event_types.name)}${res[e.id]?.fame != null ? `<em>${num(res[e.id].fame)} fama</em>` : ''}${prints[e.id] ? `<em>${prints[e.id]} print${prints[e.id] > 1 ? 's' : ''}</em>` : ''}</span>`).join('')}</button>`);
    }
    el.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Calendário de guerras</h2><div class="row" style="gap:8px"><button class="btn sm" data-nav="-1" type="button" aria-label="Mês anterior">‹</button><strong style="min-width:140px;text-align:center">${MONTHS[m]} ${y}</strong><button class="btn sm" data-nav="1" type="button" aria-label="Próximo mês">›</button></div></div>
      <p class="muted small">Clique em um dia para ver presença, prints dos grupos${owner ? ', registrar a fama das torres e definir as cidades' : ' e a fama das torres'}.</p>
      <div class="cal">${WD.map((w) => `<div class="cal-h">${w}</div>`).join('')}${cells.join('')}</div>
      <div id="day"></div>`;
    drawDay();
  }

  async function drawDay() {
    const box = el.querySelector('#day');
    const list = evs.filter((e) => dayKey(e.starts_at) === sel);
    if (!list.length) { box.innerHTML = `<h3 style="margin-top:26px">${esc(sel)}</h3>${empty('Nenhuma guerra nesse dia.')}`; return; }
    box.innerHTML = '';
    for (const e of list) {
      const t = e.event_types; const sec = document.createElement('section'); sec.className = 'plate'; sec.style.cssText = 'padding:22px;margin-top:22px'; sec.dataset.ev = e.id;
      const [cities, pr, rs] = await Promise.all([
        t.has_cities ? q(sb.from('event_cities').select('*').eq('event_id', e.id).order('sort')) : [],
        q(sb.from('event_prints').select('*').eq('event_id', e.id).order('created_at')),
        q(sb.from('event_rsvps').select('status').eq('event_id', e.id)),
      ]);
      const urls = {};
      if (pr.length) { const { data } = await sb.storage.from('war-prints').createSignedUrls(pr.map((p) => p.path), 3600); (data || []).forEach((d) => { urls[d.path] = d.signedUrl; }); }
      const going = rs.filter((r) => r.status === 'going').length, no = rs.filter((r) => r.status === 'not_going').length;
      sec.innerHTML = `<h3>${esc(e.title)} <span class="tag">${esc(t.name)}</span></h3>
        <p class="muted small">${esc(fmtDayLong(e.starts_at))}, às ${fmtTime(e.starts_at)} · ${going} confirmaram · ${no} não vão · ${att[e.id] || 0} presenças marcadas ${can('leader') ? `· <a href="#/admin/presenca">marcar presença</a>` : ''}</p>
        <div class="form-grid" style="margin-top:16px"><div><strong>Fama das torres</strong>${owner ? `<form data-f="fame" class="stack" style="margin-top:8px"><label class="f"><input type="number" name="fame" min="0" placeholder="Quantidade de fama" value="${res[e.id]?.fame ?? ''}"></label><label class="f"><input name="note" maxlength="200" placeholder="Observação (opcional)" value="${esc(res[e.id]?.note || '')}"></label><div><button class="btn sm primary" type="submit">Salvar fama</button></div></form>` : `<p style="margin-top:8px;font:700 1.6rem var(--font-head)">${res[e.id]?.fame != null ? num(res[e.id].fame) : '<span class="muted">não registrada</span>'}</p>${res[e.id]?.note ? `<p class="muted small">${esc(res[e.id].note)}</p>` : ''}`}</div>
        ${t.has_cities ? `<div><strong>Cidades da guerra</strong><div class="rows" style="margin-top:8px">${cities.map((c) => `<div><span>${esc(c.city)}</span>${owner ? `<span class="right"><button class="btn sm danger" data-rmc="${c.id}" type="button">Remover</button></span>` : ''}</div>`).join('') || '<div class="muted">Nenhuma cidade definida.</div>'}</div>
          ${owner ? `<form data-f="city" class="row" style="margin-top:8px;gap:8px"><input name="city" required maxlength="40" placeholder="Ex.: Armia" style="flex:1"><button class="btn sm" type="submit">Adicionar</button></form>
          <form data-f="bet" class="stack" style="margin-top:14px"><label class="f">Aposta fecha em<input type="datetime-local" name="bet" value="${toLocalInput(e.bet_closes_at)}"></label><div class="row" style="gap:8px"><button class="btn sm primary" type="submit">Salvar prazo</button><button class="btn sm" type="button" data-bet0="${e.id}">Virada do sábado (00:00 do dia)</button></div></form>` : (e.bet_closes_at ? `<p class="muted small" style="margin-top:8px">Aposta fecha ${fmtDateTime(e.bet_closes_at)}</p>` : '')}</div>` : ''}</div>
        <div style="margin-top:20px"><div class="row" style="justify-content:space-between"><strong>Prints do grupo (${pr.length})</strong><label class="btn sm">Enviar print<input type="file" accept="image/*" multiple hidden data-up="${e.id}"></label></div>
        <div class="shots">${pr.map((p) => `<figure><button type="button" data-view="${esc(urls[p.path] || '')}" data-cap="${esc(p.caption || '')}"><img loading="lazy" alt="${esc(p.caption || 'Print')}" src="${esc(urls[p.path] || '')}"></button><figcaption>${esc(p.caption || '')}<button class="btn sm danger" type="button" data-rmp="${p.id}" data-path="${esc(p.path)}">Excluir</button></figcaption></figure>`).join('') || '<p class="muted small">Nenhum print enviado para esta guerra.</p>'}</div></div>`;
      box.appendChild(sec);
    }
  }

  el.onclick = async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.nav) { m += +b.dataset.nav; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } await load(); }
      else if (b.dataset.day) { sel = b.dataset.day; draw(); }
      else if (b.dataset.view) modal(`<img src="${esc(b.dataset.view)}" alt="" style="max-height:78vh;margin:auto">${b.dataset.cap ? `<p class="muted" style="margin-top:10px">${esc(b.dataset.cap)}</p>` : ''}`, { wide: true });
      else if (b.dataset.rmc) { await q(sb.from('event_cities').delete().eq('id', b.dataset.rmc)); await drawDay(); }
      else if (b.dataset.rmp && await confirmBox('Excluir este print?', 'Excluir')) { await sb.storage.from('war-prints').remove([b.dataset.path]); await q(sb.from('event_prints').delete().eq('id', b.dataset.rmp)); await load(); }
      else if (b.dataset.bet0) {
        const e = evs.find((x) => x.id === b.dataset.bet0); const k = dayKey(e.starts_at).split('/');
        const f = b.closest('form'); f.bet.value = `${k[2]}-${k[1]}-${k[0]}T00:00`;
      }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  el.onsubmit = (ev) => {
    const f = ev.target; if (!f.dataset.f) return; ev.preventDefault();
    const id = f.closest('[data-ev]').dataset.ev;
    busy(f.querySelector('[type=submit]'), async () => {
      try {
        if (f.dataset.f === 'fame') { await q(sb.from('event_results').upsert({ event_id: id, fame: f.fame.value === '' ? null : +f.fame.value, note: f.note.value || null, updated_by: state.user.id, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })); toast('Fama registrada.', 'ok'); await load(); }
        if (f.dataset.f === 'city') { await q(sb.from('event_cities').insert({ event_id: id, city: f.city.value.trim(), sort: Date.now() % 100000 })); f.reset(); await drawDay(); }
        if (f.dataset.f === 'bet') { await q(sb.from('events').update({ bet_closes_at: f.bet.value ? zonedToISO(f.bet.value) : null }).eq('id', id)); toast('Prazo da aposta salvo.', 'ok'); await load(); }
      } catch (err) { toast(errMsg(err), 'bad'); }
    });
  };
  el.onchange = async (ev) => {
    const inp = ev.target.closest('[data-up]'); if (!inp?.files?.length) return;
    const id = inp.dataset.up;
    try {
      for (const file of inp.files) {
        if (file.size > 8 * 1024 * 1024) { toast(`${file.name} passa de 8 MB.`, 'bad'); continue; }
        const path = `${id}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const { error } = await sb.storage.from('war-prints').upload(path, file, { contentType: file.type });
        if (error) throw error;
        await q(sb.from('event_prints').insert({ event_id: id, path, caption: file.name.replace(/\.[^.]+$/, '').slice(0, 80) }));
      }
      toast('Prints enviados.', 'ok'); await load();
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  await load();
}
