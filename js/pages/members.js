import { sb, q } from '../supabase.js';
import { state } from '../store.js';
import { esc, clsBadge, clsRgb, crown, lineageName, className, mainChar, initial, can, debounce, ROLE_LABEL } from '../lib/util.js';
import { empty } from '../lib/ui.js';

export default async function members(root) {
  const people = await q(sb.from('profiles').select('id,display_name,role,status,characters(*)').eq('status', 'active').order('display_name'));
  let cls = 'all', term = '';
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Membros</h1><p>${people.length} na guild.</p></div>
    <div class="stat" id="st"></div><div class="section"><label class="f"><input type="search" id="s" placeholder="Buscar por nick ou nome"></label>
    <div class="filters" id="fl" style="margin-top:12px"></div><div id="v"></div></div></div>`;
  const all = people.flatMap((p) => p.characters);
  root.querySelector('#st').innerHTML = `<div><b>${people.length}</b><span>membros</span></div><div><b>${all.length}</b><span>personagens</span></div>${state.classes.filter((c) => c.active).map((c) => `<div><b>${people.filter((p) => mainChar(p.characters)?.class_code === c.code).length}</b><span>${esc(c.code)}</span></div>`).join('')}`;
  function draw() {
    root.querySelector('#fl').innerHTML = [['all', 'Todos'], ...state.classes.filter((c) => c.active).map((c) => [c.code, c.code])].map(([k, n]) => `<button class="chip ${cls === k ? 'on' : ''}" data-c="${esc(k)}" type="button">${esc(n)}</button>`).join('');
    const t = term.toLowerCase();
    const list = people.filter((p) => (cls === 'all' || p.characters.some((c) => c.class_code === cls)) && (!t || p.display_name.toLowerCase().includes(t) || p.characters.some((c) => c.nick.toLowerCase().includes(t))));
    root.querySelector('#v').innerHTML = list.length ? list.map((p) => {
      const m = mainChar(p.characters);
      return `<div class="member" style="--c:${m ? clsRgb(m.class_code) : '163,151,135'}"><div class="av">${esc(initial(m?.nick || p.display_name))}</div>
        <div><div class="name">${crown(p.role)} ${esc(m?.nick || p.display_name)} ${m ? clsBadge(m.class_code) : ''}</div>
          <div class="sub muted small">${esc(p.display_name)}${p.role !== 'member' ? ' · ' + ROLE_LABEL[p.role] : ''}${m ? ' · ' + esc(lineageName(m.lineage_id) || className(m.class_code)) + (m.level ? ', lv ' + m.level : '') : ''}</div></div><span></span>
        ${p.characters.length > 1 ? `<details><summary>${p.characters.length} personagens</summary><div class="chars">${p.characters.map((c) => `<div>${clsBadge(c.class_code)} ${esc(c.nick)} <span class="muted small">${esc(lineageName(c.lineage_id))}${c.level ? ', lv ' + c.level : ''}${c.is_main ? ' · main' : ''}</span></div>`).join('')}</div></details>` : ''}</div>`;
    }).join('') : empty('Ninguém encontrado.');
  }
  root.addEventListener('click', (e) => { const c = e.target.closest('[data-c]'); if (c) { cls = c.dataset.c; draw(); } });
  root.querySelector('#s').oninput = debounce((e) => { term = e.target.value; draw(); }, 150);
  draw();
}
