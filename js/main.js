import { sb } from './supabase.js';
import { state, loadSettings, loadProfile, loadGame } from './store.js';
import { applyTheme, applyBrand } from './theme.js';
import { initEmbers, initPointer, runIntro } from './fx.js';
import { renderShell, updateNav } from './layout.js';
import { startTicker, tick, esc, $, can } from './lib/util.js';
import { loadingHTML, closeModal } from './lib/ui.js';

// Cada rota carrega o seu módulo só quando é visitada.
const ROUTES = [
  { re: /^\/entrar$/, page: 'login', pub: true },
  { re: /^\/master$/, page: 'master', pub: true },
  { re: /^\/convite\/([^/]+)$/, page: 'login', pub: true },
  { re: /^\/p\/([a-z0-9-]+)$/, page: 'page', pub: true },
  { re: /^\/cadastro$/, page: 'signup', bare: true },
  { re: /^\/$/, page: 'lobby' },
  { re: /^\/guerras(?:\/([a-z0-9-]+))?$/, page: 'wars' },
  { re: /^\/bosses$/, page: 'bosses' },
  { re: /^\/agenda$/, page: 'agenda' },
  { re: /^\/ranking$/, page: 'ranking' },
  { re: /^\/membros$/, page: 'members' },
  { re: /^\/voz$/, page: 'voice' },
  { re: /^\/perfil$/, page: 'profile' },
  { re: /^\/admin(?:\/([a-z]+))?$/, page: 'admin' },
];

let cleanup = null;
let token = 0;
const nav = (hash) => { if (location.hash !== hash) location.hash = hash; };

async function go() {
  const my = ++token;
  closeModal();
  cleanup?.(); cleanup = null;
  const path = (location.hash.slice(1) || '/').split('?')[0];
  const route = ROUTES.find((r) => r.re.test(path));
  const params = route ? path.match(route.re).slice(1) : [];

  // portões de acesso
  if (!state.session && !route?.pub) return nav('#/entrar');
  if (state.session && !state.profile && route?.page !== 'signup' && route?.page !== 'login' && route?.page !== 'master') return nav('#/cadastro');
  if (state.profile && (route?.page === 'login' || route?.page === 'signup' || route?.page === 'master')) return nav('#/');

  const bare = route?.bare || (route?.pub && !state.profile);
  renderShell(bare ? 'bare' : 'full');
  const view = $('#view');
  view.innerHTML = loadingHTML;

  if (state.profile && state.profile.status !== 'active') {
    view.innerHTML = `<div class="wrap"><div class="page-head"><h1>Acesso desativado</h1><p>Sua conta está ${state.profile.status === 'banned' ? 'bloqueada' : 'inativa'}. Fale com a liderança da guild.</p><p style="margin-top:18px"><button class="btn" id="out">Sair</button></p></div></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    return;
  }
  if (!route) { view.innerHTML = '<div class="wrap"><div class="page-head"><h1>Página não encontrada</h1><p><a href="#/">Voltar ao lobby</a></p></div></div>'; return; }
  if (route.page === 'admin' && !can('mod')) return nav('#/');

  try {
    const mod = await import(`./pages/${route.page}.js`);
    if (my !== token) return;
    const out = await mod.default(view, params);
    if (my !== token) { out?.(); return; }
    cleanup = out || null;
  } catch (e) {
    console.error(e);
    if (my === token) view.innerHTML = `<div class="wrap"><div class="page-head"><h1>Algo deu errado</h1><p>${esc(e.message || 'Não foi possível carregar esta página.')}</p><p style="margin-top:14px"><button class="btn" onclick="location.reload()">Tentar de novo</button></p></div></div>`;
  }
  window.scrollTo(0, 0);
  updateNav();
  tick();
}

async function syncSession(session) {
  state.session = session;
  state.user = session?.user ?? null;
  await loadProfile();
  if (state.profile) await loadGame();
}

async function boot() {
  initEmbers();
  initPointer();
  await loadSettings();
  applyTheme();
  applyBrand();

  const { data } = await sb.auth.getSession();
  await syncSession(data.session);
  // remove o ?code= do OAuth da barra de endereço
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);

  let lastUser = state.user?.id ?? null;
  sb.auth.onAuthStateChange((evt, session) => {
    const uid = session?.user?.id ?? null;
    if (evt === 'SIGNED_OUT') {
      lastUser = null;
      state.session = null; state.user = null; state.profile = null; state.chars = [];
      renderShell('bare', true);
      nav('#/entrar'); go();
    } else if (uid && uid !== lastUser) {
      lastUser = uid;
      // fora do callback para não travar o cliente de auth
      setTimeout(async () => { await syncSession(session); renderShell(state.profile ? 'full' : 'bare', true); go(); }, 0);
    } else if (session) {
      state.session = session;
    }
  });

  addEventListener('hashchange', go);
  runIntro();
  startTicker();
  await go();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML = `<div class="wrap"><div class="page-head"><h1>Não foi possível iniciar</h1><p>${esc(e.message || '')}</p></div></div>`;
});
