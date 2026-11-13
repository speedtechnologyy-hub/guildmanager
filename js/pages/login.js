import { sb, fn } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, $ } from '../lib/util.js?v=20261113h';
import { busy } from '../lib/ui.js?v=20261113h';
import { sceneHTML } from '../layout.js?v=20261113h';
import { logoUrl } from '../theme.js?v=20261113h';
import { featureOn } from '../lib/features.js?v=20261113h';

const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5.04c1.64 0 3.1.56 4.26 1.67l3.18-3.18C17.46 1.7 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.56l3.7 2.87C6.76 6.9 9.17 5.04 12 5.04z"/><path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-2 3.73-4.94 3.73-8.69z"/><path fill="#FBBC05" d="M5.88 14.57A7.1 7.1 0 0 1 5.5 12c0-.89.15-1.75.38-2.57l-3.7-2.87A11.5 11.5 0 0 0 .5 12c0 1.85.44 3.6 1.18 5.15l3.7-2.58z"/><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1.02 7.6-2.78l-3.7-2.87c-1.03.69-2.35 1.1-3.9 1.1-2.83 0-5.24-1.86-6.12-4.38l-3.7 2.58C3.99 21.03 7.7 23.5 12 23.5z"/></svg>';
const DISCORD = '<svg viewBox="0 0 24 24" fill="#8b9bff" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5a18 18 0 0 0-4.4 0L10.6 3a19.7 19.7 0 0 0-4.9 1.4C2.6 9 1.8 13.5 2.2 18a19.9 19.9 0 0 0 6 3l.8-1.4c-.5-.2-1-.4-1.5-.7l.4-.3a14 14 0 0 0 12.2 0l.4.3c-.5.3-1 .5-1.5.7l.8 1.4a19.9 19.9 0 0 0 6-3c.5-5.2-.8-9.7-3.5-13.6zM9.3 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4zm5.4 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4z"/></svg>';

export default async function login(root, [code]) {
  const t = state.settings.texts;
  root.innerHTML = `
    <div class="gate-scene">${sceneHTML('login')}</div>
    <div class="gate wrap" style="position:relative;z-index:1">
      <section class="plate rise">
        <img class="crest" src="${esc(logoUrl())}" alt="">
        <h1>${code ? 'Você foi convidado' : esc(t.login_title)}</h1>
        <p id="sub">${code ? 'Entre com o Google ou o Discord para criar o seu acesso à guild.' : esc(t.login_subtitle)}</p>
        <div id="notice"></div>
        <div class="btns">
          ${featureOn('login_google') ? `<button class="btn oauth" type="button" data-p="google">${GOOGLE}${esc(t.login_google || 'Entrar com Google')}</button>` : ''}
          ${featureOn('login_discord') ? `<button class="btn oauth" type="button" data-p="discord">${DISCORD}${esc(t.login_discord || 'Entrar com Discord')}</button>` : ''}
        </div>
        ${code ? '<p class="hint" style="margin-top:18px"><a href="#/entrar">Já tenho conta</a></p>' : ''}
      </section>
    </div>`;

  async function oauth(btn) {
    const provider = btn.dataset.p;
    await busy(btn, async () => {
      if (code) { try { localStorage.setItem('gm_invite', code); } catch { /* sem storage */ } }
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: location.origin + location.pathname,
          ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
        },
      });
      if (error) throw error;
    });
  }
  root.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => oauth(b); });

  if (code) {
    try {
      const r = await fn('signup', { action: 'invite-info', code });
      if (!r.valid) {
        $('#notice', root).innerHTML = '<div class="notice bad" style="margin-bottom:18px">Esse convite não é válido, expirou ou já foi usado por todas as vagas. Peça um novo link à liderança.</div>';
        $('#sub', root).textContent = 'Quem já tem conta pode entrar normalmente.';
        root.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { try { localStorage.removeItem('gm_invite'); } catch { /* */ } return oauth(b); }; });
      }
    } catch { /* se a checagem falhar, o cadastro valida de novo no servidor */ }
  }
}
