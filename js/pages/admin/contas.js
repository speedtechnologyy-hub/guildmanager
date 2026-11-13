import { sb, q } from '../../supabase.js?v=20261113h';
import { state } from '../../store.js?v=20261113h';
import { esc, can, fmtDate, roleLabel, ROLE_LABEL, initial, mainChar } from '../../lib/util.js?v=20261113h';
import { toast, modal, closeModal, confirmBox, errMsg, empty } from '../../lib/ui.js?v=20261113h';
import { GRANTABLE, LEVELS, canEdit, globalLevel, levelName } from '../../lib/admin-tabs.js?v=20261113h';
import { savePerm } from './estudio/extra.js?v=20261113h';

const STATUS = { pending: ['Aguardando', 'warn'], active: ['Ativo', 'ok'], inactive: ['Inativo', ''], banned: ['Bloqueado', 'bad'] };
const FILTERS = [['all', 'Todos'], ['pending', 'Aguardando'], ['active', 'Ativos'], ['blocked', 'Bloqueados']];
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default async function contas(el) {
  let people = [], priv = {}, perms = {};
  const ui = { f: 'all', term: '' };
  const edit = () => canEdit('contas');

  async function load() {
    people = await q(sb.from('profiles').select('id,display_name,role,sub_slot,status,joined_at,created_at,characters(nick,is_main,class_code)').order('display_name'));
    const [p, a] = await Promise.all([
      q(sb.from('profile_private').select('id,whatsapp')).catch(() => []),
      can('master') ? q(sb.from('admin_perms').select('user_id,perms')).catch(() => []) : [],
    ]);
    priv = Object.fromEntries(p.map((r) => [r.id, r.whatsapp]));
    perms = Object.fromEntries(a.map((r) => [r.user_id, r.perms || {}]));
    draw();
  }

  const nick = (p) => mainChar(p.characters)?.nick || p.display_name;
  const protectedRow = (p) => ['master', 'owner'].includes(p.role) && !can('owner');
  const staff = (p) => ['leader', 'sub', 'mod'].includes(p.role);

  function draw() {
    const t = norm(ui.term.trim());
    const list = people.filter((p) => (ui.f === 'all' || (ui.f === 'blocked' ? ['banned', 'inactive'].includes(p.status) : p.status === ui.f))
      && (!t || norm(`${p.display_name} ${nick(p)} ${priv[p.id] || ''}`).includes(t)));
    const n = (k) => people.filter((p) => (k === 'all' ? true : k === 'blocked' ? ['banned', 'inactive'].includes(p.status) : p.status === k)).length;
    el.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Contas cadastradas</h2><span class="muted small">${people.length} no total</span></div>
      <p class="muted small">Todas as pessoas que já se cadastraram. Aprove, bloqueie, mude o cargo, edite os acessos ou remova o cadastro.</p>
      <div class="filters" style="margin-top:14px"><input type="search" id="ct" placeholder="Buscar por nome, nick ou WhatsApp" value="${esc(ui.term)}" style="flex:1;min-width:220px">
        ${FILTERS.map(([k, v]) => `<button class="btn sm ${ui.f === k ? 'primary' : ''}" data-f="${k}" type="button">${v} (${n(k)})</button>`).join('')}</div>
      <div class="rows" style="margin-top:14px">${list.length ? list.map(row).join('') : empty('Nenhuma conta nesse filtro.')}</div>`;
    const s = el.querySelector('#ct');
    s.oninput = () => { ui.term = s.value; const pos = s.selectionStart; draw(); const n2 = el.querySelector('#ct'); n2.focus(); n2.setSelectionRange(pos, pos); };
  }

  function row(p) {
    const [sl, sc] = STATUS[p.status] || [p.status, ''];
    const me = p.id === state.user.id, lock = protectedRow(p) || me || !edit();
    const acts = [];
    if (!lock) {
      if (p.status === 'pending') acts.push(`<button class="btn sm primary" data-act="ok" data-id="${p.id}" type="button">Aprovar</button>`);
      if (p.status === 'active') acts.push(`<button class="btn sm" data-act="block" data-id="${p.id}" type="button">Bloquear</button>`);
      if (['banned', 'inactive'].includes(p.status)) acts.push(`<button class="btn sm" data-act="ok" data-id="${p.id}" type="button">Desbloquear</button>`);
      acts.push(`<button class="btn sm" data-act="role" data-id="${p.id}" type="button">Cargo</button>`);
      if (can('master') && !['master', 'owner'].includes(p.role)) acts.push(`<button class="btn sm" data-act="access" data-id="${p.id}" type="button">Acessos</button>`);
      if (can('master')) acts.push(`<button class="btn sm danger" data-act="del" data-id="${p.id}" type="button">Remover</button>`);
    }
    return `<div><div style="display:flex;gap:12px;align-items:center;min-width:0"><span class="av" style="flex:none">${esc(initial(nick(p)))}</span>
      <div style="min-width:0"><div class="name">${esc(nick(p))} <span class="tag ${sc === 'ok' ? '' : 'red'}">${sl}</span> <span class="tag">${esc(roleLabel(p.role, p.sub_slot))}</span></div>
      <div class="sub">${p.display_name !== nick(p) ? esc(p.display_name) + ' · ' : ''}${esc(priv[p.id] || 'sem WhatsApp')} · desde ${fmtDate(p.joined_at || p.created_at)}</div></div></div>
      <span class="right row" style="flex-wrap:wrap;gap:6px">${acts.join('')}</span></div>`;
  }

  const setStatus = async (id, status, msg) => { await q(sb.from('profiles').update({ status }).eq('id', id)); toast(msg, 'ok'); await load(); };

  el.onclick = async (e) => {
    const f = e.target.closest('[data-f]'); if (f) { ui.f = f.dataset.f; return draw(); }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const p = people.find((x) => x.id === b.dataset.id); if (!p) return;
    try {
      if (b.dataset.act === 'ok') await setStatus(p.id, 'active', p.status === 'pending' ? 'Cadastro aprovado.' : 'Acesso liberado.');
      else if (b.dataset.act === 'block' && await confirmBox(`Bloquear ${nick(p)}? Ele perde o acesso à plataforma.`, 'Bloquear')) await setStatus(p.id, 'banned', 'Conta bloqueada.');
      else if (b.dataset.act === 'del' && await confirmBox(`Remover o cadastro de ${nick(p)}? Os personagens e a presença dessa pessoa também saem. Não dá para desfazer.`, 'Remover')) { await q(sb.from('profiles').delete().eq('id', p.id)); toast('Cadastro removido.', 'ok'); await load(); }
      else if (b.dataset.act === 'role') roleModal(p);
      else if (b.dataset.act === 'access') accessModal(p);
    } catch (err) { toast(errMsg(err), 'bad'); }
  };

  function roleModal(p) {
    const opts = can('owner') ? ['member', 'leader', 'master'] : ['member', 'leader'];
    const cur = ['sub', 'mod'].includes(p.role) ? 'leader' : p.role;
    const m = modal(`<h3>Cargo de ${esc(nick(p))}</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Cargo<select name="role">${opts.map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${ROLE_LABEL[k]}</option>`).join('')}</select></label>
      <label class="f" id="slotf">Vaga de sub líder<select name="slot"><option value="">Sem número</option>${[1, 2, 3].map((k) => `<option value="${k}" ${p.sub_slot === k ? 'selected' : ''}>Sub Líder ${'I'.repeat(k)}</option>`).join('')}</select></label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`);
    const f = m.querySelector('#f'), sync = () => { m.querySelector('#slotf').style.display = f.role.value === 'leader' ? '' : 'none'; };
    f.role.onchange = sync; sync();
    m.querySelector('[data-x]').onclick = closeModal;
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        const role = f.role.value;
        await q(sb.from('profiles').update({ role, sub_slot: role === 'leader' && f.slot.value ? +f.slot.value : null }).eq('id', p.id));
        closeModal(); toast('Cargo atualizado.', 'ok'); await load();
      } catch (err) { toast(errMsg(err), 'bad'); }
    };
  }

  function accessModal(p) {
    const mine = perms[p.id] || {};
    const m = modal(`<h3>Acessos de ${esc(nick(p))}</h3><p class="muted small">Define o que esta pessoa pode ver e editar no painel. "Regra geral" segue o que está em Estúdio → Equipe. Salva na hora.</p>
      <div class="stack" style="margin-top:12px">${GRANTABLE.map((t) => `<label class="f" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>${esc(t.name)}</span>
        <select data-tab="${t.id}" style="width:auto;min-width:160px"><option value="">Regra geral (${LEVELS.find(([k]) => k === levelName(globalLevel(t.id)))[1]})</option>${LEVELS.map(([k, v]) => `<option value="${k}" ${mine[t.id] === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" type="button" data-x>Fechar</button></div>`);
    m.querySelector('[data-x]').onclick = closeModal;
    m.onchange = async (ev) => {
      const s = ev.target.closest('select[data-tab]'); if (!s) return;
      try { await savePerm(p.id, s.dataset.tab, s.value); perms[p.id] = { ...(perms[p.id] || {}), [s.dataset.tab]: s.value || undefined }; toast('Acesso atualizado.', 'ok'); } catch (err) { toast(errMsg(err), 'bad'); }
    };
  }

  await load();
}
