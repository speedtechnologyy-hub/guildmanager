import { sb, q } from '../../supabase.js?v=20261113h';
import { state, DEFAULTS, normalize, setSetting } from '../../store.js?v=20261113h';
import { esc, $ } from '../../lib/util.js?v=20261113h';
import { loadAllPresetFonts } from '../../theme.js?v=20261113h';
import { normalizeLobby } from '../../lib/features.js?v=20261113h';
import { toast, errMsg, confirmBox } from '../../lib/ui.js?v=20261113h';
import { clone, getPath, setPath, sortable, move } from './estudio/kit.js?v=20261113h';
import { SECTIONS, PRESETS, render } from './estudio/sections.js?v=20261113h';
import { newBlock, newItem } from './estudio/blocks-ui.js?v=20261113h';
import { pagesList, renderPages, renderWhats, renderBackup, renderTeam, setSubLeader, savePerm } from './estudio/extra.js?v=20261113h';

/** Chaves de site_settings que o Estúdio controla (rascunho + publicação). */
const KEYS = ['admin_access', 'theme', 'texts', 'menu', 'features', 'effects', 'layouts', 'custom_fonts', 'guild_name', 'logo_url', 'favicon_url', 'banner_url', 'login_bg_url', 'app_bg_url', 'discord', 'timezone', 'site_url'];
const EXT_TYPE = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
const SCREENS_PREVIEW = [['/', 'Lobby'], ['/entrar', 'Login'], ['/guerras', 'Guerras'], ['/ranking', 'Ranking'], ['/membros', 'Membros'], ['/perfil', 'Perfil']];
const FONT_OK = /^[A-Za-z0-9 ]{2,40}$/;

export default async function estudio(root) {
  const base = {};
  const draft = {};
  const cur = normalize(state.raw || {});
  KEYS.forEach((k) => { draft[k] = clone(cur[k] ?? DEFAULTS[k] ?? null); base[k] = JSON.stringify(draft[k]); });

  draft.layouts = draft.layouts || {};
  draft.layouts.lobby = normalizeLobby(draft.layouts.lobby);
  base.layouts = JSON.stringify(draft.layouts);

  const ui = { section: 'identidade', screen: 'lobby', fontRole: 'display_font' };
  const c = {
    ui, pages: [], pagesFull: [], pageEdit: null, backup: null,
    get: (p) => (p.startsWith('__page.') ? getPath(c.pageEdit, p.slice(7)) : getPath(draft, p)),
    set: (p, v) => { if (p.startsWith('__page.')) setPath(c.pageEdit, p.slice(7), v); else setPath(draft, p, v); },
  };
  let undo = [], redo = [], last = JSON.stringify(draft), lastPush = 0, timer = 0, pubTimer = 0, busy = false;
  let live = false;
  try { live = localStorage.getItem('gm_studio_live') === '1'; } catch { /* sem storage */ }

  root.innerHTML = `<div class="studio">
    <header class="st-top">
      <a class="sbtn" href="#/admin">← Painel</a><strong class="st-title">Estúdio</strong>
      <button class="sbtn" type="button" id="undo" title="Desfazer">↶</button><button class="sbtn" type="button" id="redo" title="Refazer">↷</button>
      <span class="sp"></span><span id="stat" class="stat"></span>
      <label class="sw sm" title="Cada alteração vai direto para o site de todo mundo"><input type="checkbox" id="live" ${live ? 'checked' : ''}><i></i><span>Publicar ao vivo</span></label>
      <button class="sbtn" type="button" id="discard">Descartar</button><button class="sbtn pri" type="button" id="pub">Publicar</button>
    </header>
    <div class="st-body">
      <nav class="st-nav" id="nav">${SECTIONS.map(([k, n, g], i) => `${g ? `<small class="gp">${esc(g)}</small>` : ''}<button type="button" data-sec="${k}">${esc(n)}</button>`).join('')}</nav>
      <div class="st-panel" id="panel"></div>
      <div class="st-prev"><div class="st-tools"><select id="scr">${SCREENS_PREVIEW.map(([p, n]) => `<option value="${p}">${n}</option>`).join('')}</select>
        <div class="seg dev"><button type="button" data-dev="100%" class="on">Computador</button><button type="button" data-dev="820px">Tablet</button><button type="button" data-dev="390px">Celular</button></div>
        <button class="sbtn" type="button" id="reload" title="Recarregar prévia">⟳</button></div>
        <div class="st-frame"><iframe id="fr" name="gm-studio" title="Prévia do site" src="${esc(location.pathname)}#/"></iframe></div></div>
    </div></div>`;
  const panel = $('#panel', root), fr = $('#fr', root), stat = $('#stat', root);

  /* ---------- rascunho, prévia e publicação ---------- */
  const dirtyKeys = () => KEYS.filter((k) => JSON.stringify(draft[k]) !== base[k]);
  const post = () => { try { fr.contentWindow?.postMessage({ type: 'gm-draft', settings: clone(draft) }, location.origin); } catch { /* iframe ainda carregando */ } };
  function status() {
    const n = dirtyKeys().length;
    stat.textContent = busy ? 'Publicando...' : n ? `${n} ${n > 1 ? 'grupos alterados' : 'grupo alterado'} sem publicar` : 'Tudo publicado';
    stat.className = 'stat ' + (n ? 'warn' : 'ok');
    $('#pub', root).disabled = !n || busy; $('#discard', root).disabled = !n;
    $('#undo', root).disabled = !undo.length; $('#redo', root).disabled = !redo.length;
  }
  function commit() {
    const now = JSON.stringify(draft);
    if (now === last) return;
    if (Date.now() - lastPush > 700) { undo.push(last); if (undo.length > 60) undo.shift(); }
    lastPush = Date.now(); last = now; redo = [];
    clearTimeout(timer); timer = setTimeout(post, 120);
    if (live) { clearTimeout(pubTimer); pubTimer = setTimeout(publish, 1000); }
    status();
  }
  function restoreSnap(s) { const o = JSON.parse(s); KEYS.forEach((k) => { draft[k] = o[k]; }); last = s; post(); draw(); status(); }

  async function publish() {
    const keys = dirtyKeys(); if (!keys.length || busy) return;
    busy = true; status();
    try {
      const at = new Date().toISOString();
      const rows = keys.map((k) => ({ key: k, value: clone(draft[k]), updated_at: at }));
      rows.push({ key: 'studio_backup', value: { at, values: Object.fromEntries(keys.map((k) => [k, state.raw?.[k] ?? null])) }, updated_at: at });
      await q(sb.from('site_settings').upsert(rows, { onConflict: 'key' }));
      keys.forEach((k) => { base[k] = JSON.stringify(draft[k]); setSetting(k, clone(draft[k])); });
      toast('Publicado. Quem está no site já recebe a mudança.', 'ok');
    } catch (err) { toast(errMsg(err), 'bad'); }
    busy = false; status();
  }

  /* ---------- fontes e envio de arquivos ---------- */
  function studioFonts() {
    loadAllPresetFonts();
    let el = document.getElementById('gm-st-fonts');
    if (!el) { el = document.createElement('style'); el.id = 'gm-st-fonts'; document.head.append(el); }
    el.textContent = (draft.custom_fonts || []).filter((f) => FONT_OK.test(f.name) && /^https:/.test(f.url)).map((f) => `@font-face{font-family:'${f.name}';src:url('${encodeURI(f.url)}');font-display:swap}`).join('');
  }
  async function upload(file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await sb.storage.from('branding').upload(path, file, { upsert: false, contentType: EXT_TYPE[ext] || file.type || 'application/octet-stream' });
    if (error) throw error;
    return sb.storage.from('branding').getPublicUrl(path).data.publicUrl;
  }

  /* ---------- desenho do painel ---------- */
  let seq = 0;
  async function draw() {
    const my = ++seq;
    const top = panel.scrollTop;
    root.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.sec === ui.section));
    studioFonts();
    let html;
    try {
      if (ui.section === 'paginas') { if (!c.pagesFull.length && !c.pageEdit) await pagesList(c); html = renderPages(c); }
      else if (ui.section === 'whatsapp') html = renderWhats();
      else if (ui.section === 'equipe') html = await renderTeam(c);
      else if (ui.section === 'seguranca') html = await renderBackup(c);
      else html = render[ui.section](c);
    } catch (err) { html = `<p class="muted">${esc(errMsg(err))}</p>`; }
    if (my !== seq) return;
    panel.innerHTML = html;
    panel.querySelectorAll('[data-list]').forEach((box) => {
      const path = box.dataset.list;
      sortable(box, (f, t) => { move(c.get(path), f, t); commit(); draw(); });
    });
    panel.scrollTop = top;
    if (ui.section === 'whatsapp') (await import('./avisos.js?v=20261113h')).default($('#wa', panel));
  }

  /* ---------- eventos do painel ---------- */
  const val = (el) => (el.type === 'checkbox' ? el.checked : el.type === 'range' || el.type === 'number' ? +el.value : el.value);
  const onInput = (e) => {
    const t = e.target.closest('[data-p]'); if (!t) return;
    c.set(t.dataset.p, val(t));
    if (t.type === 'range') { const o = t.nextElementSibling; if (o) o.textContent = t.value + (o.dataset.unit || ''); }
    if (t.type === 'checkbox') t.closest('.brow')?.classList.toggle('off', !t.checked);
    if (t.type === 'color') { const code = t.parentElement.querySelector('code'); if (code) code.textContent = t.value; }
    if (t.dataset.p.startsWith('__page.')) return;
    commit();
  };
  panel.addEventListener('input', onInput);
  panel.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.type === 'color' && t.dataset.p) { onInput(e); return draw(); }
    if (t.matches('[data-p]') && t.type !== 'range') onInput(e);
    if (t.dataset.featon) { c.set(`features.${t.dataset.featon}.enabled`, t.checked); commit(); }
    if (t.dataset.featrole) { c.set(`features.${t.dataset.featrole}.min_role`, t.value); commit(); }
    if (t.dataset.acc) { c.set(`admin_access.${t.dataset.acc}`, t.value); commit(); draw(); }
    if (t.dataset.pp) { try { await savePerm(t.dataset.pp, t.dataset.tab, t.value); toast('Acesso atualizado.', 'ok'); } catch (err) { toast(errMsg(err), 'bad'); } }
    if (t.dataset.subslot) { try { await setSubLeader(+t.dataset.subslot, t.value); toast('Sub líder atualizado.', 'ok'); } catch (err) { toast(errMsg(err), 'bad'); } draw(); }
    if (t.dataset.fx) { c.set(`effects.${t.dataset.fx}`, t.checked); commit(); }
    if (t.dataset.dest != null) {
      const m = draft.menu[+t.dataset.dest];
      if (t.value === '__url') { m.path = ''; m.url = m.url || 'https://'; } else { m.path = t.value; delete m.url; }
      commit(); draw();
    }
    if (t.dataset.up && t.files?.[0]) {
      const f = t.files[0];
      if (f.size > 8 * 1024 * 1024) return toast('A imagem passa de 8 MB. Reduza e tente de novo.', 'bad');
      try { toast('Enviando...'); const url = await upload(f, 'img'); c.set(t.dataset.up, url); if (!t.dataset.up.startsWith('__page.')) commit(); draw(); } catch (err) { toast(errMsg(err), 'bad'); }
    }
    if (t.dataset.fontup != null && t.files?.[0]) {
      const name = $('#ffname', panel).value.trim();
      if (!FONT_OK.test(name)) return toast('Dê um nome à fonte (2 a 40 letras ou números).', 'bad');
      if (t.files[0].size > 4 * 1024 * 1024) return toast('A fonte passa de 4 MB.', 'bad');
      try {
        toast('Enviando fonte...');
        const url = await upload(t.files[0], 'fonts');
        const ext = t.files[0].name.split('.').pop().toLowerCase();
        draft.custom_fonts = [...(draft.custom_fonts || []).filter((x) => x.name !== name), { name, url, format: ext }];
        draft.theme[ui.fontRole] = name; commit(); draw();
      } catch (err) { toast(errMsg(err), 'bad'); }
    }
  });

  panel.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    const list = (p) => c.get(p);
    if (d.clear) { c.set(d.clear, d.clear.endsWith('_url') ? null : ''); if (!d.clear.startsWith('__page.')) commit(); return draw(); }
    if (d.mv) { const a = list(d.mv), i = +d.i, j = i + +d.d; if (j >= 0 && j < a.length) { move(a, i, j); commit(); draw(); } return; }
    if (d.addBlock) { const type = panel.querySelector(`[data-newtype="${d.addBlock}"]`).value; const p = d.addBlock; if (!c.get(p)) c.set(p, []); c.get(p).push(newBlock(type)); if (!p.startsWith('__page.')) commit(); return draw(); }
    if (d.rmBlock) { if (await confirmBox('Excluir este bloco?', 'Excluir')) { c.get(d.rmBlock).splice(+d.i, 1); if (!d.rmBlock.startsWith('__page.')) commit(); draw(); } return; }
    if (d.addItem) { c.get(d.addItem).push(newItem(d.bt)); if (!d.addItem.startsWith('__page.')) commit(); return draw(); }
    if (d.rmItem) { c.get(d.rmItem).splice(+d.i, 1); if (!d.rmItem.startsWith('__page.')) commit(); return draw(); }
    if (d.addMenu != null) { draft.menu.push({ id: 'm' + Date.now().toString(36), label: 'Novo botão', path: '/', min_role: 'member', style: 'button' }); commit(); return draw(); }
    if (d.rmMenu != null) { draft.menu.splice(+d.rmMenu, 1); commit(); return draw(); }
    if (d.preset != null) { Object.assign(draft.theme, clone(PRESETS[+d.preset].theme)); commit(); return draw(); }
    if (d.fontrole) { ui.fontRole = d.fontrole; return draw(); }
    if (d.font) { draft.theme[ui.fontRole] = d.font; commit(); return draw(); }
    if (d.addgfont != null) { const n = $('#gfont', panel).value.trim(); if (!FONT_OK.test(n)) return toast('Use o nome exato do Google Fonts (só letras e números).', 'bad'); draft.theme[ui.fontRole] = n; commit(); return draw(); }
    if (d.btnstyle) { draft.theme.btn_style = d.btnstyle; commit(); return draw(); }
    if (d.screen) { ui.screen = d.screen; return draw(); }
    if (d.restore != null) { await restore(); return; }
    if (d.defaults != null) {
      ['theme', 'effects', 'custom_fonts'].forEach((k) => { draft[k] = clone(DEFAULTS[k]); });
      ['banner_url', 'login_bg_url', 'app_bg_url'].forEach((k) => { draft[k] = null; });
      commit(); toast('Visual padrão no rascunho. Confira e publique.', 'ok'); return draw();
    }
    if (d.discard != null) return discard();
    // páginas
    if (d.pgNew != null) { c.pageEdit = { title: '', slug: '', body_md: '', blocks: [], visibility: 'members', published: true, show_in_menu: true, menu_order: c.pagesFull.length + 1, hero_title: true, bg_url: null }; return draw(); }
    if (d.pgEdit) { c.pageEdit = clone(c.pagesFull.find((p) => p.id === d.pgEdit)); return draw(); }
    if (d.pgBack != null) { c.pageEdit = null; return draw(); }
    if (d.pgView) { go(`/p/${d.pgView}`); return; }
    if (d.pgDel) { if (await confirmBox('Excluir esta página?', 'Excluir')) { try { await q(sb.from('cms_pages').delete().eq('id', d.pgDel)); await pagesList(c); draw(); } catch (err) { toast(errMsg(err), 'bad'); } } return; }
    if (d.pgSave != null) {
      const p = c.pageEdit;
      if (!p.title?.trim() || !/^[a-z0-9-]+$/.test(p.slug || '')) return toast('Informe o título e um endereço com letras minúsculas, números e hífen.', 'bad');
      try {
        const row = { title: p.title.trim(), slug: p.slug, body_md: p.body_md || '', blocks: p.blocks || [], visibility: p.visibility, published: !!p.published, show_in_menu: !!p.show_in_menu, menu_order: +p.menu_order || 0, hero_title: p.hero_title !== false, bg_url: p.bg_url || null, updated_at: new Date().toISOString() };
        await q(p.id ? sb.from('cms_pages').update(row).eq('id', p.id) : sb.from('cms_pages').insert(row));
        toast('Página publicada.', 'ok'); const slug = p.slug; c.pageEdit = null; await pagesList(c); draw(); go(`/p/${slug}`);
      } catch (err) { toast(errMsg(err), 'bad'); }
    }
  });

  async function restore() {
    const b = c.backup; if (!b || !(await confirmBox('Voltar o site para a versão anterior à última publicação?', 'Voltar', false))) return;
    try {
      for (const [k, v] of Object.entries(b.values)) {
        if (v === null) await q(sb.from('site_settings').delete().eq('key', k));
        else await q(sb.from('site_settings').upsert({ key: k, value: v, updated_at: new Date().toISOString() }, { onConflict: 'key' }));
        setSetting(k, v === null ? undefined : v);
      }
      const n = normalize(state.raw); KEYS.forEach((k) => { draft[k] = clone(n[k] ?? DEFAULTS[k] ?? null); base[k] = JSON.stringify(draft[k]); });
      last = JSON.stringify(draft); post(); toast('Versão anterior restaurada.', 'ok'); draw(); status();
    } catch (err) { toast(errMsg(err), 'bad'); }
  }
  function discard() {
    KEYS.forEach((k) => { draft[k] = JSON.parse(base[k]); });
    last = JSON.stringify(draft); post(); draw(); status();
  }

  /* ---------- barra de cima e prévia ---------- */
  const go = (path) => { try { fr.contentWindow.location.hash = '#' + path; } catch { /* ignora */ } };
  root.querySelector('#nav').onclick = (e) => { const b = e.target.closest('[data-sec]'); if (!b) return; ui.section = b.dataset.sec; c.pageEdit = null; draw(); };
  $('#pub', root).onclick = publish;
  $('#discard', root).onclick = async () => { if (await confirmBox('Descartar tudo que não foi publicado?', 'Descartar')) discard(); };
  $('#undo', root).onclick = () => { if (!undo.length) return; redo.push(JSON.stringify(draft)); restoreSnap(undo.pop()); };
  $('#redo', root).onclick = () => { if (!redo.length) return; undo.push(JSON.stringify(draft)); restoreSnap(redo.pop()); };
  $('#live', root).onchange = (e) => {
    live = e.target.checked;
    try { localStorage.setItem('gm_studio_live', live ? '1' : '0'); } catch { /* sem storage */ }
    if (live) toast('Publicação ao vivo ligada: cada mudança vai direto para o site.');
    if (live) publish();
  };
  $('#scr', root).onchange = (e) => go(e.target.value);
  $('#reload', root).onclick = () => { fr.contentWindow.location.reload(); };
  root.querySelector('.dev').onclick = (e) => {
    const b = e.target.closest('[data-dev]'); if (!b) return;
    root.querySelectorAll('.dev button').forEach((x) => x.classList.toggle('on', x === b));
    fr.style.width = b.dataset.dev; fr.classList.toggle('narrow', b.dataset.dev !== '100%');
  };
  const onMsg = (e) => { if (e.origin === location.origin && e.data?.type === 'gm-ready' && e.source === fr.contentWindow) post(); };
  addEventListener('message', onMsg);
  const onKey = (e) => {
    if (!(e.ctrlKey || e.metaKey) || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if (e.key === 'z') { e.preventDefault(); (e.shiftKey ? $('#redo', root) : $('#undo', root)).click(); }
    if (e.key === 's') { e.preventDefault(); publish(); }
  };
  addEventListener('keydown', onKey);
  const warn = (e) => { if (dirtyKeys().length) { e.preventDefault(); e.returnValue = ''; } };
  addEventListener('beforeunload', warn);

  try { await pagesList(c); } catch { /* sem páginas ainda */ }
  status(); draw();
  return () => { removeEventListener('message', onMsg); removeEventListener('keydown', onKey); removeEventListener('beforeunload', warn); clearTimeout(timer); clearTimeout(pubTimer); };
}
