import { sb, q, fn } from '../../supabase.js?v=20261113h';
import { state } from '../../store.js?v=20261113h';
import { esc, can, fmtDateTime, fmtShort, fmtTime, clsBadge } from '../../lib/util.js?v=20261113h';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty, formData } from '../../lib/ui.js?v=20261113h';

const VARS = ['nome', 'nick', 'classe', 'evento', 'horario', 'faltam', 'link', 'guild'];
const STATE = { open: ['ok', 'Conectado'], connecting: ['', 'Aguardando leitura do QR'], close: ['bad', 'Desconectado'], not_created: ['bad', 'Instância ainda não criada'], error: ['bad', 'Não foi possível consultar'], unknown: ['', 'Desconhecido'] };
const AUD = { all: 'Todos', going: 'Quem confirmou', no_response: 'Quem não respondeu', not_going: 'Quem disse que não vai' };

export default async function avisos(el) {
  const owner = can('owner');
  let cfg, rules = [], queue = [], poll;
  async function load() {
    [cfg, rules, queue] = await Promise.all([
      q(sb.from('integration_settings').select('*').eq('id', 1)).then((r) => r[0] || {}).catch(() => ({})),
      q(sb.from('notification_rules').select('*, event_types(name)').order('created_at')),
      q(sb.from('notification_queue').select('id,status,body,send_after,sent_at,last_error,user_id').order('created_at', { ascending: false }).limit(25)),
    ]);
    draw();
  }
  function draw() {
    el.innerHTML = `<h2>WhatsApp</h2>
      <section class="plate" style="padding:20px;margin:14px 0 26px">${owner ? `<details class="adv"${cfg.evolution_base_url && cfg.evolution_instance ? '' : ' open'}><summary>Configuração técnica (só na primeira vez)</summary><form class="stack" id="cf" style="margin-top:12px"><div class="form-grid">
        <label class="f">Endereço da Evolution API<input name="url" placeholder="https://evolution.seudominio.com" value="${esc(cfg.evolution_base_url || '')}"></label>
        <label class="f">Nome da instância<input name="inst" placeholder="guilda" value="${esc(cfg.evolution_instance || '')}"></label>
        <label class="f">Intervalo entre mensagens (s)<div class="row"><input type="number" name="dmin" min="1" value="${cfg.delay_min_s ?? 4}" style="width:80px"> a <input type="number" name="dmax" min="1" value="${cfg.delay_max_s ?? 12}" style="width:80px"></div></label></div>
        <p class="muted small">A chave da API fica guardada só no servidor (segredo EVOLUTION_API_KEY do Supabase), nunca aparece aqui.</p>
        <div><button class="btn" type="submit">Salvar configuração</button></div></form></details>` : '<p class="muted">Só o dono configura a conexão.</p>'}
        <div id="conn" style="margin-top:18px"></div>
        <label class="check" style="margin-top:18px"><input type="checkbox" id="pause" ${cfg.sends_paused ? 'checked' : ''} ${owner ? '' : 'disabled'}> Pausar todos os envios</label>
        <p class="muted small">Enquanto estiver pausado, nenhum aviso sai. Comece pausado, teste, e desmarque quando estiver tudo certo.</p></section>
      <div class="row" style="justify-content:space-between"><h2>Mensagens automáticas</h2><button class="btn primary" data-a="new" type="button">Nova regra</button></div>
      <div class="rows" style="margin:14px 0 26px">${rules.length ? rules.map((r) => `<div><div><div class="name">${esc(r.name)} <span class="tag ${r.active ? 'red' : ''}">${r.active ? 'ativa' : 'desligada'}</span></div>
        <div class="sub">${esc(r.event_types?.name || {war:'Todas as guerras',boss:'Todos os bosses',event:'Todos os eventos'}[r.kind] || r.kind)} · ${r.offsets_min.map((m) => m === 0 ? 'na hora' : m + ' min antes').join(', ')} · ${AUD[r.audience]}</div></div>
        <span class="right row"><button class="btn sm" data-a="ed" data-id="${r.id}" type="button">Editar</button><button class="btn sm danger" data-a="rm" data-id="${r.id}" type="button">Excluir</button></span></div>`).join('') : empty('Nenhuma regra.')}</div>
      <h2>Últimos envios</h2><div class="rows" style="margin-top:12px">${queue.length ? queue.map((x) => `<div><div><div class="sub">${fmtDateTime(x.sent_at || x.send_after)} · <b>${{ pending: 'na fila', sending: 'enviando', sent: 'enviado', failed: 'falhou', skipped: 'ignorado' }[x.status]}</b>${x.last_error ? ' · ' + esc(x.last_error) : ''}</div>${esc((x.body || '').slice(0, 110))}</div></div>`).join('') : empty('Nada enviado ainda.')}</div>`;
    status(false);
  }
  async function status(show = true) {
    const box = el.querySelector('#conn'); if (!box || !owner) return;
    try {
      const r = await fn('whatsapp-admin', { action: 'status' });
      const [cls, label] = STATE[r.state] || STATE.unknown;
      box.innerHTML = `<span class="st ${cls}">${label}</span><div class="row" style="gap:8px;margin-top:12px">${r.state === 'open' ? '<button class="btn sm" data-a="test" type="button">Enviar teste para mim</button><button class="btn sm danger" data-a="logout" type="button">Desconectar</button>' : '<button class="btn primary" data-a="connect" type="button">Conectar por QR code</button>'}</div><div id="qr"></div>`;
      if (r.state === 'open') clearInterval(poll);
    } catch (err) { box.innerHTML = `<span class="st bad">${esc(errMsg(err))}</span>`; }
  }
  async function connect(btn) {
    const r = await fn('whatsapp-admin', { action: 'connect' });
    const qr = el.querySelector('#qr');
    if (r.state === 'open') { toast('WhatsApp já está conectado.', 'ok'); return status(); }
    qr.innerHTML = r.qr ? `<div class="qr"><img alt="QR code do WhatsApp" src="${r.qr.startsWith('data:') ? r.qr : 'data:image/png;base64,' + r.qr}" width="260" height="260"><p class="muted small">No celular: WhatsApp > Aparelhos conectados > Conectar um aparelho.${r.pairing ? ' Código: <b>' + esc(r.pairing) + '</b>' : ''}</p></div>` : '<p class="muted small">QR indisponível. Confira o endereço e a chave da API.</p>';
    clearInterval(poll); let n = 0;
    poll = setInterval(async () => { if (!el.isConnected || ++n > 30) return clearInterval(poll); const s = await fn('whatsapp-admin', { action: 'status' }).catch(() => null); if (s?.state === 'open') { clearInterval(poll); toast('WhatsApp conectado.', 'ok'); status(); } }, 4000);
  }
  function ruleForm(r) {
    const types = state.types.filter((t) => t.active);
    const m = modal(`<h3>${r ? 'Editar' : 'Nova'} regra de aviso</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Nome<input name="name" required value="${esc(r?.name || '')}"></label>
      <div class="form-grid"><label class="f">Vale para<select name="scope">${['war:Guerras'].map((s) => { const [k, n] = s.split(':'); return `<option value="k:${k}" ${!r?.event_type_id && r?.kind === k ? 'selected' : ''}>${n} (todos)</option>`; }).join('')}${types.map((t) => `<option value="t:${t.id}" ${r?.event_type_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      <label class="f">Quem recebe<select name="aud">${Object.entries(AUD).map(([k, v]) => `<option value="${k}" ${r?.audience === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label class="f">Quando avisar<small>Minutos antes do início, separados por vírgula. Use 0 para avisar na hora. Ex.: 30, 10, 0</small><input name="off" required value="${esc((r?.offsets_min || [10]).join(', '))}"></label>
      <label class="f">Só para as classes<small>Deixe em branco para todas. Ex.: TK, FM</small><input name="cls" value="${esc((r?.audience_classes || []).join(', '))}"></label>
      <label class="f">Mensagem<textarea name="tpl" rows="5" required>${esc(r?.template || 'Salve {nome}! {evento} começa às {horario} (faltam {faltam}). {link}')}</textarea></label>
      <div class="var-chips">${VARS.map((v) => `<button class="chip" type="button" data-v="${v}">{${v}}</button>`).join('')}</div>
      <div class="preview" id="pv"></div>
      <label class="check"><input type="checkbox" name="act" ${r?.active ? 'checked' : ''}> Regra ligada</label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`, { wide: true });
    const f = m.querySelector('#f'), pv = m.querySelector('#pv');
    const ex = { nome: 'Rafael', nick: 'RafaTK', classe: 'TK', evento: 'Guerra de Torres', horario: '21:00', faltam: '10 min', link: location.origin + location.pathname, guild: state.settings.guild_name };
    const prev = () => { pv.textContent = f.tpl.value.replace(/\{(\w+)\}/g, (a, k) => ex[k] ?? a); };
    f.tpl.oninput = prev; prev();
    m.querySelector('.var-chips').onclick = (e) => { const c = e.target.closest('[data-v]'); if (!c) return; const t = f.tpl, s = t.selectionStart; t.value = t.value.slice(0, s) + `{${c.dataset.v}}` + t.value.slice(t.selectionEnd); t.focus(); prev(); };
    m.querySelector('[data-x]').onclick = closeModal;
    f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const off = [...new Set(f.off.value.split(/[,\s]+/).filter(Boolean).map(Number))];
      if (!off.length || off.some((n) => !Number.isInteger(n) || n < 0 || n > 10080)) { toast('Use só números de minutos, como 30, 10, 0.', 'bad'); return; }
      const [k, v] = f.scope.value.split(':'); const t = k === 't' ? state.types.find((x) => x.id === +v) : null;
      const row = { name: f.name.value, kind: t ? t.kind : v, event_type_id: t ? t.id : null, audience: f.aud.value, offsets_min: off, audience_classes: f.cls.value.split(/[,\s]+/).filter(Boolean).map((s) => s.toUpperCase()), template: f.tpl.value, active: f.act.checked, updated_at: new Date().toISOString() };
      await q(r ? sb.from('notification_rules').update(row).eq('id', r.id) : sb.from('notification_rules').insert(row));
      closeModal(); toast('Regra salva.', 'ok'); await load(); }); };
  }
  el.onsubmit = (e) => {
    if (e.target.id !== 'cf') return; e.preventDefault(); const d = formData(e.target);
    busy(e.target.querySelector('button'), async () => {
      await q(sb.from('integration_settings').update({ evolution_base_url: d.url.trim().replace(/\/$/, '') || null, evolution_instance: d.inst.trim() || null, delay_min_s: +d.dmin, delay_max_s: Math.max(+d.dmin, +d.dmax) }).eq('id', 1));
      toast('Configuração salva.', 'ok'); await load(); });
  };
  el.onchange = async (e) => { if (e.target.id !== 'pause') return; try { await q(sb.from('integration_settings').update({ sends_paused: e.target.checked }).eq('id', 1)); toast(e.target.checked ? 'Envios pausados.' : 'Envios ligados.', 'ok'); } catch (err) { toast(errMsg(err), 'bad'); e.target.checked = !e.target.checked; } };
  el.onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    try {
      if (a === 'new') ruleForm(null);
      else if (a === 'ed') ruleForm(rules.find((r) => r.id === b.dataset.id));
      else if (a === 'rm' && await confirmBox('Excluir esta regra?', 'Excluir')) { await q(sb.from('notification_rules').delete().eq('id', b.dataset.id)); await load(); }
      else if (a === 'connect') await busy(b, () => connect(b));
      else if (a === 'logout' && await confirmBox('Desconectar o WhatsApp da guild?', 'Desconectar')) { await fn('whatsapp-admin', { action: 'logout' }); await status(); }
      else if (a === 'test') { await busy(b, () => fn('whatsapp-admin', { action: 'test' })); toast('Mensagem de teste enviada para o seu número.', 'ok'); }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  await load();
  return () => clearInterval(poll);
}
