import { fn } from '../supabase.js?v=20261117a';
import { state } from '../store.js?v=20261117a';

/** Confere de tempos em tempos se o streamer está ao vivo e põe uma bolinha vermelha no item "Streamer" do menu. */
let timer = 0;
const chan = () => state.raw?.twitch?.channel;

export function paintStream() {
  document.querySelectorAll('.nav a[data-path="/streamer"]').forEach((a) => {
    a.querySelector('.ldot')?.remove();
    if (state.streamLive) a.insertAdjacentHTML('beforeend', '<span class="ldot" role="img" aria-label="ao vivo"></span>');
  });
}

export async function refreshStream() {
  if (!chan()) return;
  try {
    const r = await fn('twitch-status', { channel: chan() });
    state.streamLive = r.live === true; state.streamUptime = r.uptime || '';
  } catch { return; }
  paintStream();
  document.dispatchEvent(new CustomEvent('gm-stream'));
}

export function startStream() {
  if (timer || !chan()) { paintStream(); return; }
  refreshStream();
  timer = setInterval(() => { if (!document.hidden) refreshStream(); }, 120000);
  document.addEventListener('visibilitychange', onVis);
}
export function stopStream() {
  clearInterval(timer); timer = 0; state.streamLive = false;
  document.removeEventListener('visibilitychange', onVis);
}
const onVis = () => { if (!document.hidden) refreshStream(); };
