import { esc, can, $ } from '../lib/util.js';
import { loadingHTML } from '../lib/ui.js';

const TABS = [
  ['resumo', 'Resumo', 'mod'], ['convites', 'Convites e cadastro', 'mod'], ['membros', 'Membros', 'leader'],
  ['agenda', 'Agenda', 'sub'], ['presenca', 'Presença', 'mod'], ['avisos', 'WhatsApp e avisos', 'leader'],
  ['jogo', 'Jogo', 'leader'], ['aparencia', 'Aparência', 'leader'], ['paginas', 'Páginas', 'leader'], ['log', 'Registro', 'leader'],
];

export default async function admin(root, [tab]) {
  const tabs = TABS.filter((t) => can(t[2]));
  const cur = tabs.find((t) => t[0] === tab) || tabs[0];
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Painel</h1></div>
    <div class="admin"><nav class="side">${tabs.map((t) => `<a href="#/admin/${t[0]}" class="${t[0] === cur[0] ? 'on' : ''}">${esc(t[1])}</a>`).join('')}</nav>
    <div class="panel" id="ap">${loadingHTML}</div></div></div>`;
  const mod = await import(`./admin/${cur[0]}.js`);
  return mod.default($('#ap', root));
}
