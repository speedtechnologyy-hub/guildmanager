import { state } from '../store.js?v=20261113h';
import { esc } from './util.js?v=20261113h';

const TABS = [['eletronica', 'Eletrônica'], ['funk', 'Funk'], ['trap', 'Trap'], ['rock', 'Rock'], ['sertanejo', 'Sertanejo'], ['jovempan', 'Jovem Pan'], ['gospel', 'Gospel']];
const okUrl = (u) => /^https:\/\/[^\s]+$/i.test(String(u || '').trim());

let root = null, audio = null, current = '', sig = '';

/** Botão flutuante de rádio. Fica fora das telas, então continua tocando ao navegar. Nunca toca sozinho. */
export function mountPlayer() {
  const tabs = TABS.filter(([k]) => okUrl(state.settings.music?.[k]));
  if (!tabs.length) { unmountPlayer(); return; }
  const s2 = tabs.map(([k]) => k + state.settings.music[k]).join('|');
  if (root && sig === s2) return;
  const wasOpen = root?.classList.contains('open'); root?.remove(); sig = s2;
  if (!tabs.some(([k]) => k === current)) { current = tabs[0][0]; if (audio) { audio.pause(); audio = null; } }

  root = document.createElement('div');
  root.className = 'gmp' + (wasOpen ? ' open' : '');
  root.innerHTML = `<button class="gmp-fab" type="button" aria-label="Abrir rádio" aria-expanded="false"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg><i class="gmp-dot"></i></button>
    <div class="gmp-box" role="dialog" aria-label="Rádio">
      <div class="gmp-tabs">${tabs.map(([k, n]) => `<button type="button" data-k="${k}" class="${k === current ? 'on' : ''}">${esc(n)}</button>`).join('')}<button type="button" class="gmp-x" aria-label="Minimizar">✕</button></div>
      <div class="gmp-ctl"><button type="button" class="gmp-play" aria-label="Tocar">▶</button><div class="gmp-info"><b class="gmp-name"></b><span class="gmp-st">Toque em play para ouvir</span></div></div>
      <label class="gmp-vol">Volume <input type="range" min="0" max="100" value="70"></label>
    </div>`;
  document.body.appendChild(root);

  const $ = (q) => root.querySelector(q);
  const st = (t) => { $('.gmp-st').textContent = t; };
  const label = () => TABS.find(([k]) => k === current)[1];
  const paint = () => { const on = audio && !audio.paused; $('.gmp-play').textContent = on ? '❚❚' : '▶'; $('.gmp-play').setAttribute('aria-label', on ? 'Pausar' : 'Tocar'); root.classList.toggle('playing', !!on); $('.gmp-name').textContent = 'Rádio ' + label(); };
  const vol = () => { if (audio) audio.volume = $('.gmp-vol input').value / 100; };

  function make() {
    audio = new Audio(); audio.preload = 'none'; audio.crossOrigin = null; vol();
    audio.onwaiting = () => st('Carregando…');
    audio.onplaying = () => { st('Ao vivo'); paint(); };
    audio.onpause = () => { st('Pausado'); paint(); };
    audio.onerror = () => { st('Esta rádio não respondeu. Tente outra aba.'); paint(); };
    audio.src = state.settings.music[current];
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: 'Rádio ' + label(), artist: state.settings.guild_name || '' });
      navigator.mediaSession.setActionHandler('play', () => audio.play()); navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    }
  }
  const toggle = async () => {
    if (!audio) make();
    if (audio.paused) { st('Carregando…'); try { await audio.play(); } catch (e) { st('Não foi possível tocar. Tente de novo.'); } } else audio.pause();
    paint();
  };
  const setOpen = (v) => { root.classList.toggle('open', v); $('.gmp-fab').setAttribute('aria-expanded', v); };

  $('.gmp-fab').onclick = () => setOpen(true);
  $('.gmp-x').onclick = () => setOpen(false);          // minimizar não corta a música
  $('.gmp-play').onclick = toggle;
  $('.gmp-vol input').oninput = vol;
  root.querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = () => {
      const was = audio && !audio.paused;
      current = b.dataset.k; root.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x === b));
      if (audio) { audio.pause(); audio.src = ''; audio = null; }
      paint(); st(was ? 'Carregando…' : 'Toque em play para ouvir'); if (was) toggle();
    };
  });
  paint();
  if (wasOpen) setOpen(true);
}

export function unmountPlayer() { if (audio) { audio.pause(); audio = null; } root?.remove(); root = null; sig = ''; }
