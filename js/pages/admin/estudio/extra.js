import { sb, q } from '../../../supabase.js?v=20261113h';
import { esc } from '../../../lib/util.js?v=20261113h';
import { fText, fArea, fSelect, fCheck, fImage } from './kit.js?v=20261113h';
import { blockList } from './blocks-ui.js?v=20261113h';
import { GRANTABLE, LEVELS } from '../../../lib/admin-tabs.js?v=20261113h';
import { can } from '../../../lib/util.js?v=20261113h';

const head = (t, d) => `<h3 class="sh">${esc(t)}</h3>${d ? `<p class="muted small">${d}</p>` : ''}`;

export async function pagesList(c) {
  c.pagesFull = await q(sb.from('cms_pages').select('*').order('menu_order'));
  c.pages = c.pagesFull;
}

export function renderPages(c) {
  const e = c.pageEdit;
  if (!e) {
    return head('Páginas novas', 'Crie áreas inteiras no site: regras, tutoriais, tabelas, parcerias. Monte com blocos e coloque no menu.') +
      `<div class="stack"><button class="sbtn pri" type="button" data-pg-new>Nova página</button>
      ${c.pagesFull.length ? c.pagesFull.map((p) => `<div class="brow"><div class="bh"><strong>${esc(p.title)}</strong><em>#/p/${esc(p.slug)}</em><span class="sp"></span>
        <span class="tag2 ${p.published ? 'on' : ''}">${p.published ? 'publicada' : 'rascunho'}</span>
        <button class="sbtn mini" type="button" data-pg-view="${esc(p.slug)}">Ver</button>
        <button class="sbtn mini" type="button" data-pg-edit="${p.id}">Editar</button>
        <button class="sbtn mini danger" type="button" data-pg-del="${p.id}">Excluir</button></div></div>`).join('') : '<p class="muted small">Nenhuma página criada.</p>'}</div>`;
  }
  return head(e.id ? 'Editar página' : 'Nova página') + `<div class="stack">
    <div class="row"><button class="sbtn" type="button" data-pg-back>← Voltar</button><span class="sp"></span><button class="sbtn pri" type="button" data-pg-save>Salvar e publicar</button></div>
    ${fText(c, '__page.title', 'Título')}${fText(c, '__page.slug', 'Endereço', { hint: 'Só letras minúsculas, números e hífen. O link fica #/p/endereço.' })}
    <div class="g2">${fSelect(c, '__page.visibility', 'Quem vê', [['members', 'Só membros'], ['public', 'Qualquer pessoa']])}${fText(c, '__page.menu_order', 'Ordem no menu', { type: 'number' })}</div>
    ${fCheck(c, '__page.published', 'Publicada')}${fCheck(c, '__page.show_in_menu', 'Mostrar no menu')}${fCheck(c, '__page.hero_title', 'Mostrar o título grande no topo')}
    ${fImage(c, '__page.bg_url', 'Imagem de fundo da página')}
    <h4 class="sh2">Blocos</h4>${blockList(c, '__page.blocks')}
    <h4 class="sh2">Texto simples <small>(aparece depois dos blocos)</small></h4>${fArea(c, '__page.body_md', 'Texto', { rows: 5 })}</div>`;
}

export function renderWhats() {
  return head('WhatsApp (Evolution API)', 'Conexão com a Evolution e avisos automáticos de guerra, boss e evento.') +
    `<div class="card-s" style="margin-bottom:14px"><p class="small"><strong>Servidor já configurado:</strong> https://api.optapay.cloud<br>
    1. Confira o <b>nome da instância</b> abaixo (ou crie uma com o mesmo nome na sua Evolution).<br>
    2. No Supabase, em <b>Edge Functions > Secrets</b>, adicione <code>EVOLUTION_API_KEY</code> com a chave global da sua Evolution (a chave nunca passa por este painel).<br>
    3. Clique em <b>Conectar por QR code</b> e leia com o WhatsApp da guild.<br>
    4. Os envios começam pausados: teste e depois desmarque "Pausar todos os envios".</p></div><div id="wa" class="wa-embed"></div>`;
}

export async function renderBackup(c) {
  const rows = await q(sb.from('site_settings').select('value').eq('key', 'studio_backup').limit(1));
  c.backup = rows[0]?.value || null;
  const b = c.backup;
  return head('Versões e padrão', 'Rede de segurança para o site ao vivo.') + `<div class="stack">
    <div class="card-s"><strong>Última publicação</strong><p class="muted small">${b ? `${new Date(b.at).toLocaleString('pt-BR')} · alterou: ${Object.keys(b.values).join(', ')}` : 'Ainda não há versão anterior guardada.'}</p>
    <button class="sbtn" type="button" data-restore ${b ? '' : 'disabled'}>Voltar à versão anterior</button></div>
    <div class="card-s"><strong>Visual padrão</strong><p class="muted small">Volta cores, fontes, botões, imagens e efeitos ao original. Vai para o rascunho: confira na prévia e clique em Publicar.</p><button class="sbtn danger" type="button" data-defaults>Preparar visual padrão</button></div>
    <div class="card-s"><strong>Rascunho</strong><p class="muted small">Joga fora tudo que ainda não foi publicado.</p><button class="sbtn" type="button" data-discard>Descartar alterações</button></div></div>`;
}

/** Troca quem ocupa uma das 3 vagas de sub líder (userId vazio = deixa a vaga livre). */
export async function setSubLeader(slot, userId) {
  await q(sb.from('profiles').update({ role: 'member', sub_slot: null }).eq('role', 'leader').eq('sub_slot', slot));
  if (userId) await q(sb.from('profiles').update({ role: 'leader', sub_slot: slot }).eq('id', userId));
}

const opt = (v, cur, n) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${n}</option>`;

/** Salva na hora o nível de uma pessoa numa função ('' = volta a seguir a regra geral). */
export async function savePerm(userId, tab, val) {
  const row = await q(sb.from('admin_perms').select('perms').eq('user_id', userId).maybeSingle());
  const perms = { ...(row?.perms || {}) };
  if (val) perms[tab] = val; else delete perms[tab];
  await q(sb.from('admin_perms').upsert({ user_id: userId, perms, updated_at: new Date().toISOString() }));
}

export async function renderTeam(c) {
  if (!can('owner')) return head('Sub líderes e acessos', 'Só o GuildMaster define quem acessa o quê.');
  const [people, perms] = await Promise.all([
    q(sb.from('profiles').select('id,display_name,role,sub_slot,characters(nick,is_main)').eq('status', 'active').order('display_name')),
    q(sb.from('admin_perms').select('user_id,perms')),
  ]);
  const pm = Object.fromEntries((perms || []).map((r) => [r.user_id, r.perms || {}]));
  const nick = (p) => p.characters?.find((x) => x.is_main)?.nick || p.display_name;
  const eligible = people.filter((p) => p.role !== 'owner');
  const staff = people.filter((p) => p.role !== 'owner' && p.role !== 'member');
  const slot = (n) => {
    const cur = people.find((p) => p.role === 'leader' && p.sub_slot === n);
    return `<label class="sf">Sub líder ${n}<select data-subslot="${n}"><option value="">— vaga livre —</option>${eligible.map((p) => `<option value="${p.id}" ${cur?.id === p.id ? 'selected' : ''}>${esc(nick(p))}${p.display_name !== nick(p) ? ` (${esc(p.display_name)})` : ''}</option>`).join('')}</select></label>`;
  };
  const gl = (id) => { const v = c.get(`admin_access.${id}`); return v === true ? 'edit' : v === false ? 'none' : v || (id === 'estudio' ? 'none' : 'edit'); };
  const lvName = Object.fromEntries(LEVELS);
  return head('Sub líderes e acessos', 'Cada função tem três níveis: sem acesso, só ver ou ver e editar. Vale para todas as áreas do painel, inclusive o Estúdio. O GuildMaster sempre tem acesso total.') + `<div class="stack">
    <div class="card-s"><strong>Vagas de sub líder</strong><p class="muted small">Quem for escolhido passa a ver o painel, dentro dos limites abaixo. O membro precisa já estar cadastrado no site.</p>${[1, 2, 3].map(slot).join('')}</div>
    <div class="card-s"><strong>Regra geral</strong><p class="muted small">Vale para todos os sub líderes que não tiverem uma regra própria. Salva quando você clicar em Publicar.</p>
      ${GRANTABLE.map((t) => `<label class="sf lvrow"><span>${esc(t.name)}<small>${esc(t.group)}</small></span><select data-acc="${t.id}">${LEVELS.map(([v, n]) => opt(v, gl(t.id), n)).join('')}</select></label>`).join('')}</div>
    <div class="card-s"><strong>Por pessoa</strong><p class="muted small">Dê a um sub líder um nível diferente da regra geral, por exemplo, uma pessoa edita tudo e outra só vê. Salva na hora.</p>
      ${staff.length ? staff.map((p) => `<details class="pp"><summary>${esc(nick(p))}<em>${p.role === 'leader' && p.sub_slot ? `Sub líder ${p.sub_slot}` : esc(p.role)}</em></summary><div class="stack">
        ${GRANTABLE.map((t) => `<label class="sf lvrow"><span>${esc(t.name)}</span><select data-pp="${p.id}" data-tab="${t.id}">${opt('', pm[p.id]?.[t.id] || '', `Regra geral (${lvName[gl(t.id)]})`)}${LEVELS.map(([v, n]) => opt(v, pm[p.id]?.[t.id] || '', n)).join('')}</select></label>`).join('')}</div></details>`).join('') : '<p class="muted small">Nenhum sub líder ainda. Escolha alguém nas vagas acima.</p>'}</div></div>`;
}
