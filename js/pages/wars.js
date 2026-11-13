import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { esc, clsBadge, className, lineageName, clsRgb, nickOf, mainChar, fmtShort, fmtTime } from '../lib/util.js';
import { plate, empty, loadingHTML } from '../lib/ui.js';
import { callPlate, bindRsvp } from '../lib/rsvp.js';

export default async function wars(root, [slug]) {
  const types = state.types.filter((t) => t.kind === 'war' && t.active);
  if (!types.length) { root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Guerras</h1></div>' + empty('Nenhum tipo de guerra configurado.') + '</div>'; return; }
  const cur = types.find((t) => t.slug === slug) || types[0];
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Guerras</h1><p>Quem vai, quem não vai e quem ainda não respondeu.</p></div>
    <nav class="tabs">${types.map((t) => `<a href="#/guerras/${esc(t.slug)}" class="${t.id === cur.id ? 'on' : ''}">${esc(t.name)}</a>`).join('')}</nav>
    <div id="v">${loadingHTML}</div></div>`;
  const v = root.querySelector('#v');
  bindRsvp(v, load);

  const row = (p, ch) => `<div>${clsBadge(ch?.class_code)}<div><div class="name">${esc(ch?.nick || p.display_name)}</div><div class="sub">${esc(ch ? (lineageName(ch.lineage_id) || className(ch.class_code)) + (ch.level ? ', lv ' + ch.level : '') : 'sem personagem')}</div></div></div>`;
  const mix = (list) => {
    const c = {}; list.forEach((x) => { const k = x.ch?.class_code; if (k) c[k] = (c[k] || 0) + 1; });
    const ks = Object.keys(c);
    return ks.length ? `<div class="mix">${ks.map((k) => `<i style="--c:${clsRgb(k)};flex:${c[k]}"></i>`).join('')}</div><div class="mixlegend">${ks.map((k) => `${clsBadge(k)}<span class="muted small">${c[k]}</span>`).join('')}</div>` : '';
  };

  async function load() {
    const evs = await q(sb.from('events').select('*, event_types(*)').eq('event_type_id', cur.id).neq('status', 'cancelled').order('starts_at', { ascending: false }).limit(12));
    const next = [...evs].reverse().find((e) => new Date(e.starts_at) > Date.now() - 3 * 3600e3) || evs[0];
    if (!next) { v.innerHTML = empty('Ainda não há guerra desse tipo na agenda.'); return; }
    const [rs, people, hist] = await Promise.all([
      q(sb.from('event_rsvps').select('user_id,status,character_id').eq('event_id', next.id)),
      q(sb.from('profiles').select('id,display_name,characters(*)').eq('status', 'active')),
      q(sb.from('event_attendance').select('event_id,user_id,attended').in('event_id', evs.map((e) => e.id))),
    ]);
    const st = Object.fromEntries(rs.map((r) => [r.user_id, r]));
    const rows = people.map((p) => {
      const r = st[p.id]; const ch = p.characters.find((c) => c.id === r?.character_id) || mainChar(p.characters);
      return { p, ch, s: r?.status || 'none' };
    }).sort((a, b) => (a.ch?.nick || a.p.display_name).localeCompare(b.ch?.nick || b.p.display_name));
    const g = (s) => rows.filter((x) => x.s === s);
    const going = g('going'), no = g('not_going'), none = g('none');
    const mine = st[state.user.id]?.status;
    const col = (title, list, cls) => plate(`<h3 class="${cls}">${title} <em>${list.length}</em></h3>${mix(list)}${list.length ? `<div class="rows">${list.map((x) => row(x.p, x.ch)).join('')}</div>` : empty('Ninguém por aqui.')}`, cls);

    const done = evs.filter((e) => e.status === 'done' || new Date(e.starts_at) < new Date());
    const att = {}; hist.forEach((h) => { if (h.attended) att[h.user_id] = (att[h.user_id] || 0) + 1; });
    const rank = people.map((p) => ({ p, n: att[p.id] || 0, ch: mainChar(p.characters) })).sort((a, b) => b.n - a.n);
    v.innerHTML = `${callPlate(next, mine, { going: going.length, not_going: no.length, none: none.length })}
      <div class="roster section"><div class="go">${col('Vão', going, 'go')}</div><div class="no">${col('Não vão', no, 'no')}</div><div>${col('Sem resposta', none, '')}</div></div>
      <div class="section"><h2>Presença nas últimas ${done.length} guerras</h2>${done.length ? plate(`<div class="tbl-wrap"><table><thead><tr><th>Membro</th><th>Presenças</th><th>Taxa</th></tr></thead><tbody>${rank.map((r) => {
        const pc = Math.round((r.n / done.length) * 100);
        return `<tr><td>${clsBadge(r.ch?.class_code)} ${esc(r.ch?.nick || r.p.display_name)}</td><td>${r.n}/${done.length}</td><td><span class="pct"><i style="width:${pc}%"></i></span>${pc}%</td></tr>`;
      }).join('')}</tbody></table></div>`) : empty('O histórico aparece depois da primeira guerra com presença marcada.')}</div>`;
  }
  await load();
  const ch = sb.channel('wars-' + cur.id).on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, () => load()).subscribe();
  return () => sb.removeChannel(ch);
}
