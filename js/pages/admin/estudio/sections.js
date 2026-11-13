import { esc } from '../../../lib/util.js?v=20261113h';
import { PRESET_FONTS } from '../../../theme.js?v=20261113h';
import { FEATURES, EFFECTS, LOBBY_BLOCKS, SCREENS } from '../../../lib/features.js?v=20261113h';
import { fText, fArea, fSelect, fCheck, fRange, fColor, fImage, grip } from './kit.js?v=20261113h';
import { blockList } from './blocks-ui.js?v=20261113h';

const TZ = ['America/Sao_Paulo', 'America/Manaus', 'America/Bahia', 'America/Fortaleza', 'America/Cuiaba', 'America/Rio_Branco', 'Europe/Lisbon'];
const ROLE3 = [['member', 'Todos'], ['leader', 'Sub Líderes'], ['master', 'Master'], ['owner', 'Só Admin']];

export const PRESETS = [
  { name: 'Destino', theme: { bg: '#060a14', surface: '#0e1526', text: '#efe8d8', muted: '#9aa3b5', primary: '#a3162b', accent: '#e2b552', frame: '' } },
  { name: 'Brasa', theme: { bg: '#0d0605', surface: '#1c0e0a', text: '#f5e6d8', muted: '#b39a8a', primary: '#c2410c', accent: '#f59e0b', frame: '#d97706' } },
  { name: 'Floresta', theme: { bg: '#05100a', surface: '#0c1d14', text: '#e6efe2', muted: '#94ab9c', primary: '#15803d', accent: '#a3e635', frame: '#84a93c' } },
  { name: 'Gelo', theme: { bg: '#050b14', surface: '#0b1a2b', text: '#e8f1fa', muted: '#93a9bf', primary: '#1d4ed8', accent: '#67e8f9', frame: '#7dd3fc' } },
  { name: 'Noite roxa', theme: { bg: '#0a0614', surface: '#160d26', text: '#efe8fa', muted: '#a597bd', primary: '#7e22ce', accent: '#e879f9', frame: '#c084fc' } },
  { name: 'Sangue', theme: { bg: '#0a0405', surface: '#1a0a0d', text: '#f3e4e4', muted: '#b09396', primary: '#b91c1c', accent: '#f87171', frame: '#dc2626' } },
  { name: 'Pergaminho', theme: { bg: '#1a1410', surface: '#2a2018', text: '#f1e6cf', muted: '#b7a98b', primary: '#92400e', accent: '#d6a85c', frame: '#c9a15a' } },
  { name: 'Aço', theme: { bg: '#0b0d11', surface: '#161a22', text: '#e9ecf1', muted: '#9099a8', primary: '#475569', accent: '#cbd5e1', frame: '#94a3b8' } },
];

const head = (t, d) => `<h3 class="sh">${esc(t)}</h3>${d ? `<p class="muted small">${d}</p>` : ''}`;
const grid = (...x) => `<div class="g2">${x.join('')}</div>`;

// [id, nome, grupo (só no primeiro de cada grupo)]
export const SECTIONS = [
  ['identidade', 'Identidade', 'Aparência'], ['imagens', 'Imagens de fundo'], ['cores', 'Cores'], ['fontes', 'Fontes'], ['botoes', 'Botões e cartões'], ['textos', 'Textos'],
  ['menu', 'Menu', 'Estrutura'], ['funcoes', 'Funções e efeitos'], ['telas', 'Telas e blocos'], ['paginas', 'Páginas novas'],
  ['equipe', 'Sub líderes e acessos', 'Equipe'],
  ['whatsapp', 'WhatsApp (Evolution)', 'Integrações'],
  ['seguranca', 'Versões e padrão', 'Segurança'],
];

export const render = {
  identidade: (c) => head('Identidade', 'Nome, logo e links da guild.') + `<div class="stack">${fText(c, 'guild_name', 'Nome da guild')}${fImage(c, 'logo_url', 'Logo', { wide: false })}${fImage(c, 'favicon_url', 'Ícone da aba', { wide: false })}
    ${fSelect(c, 'timezone', 'Fuso horário', [...new Set([c.get('timezone'), ...TZ])].filter(Boolean).map((z) => [z, z]))}
    ${fText(c, 'site_url', 'Endereço do site', { hint: 'Usado nos links de convite e avisos.', ph: 'https://guildmanager.top' })}
    <h4 class="sh2">Discord</h4>${fText(c, 'discord.invite_url', 'Convite do servidor', { ph: 'https://discord.gg/...' })}${fText(c, 'discord.voice_url', 'Sala de voz', { hint: 'Cole o link do canal de voz.' })}${fText(c, 'discord.widget_id', 'ID do servidor (widget)')}</div>`,

  imagens: (c) => head('Imagens de fundo', 'Cada tela pode ter a sua. Sem imagem, o site usa o cenário de castelo gerado.') + `<div class="stack">
    <div class="card-s">${fImage(c, 'banner_url', 'Topo do lobby (hero)', { hint: 'Ideal: 1920x800 ou maior.' })}${fRange(c, 'theme.hero_overlay', 'Escurecer a imagem', { unit: '%' })}${fRange(c, 'theme.hero_h', 'Altura do topo', { min: 40, max: 100, unit: 'vh' })}</div>
    <div class="card-s">${fImage(c, 'login_bg_url', 'Tela de login', { hint: 'Se vazio, usa a imagem do topo.' })}${fRange(c, 'theme.login_dim', 'Escurecer a imagem', { unit: '%' })}</div>
    <div class="card-s">${fImage(c, 'app_bg_url', 'Fundo de todas as telas', { hint: 'Fica atrás do conteúdo das páginas internas.' })}${fRange(c, 'theme.app_bg_dim', 'Cobertura da cor de fundo', { unit: '%' })}</div></div>`,

  cores: (c) => head('Cores', 'Escolha um tema pronto ou ajuste cada cor. A prévia à direita muda na hora.') +
    `<div class="presets">${PRESETS.map((p, i) => `<button class="preset" type="button" data-preset="${i}" style="--a:${p.theme.bg};--b:${p.theme.primary};--c:${p.theme.accent}"><i></i><span>${esc(p.name)}</span></button>`).join('')}</div>
    <div class="stack"><h4 class="sh2">Base</h4><div class="g2">${[['bg', 'Fundo'], ['surface', 'Painéis'], ['text', 'Texto'], ['muted', 'Texto secundário'], ['primary', 'Cor principal'], ['accent', 'Destaque']].map(([k, n]) => fColor(c, 'theme.' + k, n)).join('')}</div>
    <h4 class="sh2">Detalhes <small>(vazio = padrão do tema)</small></h4><div class="g2">${[['frame', 'Molduras de metal', '#e2b552'], ['heading_color', 'Títulos das seções', '#e2b552'], ['hero_title', 'Título grande do topo', '#fff6e4'], ['link', 'Links', '#e2b552'], ['topbar_bg', 'Barra do topo', '#0e1526'], ['footer_bg', 'Rodapé', '#0e1526']].map(([k, n, f]) => fColor(c, 'theme.' + k, n, f, { optional: true })).join('')}</div></div>`,

  fontes: (c) => {
    const roles = [['display_font', 'Logo e título grande'], ['heading_font', 'Títulos e botões'], ['body_font', 'Texto corrido']];
    const role = c.ui.fontRole || 'display_font';
    const cur = c.get('theme.' + role);
    const custom = (c.get('custom_fonts') || []).map((f) => [f.name, 'Minhas fontes']);
    const all = [...custom, ...PRESET_FONTS.map(([n, s]) => [n, s])];
    if (cur && !all.some(([n]) => n === cur)) all.unshift([cur, 'Outras']);
    const groups = [...new Set(all.map((x) => x[1]))];
    return head('Fontes', 'Escolha o papel e clique numa fonte. Já vêm dezenas cadastradas; você também pode enviar a sua.') + `<div class="stack">
      <div class="seg">${roles.map(([k, n]) => `<button type="button" class="${role === k ? 'on' : ''}" data-fontrole="${k}">${n}<small>${esc(c.get('theme.' + k) || '')}</small></button>`).join('')}</div>
      ${groups.map((g) => `<h4 class="sh2">${esc(g)}</h4><div class="fonts">${all.filter((x) => x[1] === g).map(([n]) => `<button type="button" class="fontcard ${n === cur ? 'on' : ''}" data-font="${esc(n)}" style="font-family:'${esc(n)}',serif">${esc(n)}<span>Quem responde à chamada vai para a guerra</span></button>`).join('')}</div>`).join('')}
      <h4 class="sh2">Outra fonte do Google Fonts</h4><div class="row"><input id="gfont" placeholder="Nome exato, ex.: Bangers" style="flex:1"><button class="sbtn" type="button" data-addgfont>Usar</button></div>
      <h4 class="sh2">Enviar fonte própria</h4><div class="row"><input id="ffname" placeholder="Nome (letras e números)" style="flex:1"><label class="sbtn">Arquivo .woff2 / .ttf / .otf<input type="file" accept=".woff2,.woff,.ttf,.otf" data-fontup hidden></label></div>
      ${fRange(c, 'theme.font_scale', 'Tamanho geral do texto', { min: 85, max: 125, unit: '%' })}</div>`;
  },

  botoes: (c) => head('Botões e cartões', 'Formato, cantos e cores dos botões, cartões e da barra do topo.') + `<div class="stack">
    <div class="seg wrapseg">${[['metal', 'Metal'], ['flat', 'Chapado'], ['outline', 'Contorno'], ['glass', 'Vidro'], ['soft', 'Suave']].map(([k, n]) => `<button type="button" class="${c.get('theme.btn_style') === k ? 'on' : ''}" data-btnstyle="${k}">${n}</button>`).join('')}</div>
    ${fRange(c, 'theme.btn_radius', 'Cantos dos botões', { max: 40, unit: 'px' })}${fCheck(c, 'theme.btn_upper', 'Texto dos botões em maiúsculas')}
    ${grid(fColor(c, 'theme.btn_bg', 'Fundo dos botões', '#161c2c', { optional: true }), fColor(c, 'theme.btn_text', 'Texto dos botões', '#fbe9ad', { optional: true }), fColor(c, 'theme.btn_primary_text', 'Texto do botão principal', '#fff6e0', { optional: true }))}
    <h4 class="sh2">Cartões e largura</h4>${fRange(c, 'theme.radius', 'Cantos dos cartões', { max: 32, unit: 'px' })}${fRange(c, 'theme.wrap_w', 'Largura do conteúdo', { min: 860, max: 1600, step: 20, unit: 'px' })}
    <h4 class="sh2">Barra do topo</h4>${grid(fSelect(c, 'theme.topbar_style', 'Estilo', [['glass', 'Vidro'], ['solid', 'Sólida'], ['clear', 'Transparente']]), fSelect(c, 'theme.nav_align', 'Posição do menu', [['right', 'Direita'], ['center', 'Centro'], ['left', 'Esquerda']]))}</div>`,

  textos: (c) => head('Textos', 'Frases do lobby, do login e do rodapé.') + `<div class="stack">${[['hero_tagline', 'Frase do lobby'], ['intro_tagline', 'Frase da abertura'], ['login_title', 'Título do login'], ['login_subtitle', 'Subtítulo do login'], ['login_google', 'Botão do Google'], ['login_discord', 'Botão do Discord'], ['nick_hint', 'Dica do nick'], ['footer', 'Rodapé']].map(([k, n]) => fText(c, 'texts.' + k, n)).join('')}</div>`,

  funcoes: (c) => head('Funções', 'Desligue o que a guild não usa ou restrinja por cargo. Some do menu e da navegação na hora para todos.') + `<div class="stack">
    ${FEATURES.map((f) => `<div class="frow"><label class="sw"><input type="checkbox" data-featon="${f.id}" ${c.get(`features.${f.id}.enabled`) !== false ? 'checked' : ''}><i></i><span>${esc(f.label)}<small>${esc(f.desc)}</small></span></label>
      <select class="mini" data-featrole="${f.id}">${ROLE3.map(([v, n]) => `<option value="${v}" ${(c.get(`features.${f.id}.min_role`) || 'member') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`).join('')}
    <h4 class="sh2">Efeitos</h4>${EFFECTS.map((f) => `<label class="sw"><input type="checkbox" data-fx="${f.id}" ${c.get(`effects.${f.id}`) !== false ? 'checked' : ''}><i></i><span>${esc(f.label)}<small>${esc(f.desc)}</small></span></label>`).join('')}</div>`,

  telas: (c) => {
    const scr = c.ui.screen || 'lobby';
    const labels = Object.fromEntries(LOBBY_BLOCKS.map((b) => [b.id, b.label]));
    const body = scr === 'lobby'
      ? `<p class="muted small">Arraste para reordenar, ligue ou desligue seções, escolha quem vê e adicione blocos próprios.</p>${blockList(c, 'layouts.lobby', { nativeLabels: labels })}`
      : `<h4 class="sh2">No topo da tela</h4>${blockList(c, `layouts.top_${scr}`)}<h4 class="sh2">No rodapé da tela</h4>${blockList(c, `layouts.bottom_${scr}`)}`;
    return head('Telas e blocos', 'Escolha a tela e monte o que aparece nela.') + `<div class="stack"><div class="seg wrapseg">${[['lobby', 'Lobby'], ...SCREENS.map((s) => [s.id, s.label])].map(([k, n]) => `<button type="button" class="${scr === k ? 'on' : ''}" data-screen="${k}">${n}</button>`).join('')}</div>${body}</div>`;
  },

  menu: (c) => {
    const items = c.get('menu') || [];
    const dests = [['/', 'Lobby'], ['/guerras', 'Guerras'], ['/ranking', 'Ranking'], ['/membros', 'Membros'], ['/voz', 'Voz'], ['/perfil', 'Meu perfil'],
      ...c.pages.map((p) => ['/p/' + p.slug, 'Página: ' + p.title]), ['__url', 'Link externo...']];
    return head('Menu', 'Crie botões novos, mude a ordem arrastando e escolha o estilo de cada um. Páginas novas com "mostrar no menu" entram sozinhas.') + `<div class="blist" data-list="menu">${items.map((m, i) => {
      const known = dests.some(([v]) => v === m.path) && !m.url;
      return `<div class="brow ${m.enabled === false ? 'off' : ''}" data-row><div class="bh">${grip}<label class="sw sm"><input type="checkbox" data-p="menu.${i}.enabled" ${m.enabled !== false ? 'checked' : ''}><i></i></label>
        <input class="grow" data-p="menu.${i}.label" value="${esc(m.label)}" placeholder="Nome do botão">
        <button class="sbtn mini" type="button" data-mv="menu" data-i="${i}" data-d="-1">↑</button><button class="sbtn mini" type="button" data-mv="menu" data-i="${i}" data-d="1">↓</button>
        <button class="sbtn mini danger" type="button" data-rm-menu="${i}">×</button></div>
        <div class="bd open g2"><label class="sf">Leva para<select data-dest="${i}">${dests.map(([v, n]) => `<option value="${esc(v)}" ${(known ? v === m.path : v === '__url') ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
          ${known ? '' : `<label class="sf">Endereço<input data-p="menu.${i}.url" value="${esc(m.url || '')}" placeholder="https://..."></label>`}
          <label class="sf">Estilo<select data-p="menu.${i}.style">${[['link', 'Texto'], ['button', 'Botão'], ['primary', 'Botão de destaque']].map(([v, n]) => `<option value="${v}" ${(m.style || 'link') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="sf">Quem vê<select data-p="menu.${i}.min_role">${ROLE3.map(([v, n]) => `<option value="${v}" ${(m.min_role || 'member') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="sw sm"><input type="checkbox" data-p="menu.${i}.newtab" ${m.newtab ? 'checked' : ''}><i></i><span>Abrir em nova aba</span></label></div></div>`;
    }).join('')}</div><div class="addrow"><button class="sbtn" type="button" data-add-menu>Novo botão de navegação</button></div>`;
  },
};
