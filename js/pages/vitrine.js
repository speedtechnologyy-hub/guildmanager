import { state } from '../store.js?v=20261113h';
import { esc } from '../lib/util.js?v=20261113h';
import { sceneHTML } from '../layout.js?v=20261113h';

/** Domínio puro, sem conta: só o banner em tela cheia. Sem botões nem menu. */
export default function vitrine(root) {
  const s = state.settings;
  const img = s.vitrine_url || s.banner_url || s.login_bg_url;
  // No app instalado (tela inicial do celular) aparece o botão Entrar. No navegador comum, só o banner.
  const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const btn = app ? '<a class="btn primary vitrine-go" href="#/entrar">Entrar</a>' : '';
  root.innerHTML = img
    ? `<div class="vitrine"><img src="${esc(img)}" alt="${esc(s.guild_name)}">${btn}</div>`
    : `<div class="vitrine">${sceneHTML('login')}${btn}</div>`;
}
