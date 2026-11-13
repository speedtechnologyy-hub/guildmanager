import { esc } from '../../../lib/util.js?v=20261113h';
import { BLOCK_TYPES } from '../../../lib/blocks.js?v=20261113h';
import { fText, fArea, fSelect, fImage, fRange, grip, uid } from './kit.js?v=20261113h';

const ROLE_OPTS = [['member', 'Todos'], ['leader', 'Sub Líderes'], ['master', 'Master'], ['owner', 'Só Admin']];

function field(ctx, base, [key, kind, label, opts]) {
  const p = `${base}.${key}`;
  if (kind === 'area') return fArea(ctx, p, label, { rows: 3 });
  if (kind === 'select') return fSelect(ctx, p, label, opts);
  if (kind === 'image') return fImage(ctx, p, label, { wide: true });
  if (kind === 'range') return fRange(ctx, p, label, { max: 90, unit: '%' });
  return fText(ctx, p, label);
}

/** Campos de um bloco (e da lista interna, se tiver, como botões e cartões). */
export function blockFields(ctx, b, base) {
  const t = BLOCK_TYPES[b.type];
  if (!t) return '';
  let h = t.fields.map((f) => field(ctx, base, f)).join('');
  if (t.list) {
    const items = b[t.list] || [];
    h += `<div class="sub-items"><strong>${b.type === 'cards' ? 'Cartões' : 'Botões'}</strong>${items.map((it, i) => `<div class="sub-item"><div class="sub-h"><span>${i + 1}</span><button class="sbtn mini danger" type="button" data-rm-item="${base}.${t.list}" data-i="${i}">Remover</button></div>${t.item.map((f) => field(ctx, `${base}.${t.list}.${i}`, f)).join('')}</div>`).join('')}
      <button class="sbtn mini" type="button" data-add-item="${base}.${t.list}" data-bt="${b.type}">Adicionar ${b.type === 'cards' ? 'cartão' : 'botão'}</button></div>`;
  }
  return h;
}

/**
 * Lista de blocos editáveis no caminho `path` (um array dentro do rascunho).
 * `lockedIds` mostra itens nativos (seções do lobby) sem campos, só com ligar/desligar e cargo.
 */
export function blockList(ctx, path, { nativeLabels = {}, allowAdd = true } = {}) {
  const list = ctx.get(path) || [];
  const rows = list.map((b, i) => {
    const base = `${path}.${i}`;
    const native = !b.custom && nativeLabels[b.id];
    const name = native || BLOCK_TYPES[b.type]?.label || 'Bloco';
    return `<div class="brow ${b.on === false ? 'off' : ''}" data-row>
      <div class="bh">${grip}<label class="sw sm"><input type="checkbox" data-p="${base}.on" ${b.on !== false ? 'checked' : ''}><i></i></label>
        <strong>${esc(name)}</strong>${b.custom ? `<em>${esc(b.title || b.text || b.md || '').slice(0, 28)}</em>` : ''}
        <span class="sp"></span>
        <select class="mini" data-p="${base}.min_role" title="Quem vê">${ROLE_OPTS.map(([v, n]) => `<option value="${v}" ${(b.min_role || 'member') === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="sbtn mini" type="button" data-mv="${path}" data-i="${i}" data-d="-1" aria-label="Subir">↑</button>
        <button class="sbtn mini" type="button" data-mv="${path}" data-i="${i}" data-d="1" aria-label="Descer">↓</button>
        ${b.custom ? `<button class="sbtn mini danger" type="button" data-rm-block="${path}" data-i="${i}" aria-label="Excluir">×</button>` : ''}</div>
      ${b.custom ? `<details class="bd"><summary>Editar conteúdo</summary><div class="stack">${blockFields(ctx, b, base)}</div></details>` : ''}</div>`;
  }).join('');
  return `<div class="blist" data-list="${path}">${rows || '<p class="muted small">Nenhum bloco ainda.</p>'}</div>
    ${allowAdd ? `<div class="addrow"><select data-newtype="${path}">${Object.entries(BLOCK_TYPES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select><button class="sbtn" type="button" data-add-block="${path}">Adicionar bloco</button></div>` : ''}`;
}

export function newBlock(type) {
  return { id: 'b' + uid(), custom: true, on: true, min_role: 'member', type, ...BLOCK_TYPES[type].make() };
}
export function newItem(type) {
  return type === 'cards' ? { title: 'Cartão', text: '' } : { label: 'Botão', url: '/', style: 'normal' };
}
