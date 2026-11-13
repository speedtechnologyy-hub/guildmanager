import { sb, q } from '../../supabase.js';
import { esc } from '../../lib/util.js';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty } from '../../lib/ui.js';

export default async function paginas(el) {
  let pages = [];
  async function load() {
    pages = await q(sb.from('cms_pages').select('*').order('menu_order'));
    el.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Páginas</h2><button class="btn primary" data-a="new" type="button">Nova página</button></div>
      <p class="muted small">Regras da guild, tutoriais, tabelas. Escreva em Markdown simples (# título, **negrito**, listas com -).</p>
      <div class="rows" style="margin-top:14px">${pages.length ? pages.map((p) => `<div><div><div class="name">${esc(p.title)} <span class="tag ${p.published ? 'red' : ''}">${p.published ? 'publicada' : 'rascunho'}</span></div><div class="sub">#/p/${esc(p.slug)} · ${p.visibility === 'members' ? 'só membros' : 'pública'}${p.show_in_menu ? ' · no menu' : ''}</div></div>
        <span class="right row"><button class="btn sm" data-a="ed" data-id="${p.id}" type="button">Editar</button><button class="btn sm danger" data-a="rm" data-id="${p.id}" type="button">Excluir</button></span></div>`).join('') : empty('Nenhuma página criada.')}</div>`;
  }
  function form(p) {
    const m = modal(`<h3>${p ? 'Editar' : 'Nova'} página</h3><form class="stack" id="f" style="margin-top:14px">
      <label class="f">Título<input name="title" required value="${esc(p?.title || '')}"></label>
      <label class="f">Endereço<small>Só letras minúsculas, números e hífen.</small><input name="slug" required pattern="[a-z0-9-]+" value="${esc(p?.slug || '')}"></label>
      <label class="f">Conteúdo<textarea name="body" rows="10">${esc(p?.body_md || '')}</textarea></label>
      <div class="form-grid"><label class="f">Quem vê<select name="vis"><option value="members" ${p?.visibility !== 'public' ? 'selected' : ''}>Só membros</option><option value="public" ${p?.visibility === 'public' ? 'selected' : ''}>Qualquer pessoa</option></select></label><label class="f">Ordem no menu<input type="number" name="ord" value="${p?.menu_order ?? 0}"></label></div>
      <label class="check"><input type="checkbox" name="pub" ${p?.published !== false ? 'checked' : ''}> Publicada</label>
      <label class="check"><input type="checkbox" name="menu" ${p?.show_in_menu ? 'checked' : ''}> Mostrar no menu</label>
      <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`, { wide: true });
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const row = { title: f.title.value, slug: f.slug.value, body_md: f.body.value, visibility: f.vis.value, menu_order: +f.ord.value, published: f.pub.checked, show_in_menu: f.menu.checked, updated_at: new Date().toISOString() };
      await q(p ? sb.from('cms_pages').update(row).eq('id', p.id) : sb.from('cms_pages').insert(row));
      closeModal(); toast('Página salva.', 'ok'); await load(); }); };
  }
  el.onclick = async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    try {
      if (b.dataset.a === 'new') form(null);
      else if (b.dataset.a === 'ed') form(pages.find((p) => p.id === b.dataset.id));
      else if (await confirmBox('Excluir esta página?', 'Excluir')) { await q(sb.from('cms_pages').delete().eq('id', b.dataset.id)); await load(); }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  await load();
}
