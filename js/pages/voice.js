import { state } from '../store.js?v=20261113h';
import { esc } from '../lib/util.js?v=20261113h';
import { plate, empty } from '../lib/ui.js?v=20261113h';

export default async function voice(root) {
  const d = state.settings.discord || {};
  const wid = String(d.widget_id || '').replace(/\D/g, '');
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Voz</h1><p>A chamada da guerra acontece no Discord.</p></div>
    ${d.voice_url || d.invite_url ? `<div class="row" style="gap:12px">${d.voice_url ? `<a class="btn primary" href="${esc(d.voice_url)}" target="_blank" rel="noopener">Entrar na call</a>` : ''}${d.invite_url ? `<a class="btn" href="${esc(d.invite_url)}" target="_blank" rel="noopener">Convite do servidor</a>` : ''}</div>` : empty('A liderança ainda não configurou o Discord.')}
    ${wid ? `<div class="section">${plate(`<iframe src="https://discord.com/widget?id=${wid}&theme=dark" width="100%" height="480" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts" style="border:0"></iframe>`)}</div>` : ''}</div>`;
}
