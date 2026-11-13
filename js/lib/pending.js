import { sb, q } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, can, fmtDateTime } from './util.js?v=20261113h';
import { toast, modal, closeModal, errMsg } from './ui.js?v=20261113h';
import { levelOf } from './admin-tabs.js?v=20261113h';

/** Quem vê o aviso: Admin, Master e sub líderes com acesso de edição em "Membros". */
export const canApprove = () => state.profile?.status === 'active' && can('leader') && levelOf('membros') >= 2;

const BASE_TITLE = document.title.replace(/^\(\d+\)\s*/, '');
let timer = 0, list = [], seen = -1;

/** Atualiza bolinha do menu, faixa no topo e título da aba. */
export function paintPending() {
  const n = list.length;
  state.pendingCount = n;
  document.title = (n ? `(${n}) ` : '') + BASE_TITLE;
  document.querySelectorAll('.nav a[data-path="/admin"]').forEach((a) => {
    a.querySelector('.nbadge')?.remove();
    if (n) a.insertAdjacentHTML('beforeend', `<span class="nbadge" aria-label="${n} cadastros aguardando">${n}</span>`);
  });
  const bar = document.getElementById('pendBar');
  if (bar) {
    bar.hidden = !n;
    bar.innerHTML = n ? `<button type="button" class="pbtn"><span class="pdot"></span><b>${n} ${n === 1 ? 'novo cadastro aguardando' : 'novos cadastros aguardando'} aprovação</b><span class="pgo">Ver e aprovar</span></button>` : '';
    const b = bar.querySelector('.pbtn'); if (b) b.onclick = openPending;
  }
  document.querySelectorAll('[data-pc]').forEach((el) => { el.textContent = n || ''; el.hidden = !n; });
}

export async function refreshPending(quiet = false) {
  if (!canApprove()) { list = []; paintPending(); return; }
  try {
    list = await q(sb.from('profiles').select('id,display_name,created_at').eq('status', 'pending').order('created_at'));
  } catch { return; }
  if (!quiet && seen >= 0 && list.length > seen) toast('Novo cadastro aguardando aprovação.', 'ok');
  seen = list.length;
  paintPending();
}

export function startPending() {
  if (timer) return;
  seen = -1;
  refreshPending();
  timer = setInterval(() => { if (!document.hidden) refreshPending(); }, 30000);
  document.addEventListener('visibilitychange', onVis);
}
export function stopPending() {
  clearInterval(timer); timer = 0; list = []; seen = -1;
  document.removeEventListener('visibilitychange', onVis);
  paintPending();
}
const onVis = () => { if (!document.hidden) refreshPending(true); };

/** Janela rápida: aprova ou recusa sem sair da tela atual. */
export async function openPending() {
  await refreshPending(true);
  const draw = async () => {
    const root = document.querySelector('#modal-root .pq');
    if (!root) return;
    if (!list.length) { closeModal(); return; }
    const wa = Object.fromEntries((await q(sb.from('profile_private').select('id,whatsapp').in('id', list.map((w) => w.id))).catch(() => [])).map((r) => [r.id, r.whatsapp]));
    root.innerHTML = list.map((w) => `<div><div><div class="name">${esc(w.display_name)}</div><div class="sub">WhatsApp ${esc(wa[w.id] || 'não informado')} · pediu em ${w.created_at ? fmtDateTime(w.created_at) : ''}</div></div>
      <span class="right row"><button class="btn sm primary" data-ok="${w.id}" type="button">Aprovar</button><button class="btn sm danger" data-no="${w.id}" type="button">Recusar</button></span></div>`).join('');
  };
  if (!list.length) { toast('Nenhum cadastro aguardando.', 'ok'); return; }
  const m = modal(`<h3>Cadastros aguardando aprovação</h3><p class="muted small">Só liberam o acesso depois que você aprovar.</p><div class="rows pq" style="margin-top:14px"></div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><a class="btn" href="#/admin/convites" data-go>Abrir no painel</a></div>`, { wide: true });
  await draw();
  m.addEventListener('click', async (e) => {
    if (e.target.closest('[data-go]')) { closeModal(); return; }
    const t = e.target.closest('button[data-ok],button[data-no]'); if (!t) return;
    const id = t.dataset.ok || t.dataset.no;
    try {
      if (t.dataset.ok) { await q(sb.from('profiles').update({ status: 'active' }).eq('id', id)); toast('Cadastro aprovado. A pessoa já pode entrar.', 'ok'); }
      else { await q(sb.from('profiles').update({ status: 'inactive' }).eq('id', id)); toast('Cadastro recusado.', 'ok'); }
      await refreshPending(true); await draw();
      document.dispatchEvent(new CustomEvent('pending-changed'));
    } catch (err) { toast(errMsg(err), 'bad'); }
  });
}
