import { esc } from '../../../lib/util.js';

export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
export function getPath(o, path) {
  return path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
}
export function setPath(o, path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  const t = ks.reduce((a, k) => (a[k] ??= {}), o);
  t[last] = val;
}

/* Campos: todos usam data-p="caminho" e são ligados por um único ouvinte no painel. */
export const fText = (ctx, p, label, { ph = '', hint = '', type = 'text' } = {}) =>
  `<label class="sf">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}<input type="${type}" data-p="${p}" value="${esc(ctx.get(p) ?? '')}" placeholder="${esc(ph)}"></label>`;
export const fArea = (ctx, p, label, { rows = 4, hint = '' } = {}) =>
  `<label class="sf">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}<textarea data-p="${p}" rows="${rows}">${esc(ctx.get(p) ?? '')}</textarea></label>`;
export const fSelect = (ctx, p, label, opts, { hint = '' } = {}) => {
  const cur = String(ctx.get(p) ?? opts[0][0]);
  return `<label class="sf">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}<select data-p="${p}">${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(v) === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
};
export const fCheck = (ctx, p, label, { hint = '' } = {}) =>
  `<label class="sw"><input type="checkbox" data-p="${p}" ${ctx.get(p) !== false && ctx.get(p) ? 'checked' : ''}><i></i><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span></label>`;
export const fRange = (ctx, p, label, { min = 0, max = 100, step = 1, unit = '' } = {}) => {
  const v = ctx.get(p) ?? min;
  return `<label class="sf rg">${esc(label)}<span><input type="range" data-p="${p}" min="${min}" max="${max}" step="${step}" value="${v}"><output data-unit="${unit}">${v}${unit}</output></span></label>`;
};
/** Cor opcional: vazio = padrão da pele. */
export const fColor = (ctx, p, label, fallback = '#888888', { optional = false, hint = '' } = {}) => {
  const raw = ctx.get(p);
  const v = /^#[0-9a-f]{6}$/i.test(raw || '') ? raw : fallback;
  return `<div class="sf col"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><div class="cw"><input type="color" data-p="${p}" value="${esc(v)}">
    <code>${raw ? esc(raw) : 'padrão'}</code>${optional && raw ? `<button class="sbtn mini" type="button" data-clear="${p}">Usar padrão</button>` : ''}</div></div>`;
};
export const fImage = (ctx, p, label, { wide = true, hint = '' } = {}) => {
  const u = ctx.get(p);
  return `<div class="sf img"><span>${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><div class="im ${wide ? 'wide' : ''}">${u ? `<img src="${esc(u)}" alt="">` : '<em>sem imagem</em>'}</div>
    <div class="row"><label class="sbtn mini">Enviar<input type="file" accept="image/*" data-up="${p}" hidden></label>${u ? `<button class="sbtn mini" type="button" data-clear="${p}">Remover</button>` : ''}</div></div>`;
};

/** Arrastar para reordenar. Chama onMove(de, para) com os índices dos filhos [data-row]. */
export function sortable(box, onMove) {
  let from = -1;
  const rows = () => [...box.querySelectorAll(':scope > [data-row]')];
  box.addEventListener('dragstart', (e) => {
    const r = e.target.closest?.('[data-row]'); if (!r || r.parentElement !== box || !e.target.closest('[data-drag]')) { e.preventDefault(); return; }
    from = rows().indexOf(r); r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(from)); } catch { /* ok */ }
  });
  box.addEventListener('dragover', (e) => {
    if (from < 0) return; e.preventDefault();
    const r = e.target.closest('[data-row]'); rows().forEach((x) => x.classList.toggle('over', x === r && x.parentElement === box));
  });
  box.addEventListener('drop', (e) => {
    if (from < 0) return; e.preventDefault();
    const r = e.target.closest('[data-row]'); const to = r ? rows().indexOf(r) : -1;
    const f = from; from = -1; rows().forEach((x) => x.classList.remove('dragging', 'over'));
    if (to >= 0 && to !== f) onMove(f, to);
  });
  box.addEventListener('dragend', () => { from = -1; rows().forEach((x) => x.classList.remove('dragging', 'over')); });
}
export const move = (arr, from, to) => { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); };
export const grip = '<span class="grip" data-drag draggable="true" title="Arraste para reordenar">⠿</span>';
export const uid = () => Math.random().toString(36).slice(2, 8);
