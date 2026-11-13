import { state } from '../store.js?v=20261113h';
import { esc } from '../lib/util.js?v=20261113h';
import { sceneHTML } from '../layout.js?v=20261113h';

/** Domínio puro, sem conta: só o banner em tela cheia. Sem botões nem menu. */
export default function vitrine(root) {
  const s = state.settings;
  const img = s.vitrine_url || s.banner_url || s.login_bg_url;
  root.innerHTML = img
    ? `<div class="vitrine"><img src="${esc(img)}" alt="${esc(s.guild_name)}"></div>`
    : `<div class="vitrine">${sceneHTML('login')}</div>`;
}
