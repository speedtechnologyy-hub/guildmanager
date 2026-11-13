import { sb, q } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, clsBadge, clsRgb, clsIcon, crown, lineageName, className, mainChar, debounce, roleLabel, fmtDate } from '../lib/util.js?v=20261113h';
import { empty, modal } from '../lib/ui.js?v=20261113h';
import { attendanceStats } from '../lib/stats.js?v=20261113h';

export default async function members(root) {
  const [people, att] = await Promise.all([
    q(sb.from('profiles').select('id,display_name,role,sub_slot,status,joined_at,characters(*)').eq('status', 'active').order('display_name')),
    attendanceStats(30).catch(() => ({ total: 0, per: {}, pct: () => 0 })),
  ]);
  let cls = 'all', term = '';
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Membros</h1><p>${people.length} guerreiros na guild.</p></div>
    <div class="legion" id="lg" style="margin-bottom:26px"></div>
    <label class="f"><input type="search" id="s" placeholder="Buscar por nick ou nome"></label>
    <div class="filters" id="fl" style="margin:12px 0 18px"></div><div id="v"></div></div>`;
  const mains = people.map((p) => mainChar(p.characters)).filter(Boolean);
  root.querySelector('#lg').innerHTML = state.classes.filter((c) => c.active).map((c) => {
    const n = mains.filter((m) => m.class_code === c.code).length;
    return `<div class="pillar" style="--c:${clsRgb(c.code)};padding:16px 18px"><span class="glyph" style="width:90px;height:90px">${clsIcon(c.code)}</span><div class="code" style="font-size:1.8rem">${esc(c.code)}</div><div class="n" style="margin-top:8px">${n}<small>${esc(c.name)}</small></div></div>`;
  }).join('');
  function draw() {
    root.querySelector('#fl').innerHTML = [['all', 'Todos'], ...state.classes.filter((c) => c.active).map((c) => [c.code, c.code])].map(([k, n]) => `<button class="chip ${cls === k ? 'on' : ''}" data-c="${esc(k)}" type="button">${esc(n)}</button>`).join('');
    const t = term.toLowerCase();
    const list = people.filter((p) => (cls === 'all' || p.characters.some((c) => c.class_code === cls)) && (!t || p.display_name.toLowerCase().includes(t) || p.characters.some((c) => c.nick.toLowerCase().includes(t))));
    root.querySelector('#v').innerHTML = list.length ? `<div class="mgrid">${list.map((p) => {
      const m = mainChar(p.characters);
      return `<button class="mcard" data-id="${p.id}" type="button" style="--c:${m ? clsRgb(m.class_code) : '163,151,135'}">${m ? `<span class="glyph">${clsIcon(m.class_code)}</span>` : ''}
        <div class="nick">${crown(p.role)} ${esc(m?.nick || p.display_name)}</div>
        <div class="meta">${m ? clsBadge(m.class_code) + ' ' + esc(lineageName(m.lineage_id) || className(m.class_code)) + (m.level ? ' · lv ' + m.level : '') : 'sem personagem'}</div>
        <div class="att">Presença em 30 dias: <b>${att.total ? att.pct(p.id) + '%' : '-'}</b>${att.total ? `<span class="pct"><i style="width:${att.pct(p.id)}%"></i></span>` : ''}</div></button>`;
    }).join('')}</div>` : empty('Ninguém encontrado.');
  }
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]'); if (c) { cls = c.dataset.c; draw(); return; }
    const card = e.target.closest('.mcard'); if (!card) return;
    const p = people.find((x) => x.id === card.dataset.id);
    modal(`<h3>${crown(p.role)} ${esc(mainChar(p.characters)?.nick || p.display_name)}</h3><p class="muted small">${esc(p.display_name)} · ${roleLabel(p.role, p.sub_slot)} · na guild desde ${fmtDate(p.joined_at)}</p>
      <div class="stat" style="margin:16px 0"><div><b>${att.total ? att.pct(p.id) + '%' : '-'}</b><span>presença 30 dias</span></div><div><b>${att.per[p.id] || 0}</b><span>guerras</span></div><div><b>${p.characters.length}</b><span>personagens</span></div></div>
      <div class="rows">${p.characters.map((c) => `<div>${clsBadge(c.class_code)}<div><div class="name">${esc(c.nick)} ${c.is_main ? '<span class="tag red">Main</span>' : ''}</div><div class="sub">${esc(lineageName(c.lineage_id) || className(c.class_code))}${c.level ? ', level ' + c.level : ''}</div></div></div>`).join('') || empty('Sem personagens.')}</div>`);
  });
  root.querySelector('#s').oninput = debounce((e) => { term = e.target.value; draw(); }, 150);
  draw();
}
