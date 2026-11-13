import { sb, q } from '../supabase.js';
import { esc, md } from '../lib/util.js';
import { empty } from '../lib/ui.js';
import { renderBlocks } from '../lib/blocks.js';

export default async function page(root, [slug]) {
  const rows = await q(sb.from('cms_pages').select('*').eq('slug', slug).eq('published', true).limit(1));
  const p = rows[0];
  if (!p) { root.innerHTML = `<div class="wrap">${empty('Página não encontrada.')}</div>`; return; }
  const bg = /^https:\/\//.test(p.bg_url || '') ? `<div class="page-bg" style="background-image:url('${esc(encodeURI(p.bg_url))}')"></div>` : '';
  const blocks = Array.isArray(p.blocks) ? p.blocks : [];
  root.innerHTML = `${bg}<div class="wrap">${p.hero_title !== false ? `<div class="page-head"><h1>${esc(p.title)}</h1></div>` : '<div style="height:24px"></div>'}
    ${blocks.length ? `<div class="blks">${renderBlocks(blocks)}</div>` : ''}
    ${p.body_md ? `<div class="md" style="margin-top:20px">${md(p.body_md)}</div>` : ''}</div>`;
}
