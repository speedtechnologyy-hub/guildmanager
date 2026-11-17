import { state } from '../store.js?v=20261113h';
import { esc } from '../lib/util.js?v=20261113h';
import { empty } from '../lib/ui.js?v=20261113h';
import { pauseRadio } from '../lib/player.js?v=20261113h';
import { refreshStream } from '../lib/stream-live.js?v=20261113h';

export default async function streamer(root) {
  const t = state.raw?.twitch || {};
  const ch = /^[A-Za-z0-9_]{3,25}$/.test(t.channel || '') ? t.channel : '';
  if (!ch) { root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Streamer</h1></div>${empty('O canal da Twitch ainda não foi configurado.')}</div>`; return; }
  const host = location.hostname || 'localhost';
  const link = `https://www.twitch.tv/${ch}`;
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Streamer</h1><p>${esc(t.title || ch)} na Twitch. Assista a live e acompanhe o chat sem sair do site.</p></div>
    <p class="row" style="margin-bottom:16px"><span class="live-pill" id="lp">Verificando…</span><a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir na Twitch</a></p>
    <div class="tw-grid">
      <div class="vid-frame"><iframe src="https://player.twitch.tv/?channel=${encodeURIComponent(ch)}&parent=${encodeURIComponent(host)}&autoplay=true&muted=false" title="Live de ${esc(t.title || ch)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
      <div class="tw-chat"><iframe src="https://www.twitch.tv/embed/${encodeURIComponent(ch)}/chat?parent=${encodeURIComponent(host)}&darkpopout" title="Chat da live"></iframe></div>
    </div>
    <p class="muted small" style="margin-top:12px">Se a tela do player ficar preta, a live está offline no momento. Quando ele entrar no ar, aparece "Ao vivo" aqui e uma bolinha vermelha no menu.</p></div>`;
  pauseRadio(); // o som da live não disputa com o rádio
  const pill = root.querySelector('#lp');
  const paint = () => {
    const on = state.streamLive;
    pill.className = 'live-pill' + (on ? ' on' : '');
    pill.textContent = on ? 'Ao vivo agora' + (state.streamUptime ? ' · no ar há ' + state.streamUptime.replace(/ hours?/, 'h').replace(/ minutes?/, 'min').replace(/,?\s*\d+ seconds?/, '') : '') : 'Offline';
  };
  paint(); refreshStream();
  document.addEventListener('gm-stream', paint);
  return () => document.removeEventListener('gm-stream', paint);
}
