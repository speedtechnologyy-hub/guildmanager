import { sb, q } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, clsBadge, lineageName } from './util.js?v=20261113h';
import { modal, closeModal, busy, toast, confirmBox, formData, empty } from './ui.js?v=20261113h';

const NIL = '00000000-0000-0000-0000-000000000000';

export function openCharForm({ userId, char = null, hasMain = false, onDone }) {
  const classes = state.classes.filter((c) => c.active);
  const m = modal(`
    <h3>${char ? 'Editar personagem' : 'Novo personagem'}</h3>
    <form class="stack" id="cf" style="margin-top:16px" autocomplete="off">
      <label class="f">Nick<small>${esc(state.settings.texts.nick_hint)}</small>
        <input type="text" name="nick" required maxlength="30" value="${esc(char?.nick || '')}"></label>
      <div class="form-grid">
        <label class="f">Classe<select name="class_code">${classes.map((c) => `<option value="${esc(c.code)}" ${c.code === char?.class_code ? 'selected' : ''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></label>
        <label class="f">Linhagem<select name="lineage_id"></select></label>
        <label class="f">Level<input type="number" name="level" min="1" max="999" value="${char?.level ?? ''}"></label>
      </div>
      <label class="check"><input type="checkbox" name="is_main" ${char?.is_main || (!char && !hasMain) ? 'checked' : ''}> Personagem principal (main)</label>
      <div class="row" style="justify-content:flex-end">
        <button class="btn" type="button" data-x>Cancelar</button>
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  const f = m.querySelector('#cf');
  const fill = () => {
    const opts = state.lineages.filter((l) => l.active && l.class_code === f.class_code.value);
    f.lineage_id.innerHTML = '<option value="">Escolha</option>' + opts.map((l) => `<option value="${l.id}" ${l.id === char?.lineage_id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  };
  f.class_code.onchange = fill; fill();
  m.querySelector('[data-x]').onclick = closeModal;
  f.onsubmit = (e) => {
    e.preventDefault();
    busy(f.querySelector('[type=submit]'), async () => {
      const d = formData(f);
      const row = {
        nick: d.nick.trim(), class_code: d.class_code,
        lineage_id: d.lineage_id ? +d.lineage_id : null,
        level: d.level ? +d.level : null,
        is_main: f.is_main.checked,
      };
      if (row.is_main) await q(sb.from('characters').update({ is_main: false }).eq('user_id', userId).neq('id', char?.id ?? NIL));
      if (char) await q(sb.from('characters').update(row).eq('id', char.id));
      else await q(sb.from('characters').insert({ ...row, user_id: userId }));
      closeModal();
      toast('Personagem salvo.', 'ok');
      await onDone?.();
    });
  };
}

/** Lista de personagens de um membro com adicionar, editar e excluir. */
export async function charsPanel(el, userId, onChange) {
  let chars = [];
  async function load() {
    chars = await q(sb.from('characters').select('*').eq('user_id', userId).order('is_main', { ascending: false }).order('created_at'));
    if (userId === state.user.id) state.chars = chars;
    render();
    onChange?.(chars);
  }
  function render() {
    el.innerHTML = `${chars.length ? `<div class="rows">${chars.map((c) => `
      <div>${clsBadge(c.class_code)}
        <div><div class="name">${esc(c.nick)} ${c.is_main ? '<span class="tag red">Main</span>' : '<span class="tag">Secundária</span>'}</div>
          <div class="sub">${esc(lineageName(c.lineage_id) || 'sem linhagem')}, ${c.level ? 'level ' + c.level : 'sem level'}</div></div>
        <span class="right row"><button class="btn sm" data-edit="${c.id}" type="button">Editar</button>
          <button class="btn sm danger" data-del="${c.id}" type="button">Excluir</button></span>
      </div>`).join('')}</div>` : empty('Nenhum personagem cadastrado ainda.')}
      <div style="margin-top:14px"><button class="btn" data-add type="button">Adicionar personagem</button></div>`;
  }
  el.onclick = async (e) => {
    const add = e.target.closest('[data-add]'), ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (add) openCharForm({ userId, hasMain: chars.some((c) => c.is_main), onDone: load });
    if (ed) openCharForm({ userId, char: chars.find((c) => c.id === ed.dataset.edit), hasMain: true, onDone: load });
    if (del && await confirmBox('Excluir este personagem?', 'Excluir')) {
      await busy(del, async () => { await q(sb.from('characters').delete().eq('id', del.dataset.del)); toast('Personagem excluído.', 'ok'); await load(); });
    }
  };
  await load();
  return load;
}
