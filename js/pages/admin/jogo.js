import { sb, q } from '../../supabase.js?v=20261113h';
import { state, loadGame } from '../../store.js?v=20261113h';
import { esc, clsBadge } from '../../lib/util.js?v=20261113h';
import { toast, modal, closeModal, busy, errMsg, confirmBox, empty } from '../../lib/ui.js?v=20261113h';

export default async function jogo(el) {
  async function load() {
    await loadGame();
    const bosses = [];
    const types = [];
    const sect = (title, id, body, add) => `<section class="section" style="margin-top:28px"><div class="row" style="justify-content:space-between"><h2>${title}</h2><button class="btn" data-add="${id}" type="button">${add}</button></div><div class="rows" style="margin-top:12px">${body || empty('Nada cadastrado.')}</div></section>`;
    const btns = (k, id) => `<span class="right row"><button class="btn sm" data-ed="${k}" data-id="${esc(id)}" type="button">Editar</button><button class="btn sm danger" data-rm="${k}" data-id="${esc(id)}" type="button">Excluir</button></span>`;
    el.innerHTML = `<h1 style="font-size:1.6rem">Classes e linhagens</h1><p class="muted small">Usadas no cadastro dos personagens e no ranking.</p>
      ${sect('Classes', 'class', state.classes.map((c) => `<div>${clsBadge(c.code)}<div><div class="name">${esc(c.name)}</div><div class="sub">${c.active ? 'ativa' : 'desativada'}</div></div>${btns('class', c.code)}</div>`).join(''), 'Nova classe')}
      ${sect('Linhagens', 'lineage', state.lineages.map((l) => `<div>${clsBadge(l.class_code)}<div><div class="name">${esc(l.name)}</div><div class="sub">${l.active ? 'ativa' : 'desativada'}</div></div>${btns('lineage', l.id)}</div>`).join(''), 'Nova linhagem')}`;
    el._d = { bosses, types };
  }
  const defs = {
    class: { table: 'game_classes', pk: 'code', get: (id) => state.classes.find((c) => c.code === id), fields: (r) => `<label class="f">Sigla<input name="code" required maxlength="4" value="${esc(r?.code || '')}" ${r ? 'readonly' : ''}></label><label class="f">Nome<input name="name" required value="${esc(r?.name || '')}"></label>`, row: (f) => ({ code: f.code.value.toUpperCase(), name: f.name.value, sort: state.classes.length + 1 }) },
    lineage: { table: 'game_lineages', pk: 'id', get: (id) => state.lineages.find((l) => l.id === +id), fields: (r) => `<label class="f">Classe<select name="cls">${state.classes.map((c) => `<option value="${esc(c.code)}" ${c.code === r?.class_code ? 'selected' : ''}>${esc(c.code)} · ${esc(c.name)}</option>`).join('')}</select></label><label class="f">Nome<input name="name" required value="${esc(r?.name || '')}"></label>`, row: (f) => ({ class_code: f.cls.value, name: f.name.value }) },
    type: { table: 'event_types', pk: 'id', get: (id) => el._d.types.find((t) => t.id === +id), fields: (r) => `<label class="f">Nome<input name="name" required value="${esc(r?.name || '')}"></label><div class="form-grid"><label class="f">Categoria<select name="kind">${[['war', 'Guerra'], ['boss', 'Boss'], ['event', 'Evento']].map(([k, v]) => `<option value="${k}" ${r?.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="f">Cor<input type="color" name="color" value="${esc(r?.color || '#a52525')}"></label></div><label class="check"><input type="checkbox" name="rsvp" ${r?.rsvp_enabled !== false ? 'checked' : ''}> Tem chamada (Vou / Não vou)</label><label class="check"><input type="checkbox" name="cities" ${r?.has_cities ? 'checked' : ''}> Tem cidades e prazo de aposta (guerra de cidades)</label>`, row: (f) => ({ name: f.name.value, slug: f.name.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), kind: f.kind.value, color: f.color.value, rsvp_enabled: f.rsvp.checked, has_cities: f.cities.checked }), keepSlug: true },
    boss: { table: 'bosses', pk: 'id', get: (id) => el._d.bosses.find((b) => b.id === +id), fields: (r) => `<label class="f">Nome<input name="name" required value="${esc(r?.name || '')}"></label><label class="f">Respawn em minutos<small>Deixe em branco se o boss tem horário fixo.</small><input type="number" name="resp" min="1" value="${r?.respawn_minutes ?? ''}"></label><label class="f">Observações<textarea name="notes" rows="2">${esc(r?.notes || '')}</textarea></label>`, row: (f) => ({ name: f.name.value, respawn_minutes: f.resp.value ? +f.resp.value : null, notes: f.notes.value || null }) },
  };
  function form(kind, id) {
    const d = defs[kind]; const r = id != null ? d.get(id) : null;
    const m = modal(`<h3>${r ? 'Editar' : 'Novo'}</h3><form class="stack" id="f" style="margin-top:14px">${d.fields(r)}<label class="check"><input type="checkbox" name="act" ${r?.active !== false ? 'checked' : ''}> Ativo</label><div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const f = m.querySelector('#f');
    f.onsubmit = (e) => { e.preventDefault(); busy(f.querySelector('[type=submit]'), async () => {
      const row = { ...d.row(f), active: f.act.checked };
      if (r && d.keepSlug) delete row.slug;
      await q(r ? sb.from(d.table).update(row).eq(d.pk, r[d.pk]) : sb.from(d.table).insert(row));
      closeModal(); toast('Salvo.', 'ok'); await load(); }); };
  }
  el.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.add) form(b.dataset.add);
      else if (b.dataset.ed) form(b.dataset.ed, b.dataset.id);
      else if (b.dataset.rm && await confirmBox('Excluir? Se estiver em uso, desative em vez de excluir.', 'Excluir')) { const d = defs[b.dataset.rm]; await q(sb.from(d.table).delete().eq(d.pk, b.dataset.id)); await load(); }
    } catch (err) { toast(errMsg(err), 'bad'); }
  };
  await load();
}
