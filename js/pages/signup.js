import { sb, fn } from '../supabase.js?v=20261113h';
import { state, loadProfile, loadGame } from '../store.js?v=20261113h';
import { esc, $, maskPhone } from '../lib/util.js?v=20261113h';
import { busy } from '../lib/ui.js?v=20261113h';
import { sceneHTML } from '../layout.js?v=20261113h';
import { logoUrl } from '../theme.js?v=20261113h';
import { mountTurnstile } from '../lib/turnstile.js?v=20261113h';

export default async function signup(root) {
  const u = state.user;
  const meta = u.user_metadata || {};
  const suggested = meta.custom_claims?.global_name || meta.full_name || meta.name || (u.email || '').split('@')[0] || '';
  let invite = '';
  try { invite = localStorage.getItem('gm_invite') || ''; } catch { /* sem storage */ }

  root.innerHTML = `
    <div class="gate-scene">${sceneHTML()}</div>
    <div class="gate wrap" style="position:relative;z-index:1">
      <section class="plate rise">
        <img class="crest" src="${esc(logoUrl())}" alt="">
        <h1>Quase lá</h1>
        <p>Falta confirmar seus dados. O WhatsApp é obrigatório: é por ele que a guild avisa de guerra, boss e evento.</p>
        <form class="stack" id="f" autocomplete="off">
          <label class="f">Seu nome<input type="text" name="name" required minlength="2" maxlength="40" value="${esc(suggested)}"></label>
          <label class="f">WhatsApp com DDD<input type="tel" name="whatsapp" required inputmode="numeric" placeholder="(48) 99999-9999"></label>
          ${invite ? '' : '<label class="f">Código do convite<small>Se a liderança já te cadastrou, deixe em branco.</small><input type="text" name="code" placeholder="Cole o código ou use o link de convite"></label>'}
          <div id="cf"></div>
          <div id="msg"></div>
          <button class="btn" type="button" id="chk">Validar WhatsApp</button>
          <button class="btn primary block" type="submit">Concluir cadastro</button>
        </form>
        <p class="hint" style="margin-top:18px"><a href="#" id="out">Sair e usar outra conta</a></p>
      </section>
    </div>`;

  const f = $('#f', root);
  const cf = await mountTurnstile($('#cf', root)).catch(() => null);
  const msg = (cls, text) => { $('#msg', root).innerHTML = text ? `<div class="notice ${cls}">${esc(text)}</div>` : ''; };
  f.whatsapp.addEventListener('input', () => { f.whatsapp.value = maskPhone(f.whatsapp.value); msg('', ''); });
  $('#out', root).onclick = (e) => { e.preventDefault(); sb.auth.signOut(); };

  async function check() {
    const r = await fn('signup', { action: 'check-whatsapp', whatsapp: f.whatsapp.value });
    msg('ok', r.checked ? 'Número encontrado no WhatsApp.' : 'Número aceito. A validação automática começa quando o WhatsApp da guild estiver conectado.');
  }
  $('#chk', root).onclick = (e) => busy(e.currentTarget, () => check().catch((err) => msg('bad', err.message)));

  f.onsubmit = (e) => {
    e.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      if (cf?.enabled && !cf.token()) { msg('bad', 'Conclua a verificação de segurança.'); return; }
      try {
        await fn('signup', {
          action: 'complete',
          turnstile_token: cf?.token() || '',
          display_name: f.name.value,
          whatsapp: f.whatsapp.value,
          invite_code: invite || f.code?.value || '',
        });
      } catch (err) { cf?.reset(); msg('bad', err.message); return; }
      try { localStorage.removeItem('gm_invite'); } catch { /* */ }
      await loadProfile();
      await loadGame();
      location.hash = '#/';
    });
  };
}
