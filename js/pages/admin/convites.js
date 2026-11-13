import { sb, q } from '../../supabase.js?v=20261113h';
import { state } from '../../store.js?v=20261113h';
import { esc, can, copyText, fmtDateTime, ROLE_LABEL, roleLabel } from '../../lib/util.js?v=20261113h';
import { refreshPending } from '../../lib/pending.js?v=20261113h';
import { toast, modal, closeModal, busy, formData, confirmBox, empty, errMsg } from '../../lib/ui.js?v=20261113h';

const code = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const base = () => (state.settings.site_url || location.origin + location.pathname).replace(/\/$/, '').replace(/index\.html$/, '');

export default async function convites(el) {
  async function load() {
    const [inv, pend, waiting] = await Promise.all([
      q(sb.from('invites').select('*').order('created_at', { ascending: false })),
      q(sb.from('pending_members').select('*').order('created_at', { ascending: false })),
      q(sb.from('profiles').select('id,display_name,created_at').eq('status', 'pending').order('created_at')),
    ]);
    const wa = waiting.length ? Object.fromEntries((await q(sb.from('profile_private').select('id,whatsapp').in('id', waiting.map((w) => w.id)))).map((r) => [r.id, r.whatsapp])) : {};
    const waitBox = waiting.length ? `<section class="plate" style="padding:20px;margin-bottom:24px"><h3>Aguardando aprovação (${waiting.length})</h3><p class="muted small">Essas pessoas entraram pelo link de cadastro. Só liberam o acesso depois que você aprovar.</p>
      <div class="rows" style="margin-top:12px">${waiting.map((w) => `<div><div><div class="name">${esc(w.display_name)}</div><div class="sub">WhatsApp ${esc(wa[w.id] || 'não informado')} · ${w.created_at ? `pediu em ${fmtDateTime(w.created_at)}` : ""}</div></div>
        <span class="right row"><button class="btn sm primary" data-ok="${w.id}" type="button">Aprovar</button><button class="btn sm danger" data-no="${w.id}" type="button">Recusar</button></span></div>`).join('')}</div></section>` : '';
    const perm = inv.find((i) => i.label === 'Link de cadastro' && i.active && !i.max_uses && !i.expires_at && i.role_on_join === 'member');
    const permBox = perm
      ? `<section class="plate" style="padding:20px"><h3>Link de cadastro</h3><p class="muted small">Envie este link para quem vai entrar na guild. Cada pessoa cria o acesso e cadastra o personagem sozinha, e você acompanha tudo em Membros.</p>
          <div class="row" style="margin-top:12px"><input readonly value="${esc(`${base()}/#/convite/${perm.code}`)}" style="flex:1;min-width:200px" aria-label="Link de cadastro"><button class="btn primary" data-copy="${esc(`${base()}/#/convite/${perm.code}`)}" type="button">Copiar link</button></div>
          <p class="muted small" style="margin-top:8px">${perm.uses} cadastros por este link. Para parar de aceitar, desative-o na lista abaixo.</p></section>`
      : `<section class="plate" style="padding:20px"><h3>Link de cadastro</h3><p class="muted small">Gere um link fixo para enviar a quem vai entrar na guild. Sem validade e sem limite de usos.</p><div style="margin-top:12px"><button class="btn primary" id="mkperm" type="button">Gerar link de cadastro</button></div></section>`;
    el.innerHTML = `${waitBox}${permBox}<div class="row" style="justify-content:space-between;margin-top:30px"><h2>Todos os links de convite</h2><button class="btn primary" id="new" type="button">Criar link</button></div>
      <p class="muted small">Quem entra pelo link cria o acesso com Google ou Discord e cadastra o WhatsApp.</p>
      <div class="rows" style="margin:14px 0 30px">${inv.length ? inv.map((i) => {
        const exp = i.expires_at && new Date(i.expires_at) < new Date(), full = i.max_uses && i.uses >= i.max_uses;
        const on = i.active && !exp && !full; const url = `${base()}/#/convite/${i.code}`;
        return `<div><div><div class="name">${esc(i.label || 'Convite')} <span class="tag ${on ? 'red' : ''}">${on ? 'ativo' : exp ? 'expirado' : full ? 'esgotado' : 'desativado'}</span></div>
          <div class="sub">${i.uses}${i.max_uses ? '/' + i.max_uses : ''} usos · entra como ${roleLabel(i.role_on_join)} · ${i.expires_at ? 'expira ' + fmtDateTime(i.expires_at) : 'não expira'}</div></div>
          <span class="right row"><button class="btn sm" data-copy="${esc(url)}" type="button">Copiar link</button><button class="btn sm" data-tg="${i.id}" data-on="${i.active}" type="button">${i.active ? 'Desativar' : 'Reativar'}</button><button class="btn sm danger" data-del="${i.id}" type="button">Excluir</button></span></div>`;
      }).join('') : empty('Nenhum link criado.')}</div>
      <div class="row" style="justify-content:space-between"><h2>Cadastro manual</h2><button class="btn" id="pm" type="button">Cadastrar membro</button></div>
      <p class="muted small">Informe o e-mail do Google ou o ID do Discord da pessoa. Quando ela entrar, já cai com o papel e o nick definidos aqui.</p>
      <div class="rows" style="margin-top:14px">${pend.length ? pend.map((p) => `<div><div><div class="name">${esc(p.display_name)} ${p.nick ? '· ' + esc(p.nick) : ''}</div><div class="sub">${esc(p.google_email || 'Discord ' + p.discord_id)} · ${roleLabel(p.role)} · ${p.claimed_by ? 'já entrou' : 'aguardando'}</div></div>
        <span class="right">${p.claimed_by ? '' : `<button class="btn sm danger" data-dp="${p.id}" type="button">Remover</button>`}</span></div>`).join('') : empty('Nenhum cadastro manual pendente.')}</div>`;
  }
  el.onclick = async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    try {
      if (t.dataset.ok) { await q(sb.from('profiles').update({ status: 'active' }).eq('id', t.dataset.ok)); refreshPending(true); toast('Cadastro aprovado. A pessoa já pode entrar.', 'ok'); await load(); }
      else if (t.dataset.no && await confirmBox('Recusar este cadastro? A pessoa não terá acesso.', 'Recusar')) { await q(sb.from('profiles').update({ status: 'inactive' }).eq('id', t.dataset.no)); refreshPending(true); toast('Cadastro recusado.', 'ok'); await load(); }
      else if (t.dataset.copy) { await copyText(t.dataset.copy); toast('Link copiado.', 'ok'); }
      else if (t.dataset.tg) { await q(sb.from('invites').update({ active: t.dataset.on !== 'true' }).eq('id', t.dataset.tg)); await load(); }
      else if (t.dataset.del && await confirmBox('Excluir este convite?', 'Excluir')) { await q(sb.from('invites').delete().eq('id', t.dataset.del)); await load(); }
      else if (t.dataset.dp) { await q(sb.from('pending_members').delete().eq('id', t.dataset.dp)); await load(); }
      else if (t.id === 'mkperm') { await q(sb.from('invites').insert({ code: code(), label: 'Link de cadastro', role_on_join: 'member', max_uses: null, expires_at: null, created_by: state.user.id })); toast('Link gerado.', 'ok'); await load(); }
      else if (t.id === 'new') newInvite(); else if (t.id === 'pm') manual();
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  function newInvite() {
    const m = modal(`<h3>Novo link de convite</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Nome do link<input name="label" placeholder="Ex.: Recrutamento de novembro" maxlength="60"></label>
      <div class="form-grid"><label class="f">Validade<select name="exp"><option value="">Sem validade</option><option value="1">1 hora</option><option value="24">24 horas</option><option value="168">7 dias</option><option value="720">30 dias</option></select></label>
      <label class="f">Máximo de usos<input type="number" name="max" min="1" placeholder="Ilimitado"></label>
      <label class="check"><input type="checkbox" name="approval" checked> Exigir aprovação da liderança antes de liberar o acesso</label>
      ${can('master') ? `<label class="f">Entra como<select name="role"><option value="member">Membro</option><option value="leader">Sub Líder</option></select></label>` : ''}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Criar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    f.onsubmit = (ev) => { ev.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const d = formData(f);
      await q(sb.from('invites').insert({ code: code(), label: d.label || null, role_on_join: d.role || 'member', requires_approval: f.approval.checked, max_uses: d.max ? +d.max : null, expires_at: d.exp ? new Date(Date.now() + d.exp * 3600e3).toISOString() : null, created_by: state.user.id }));
      closeModal(); toast('Link criado.', 'ok'); await load(); }); };
  }
  function manual() {
    const m = modal(`<h3>Cadastrar membro</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Nome<input name="display_name" required maxlength="40"></label>
      <label class="f">Nick no jogo<input name="nick" maxlength="30"></label>
      <label class="f">Classe<select name="class_code"><option value="">Definir depois</option>${state.classes.filter((c) => c.active).map((c) => `<option value="${esc(c.code)}">${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f">E-mail do Google<input type="email" name="google_email"></label>
      <label class="f">ou ID do Discord<input name="discord_id" inputmode="numeric"></label>
      ${can('master') ? `<label class="f">Papel<select name="role">${Object.entries(ROLE_LABEL).filter(([k]) => k !== 'owner' || can('master')).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Cadastrar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    f.onsubmit = (ev) => { ev.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const d = formData(f);
      if (!d.google_email && !d.discord_id) { toast('Informe o e-mail do Google ou o ID do Discord.', 'bad'); return; }
      await q(sb.from('pending_members').insert({ display_name: d.display_name, nick: d.nick || null, class_code: d.class_code || null, role: d.role || 'member', google_email: d.google_email?.trim().toLowerCase() || null, discord_id: d.discord_id?.trim() || null }));
      closeModal(); toast('Membro cadastrado. Ele já pode entrar.', 'ok'); await load(); }); };
  }
  await load();
}
