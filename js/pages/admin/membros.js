import { sb, q } from '../../supabase.js';
import { state } from '../../store.js';
import { esc, can, clsBadge, ROLE_LABEL, rank, fmtDate, debounce, mainChar } from '../../lib/util.js';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty, formData } from '../../lib/ui.js';
import { charsPanel } from '../../lib/characters.js';

export default async function membros(el) {
  let people = [], term = '';
  async function load() {
    people = await q(sb.from('profiles').select('id,display_name,role,status,joined_at,characters(*)').order('display_name'));
    draw();
  }
  function draw() {
    const t = term.toLowerCase();
    const list = people.filter((p) => !t || p.display_name.toLowerCase().includes(t) || p.characters.some((c) => c.nick.toLowerCase().includes(t)));
    el.querySelector('#v').innerHTML = list.length ? `<div class="tbl-wrap"><table><thead><tr><th>Membro</th><th>Papel</th><th>Status</th><th></th></tr></thead><tbody>${list.map((p) => {
      const m = mainChar(p.characters); const editable = rank(p.role) < rank(state.profile.role) || p.id === state.user.id;
      return `<tr><td>${clsBadge(m?.class_code)} ${esc(m?.nick || p.display_name)}<div class="muted small">${esc(p.display_name)} · desde ${fmtDate(p.joined_at || p.created_at)}</div></td>
        <td>${editable && p.id !== state.user.id ? `<select data-role="${p.id}">${Object.entries(ROLE_LABEL).filter(([k]) => rank(k) < rank(state.profile.role) || k === p.role).map(([k, v]) => `<option value="${k}" ${k === p.role ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ROLE_LABEL[p.role]}</td>
        <td>${editable && p.id !== state.user.id ? `<select data-status="${p.id}">${[['active', 'Ativo'], ['inactive', 'Inativo'], ['banned', 'Bloqueado']].map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select>` : p.status}</td>
        <td><button class="btn sm" data-ch="${p.id}" type="button">Personagens</button> <button class="btn sm" data-note="${p.id}" type="button">Notas</button>${can('owner') && p.id !== state.user.id ? ` <button class="btn sm danger" data-rm="${p.id}" type="button">Remover</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : empty('Ninguém encontrado.');
  }
  el.innerHTML = '<h2>Membros</h2><label class="f" style="margin:14px 0"><input type="search" id="s" placeholder="Buscar"></label><div id="v"></div>';
  el.querySelector('#s').oninput = debounce((e) => { term = e.target.value; draw(); }, 150);
  el.onchange = async (e) => {
    const r = e.target.dataset.role, s = e.target.dataset.status;
    try { if (r) await q(sb.from('profiles').update({ role: e.target.value }).eq('id', r)); if (s) await q(sb.from('profiles').update({ status: e.target.value }).eq('id', s)); toast('Atualizado.', 'ok'); await load(); } catch (err) { toast(errMsg(err), 'bad'); await load(); }
  };
  el.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ch) { const p = people.find((x) => x.id === b.dataset.ch); modal(`<h3>Personagens de ${esc(p.display_name)}</h3><div id="cp" style="margin-top:14px"></div>`, { wide: true, onClose: load }); charsPanel(document.getElementById('cp'), p.id); }
    if (b.dataset.note) {
      const id = b.dataset.note; const notes = await q(sb.from('member_notes').select('*').eq('member_id', id).order('created_at', { ascending: false }));
      const m = modal(`<h3>Notas internas</h3><form class="stack" id="nf" style="margin:14px 0"><label class="f"><textarea name="body" rows="3" required placeholder="Advertência, observação, combinado..."></textarea></label><button class="btn primary" type="submit">Adicionar nota</button></form>
        <div class="rows">${notes.length ? notes.map((n) => `<div><div><div class="sub">${fmtDate(n.created_at)}</div>${esc(n.note)}</div></div>`).join('') : empty('Sem notas.')}</div>`);
      m.querySelector('#nf').onsubmit = (ev) => { ev.preventDefault(); busy(ev.target.querySelector('button'), async () => { await q(sb.from('member_notes').insert({ member_id: id, note: formData(ev.target).body, kind: 'note', author_id: state.user.id })); closeModal(); toast('Nota salva.', 'ok'); }); };
    }
    if (b.dataset.rm && await confirmBox('Remover este membro e todos os dados dele? Não dá para desfazer.', 'Remover')) {
      try { await q(sb.from('profiles').delete().eq('id', b.dataset.rm)); toast('Membro removido.', 'ok'); await load(); } catch (err) { toast(errMsg(err), 'bad'); }
    }
  };
  await load();
}
