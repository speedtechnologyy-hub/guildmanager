import { sb } from './supabase.js?v=20261113h';
import { state, loadSettings, loadProfile, loadGame, loadPages } from './store.js?v=20261113h';
import { applyTheme, applyBrand } from './theme.js?v=20261113h';
import { initEmbers, initPointer, runIntro } from './fx.js?v=20261113h';
import { renderShell, updateNav, shellMode } from './layout.js?v=20261113h';
import { routeFeature, featureAllowed, screenBlocks } from './lib/features.js?v=20261113h';
import { renderBlocks } from './lib/blocks.js?v=20261113h';
import { startLive, listenPreview, IS_PREVIEW } from './lib/live.js?v=20261113h';
import { startTicker, tick, esc, $, can } from './lib/util.js?v=20261113h';
import { loadingHTML, closeModal } from './lib/ui.js?v=20261113h';

// Cada rota carrega o seu módulo só quando é visitada.
const ROUTES = [
  { re: /^\/entrar$/, page: 'login', pub: true },
  { re: /^\/adminpainel$/, page: 'master', pub: true },
  { re: /^\/convite\/([^/]+)$/, page: 'login', pub: true },
  { re: /^\/p\/([a-z0-9-]+)$/, page: 'page', pub: true },
  { re: /^\/instalar$/, page: 'install', pub: true },
  { re: /^\/cadastro$/, page: 'signup', bare: true },
  { re: /^\/$/, page: 'lobby' },
  { re: /^\/guerras(?:\/([a-z0-9-]+))?$/, page: 'wars' },
  { re: /^\/ranking$/, page: 'ranking' },
  { re: /^\/membros$/, page: 'members' },
  { re: /^\/voz$/, page: 'voice' },
  { re: /^\/perfil$/, page: 'profile' },
  { re: /^\/admin(?:\/([a-z-]+))?$/, page: 'admin' },
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
  // Sem conta: o domínio puro mostra só a vitrine. O login fica em #/entrar e o cadastro, no link de convite.
  if (!state.session && !route?.pub) {
    if (path !== '/') return nav('#/');
    renderShell('bare');
    const mod = await import('./pages/vitrine.js?v=20261113h');
    if (my === token) mod.default($('#view'));
    return;
  }
  if (state.session && !state.profile && route?.page !== 'signup' && route?.page !== 'login') return nav('#/cadastro');
  if (state.profile && !IS_PREVIEW && (route?.page === 'login' || route?.page === 'signup' || route?.page === 'master')) return nav('#/');
  if (route?.page === 'install' && !state.profile && state.session) return nav('#/cadastro');

  const bare = route?.bare || (route?.pub && (!state.profile || (IS_PREVIEW && route.page === 'login')));
  renderShell(bare ? 'bare' : 'full');
  const view = $('#view');
  view.innerHTML = loadingHTML;

  if (state.profile && state.profile.status !== 'active') {
    const pend = state.profile.status === 'pending';
    view.innerHTML = `<div class="wrap"><div class="page-head"><h1>${pend ? 'Cadastro em análise' : 'Acesso desativado'}</h1><p>${pend ? 'Recebemos o seu cadastro. Assim que a liderança aprovar, o acesso à guild é liberado. Volte mais tarde ou aguarde o aviso no WhatsApp.' : `Sua conta está ${state.profile.status === 'banned' ? 'bloqueada' : 'inativa'}. Fale com a liderança da guild.`}</p><p style="margin-top:18px"><button class="btn" id="out">Sair</button></p></div></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    if (pend) {
      // confere a aprovação sozinho: quando a liderança aprovar, a pessoa entra sem precisar fazer nada
      const check = async () => { await loadProfile(); if (state.profile?.status !== 'pending') { clearInterval(timer); if (state.profile) await loadGame(); renderShell(state.profile ? 'full' : 'bare', true); go(); } };
      const timer = setInterval(check, 20000);
      cleanup = () => clearInterval(timer);
      view.querySelector('.page-head').insertAdjacentHTML('beforeend', '<p class="muted small" style="margin-top:14px">Esta tela confere sozinha a cada 20 segundos. Assim que aprovarem, você entra direto.</p>');
    }
    return;
  }
  if (!route) { view.innerHTML = '<div class="wrap"><div class="page-head"><h1>Página não encontrada</h1><p><a href="#/">Voltar ao lobby</a></p></div></div>'; return; }
  if (route.page === 'admin' && !can('mod')) return nav('#/');

  // função desligada pelo master: some para os membros; o master ainda entra, com aviso
  const fid = routeFeature(route.page);
  let offNote = false;
  if (fid && !featureAllowed(fid)) {
    if (!can('master')) { view.innerHTML = '<div class="wrap"><div class="page-head"><h1>Função indisponível</h1><p>Esta área está desativada no momento.</p><p style="margin-top:14px"><a href="#/">Voltar ao lobby</a></p></div></div>'; updateNav(); return; }
    offNote = true;
  }

  // blocos extras que o master colocou no topo e no rodapé desta tela
  let host = view;
  const top = screenBlocks(route.page, 'top'), bottom = screenBlocks(route.page, 'bottom');
  if (top.length || bottom.length) {
    view.innerHTML = `<div class="wrap blks" id="gm-top" style="padding-top:24px">${renderBlocks(top)}</div><div id="gm-page"></div><div class="wrap blks" id="gm-bottom" style="padding-bottom:24px">${renderBlocks(bottom)}</div>`;
    host = view.querySelector('#gm-page');
  }

  try {
    const mod = await import(`./pages/${route.page}.js?v=20261113h`);
    if (my !== token) return;
    const out = await mod.default(host, params);
    if (offNote && my === token) view.insertAdjacentHTML('afterbegin', '<div class="wrap"><div class="flag-off">Esta função está desativada ou restrita para os membros. Só você enxerga esta tela.</div></div>');
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
  if (state.profile) await Promise.all([loadGame(), loadPages().catch(() => {})]);
}

/** Mudança do master chegou (tempo real ou prévia): refaz tema, topo e, se preciso, a tela aberta. */
let refreshTimer = 0;
function refreshLive({ cssOnly } = {}) {
  applyTheme(); applyBrand();
  if (shellMode() === 'full') renderShell('full', true);
  if (cssOnly) return;
  const path = (location.hash.slice(1) || '/').split('?')[0];
  if (/^\/(admin|cadastro)/.test(path)) return;
  clearTimeout(refreshTimer);
  const tryGo = () => {
    const a = document.activeElement;
    const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#view');
    if (document.querySelector('#modal-root .overlay') || typing) { refreshTimer = setTimeout(tryGo, 2500); return; }
    go();
  };
  refreshTimer = setTimeout(tryGo, 150);
}

async function boot() {
  initEmbers();
  initPointer();
  // configurações, sessão e páginas em paralelo (antes eram uma fila de 3 idas ao servidor)
  const [, sess] = await Promise.all([loadSettings(), sb.auth.getSession(), loadPages().catch(() => {})]);
  applyTheme();
  applyBrand();
  if (state.offline) {
    document.getElementById('app').innerHTML = '<div class="wrap"><div class="page-head"><h1>Sem resposta do servidor</h1><p>Não foi possível carregar o site agora. Confira a sua internet e tente de novo.</p><p style="margin-top:14px"><button class="btn primary" onclick="location.reload()">Tentar de novo</button></p></div></div>';
    return;
  }
  await syncSession(sess.data.session);
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
  if (IS_PREVIEW) listenPreview(() => refreshLive({}));
  startLive(refreshLive);
  runIntro();
  startTicker();
  await go();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML = `<div class="wrap"><div class="page-head"><h1>Não foi possível iniciar</h1><p>${esc(e.message || '')}</p></div></div>`;
});
