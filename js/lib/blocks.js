import { esc, md, can } from './util.js';

/** Aceita só endereços seguros: interno (/ ou #), https, mailto. */
export function safeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (s.startsWith('#') || s.startsWith('/')) return s.startsWith('/') && !s.startsWith('//') ? '#' + s : s;
  if (/^https:\/\//i.test(s) || /^mailto:/i.test(s)) return s;
  return '';
}
const external = (u) => /^(https?:|mailto:)/i.test(u);
const link = (u) => { const h = safeUrl(u); return h ? `href="${esc(h)}"${external(h) ? ' target="_blank" rel="noopener noreferrer"' : ''}` : ''; };
const imgUrl = (u) => { const s = String(u || '').trim(); return /^https:\/\//i.test(s) || /^assets\//.test(s) ? s : ''; };
const pick = (v, list, d) => (list.includes(v) ? v : d);

function youtube(u) {
  const m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
}
const BTN = { primary: 'btn primary', normal: 'btn', ghost: 'btn sm' };
const btn = (b) => `<a class="${BTN[b.style] || 'btn'}" ${link(b.url)}>${esc(b.label || 'Botão')}</a>`;

/** Tipos de bloco e seus campos (usado também pelo editor do Estúdio). */
export const BLOCK_TYPES = {
  heading: { label: 'Título', fields: [['text', 'text', 'Texto'], ['size', 'select', 'Tamanho', [['h1', 'Grande'], ['h2', 'Médio'], ['h3', 'Pequeno']]], ['align', 'select', 'Alinhamento', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]]], make: () => ({ text: 'Novo título', size: 'h2', align: 'left' }) },
  text: { label: 'Texto', fields: [['md', 'area', 'Texto (# título, **negrito**, listas com -)'], ['align', 'select', 'Alinhamento', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]]], make: () => ({ md: 'Escreva aqui.', align: 'left' }) },
  image: { label: 'Imagem', fields: [['url', 'image', 'Imagem'], ['alt', 'text', 'Descrição da imagem'], ['link', 'text', 'Link ao clicar (opcional)'], ['size', 'select', 'Largura', [['full', 'Total'], ['wide', 'Média'], ['small', 'Pequena']]], ['align', 'select', 'Posição', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]]], make: () => ({ url: '', alt: '', size: 'full', align: 'center' }) },
  banner: { label: 'Banner com imagem', fields: [['bg', 'image', 'Imagem de fundo'], ['title', 'text', 'Título'], ['text', 'area', 'Texto'], ['button', 'text', 'Texto do botão (opcional)'], ['url', 'text', 'Link do botão'], ['height', 'select', 'Altura', [['sm', 'Baixa'], ['md', 'Média'], ['lg', 'Alta']]], ['dim', 'range', 'Escurecer imagem (%)']], make: () => ({ title: 'Título do banner', text: '', height: 'md', dim: 40 }) },
  buttons: { label: 'Botões', list: 'items', item: [['label', 'text', 'Texto'], ['url', 'text', 'Link (/guerras, /p/regras ou https://...)'], ['style', 'select', 'Estilo', [['primary', 'Destaque'], ['normal', 'Normal'], ['ghost', 'Pequeno']]]], fields: [['align', 'select', 'Alinhamento', [['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]]], make: () => ({ align: 'left', items: [{ label: 'Saiba mais', url: '/', style: 'primary' }] }) },
  cards: { label: 'Cartões', list: 'items', item: [['title', 'text', 'Título'], ['text', 'area', 'Texto'], ['image', 'image', 'Imagem'], ['url', 'text', 'Link (opcional)']], fields: [['cols', 'select', 'Colunas', [['2', '2'], ['3', '3'], ['4', '4']]]], make: () => ({ cols: '3', items: [{ title: 'Cartão', text: 'Descrição curta.' }] }) },
  video: { label: 'Vídeo do YouTube', fields: [['url', 'text', 'Link do vídeo']], make: () => ({ url: '' }) },
  divider: { label: 'Linha divisória', fields: [], make: () => ({}) },
  spacer: { label: 'Espaço', fields: [['size', 'select', 'Tamanho', [['sm', 'Pequeno'], ['md', 'Médio'], ['lg', 'Grande']]]], make: () => ({ size: 'md' }) },
};

/** Desenha um bloco. Cada valor é escapado; nada de HTML solto vindo do painel. */
export function renderBlock(b) {
  const d = b.data || b;
  const al = `al-${pick(d.align, ['left', 'center', 'right'], 'left')}`;
  switch (b.type) {
    case 'heading': { const s = pick(d.size, ['h1', 'h2', 'h3'], 'h2'); return `<div class="blk heading ${al}"><${s}>${esc(d.text)}</${s}></div>`; }
    case 'text': return `<div class="blk text md ${al}">${md(d.md || '')}</div>`;
    case 'image': { const u = imgUrl(d.url); if (!u) return ''; const i = `<img src="${esc(u)}" alt="${esc(d.alt)}" loading="lazy">`; return `<div class="blk image sz-${pick(d.size, ['full', 'wide', 'small'], 'full')} ${al}">${link(d.link) ? `<a ${link(d.link)}>${i}</a>` : i}</div>`; }
    case 'banner': { const u = imgUrl(d.bg); return `<div class="blk banner h-${pick(d.height, ['sm', 'md', 'lg'], 'md')}" style="--o:${Math.min(100, Math.max(0, +d.dim || 0)) / 100}">${u ? `<div class="bg" style="background-image:url('${esc(encodeURI(u))}')"></div>` : ''}<div><h2>${esc(d.title)}</h2>${d.text ? `<p>${esc(d.text)}</p>` : ''}${d.button && link(d.url) ? `<a class="btn primary" ${link(d.url)}>${esc(d.button)}</a>` : ''}</div></div>`; }
    case 'buttons': return `<div class="blk buttons ${al}"><div class="row">${(d.items || []).filter((x) => x.label).map(btn).join('')}</div></div>`;
    case 'cards': return `<div class="blk cards"><div class="grid" style="--cols:${pick(String(d.cols), ['2', '3', '4'], '3')}">${(d.items || []).map((c) => { const u = imgUrl(c.image); const inner = `${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : ''}<div><h3>${esc(c.title)}</h3>${c.text ? `<p>${esc(c.text)}</p>` : ''}</div>`; return link(c.url) ? `<a class="card" ${link(c.url)}>${inner}</a>` : `<div class="card">${inner}</div>`; }).join('')}</div></div>`;
    case 'video': { const u = youtube(d.url); return u ? `<div class="blk video"><div class="frame"><iframe src="${esc(u)}" title="Vídeo" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div>` : ''; }
    case 'divider': return '<div class="blk divider"></div>';
    case 'spacer': return `<div class="blk spacer s-${pick(d.size, ['sm', 'md', 'lg'], 'md')}"></div>`;
    default: return '';
  }
}

/** Lista de blocos: respeita "ligado" e o cargo mínimo de cada um. */
export function renderBlocks(list = []) {
  return list.filter((b) => b.on !== false && can(b.min_role || 'member')).map(renderBlock).join('');
}
