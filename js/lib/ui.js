import { esc, $ } from './util.js';

/** Traduz erros técnicos do Supabase para mensagens que o membro entende. */
export function errMsg(e) {
  const m = String(e?.message || e || '');
  if (e?.code === '23505' || /duplicate key/i.test(m)) return 'Esse registro já existe (nick, nome ou código repetido).';
  if (/row-level security|permission denied|42501/i.test(m) || e?.code === '42501') return /sem permiss|só o dono/i.test(m) ? m : 'Você não tem permissão para fazer isso.';
  if (/violates check constraint/i.test(m)) return 'Algum campo está com valor inválido. Confira e tente de novo.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Confira sua internet.';
  return m || 'Algo deu errado. Tente novamente.';
}

export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), type === 'bad' ? 6500 : 3500);
}

let closeCb = null;
export function closeModal() {
  $('#modal-root').innerHTML = '';
  document.removeEventListener('keydown', onKey);
  const cb = closeCb; closeCb = null;
  cb?.();
}
function onKey(e) { if (e.key === 'Escape') closeModal(); }

/** Abre um modal. Devolve o elemento .modal. */
export function modal(html, { wide = false, onClose } = {}) {
  closeCb = null;
  $('#modal-root').innerHTML = `<div class="overlay"><div class="plate modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="x" aria-label="Fechar" type="button">×</button>${html}</div></div>`;
  closeCb = onClose || null;
  const ov = $('#modal-root .overlay');
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(); });
  $('#modal-root .x').onclick = closeModal;
  document.addEventListener('keydown', onKey);
  const m = $('#modal-root .modal');
  m.querySelector('input,select,textarea,button:not(.x)')?.focus();
  return m;
}

export function confirmBox(message, okLabel = 'Confirmar', danger = true) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(`<h3>${esc(message)}</h3>
      <div class="row" style="margin-top:22px;justify-content:flex-end">
        <button class="btn" data-n type="button">Cancelar</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-y type="button">${esc(okLabel)}</button>
      </div>`, { onClose: () => { if (!done) resolve(false); } });
    m.querySelector('[data-y]').onclick = () => { done = true; closeModal(); resolve(true); };
    m.querySelector('[data-n]').onclick = () => closeModal();
  });
}

/** Desativa o botão e mostra um spinner enquanto a ação roda; erros viram toast. */
export async function busy(btn, action) {
  if (btn?.disabled) return;
  if (btn) { btn.disabled = true; btn.classList.add('spin'); }
  try { return await action(); } catch (e) {
    console.error(e);
    toast(errMsg(e), 'bad');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('spin'); }
  }
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
export const loadingHTML = '<div class="loading"><i></i></div>';
export const empty = (msg) => `<div class="empty">${esc(msg)}</div>`;
export const plate = (inner, cls = '') => `<section class="plate lit ${cls}"><span class="sheen"></span>${inner}</section>`;
export const orn = '<div class="orn" aria-hidden="true"><i></i></div>';
export const pageHead = (title, sub = '') => `<div class="wrap"><div class="page-head"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div>`;
