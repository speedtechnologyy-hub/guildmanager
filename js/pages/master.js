import { sb } from '../supabase.js';
import { esc, $ } from '../lib/util.js';
import { busy } from '../lib/ui.js';
import { sceneHTML } from '../layout.js';
import { logoUrl } from '../theme.js';

/** Acesso reservado do GuildMaster: e-mail e senha (rota oculta, fora do menu). */
export default async function master(root) {
  root.innerHTML = `
    <div class="gate-scene">${sceneHTML()}</div>
    <div class="gate wrap" style="position:relative;z-index:1">
      <section class="plate rise">
        <img class="crest" src="${esc(logoUrl())}" alt="">
        <h1>Acesso do GuildMaster</h1>
        <p>Entrada reservada com e-mail e senha.</p>
        <form class="stack" id="f" autocomplete="on">
          <label class="f">E-mail<input type="email" name="email" required autocomplete="username"></label>
          <label class="f">Senha<input type="password" name="password" required autocomplete="current-password"></label>
          <div id="msg"></div>
          <button class="btn primary block" type="submit">Entrar</button>
        </form>
        <p class="hint" style="margin-top:18px"><a href="#/entrar">Entrar com Google ou Discord</a></p>
      </section>
    </div>`;
  const f = $('#f', root);
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      $('#msg', root).innerHTML = error ? `<div class="notice bad">E-mail ou senha incorretos.</div>` : '';
    });
  };
}
