import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { can, esc, md, mainChar, fmtDate, fmtTime, relDay, clsRgb, clsIcon, className, every } from '../lib/util.js';
import { plate, empty } from '../lib/ui.js';
import { sceneHTML } from '../layout.js';
import { lobbyLayout } from '../lib/features.js';
import { renderBlock } from '../lib/blocks.js';
import { callPlate, bindRsvp, rsvpButtons, rsvpState } from '../lib/rsvp.js';
import { charsPanel } from '../lib/characters.js';
import { attendanceStats } from '../lib/stats.js';

export default async function lobby(root) {
  const main = mainChar(state.chars);
  const t = state.settings.texts;
  root.innerHTML = `<header class="hero"><div class="scene-wrap">${sceneHTML()}</div><div class="wrap hero-in" id="hero"></div></header><div class="wrap" id="body"></div>`;
  const hero = root.querySelector('#hero'), body = root.querySelector('#body');
  bindRsvp(root, load);
  let charsLoaded = false;

  async function load() {
    const [evs, rs, ann, people, att] = await Promise.all([
      q(sb.from('events').select('*, event_types(*)').neq('status', 'cancelled').gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('starts_at').limit(40)),
      q(sb.from('event_rsvps').select('event_id,status,user_id')),
      q(sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4)),
      q(sb.from('profiles').select('id,display_name,characters(*)').eq('status', 'active')),
      attendanceStats(30).catch(() => ({ total: 0, per: {}, pct: () => 0 })),
    ]);
    const mine = Object.fromEntries(rs.filter((r) => r.user_id === state.user.id).map((r) => [r.event_id, r.status]));
    const war = evs.find((e) => e.event_types?.kind === 'war' && new Date(e.rsvp_closes_at || e.starts_at) > Date.now() - 3600e3);
    let tally = null, going = 0;
    if (war) {
      const wr = rs.filter((r) => r.event_id === war.id);
      going = wr.filter((r) => r.status === 'going').length;
      const no = wr.filter((r) => r.status === 'not_going').length;
      tally = { going, not_going: no, none: Math.max(0, people.length - going - no) };
    }
    const open = war && rsvpState(war) === 'open';
    hero.innerHTML = `<div>
        ${war ? `<span class="kicker rise"><i></i>${open ? 'Chamada aberta' : 'Próxima guerra'}</span>` : ''}
        <h1 class="rise">${esc(state.settings.guild_name)}</h1>
        <p class="tagline rise d1">Salve, ${esc(main?.nick || state.profile.display_name)}. ${esc(t.hero_tagline)}</p></div>
      ${war ? `<aside class="nextwar rise d2"><small>${esc(war.event_types?.name || 'Guerra')}</small><h3>${esc(war.title)}</h3>
        <div class="big" data-cd="${war.starts_at}" data-done="É AGORA">--</div>
        <p class="sub">${relDay(war.starts_at)}, às ${fmtTime(war.starts_at)} · ${going} confirmados</p>${war.bet_closes_at && new Date(war.bet_closes_at) > Date.now() ? `<p class="sub">Aposta fecha em <b data-cd="${war.bet_closes_at}" data-done="encerrada"></b></p>` : ''}
        <div class="acts">${rsvpButtons(war, mine[war.id], { go: 'Eu vou', no: 'Não vou' })}</div></aside>` : ''}`;

    const mains = people.map((p) => mainChar(p.characters)).filter(Boolean);
    const classes = state.classes.filter((c) => c.active);
    const pct = people.length ? Math.round(people.reduce((a, p) => a + att.pct(p.id), 0) / people.length) : 0;
    const rank = people.map((p) => ({ p, ch: mainChar(p.characters), n: att.per[p.id] || 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
    const others = evs.filter((e) => e !== war && new Date(e.starts_at) < Date.now() + 36 * 3600e3).slice(0, 6);
    const podiumOrder = rank.length === 3 ? [rank[1], rank[0], rank[2]] : rank;

    const S = {
      pulse: () => `<div class="section"><div class="pulse">
        <div><b>${people.length}</b><span>Guerreiros</span></div>
        <div><b>${going}</b><span>Confirmados</span></div>
        <div><b>${mains.length}</b><span>Mains na guild</span></div>
        <div><b>${att.total ? pct + '%' : '-'}</b><span>Presença em 30 dias</span></div></div></div>`,
      call: () => (war ? `<div class="section"><h2>Chamada de guerra</h2>${callPlate(war, mine[war.id], tally)}</div>` : ''),
      classes: () => `<div class="section"><h2>Classes</h2><div class="legion">${classes.map((c) => {
        const list = mains.filter((m) => m.class_code === c.code);
        const lin = state.lineages.filter((l) => l.class_code === c.code && l.active).map((l) => [l.name, list.filter((m) => m.lineage_id === l.id).length]);
        const share = mains.length ? Math.round((list.length / mains.length) * 100) : 0;
        return `<div class="pillar" style="--c:${clsRgb(c.code)}"><span class="glyph">${clsIcon(c.code)}</span><div class="code">${esc(c.code)}</div><div class="nm">${esc(c.name)}</div>
          <div class="n">${list.length}<small>${share}% da guild</small></div><div class="bar"><i style="width:${share}%"></i></div>
          <ul>${lin.map(([n, v]) => `<li><span>${esc(n)}</span><b>${v}</b></li>`).join('')}</ul></div>`;
      }).join('')}</div></div>`,
      podium: () => `${podiumOrder.length ? `<div class="section"><h2>Os mais presentes</h2><div class="podium">${podiumOrder.map((x) => { const pos = rank.indexOf(x) + 1;
        return `<div class="pl p${pos}" style="--c:${x.ch ? clsRgb(x.ch.class_code) : '163,151,135'}"><span class="medal">${pos}</span>${x.ch ? `<div style="width:30px;height:30px;margin:0 auto;color:rgb(${clsRgb(x.ch.class_code)})">${clsIcon(x.ch.class_code)}</div>` : ''}<div class="nm">${esc(x.ch?.nick || x.p.display_name)}</div><div class="pc">${att.pct(x.p.id)}%<small>${x.n} de ${att.total} guerras</small></div></div>`; }).join('')}</div>
        <p class="muted small"><a href="#/ranking">Ver ranking completo</a></p></div>` : ''}`,
      announcements: () => `${ann.length ? `<div class="section"><h2>Avisos</h2><div class="stack">${ann.map((a) => plate(`<h3>${a.pinned ? '<span class="tag red">Fixado</span> ' : ''}${esc(a.title)}</h3><div class="md">${md(a.body || '')}</div><p class="muted small">${fmtDate(a.created_at)}</p>`)).join('')}</div></div>` : ''}`,
      timeline: () => `<div class="section"><h2>Próximas horas</h2>${others.length ? `<div class="timeline">${others.map((e) => `<div class="tl" style="--tc:${esc(e.event_types?.color || '#d4a017')}"><time>${relDay(e.starts_at)} · ${fmtTime(e.starts_at)}</time><h4>${esc(e.title)}</h4><div class="cd">começa em <span data-cd="${e.starts_at}" data-done="agora"></span></div>${rsvpState(e) === 'open' && e.event_types?.rsvp_enabled !== false ? `<div style="margin-top:8px;display:flex;gap:8px">${rsvpButtons(e, mine[e.id], { compact: true })}</div>` : ''}</div>`).join('')}</div>` : empty('Nada marcado para as próximas 36 horas.')}</div>`,
      chars: () => `<div class="section"><h2>Seus personagens</h2>${plate('<div id="chars"></div>')}</div>`,
      discord: () => `${state.settings.discord?.invite_url ? `<div class="section">${plate(`<h3>Chamada de voz</h3><p class="muted">A guerra acontece no Discord.</p><p style="margin-top:12px"><a class="btn" href="${esc(state.settings.discord.invite_url)}" target="_blank" rel="noopener">Entrar no Discord</a></p>`)}</div>` : ''}`,
    };
    body.innerHTML = `${state.chars.length ? '' : '<div class="notice bad section">Você ainda não cadastrou um personagem. Cadastre o seu nick abaixo para aparecer nas chamadas.</div>'}
      ${lobbyLayout().filter((b) => b.on !== false && can(b.min_role || 'member')).map((b) => (b.custom ? `<div class="section">${renderBlock(b)}</div>` : S[b.id]?.() || '')).join('')}`;
    const el = body.querySelector('#chars');
    if (el) charsPanel(el, state.user.id);
  }
  await load();
  return every(60000, load);
}
