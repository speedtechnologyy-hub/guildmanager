import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { esc, md, mainChar, nickOf, fmtDate, every } from '../lib/util.js';
import { plate, empty, orn } from '../lib/ui.js';
import { sceneHTML } from '../layout.js';
import { callPlate, evRow, bindRsvp } from '../lib/rsvp.js';
import { charsPanel } from '../lib/characters.js';

export default async function lobby(root) {
  const main = mainChar(state.chars);
  const t = state.settings.texts;
  root.innerHTML = `
    <header class="hero"><div class="scene-wrap">${sceneHTML()}</div>
      <div class="wrap hero-in">
        <h1 class="rise">${esc(state.settings.guild_name)}</h1>
        <p class="tagline rise">Salve, ${esc(main?.nick || state.profile.display_name)}. ${esc(t.hero_tagline)}</p>
      </div></header>
    <div class="wrap" id="body"></div>`;
  const body = root.querySelector('#body');
  bindRsvp(body, load);

  async function load() {
    const now = new Date().toISOString();
    const [evs, rs, ann] = await Promise.all([
      q(sb.from('events').select('*, event_types(*)').neq('status', 'cancelled').gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('starts_at').limit(30)),
      q(sb.from('event_rsvps').select('event_id,status,user_id')),
      q(sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4)),
    ]);
    const mine = Object.fromEntries(rs.filter((r) => r.user_id === state.user.id).map((r) => [r.event_id, r.status]));
    const war = evs.find((e) => e.event_types?.kind === 'war' && new Date(e.rsvp_closes_at || e.starts_at) > new Date(now) - 3600e3);
    let tally = null;
    if (war) {
      const wr = rs.filter((r) => r.event_id === war.id);
      const total = (await q(sb.from('profiles').select('id', { count: 'exact', head: false }).eq('status', 'active'))).length;
      const going = wr.filter((r) => r.status === 'going').length, no = wr.filter((r) => r.status === 'not_going').length;
      tally = { going, not_going: no, none: Math.max(0, total - going - no) };
    }
    const others = evs.filter((e) => e !== war).slice(0, 6);
    body.innerHTML = `
      ${state.chars.length ? '' : '<div class="notice bad section">Você ainda não cadastrou um personagem. Cadastre o seu nick abaixo para aparecer nas chamadas.</div>'}
      <div class="section">${war ? callPlate(war, mine[war.id], tally) : plate('<h2>Sem guerra marcada</h2><p class="muted">Assim que a liderança definir a próxima guerra, a chamada aparece aqui.</p>')}</div>
      ${ann.length ? `<div class="section"><h2>Avisos</h2><div class="stack">${ann.map((a) => plate(`<h3>${a.pinned ? '<span class="tag red">Fixado</span> ' : ''}${esc(a.title)}</h3><div class="md">${md(a.body || '')}</div><p class="muted small">${fmtDate(a.created_at)}</p>`)).join('')}</div></div>` : ''}
      <div class="section"><h2>Próximos compromissos</h2>${others.length ? `<div class="stack">${others.map((e) => evRow(e, mine[e.id])).join('')}</div>` : empty('Nada marcado por enquanto.')}</div>
      ${orn}
      <div class="section"><h2>Seus personagens</h2>${plate('<div id="chars"></div>')}</div>
      ${state.settings.discord?.invite_url ? `<div class="section">${plate(`<h3>Chamada de voz</h3><p class="muted">A guerra acontece no Discord.</p><p style="margin-top:12px"><a class="btn" href="${esc(state.settings.discord.invite_url)}" target="_blank" rel="noopener">Entrar no Discord</a></p>`)}</div>` : ''}`;
    const el = body.querySelector('#chars');
    if (el) charsPanel(el, state.user.id);
  }
  await load();
  return every(60000, load);
}
