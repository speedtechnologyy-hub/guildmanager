import { state } from '../store.js?v=20261113h';
import { esc } from './util.js?v=20261113h';

const TABS = [['eletronica', 'Eletrônica'], ['funk', 'Funk'], ['trap', 'Trap'], ['rock', 'Rock']];

/** Converte um link do Spotify no endereço de player embutido. */
export function spotifyEmbed(url) {
  const m = String(url || '').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
}

let root = null, current = '';

/** Botão flutuante com o player. Fica fora das telas, então a música continua ao navegar. Nunca toca sozinho. */
export function mountPlayer() {
  const tabs = TABS.filter(([k]) => spotifyEmbed(state.settings.music?.[k]));
  if (!tabs.length) { root?.remove(); root = null; return; }
  if (root && root.dataset.sig === tabs.map(([k]) => k + state.settings.music[k]).join('|')) return;
  const open = root?.classList.contains('open'); root?.remove();
  root = document.createElement('div');
  root.id = 'gm-player'; root.className = 'gmp' + (open ? ' open' : '');
  root.dataset.sig = tabs.map(([k]) => k + state.settings.music[k]).join('|');
  if (!tabs.some(([k]) => k === current)) current = tabs[0][0];
  root.innerHTML = `<button class="gmp-fab" type="button" aria-label="Abrir player de música" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg></button>
    <div class="gmp-box" role="dialog" aria-label="Player de música">
      <div class="gmp-tabs">${tabs.map(([k, n]) => `<button type="button" data-k="${k}" class="${k === current ? 'on' : ''}">${esc(n)}</button>`).join('')}<button type="button" class="gmp-x" aria-label="Minimizar">✕</button></div>
      <div class="gmp-frame"></div>
    </div>`;
  document.body.appendChild(root);
  const frame = root.querySelector('.gmp-frame');
  const load = () => {
    const src = spotifyEmbed(state.settings.music[current]);
    frame.innerHTML = `<iframe src="${esc(src)}" width="100%" height="352" frameborder="0" allow="encrypted-media; clipboard-write; fullscreen" loading="lazy" title="Spotify"></iframe>`;
  };
  const setOpen = (v) => {
    root.classList.toggle('open', v); root.querySelector('.gmp-fab').setAttribute('aria-expanded', v);
    if (v && !frame.firstElementChild) load();   // só carrega o Spotify quando a pessoa abre
  };
  root.querySelector('.gmp-fab').onclick = () => setOpen(!root.classList.contains('open'));
  root.querySelector('.gmp-x').onclick = () => setOpen(false);   // minimizar não corta a música: o iframe continua montado
  root.querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = () => { current = b.dataset.k; root.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x === b)); load(); };
  });
  if (open) setOpen(true);
}

export function unmountPlayer() { root?.remove(); root = null; }
