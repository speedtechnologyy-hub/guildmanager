import { sb } from './supabase.js?v=20261113h';
import { state } from './store.js?v=20261113h';
import { mountPlayer, unmountPlayer } from './lib/player.js?v=20261113h';
import { esc, can, clsRgb, initial, mainChar } from './lib/util.js?v=20261113h';
import { logoUrl } from './theme.js?v=20261113h';
import { featureAllowed, pathFeature } from './lib/features.js?v=20261113h';
import { safeUrl } from './lib/blocks.js?v=20261113h';
import { startPending, stopPending, paintPending, canApprove } from './lib/pending.js?v=20261113h';

/** Cenário do herói: banner enviado pelo admin ou o cenário gerado (castelo ao entardecer). */
export function sceneHTML(kind = 'hero') {
  const banner = kind === 'login' ? (state.settings.login_bg_url || state.settings.banner_url) : state.settings.banner_url;
  const wins = [[979, 232], [1012, 190], [1041, 166], [1075, 232], [1118, 148], [1150, 210], [1166, 232], [840, 262], [870, 250]]
    .map(([x, y]) => `<rect class="win" x="${x}" y="${y}" width="4" height="7"/>`).join('');
  const svg = (cls, body) => `<svg class="layer ${cls}" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">${body}</svg>`;
  const sword = (deg) => `<g transform="rotate(${deg} 200 200)"><path d="M200 10 L209 56 L207 252 L193 252 L191 56Z"/><path d="M200 26 V248" class="fuller"/><path d="M146 252 H254 V264 H146Z"/><path d="M194 264 H206 V322 H194Z"/><circle cx="200" cy="334" r="11"/></g>`;
  const emblem = `<svg class="emblem" viewBox="0 0 400 400"><path class="shield" d="M112 84 Q200 52 288 84 V204 Q288 296 200 352 Q112 296 112 204Z"/>${sword(-38)}${sword(38)}</svg>`;
  const generated = `<div class="sun"></div>
    ${svg('l1', '<path fill="#0f1d45" d="M0 400V250L110 196 200 238 330 150 450 226 550 176 690 252 800 168 930 242 1040 196 1170 250 1290 176 1380 222 1440 198V400Z"/>')}
    ${svg('l2', `<path fill="#08112b" d="M0 400V312L120 276 230 312 360 258 480 302 600 270 720 312 840 284 940 312H958V240h14v-26l11-16 11 16v26h14v-60h12v-26l12-18 12 18v26h12v60h18v-30h10v30h22v-90h14v-30l14-20 14 20v30h14v90h26v-34h12v34h20L1190 312 1300 288 1440 312V400Z"/>${wins}`)}
    ${svg('l3', '<path fill="#03060f" d="M0 400V340L70 322 150 344 260 316 380 350 500 326 640 354 780 330 900 356 1040 334 1180 356 1320 326 1440 346V400Z"/><path fill="#03060f" d="M96 330V262l10-6v-34l5 8 5-8v34l10 6v68zM1230 340V270l10-6v-30l5 8 5-8v30l10 6v70z"/>')}
    ${emblem}`;
  return `<div class="scene ${kind}" aria-hidden="true">${banner ? `<div class="banner" style="background-image:url('${esc(encodeURI(banner))}')"></div>` : generated}<div class="fog"></div><div class="fog b"></div></div>`;
}

const hashPath = () => (location.hash.slice(1) || '/').split('?')[0];
let shellKind = '';
export const shellMode = () => shellKind;

/** Menu final: itens do master + páginas marcadas "no menu" + atalhos automáticos. */
function menuItems() {
  const s = state.settings;
  const items = (s.menu || []).filter((i) => i.enabled !== false && can(i.min_role || 'member') && !['/bosses', '/agenda'].includes(i.path))
    .filter((i) => { const f = i.path && pathFeature(i.path); return !f || featureAllowed(f); });
  for (const p of state.pages) {
    if (!p.show_in_menu || items.some((i) => i.path === '/p/' + p.slug)) continue;
    items.push({ label: p.title, path: '/p/' + p.slug });
  }
  if (s.discord?.voice_url && featureAllowed('voice') && !items.some((i) => i.path === '/voz')) items.push({ label: 'Voz', path: '/voz' });
  if (can('mod')) items.push({ label: 'Painel', path: '/admin' });
  return items;
}

export function updateNav() {
  const p = hashPath();
  document.querySelectorAll('.nav a[data-path]').forEach((a) => {
    const t = a.dataset.path;
    a.classList.toggle('on', !!t && (p === t || (t !== '/' && p.startsWith(t))));
  });
  document.getElementById('nav')?.classList.remove('open');
}

const syncPlayer = () => {
  const on = state.profile?.status === 'active' && shellKind === 'full';
  on ? mountPlayer() : unmountPlayer();
  if (on && canApprove()) { startPending(); paintPending(); } else stopPending();
};

/** kind: 'full' (barra + rodapé) ou 'bare' (login e cadastro). */
export function renderShell(kind = 'full', force = false) {
  const app = document.getElementById('app');
  if (!force && kind === shellKind) { updateNav(); syncPlayer(); return; }
  shellKind = kind;
  if (kind === 'bare') { app.innerHTML = '<main id="view"></main>'; unmountPlayer(); return; }

  const s = state.settings;
  const main = mainChar(state.chars);
  const rgb = main ? clsRgb(main.class_code) : '229,115,107';
  const nick = main?.nick || state.profile?.display_name || '';
  const links = menuItems().map((i) => {
    const href = i.url ? safeUrl(i.url) : '#' + i.path;
    if (!href) return '';
    const ext = /^(https?:|mailto:)/i.test(href) || i.newtab;
    const cls = i.style === 'primary' ? 'nb pri' : i.style === 'button' ? 'nb' : '';
    return `<a href="${esc(href)}" class="${cls}" data-path="${esc(i.path || '')}" ${ext ? 'target="_blank" rel="noopener noreferrer"' : ''}>${esc(i.label)}</a>`;
  }).join('');

  app.innerHTML = `
    <header class="topbar"><div class="wrap">
      <a class="brand" href="#/"><img src="${esc(logoUrl())}" alt=""><b>${esc(s.guild_name)}</b></a>
      <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false">☰</button>
      <nav class="nav" id="nav">${links}
        <div class="who">
          <button type="button" id="whoBtn" aria-haspopup="true" aria-expanded="false">
            <span class="av" style="--c:${rgb}">${esc(initial(nick))}</span><span>${esc(nick)}</span>
          </button>
          <div class="menu" id="whoMenu" hidden>
            <a href="#/perfil">Meu perfil</a>
            <a href="#/instalar">Instalar o app</a>
            <hr>
            <button type="button" id="logout">Sair</button>
          </div>
        </div>
      </nav>
    </div></header>
    <div id="pendBar" class="pendbar" hidden></div>
    <main id="view"></main>
    <footer class="foot"><div class="orn" aria-hidden="true"><i></i></div>${esc(s.texts.footer || s.guild_name)}</footer>`;

  const nav = document.getElementById('nav');
  const burger = app.querySelector('.burger');
  burger.onclick = () => { const open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open); };
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) nav.classList.remove('open'); });
  const whoBtn = document.getElementById('whoBtn');
  const menu = document.getElementById('whoMenu');
  whoBtn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; whoBtn.setAttribute('aria-expanded', !menu.hidden); };
  menu.addEventListener('click', () => { menu.hidden = true; });
  document.addEventListener('click', () => { menu.hidden = true; });
  document.getElementById('logout').onclick = () => sb.auth.signOut();
  syncPlayer();
  updateNav();
}
