import { sb } from './supabase.js?v=20261117a';
import { state } from './store.js?v=20261117a';
import { mountPlayer, unmountPlayer } from './lib/player.js?v=20261117a';
import { esc, can, clsRgb, initial, mainChar } from './lib/util.js?v=20261117a';
import { logoUrl } from './theme.js?v=20261117a';
import { featureAllowed, pathFeature } from './lib/features.js?v=20261117a';
import { safeUrl } from './lib/blocks.js?v=20261117a';
import { startStream, stopStream } from './lib/stream-live.js?v=20261117a';
import { startDraws, stopDraws } from './lib/draws-live.js?v=20261117a';
import { startPending, stopPending, paintPending, canApprove } from './lib/pending.js?v=20261117a';

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


/** Ícones da barra de baixo (celular). */
const TAB_ICON = {
  '/': '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  '/guerras': '<path d="m14.5 4.5 5 5-9 9-3.5.5.5-3.5z"/><path d="m4 20 3-3M9 6l-4 4 3 3"/>',
  '/ranking': '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 20h7"/>',
  '/membros': '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 6M18 14.8c1.6.6 2.7 2.2 3 4.7"/>',
  '/sorteios': '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  '/videos': '<rect x="3" y="5.5" width="18" height="13" rx="3.5"/><path d="m10.5 9.5 4.5 2.5-4.5 2.5z" fill="currentColor"/>',
  '/streamer': '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M8 20h8M12 16.5V20"/><circle cx="12" cy="10.5" r="1.7" fill="currentColor"/>',
  '/admin': '<path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.2 7 9 4.1-1.8 7-4.8 7-9V6z"/>',
};
const tabIcon = (path) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_ICON[path] || '<circle cx="12" cy="12" r="6"/>'}</svg>`;

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
  if (featureAllowed('draws') && !items.some((i) => i.path === '/sorteios')) items.push({ label: 'Sorteios', path: '/sorteios' });
  if (state.raw?.youtube?.channel_id && featureAllowed('videos') && !items.some((i) => i.path === '/videos')) items.push({ label: 'Youtuber', path: '/videos' });
  if (state.raw?.twitch?.channel && featureAllowed('streamer') && !items.some((i) => i.path === '/streamer')) items.push({ label: 'Streamer', path: '/streamer' });
  if (can('mod')) items.push({ label: 'Painel', path: '/admin' });
  return items;
}

export function updateNav() {
  const p = hashPath();
  document.querySelectorAll('.nav a[data-path], .tabbar a[data-path]').forEach((a) => {
    const t = a.dataset.path;
    a.classList.toggle('on', !!t && (p === t || (t !== '/' && p.startsWith(t))));
  });
  document.getElementById('nav')?.classList.remove('open');
}

const syncPlayer = () => {
  const on = state.profile?.status === 'active' && shellKind === 'full';
  on ? mountPlayer() : unmountPlayer();
  if (on && canApprove()) { startPending(); paintPending(); } else stopPending();
  if (on && featureAllowed('draws')) startDraws(); else stopDraws();
  if (on && featureAllowed('streamer')) startStream(); else stopStream();
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

  const tabs = menuItems().filter((i) => i.path && !i.url && i.path !== '/admin').slice(0, 4);
  const tabbar = `<nav class="tabbar" id="tabbar" aria-label="Navegação principal">${tabs.map((i) => `<a href="#${esc(i.path)}" data-path="${esc(i.path)}">${tabIcon(i.path)}<span>${esc(i.label)}</span></a>`).join('')}<button type="button" id="tabMore" aria-label="Abrir o menu completo">${tabIcon('')}<span>Mais</span></button></nav>`;

  app.innerHTML = `
    <header class="topbar"><div class="wrap">
      <a class="brand" href="#/"><img src="${esc(logoUrl())}" alt=""><b>${esc(s.guild_name)}</b></a>
      <button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false">☰</button>
      <nav class="nav" id="nav">${links}${(matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? '' : '<a href="#/instalar" class="instlink" data-path="/instalar">Instalar o app</a>'}
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
        <button type="button" class="outbtn" id="logout2" aria-label="Sair da conta">Sair</button>
      </nav>
    </div></header>
    <div id="pendBar" class="pendbar" hidden></div>
    <div id="drawBar" class="pendbar drawbar" hidden></div>
    <main id="view"></main>
    <footer class="foot"><div class="orn" aria-hidden="true"><i></i></div>${esc(s.texts.footer || s.guild_name)}</footer>
    ${tabbar}`;

  const nav = document.getElementById('nav');
  const burger = app.querySelector('.burger');
  burger.onclick = () => { const open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open); };
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) nav.classList.remove('open'); });
  document.getElementById('tabMore').onclick = () => { const open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open); };
  const whoBtn = document.getElementById('whoBtn');
  const menu = document.getElementById('whoMenu');
  whoBtn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; whoBtn.setAttribute('aria-expanded', !menu.hidden); };
  menu.addEventListener('click', () => { menu.hidden = true; });
  document.addEventListener('click', () => { menu.hidden = true; });
  document.getElementById('logout').onclick = () => sb.auth.signOut();
  document.getElementById('logout2').onclick = () => sb.auth.signOut();
  syncPlayer();
  updateNav();
}
