import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, can } from '../../lib/util.js';

export default async function resumo(el) {
  const head = (t, n) => sb.from(t).select('id', { count: 'exact', head: true });
  const [m, inv, ev, integ] = await Promise.all([
    head('profiles').eq('status', 'active'), head('invites').eq('active', true),
    head('events').gte('starts_at', new Date().toISOString()).eq('status', 'scheduled'),
    can('leader') ? sb.from('integration_settings').select('*').eq('id', 1).maybeSingle() : { data: null },
  ]);
  const d = state.settings.discord || {}; const i = integ.data;
  const chk = [
    ['Logo e nome da guild', !!state.settings.logo_url, '#/admin/aparencia'],
    ['Tipos de guerra com horários', ev.count > 0, '#/admin/agenda'],
    ['Discord configurado', !!(d.invite_url || d.voice_url), '#/admin/aparencia'],
    ['WhatsApp conectado', !!i?.whatsapp_connected, '#/admin/avisos'],
    ['Envio de avisos ligado', i ? !i.sends_paused : false, '#/admin/avisos'],
  ];
  el.innerHTML = `<h2>Resumo</h2><div class="stat" style="margin:16px 0 26px"><div><b>${m.count ?? 0}</b><span>membros ativos</span></div><div><b>${ev.count ?? 0}</b><span>eventos na agenda</span></div><div><b>${inv.count ?? 0}</b><span>convites ativos</span></div></div>
    ${can('leader') ? `<h3>Para deixar tudo pronto</h3><div class="rows" style="margin-top:10px">${chk.map(([t, ok, h]) => `<div><span class="st ${ok ? 'ok' : 'bad'}">${esc(t)}</span><span class="right">${ok ? '' : `<a class="btn sm" href="${h}">Configurar</a>`}</span></div>`).join('')}</div>` : ''}`;
}
