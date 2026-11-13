import { sb, q } from '../supabase.js';
import { esc, md } from '../lib/util.js';
import { empty } from '../lib/ui.js';

export default async function page(root, [slug]) {
  const rows = await q(sb.from('cms_pages').select('*').eq('slug', slug).eq('published', true).limit(1));
  const p = rows[0];
  root.innerHTML = p ? `<div class="wrap"><div class="page-head"><h1>${esc(p.title)}</h1></div><div class="md">${md(p.body_md || '')}</div></div>` : `<div class="wrap">${empty('Página não encontrada.')}</div>`;
}
