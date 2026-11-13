import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, fmtDateTime, zonedToISO, can } from '../../lib/util.js';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty, formData } from '../../lib/ui.js';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const hm = (t) => String(t || '').slice(0, 5);

export default async function agenda(el) {
  let bosses = [];
  async function load() {
    const [rules, evs] = await Promise.all([
      q(sb.from('schedule_rules').select('*, event_types(name), bosses(name)').order('created_at')),
      q(sb.from('events').select('*, event_types(name)').gte('starts_at', new Date(Date.now() - 864e5).toISOString()).order('starts_at').limit(60)),
    ]);
    bosses = await q(sb.from('bosses').select('id,name').eq('active', true));
    el.innerHTML = `${warCard(rules)}<div class="row" style="justify-content:space-between;margin-top:30px"><h2>Horários fixos</h2>${can('leader') ? '<button class="btn primary" data-act="rule" type="button">Novo horário</button>' : ''}</div>
      <p class="muted small">Cada horário gera os eventos automaticamente, com a chamada abrindo e fechando nos horários definidos.</p>
      <div class="rows" style="margin:14px 0">${rules.length ? rules.map((r) => `<div><div><div class="name">${esc(r.title)} <span class="tag ${r.active ? 'red' : ''}">${r.active ? 'ativo' : 'pausado'}</span></div>
        <div class="sub">${r.weekdays.map((d) => DAYS[d - 1]).join(', ')} às ${hm(r.start_time)} · ${esc(r.event_types?.name || '')}${r.bosses ? ' · ' + esc(r.bosses.name) : ''}${r.rsvp_open_time ? ' · chamada abre ' + hm(r.rsvp_open_time) : ''} · fecha ${r.rsvp_close_offset_min} min antes</div></div>
        ${can('leader') ? `<span class="right row"><button class="btn sm" data-act="rule" data-id="${r.id}" type="button">Editar</button><button class="btn sm danger" data-act="delrule" data-id="${r.id}" type="button">Excluir</button></span>` : ''}</div>`).join('') : empty('Nenhum horário fixo.')}</div>
      <div class="row"><button class="btn" data-act="gen" type="button">Gerar agenda agora</button><button class="btn" data-act="ev" type="button">Evento avulso</button></div>
      <h2 style="margin-top:30px">Próximos eventos</h2>
      <div class="rows" style="margin-top:12px">${evs.length ? evs.map((e) => `<div><div><div class="name">${esc(e.title)} <span class="tag">${esc(e.event_types?.name || '')}</span> ${e.status !== 'scheduled' ? `<span class="tag red">${e.status === 'cancelled' ? 'cancelado' : 'encerrado'}</span>` : ''}</div><div class="sub">${fmtDateTime(e.starts_at)}</div></div>
        <span class="right row">${e.status === 'scheduled' ? `<button class="btn sm" data-act="cancel" data-id="${e.id}" type="button">Cancelar</button>` : `<button class="btn sm" data-act="restore" data-id="${e.id}" type="button">Reativar</button>`}${can('sub') ? `<button class="btn sm danger" data-act="delev" data-id="${e.id}" type="button">Excluir</button>` : ''}</span></div>`).join('') : empty('Nenhum evento.')}</div>`;
    el._rules = rules;
  }

  const wtypes = () => state.types.filter((t) => t.kind === 'war' && t.active);
  function warCard(rules) {
    const ws = wtypes(); if (!ws.length) return '';
    const base = rules.find((r) => ws.some((t) => t.id === r.event_type_id)) || {};
    const defDays = (t) => rules.find((r) => r.event_type_id === t.id)?.weekdays || (t.slug.includes('cidades') ? [7] : [1, 2, 3, 4, 5]);
    if (!can('owner')) return `<h2>Horário das guerras</h2><p class="muted small">Só o GuildMaster altera o horário.</p>`;
    return `<h2>Horário das guerras</h2><p class="muted small">Todas as guerras usam o mesmo horário. Defina uma vez e a agenda, o contador e os avisos seguem daqui.</p>
      <form id="wf" class="plate" style="padding:20px;margin-top:14px"><div class="form-grid">
        <label class="f">Início das guerras<input type="time" name="start" required value="${hm(base.start_time) || '21:00'}"></label>
        <label class="f">Chamada abre às<input type="time" name="open" value="${hm(base.rsvp_open_time) || '12:00'}"></label>
        <label class="f">Chamada fecha quantos min antes<input type="number" name="close" min="0" value="${base.rsvp_close_offset_min ?? 30}"></label></div>
        ${ws.map((t) => `<div class="f" style="margin-top:14px" data-t="${t.id}"><strong>${esc(t.name)}</strong><div class="row" style="gap:10px;flex-wrap:wrap">${DAYS.map((d, i) => `<label class="check"><input type="checkbox" name="wd${t.id}" value="${i + 1}" ${defDays(t).includes(i + 1) ? 'checked' : ''}> ${d}</label>`).join('')}
          <button class="btn sm" type="button" data-pre="1,2,3,4,5" data-for="${t.id}">Seg a Sex</button><button class="btn sm" type="button" data-pre="1,2,3,4" data-for="${t.id}">Seg a Qui</button><button class="btn sm" type="button" data-pre="7" data-for="${t.id}">Domingo</button></div></div>`).join('')}
        <div style="margin-top:16px"><button class="btn primary" type="submit">Salvar horário das guerras</button></div></form>`;
  }
  el.onsubmit = (ev) => {
    const f = ev.target; if (f.id !== 'wf') return; ev.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      try {
        const rules = el._rules || [];
        for (const t of wtypes()) {
          const wd = [...f.querySelectorAll(`[name=wd${t.id}]:checked`)].map((x) => +x.value);
          const old = rules.find((r) => r.event_type_id === t.id);
          if (!wd.length) { if (old) await q(sb.from('schedule_rules').update({ active: false }).eq('id', old.id)); continue; }
          const row = { title: t.name, event_type_id: t.id, weekdays: wd, start_time: f.start.value, rsvp_open_time: f.open.value || null, rsvp_close_offset_min: +f.close.value, lead_days: old?.lead_days ?? 7, active: true };
          if (old) await q(sb.from('schedule_rules').update(row).eq('id', old.id)); else await q(sb.from('schedule_rules').insert(row));
        }
        const ids = rules.filter((r) => wtypes().some((t) => t.id === r.event_type_id)).map((r) => r.id);
        if (ids.length) await q(sb.from('events').delete().in('schedule_rule_id', ids).eq('status', 'scheduled').gt('starts_at', new Date().toISOString()));
        await q(sb.rpc('generate_events_now'));
        toast('Horário salvo e agenda atualizada.', 'ok'); await load();
      } catch (err) { toast(errMsg(err), 'bad'); }
    });
  };
  el.onclick = async (e) => {
    const pre = e.target.closest('[data-pre][data-for]');
    if (pre) { const on = pre.dataset.pre.split(','); el.querySelectorAll(`[name=wd${pre.dataset.for}]`).forEach((c) => { c.checked = on.includes(c.value); }); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, id = b.dataset.id;
    try {
      if (a === 'gen') { await busy(b, () => q(sb.rpc('generate_events_now'))); toast('Agenda gerada.', 'ok'); await load(); }
      else if (a === 'cancel' || a === 'restore') { await q(sb.from('events').update({ status: a === 'cancel' ? 'cancelled' : 'scheduled' }).eq('id', id)); await load(); }
      else if (a === 'delev' && await confirmBox('Excluir este evento e as respostas dele?', 'Excluir')) { await q(sb.from('events').delete().eq('id', id)); await load(); }
      else if (a === 'delrule' && await confirmBox('Excluir este horário fixo? Os eventos já criados continuam.', 'Excluir')) { await q(sb.from('schedule_rules').delete().eq('id', id)); await load(); }
      else if (a === 'rule') ruleForm(el._rules.find((r) => r.id === id));
      else if (a === 'ev') evForm();
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  const typeOpts = (sel) => state.types.filter((t) => t.active).map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const bossOpts = (sel) => '<option value="">Nenhum</option>' + bosses.map((b) => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
  function ruleForm(r) {
    const m = modal(`<h3>${r ? 'Editar' : 'Novo'} horário fixo</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Título<input name="title" required value="${esc(r?.title || '')}" maxlength="80"></label>
      <div class="form-grid"><label class="f">Tipo<select name="type">${typeOpts(r?.event_type_id)}</select></label><label class="f">Boss (opcional)<select name="boss">${bossOpts(r?.boss_id)}</select></label></div>
      <div class="f">Dias da semana<div class="row" style="gap:8px"><button class="btn sm" type="button" data-pre="1,2,3,4,5">Seg a Sex</button><button class="btn sm" type="button" data-pre="1,2,3,4">Seg a Qui</button><button class="btn sm" type="button" data-pre="7">Domingo</button></div><div class="row" style="gap:10px;flex-wrap:wrap">${DAYS.map((d, i) => `<label class="check"><input type="checkbox" name="wd" value="${i + 1}" ${r?.weekdays.includes(i + 1) ? 'checked' : ''}> ${d}</label>`).join('')}</div></div>
      <div class="form-grid"><label class="f">Horário<input type="time" name="start" required value="${hm(r?.start_time)}"></label>
        <label class="f">Chamada abre às<input type="time" name="open" value="${hm(r?.rsvp_open_time)}"></label>
        <label class="f">Fecha quantos min antes<input type="number" name="close" min="0" value="${r?.rsvp_close_offset_min ?? 30}"></label>
        <label class="f">Gerar com quantos dias de antecedência<input type="number" name="lead" min="1" max="30" value="${r?.lead_days ?? 7}"></label></div>
      <label class="check"><input type="checkbox" name="active" ${r?.active !== false ? 'checked' : ''}> Ativo</label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    m.querySelectorAll('[data-pre]').forEach((b) => { b.onclick = () => { const on = b.dataset.pre.split(','); f.querySelectorAll('[name=wd]').forEach((c) => { c.checked = on.includes(c.value); }); }; });
    f.onsubmit = (ev) => { ev.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const wd = [...f.querySelectorAll('[name=wd]:checked')].map((x) => +x.value);
      if (!wd.length) { toast('Escolha ao menos um dia.', 'bad'); return; }
      const row = { title: f.title.value, event_type_id: +f.type.value, boss_id: f.boss.value ? +f.boss.value : null, weekdays: wd, start_time: f.start.value, rsvp_open_time: f.open.value || null, rsvp_close_offset_min: +f.close.value, lead_days: +f.lead.value, active: f.active.checked };
      await q(r ? sb.from('schedule_rules').update(row).eq('id', r.id) : sb.from('schedule_rules').insert(row));
      closeModal(); toast('Horário salvo.', 'ok'); await load(); }); };
  }
  function evForm() {
    const m = modal(`<h3>Evento avulso</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Título<input name="title" required maxlength="80"></label>
      <label class="f">Tipo<select name="type">${typeOpts()}</select></label>
      <label class="f">Início (horário da guild)<input type="datetime-local" name="start" required></label>
      <label class="f">Chamada fecha quantos min antes<input type="number" name="close" min="0" value="30"></label>
      <label class="f">Descrição<textarea name="desc" rows="2"></textarea></label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Criar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    f.onsubmit = (ev) => { ev.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const start = zonedToISO(f.start.value);
      await q(sb.from('events').insert({ title: f.title.value, event_type_id: +f.type.value, starts_at: start, rsvp_opens_at: new Date().toISOString(), rsvp_closes_at: new Date(Date.parse(start) - f.close.value * 60000).toISOString(), description: f.desc.value || null, created_by: state.user.id }));
      closeModal(); toast('Evento criado.', 'ok'); await load(); }); };
  }
  await load();
}
