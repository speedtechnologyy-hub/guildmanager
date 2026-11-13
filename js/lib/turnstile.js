import { state } from '../store.js';

let loading;
function load() {
  loading ||= new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = ok; s.onerror = () => fail(new Error('Não foi possível carregar a verificação de segurança.'));
    document.head.appendChild(s);
  });
  return loading;
}

/** Chave pública do Turnstile (guardada em site_settings.turnstile_site_key). Vazia = sem verificação. */
export const turnstileKey = () => String(state.settings?.turnstile_site_key || '').trim();

/** Monta o widget dentro de `box`. Sem chave configurada, devolve um controle vazio. */
export async function mountTurnstile(box) {
  const key = turnstileKey();
  if (!key) return { enabled: false, token: () => '', reset() {} };
  await load();
  let token = '';
  const id = window.turnstile.render(box, {
    sitekey: key, theme: 'dark', language: 'pt-br',
    callback: (t) => { token = t; },
    'expired-callback': () => { token = ''; },
    'error-callback': () => { token = ''; },
  });
  return { enabled: true, token: () => token, reset() { token = ''; try { window.turnstile.reset(id); } catch { /* */ } } };
}
