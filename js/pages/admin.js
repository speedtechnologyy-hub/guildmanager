import { esc, $ } from '../lib/util.js?v=20261113h';
import { loadingHTML } from '../lib/ui.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { GROUPS, TABS, tabAllowed, levelOf, lockReadonly } from '../lib/admin-tabs.js?v=20261113h';

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (g) => 'g-' + norm(g).replace(/\W/g, '');
const isMobile = () => matchMedia('(max-width: 860px)').matches;
const badge = (t) => (levelOf(t.id) < 2 ? '<em class="lv">Só ver</em>' : '');

export default async function admin(root, [tab]) {
  const tabs = TABS.filter(tabAllowed);
  const known = TABS.find((t) => t.id === tab);
  const group = GROUPS.find((g) => slug(g) === tab);
  const mobile = isMobile();
  if (!tabs.length) { root.innerHTML = '<div class="wrap"><p class="muted">Você não tem acesso ao painel.</p></div>'; return; }
  const home = !tab || tab === 'home' || !!group;
  const cur = tabs.find((t) => t.id === tab) || (mobile ? null : tabs.find((t) => t.id === 'resumo') || tabs[0]);
  const blocked = known && !tabs.includes(known);

  const cards = (g) => {
    const items = tabs.filter((x) => x.group === g);
    return items.length ? `<section class="hg"><h2>${esc(g)}</h2><div class="hcards">${items.map((x) => `<a class="hcard" href="#/admin/${x.id}"><i>${x.icon}</i><span><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small></span>${badge(x)}</a>`).join('')}</div></section>` : '';
  };
  const bottom = (active) => `<nav class="bnav" aria-label="Áreas do painel"><a href="#/admin/home" class="${active === 'home' ? 'on' : ''}"><i>⌂</i>Início</a>${GROUPS.filter((g) => tabs.some((x) => x.group === g)).map((g) => `<a href="#/admin/${slug(g)}" class="${active === slug(g) ? 'on' : ''}"><i>${tabs.find((x) => x.group === g).icon}</i>${esc(g === 'Comunicação' ? 'Avisos' : g)}</a>`).join('')}</nav>`;

  /* ---------- celular: início em cartões, uma função por vez ---------- */
  if (mobile && home) {
    const gs = group ? [group] : GROUPS;
    root.innerHTML = `<div class="wrap mhome"><div class="page-head"><h1>${group ? esc(group) : 'Painel'}</h1></div>
      ${group ? '' : '<input type="search" id="as" class="side-s" placeholder="Buscar função..." autocomplete="off" aria-label="Buscar função do painel">'}
      <div id="hl">${gs.map(cards).join('')}</div></div>${bottom(group ? slug(group) : 'home')}`;
    const s = $('#as', root);
    if (s) s.oninput = () => {
      const t = norm(s.value.trim());
      const hit = tabs.filter((x) => !t || norm(`${x.name} ${x.group} ${x.desc} ${x.kw}`).includes(t));
      $('#hl', root).innerHTML = hit.length ? `<div class="hcards">${hit.map((x) => `<a class="hcard" href="#/admin/${x.id}"><i>${x.icon}</i><span><strong>${esc(x.name)}</strong><small>${esc(x.group)}</small></span>${badge(x)}</a>`).join('')}</div>` : '<p class="muted small">Nada encontrado.</p>';
    };
    return;
  }

  const ro = cur && levelOf(cur.id) < 2;
  const roBanner = ro ? '<div class="robar">Modo leitura: você pode ver esta área, mas não pode alterar nada.</div>' : '';

  /* ---------- Estúdio: tela toda ---------- */
  if (cur?.id === 'estudio' && !blocked) {
    root.innerHTML = `<div id="ap"></div>${mobile ? bottom(slug(cur.group)) : ''}`;
    const ap = $('#ap', root);
    await (await import('./admin/estudio.js?v=20261113h')).default(ap);
    if (ro) lockReadonly(ap, '.st-nav, .st-tools, .st-top a');
    return;
  }

  const list = (term = '') => {
    const t = norm(term.trim());
    const hit = tabs.filter((x) => !t || norm(`${x.name} ${x.group} ${x.kw}`).includes(t));
    if (!hit.length) return '<p class="muted small" style="padding:8px 14px">Nada encontrado.</p>';
    return GROUPS.map((g) => {
      const items = hit.filter((x) => x.group === g);
      return items.length ? `<small class="gp">${esc(g)}</small>${items.map((x) => `<a href="#/admin/${x.id}" class="${x.id === cur?.id ? 'on' : ''} ${x.id === 'estudio' ? 'hl' : ''}"><i>${x.icon}</i>${esc(x.name)}${badge(x)}</a>`).join('')}` : '';
    }).join('');
  };

  root.innerHTML = mobile
    ? `<div class="mtop"><a href="#/admin/${slug(cur.group)}" aria-label="Voltar">←</a><span><strong>${esc(cur.name)}</strong><small>${esc(cur.group)}</small></span></div>
       <div class="wrap mfn">${roBanner}<div class="panel" id="ap">${blocked ? '<p class="muted">O Master restringiu esta área.</p>' : loadingHTML}</div></div>${bottom(slug(cur.group))}`
    : `<div class="wrap"><div class="page-head"><h1>${esc(state.settings.guild_name)} · Painel</h1></div>
    <div class="admin"><nav class="side"><input type="search" id="as" class="side-s" placeholder="Buscar função..." autocomplete="off" aria-label="Buscar função do painel"><div id="al">${list()}</div></nav>
    <div class="panel-wrap">${roBanner}<div class="panel" id="ap">${blocked ? '<p class="muted">O Master restringiu esta área.</p>' : loadingHTML}</div></div></div></div>`;
  const s = $('#as', root);
  if (s) {
    s.oninput = () => { $('#al', root).innerHTML = list(s.value); };
    s.onkeydown = (e) => { if (e.key === 'Enter') { const a = $('#al a', root); if (a) location.hash = a.getAttribute('href'); } };
  }
  if (blocked) return;
  const ap = $('#ap', root);
  if (ro) lockReadonly(ap);
  const mod = await import(`./admin/${cur.id}.js?v=20261113h`);
  return mod.default(ap);
}
