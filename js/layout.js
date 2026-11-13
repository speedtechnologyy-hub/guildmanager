import { sb } from './supabase.js';
import { state } from './store.js';
import { esc, can, clsRgb, initial, mainChar } from './lib/util.js';
import { logoUrl } from './theme.js';
import { featureAllowed, pathFeature } from './lib/features.js';
import { safeUrl } from './lib/blocks.js';

/** Cenário do herói: banner enviado pelo admin ou o cenário gerado (castelo ao entardecer). */
export function sceneHTML(kind = 'hero') {
  const banner = kind === 'login' ? (state.settings.login_bg_url || state.settings.banner_url) : state.settings.banner_url;
  const wins = [[979, 232], [1012, 190], [1041, 166], [1075, 232], [1118, 148], [1150, 210], [1166, 232]]
    .map(([x, y]) => `<rect class="win" x="${x}" y="${y}" width="4" height="7"/>`).join('');
  const svg = (cls, body) => `<svg class="layer ${cls}" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">${body}</svg>`;
  const generated = `<div class="moon"></div><div class="sun"></div>
    ${svg('l1', '<path fill="#2d1317" d="M0 400V232L110 172 200 216 330 122 450 206 550 152 690 236 800 142 930 226 1040 172 1170 232 1290 152 1380 202 1440 176V400Z"/>')}
    ${svg('l2', `<path fill="#180b0c" d="M0 400V304L120 266 230 304 360 244 480 294 600 258 720 304 840 274 940 304H958V240h14v-26l11-16 11 16v26h14v-60h12v-26l12-18 12 18v26h12v60h18v-30h10v30h22v-90h14v-30l14-20 14 20v30h14v90h26v-34h12v34h20L1190 304 1300 280 1440 304V400Z"/>${wins}`)}
    ${svg('l3', '<path fill="#070405" d="M0 400V336L70 318 150 340 260 312 380 346 500 322 640 350 780 326 900 352 1040 330 1180 352 1320 322 1440 342V400Z"/>')}`;
  return `<div class="scene ${kind}" aria-hidden="true">${banner ? `<div class="banner" style="background-image:url('${esc(encodeURI(banner))}')"></div>` : generated}<div class="fog"></div><div class="fog b"></div></div>`;
}

const hashPath = () => (location.hash.slice(1) || '/').split('?')[0];
let shellKind = '';
export const shellMode = () => shellKind;

/** Menu final: itens do master + páginas marcadas "no menu" + atalhos automáticos. */
function menuItems() {
  const s = state.settings;
  const items = (s.menu || []).filter((i) => i.enabled !== false && can(i.min_role || 'member'))
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

/** kind: 'full' (barra + rodapé) ou 'bare' (login e cadastro). */
export function renderShell(kind = 'full', force = false) {
  const app = document.getElementById('app');
  if (!force && kind === shellKind) { updateNav(); return; }
  shellKind = kind;
  if (kind === 'bare') { app.innerHTML = '<main id="view"></main>'; return; }

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
            <hr>
            <button type="button" id="logout">Sair</button>
          </div>
        </div>
      </nav>
    </div></header>
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
  updateNav();
}
