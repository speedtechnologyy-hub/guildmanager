import { sb, q, fn } from '../supabase.js';
import { state, loadProfile } from '../store.js';
import { esc, $, maskPhone, fmtPhone } from '../lib/util.js';
import { plate, busy, toast, errMsg, formData } from '../lib/ui.js';
import { charsPanel } from '../lib/characters.js';

export default async function profile(root) {
  const priv = (await q(sb.from('profile_private').select('*').eq('id', state.user.id)))[0] || {};
  const prefs = { war: true, boss: true, event: true, ...(priv.notify_prefs || {}) };
  const ids = state.session?.user?.identities || [];
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Meu perfil</h1></div><div class="stack">
    ${plate(`<h3>Dados</h3><form class="stack" id="pf" style="margin-top:12px"><label class="f">Nome<input name="name" required minlength="2" maxlength="40" value="${esc(state.profile.display_name)}"></label>
      <button class="btn primary" type="submit">Salvar nome</button></form>`)}
    ${plate(`<h3>WhatsApp</h3><p class="muted small">${priv.whatsapp ? 'Cadastrado: ' + esc(fmtPhone(priv.whatsapp)) + (priv.whatsapp_verified_at ? ' (verificado)' : '') : 'Nenhum número cadastrado.'}</p>
      <form class="stack" id="wf" style="margin-top:12px"><label class="f">Novo número com DDD<input name="w" type="tel" inputmode="numeric" placeholder="(48) 99999-9999" required></label><button class="btn" type="submit">Trocar número</button></form>`)}
    ${plate(`<h3>Avisos por WhatsApp</h3><div class="stack" style="margin-top:10px">${[['war', 'Guerras'], ['boss', 'Bosses'], ['event', 'Eventos']].map(([k, n]) => `<label class="check"><input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}> ${n}</label>`).join('')}</div>`)}
    ${plate(`<h3>Personagens</h3><div id="chars" style="margin-top:12px"></div>`)}
    ${plate(`<h3>Contas de login</h3><p class="muted small">${ids.map((i) => esc(i.provider)).join(', ') || '-'}</p><div class="row" style="margin-top:10px;gap:8px">${['google', 'discord'].filter((p) => !ids.some((i) => i.provider === p)).map((p) => `<button class="btn sm" data-link="${p}" type="button">Vincular ${p === 'google' ? 'Google' : 'Discord'}</button>`).join('')}</div>`)}
    </div></div>`;
  charsPanel($('#chars', root), state.user.id);
  $('#pf', root).onsubmit = (e) => { e.preventDefault(); busy(e.target.querySelector('button'), async () => {
    await q(sb.from('profiles').update({ display_name: formData(e.target).name.trim() }).eq('id', state.user.id));
    await loadProfile(); toast('Nome atualizado.', 'ok'); }); };
  const wf = $('#wf', root);
  wf.w.oninput = () => { wf.w.value = maskPhone(wf.w.value); };
  wf.onsubmit = (e) => { e.preventDefault(); busy(wf.querySelector('button'), async () => {
    try { await fn('signup', { action: 'set-whatsapp', whatsapp: wf.w.value }); toast('WhatsApp atualizado.', 'ok'); setTimeout(() => location.reload(), 600); } catch (err) { toast(errMsg(err), 'bad'); } }); };
  root.addEventListener('change', async (e) => {
    const c = e.target.closest('[data-pref]'); if (!c) return;
    prefs[c.dataset.pref] = c.checked;
    try { await q(sb.from('profile_private').update({ notify_prefs: prefs }).eq('id', state.user.id)); toast('Preferência salva.', 'ok'); } catch (err) { toast(errMsg(err), 'bad'); c.checked = !c.checked; }
  });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-link]'); if (!b) return;
    const { error } = await sb.auth.linkIdentity({ provider: b.dataset.link, options: { redirectTo: location.origin + location.pathname } });
    if (error) toast(errMsg(error), 'bad');
  });
}
