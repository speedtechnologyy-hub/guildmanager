import { esc, can, $ } from '../lib/util.js';
import { loadingHTML } from '../lib/ui.js';

// [id, nome, cargo mínimo, grupo]
const TABS = [
  ['estudio', 'Estúdio do site', 'owner', 'Site'],
  ['resumo', 'Visão geral', 'mod', 'Guild'], ['membros', 'Membros', 'leader', 'Guild'], ['convites', 'Convites e cadastro', 'mod', 'Guild'], ['presenca', 'Presença', 'mod', 'Guild'],
  ['agenda', 'Agenda e horários', 'sub', 'Guerra e eventos'], ['calendario', 'Calendário de guerras', 'leader', 'Guerra e eventos'], ['fama', 'Fama da semana', 'leader', 'Guerra e eventos'], ['jogo', 'Jogo (classes e bosses)', 'leader', 'Guerra e eventos'],
  ['avisos', 'WhatsApp e avisos', 'leader', 'Comunicação'], ['log', 'Registro de ações', 'leader', 'Comunicação'],
];
const ICON = { estudio: '✦', resumo: '◈', membros: '♜', convites: '✉', presenca: '✓', agenda: '◷', calendario: '▦', fama: '★', jogo: '⚔', avisos: '✆', log: '≡' };

export default async function admin(root, [tab]) {
  const tabs = TABS.filter((t) => can(t[2]));
  const cur = tabs.find((t) => t[0] === tab) || tabs.find((t) => t[0] === 'resumo') || tabs[0];
  // o Estúdio ocupa a tela toda (edição à esquerda, prévia ao vivo à direita)
  if (cur[0] === 'estudio') {
    root.innerHTML = '<div id="ap"></div>';
    return (await import('./admin/estudio.js')).default($('#ap', root));
  }
  const groups = [...new Set(tabs.map((t) => t[3]))];
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Painel</h1></div>
    <div class="admin"><nav class="side">${groups.map((g) => `<small class="gp">${esc(g)}</small>${tabs.filter((t) => t[3] === g).map((t) => `<a href="#/admin/${t[0]}" class="${t[0] === cur[0] ? 'on' : ''} ${t[0] === 'estudio' ? 'hl' : ''}"><i>${ICON[t[0]] || '•'}</i>${esc(t[1])}</a>`).join('')}`).join('')}</nav>
    <div class="panel" id="ap">${loadingHTML}</div></div></div>`;
  const mod = await import(`./admin/${cur[0]}.js`);
  return mod.default($('#ap', root));
}
