import { esc, $ } from '../lib/util.js';
import { loadingHTML } from '../lib/ui.js';
import { state } from '../store.js';
import { GROUPS, TABS, tabAllowed } from '../lib/admin-tabs.js';

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default async function admin(root, [tab]) {
  const tabs = TABS.filter(tabAllowed);
  const known = TABS.find((t) => t.id === tab);
  const cur = tabs.find((t) => t.id === tab) || tabs.find((t) => t.id === 'resumo') || tabs[0];
  if (!cur) { root.innerHTML = '<div class="wrap"><p class="muted">Você não tem acesso ao painel.</p></div>'; return; }
  // a função existe mas o master bloqueou para este cargo
  const blocked = known && !tabs.includes(known);

  // o Estúdio ocupa a tela toda (edição à esquerda, prévia ao vivo à direita)
  if (cur.id === 'estudio' && !blocked) {
    root.innerHTML = '<div id="ap"></div>';
    return (await import('./admin/estudio.js')).default($('#ap', root));
  }

  const list = (term = '') => {
    const t = norm(term.trim());
    const hit = tabs.filter((x) => !t || norm(`${x.name} ${x.group} ${x.kw}`).includes(t));
    if (!hit.length) return '<p class="muted small" style="padding:8px 14px">Nada encontrado.</p>';
    return GROUPS.map((g) => {
      const items = hit.filter((x) => x.group === g);
      return items.length ? `<small class="gp">${esc(g)}</small>${items.map((x) => `<a href="#/admin/${x.id}" class="${x.id === cur.id ? 'on' : ''} ${x.id === 'estudio' ? 'hl' : ''}"><i>${x.icon}</i>${esc(x.name)}</a>`).join('')}` : '';
    }).join('');
  };

  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>${esc(state.settings.guild_name)} · Painel</h1></div>
    <div class="admin"><nav class="side"><input type="search" id="as" class="side-s" placeholder="Buscar função..." autocomplete="off" aria-label="Buscar função do painel"><div id="al">${list()}</div></nav>
    <div class="panel" id="ap">${blocked ? '<p class="muted">O GuildMaster restringiu esta área.</p>' : loadingHTML}</div></div></div>`;
  const s = $('#as', root);
  s.oninput = () => { $('#al', root).innerHTML = list(s.value); };
  s.onkeydown = (e) => { if (e.key === 'Enter') { const a = $('#al a', root); if (a) location.hash = a.getAttribute('href'); } };
  if (blocked) return;
  const mod = await import(`./admin/${cur.id}.js`);
  return mod.default($('#ap', root));
}
