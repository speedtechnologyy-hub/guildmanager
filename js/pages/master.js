import { sb } from '../supabase.js?v=20261113h';
import { esc, $ } from '../lib/util.js?v=20261113h';
import { busy } from '../lib/ui.js?v=20261113h';
import { sceneHTML } from '../layout.js?v=20261113h';
import { mountTurnstile } from '../lib/turnstile.js?v=20261113h';
import { logoUrl } from '../theme.js?v=20261113h';

/** Acesso reservado do Admin: e-mail e senha (rota oculta, fora do menu). */
export default async function master(root) {
  root.innerHTML = `
    <div class="gate-scene">${sceneHTML()}</div>
    <div class="gate wrap" style="position:relative;z-index:1">
      <section class="plate rise">
        <img class="crest" src="${esc(logoUrl())}" alt="">
        <h1>Acesso do Admin</h1>
        <p>Entrada reservada com e-mail e senha.</p>
        <form class="stack" id="f" autocomplete="on">
          <label class="f">E-mail<input type="email" name="email" required autocomplete="username"></label>
          <label class="f">Senha<input type="password" name="password" required autocomplete="current-password"></label>
          <div id="cf" style="min-height:0"></div>
          <div id="msg"></div>
          <button class="btn primary block" type="submit">Entrar</button>
        </form>
        <p class="hint" style="margin-top:18px"><a href="#/entrar">Entrar com Google ou Discord</a></p>
      </section>
    </div>`;
  const f = $('#f', root);
  const cf = await mountTurnstile($('#cf', root)).catch((e) => { $('#msg', root).innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; return null; });
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      if (cf?.enabled && !cf.token()) { $('#msg', root).innerHTML = '<div class="notice bad">Conclua a verificação de segurança.</div>'; return; }
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value, options: cf?.enabled ? { captchaToken: cf.token() } : undefined });
      if (error) cf?.reset();
      $('#msg', root).innerHTML = error ? `<div class="notice bad">${/captcha/i.test(error.message) ? 'Verificação de segurança falhou. Tente de novo.' : 'E-mail ou senha incorretos.'}</div>` : '';
    });
  };
}
