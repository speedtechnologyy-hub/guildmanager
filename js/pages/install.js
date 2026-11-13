import { state } from '../store.js?v=20261113h';
import { esc } from '../lib/util.js?v=20261113h';

let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('gm-installable')); });

const IOS = [
  ['Abra no Safari', 'No iPhone a instalação só funciona pelo Safari. Se você abriu pelo WhatsApp ou outro app, toque em "Abrir no Safari".'],
  ['Toque em Compartilhar', 'É o quadrado com a seta para cima, na barra de baixo do Safari.'],
  ['Adicionar à Tela de Início', 'Role a lista de opções até encontrar e toque nela.'],
  ['Toque em Adicionar', 'O ícone aparece na tela do iPhone e abre em tela cheia, como um aplicativo.'],
];
const AND = [
  ['Abra no Chrome', 'Se você abriu pelo WhatsApp ou outro app, toque nos três pontinhos e em "Abrir no Chrome".'],
  ['Toque nos três pontinhos', 'Ficam no canto de cima, à direita.'],
  ['Instalar app', 'Em alguns aparelhos aparece como "Adicionar à tela inicial".'],
  ['Confirme em Instalar', 'O ícone aparece na tela do celular e abre em tela cheia, como um aplicativo.'],
];

export default function install(root) {
  const ua = navigator.userAgent;
  let os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : 'and';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const draw = () => {
    const steps = os === 'ios' ? IOS : AND;
    root.innerHTML = `<div class="wrap inst"><div class="page-head"><h1>Instalar o app</h1>
      <p>Coloque ${esc(state.settings.guild_name)} na tela do celular. Abre em tela cheia e você continua logado, sem digitar nada de novo.</p></div>
      ${standalone ? '<div class="notice ok" style="margin-bottom:18px">Você já está usando o app instalado.</div>' : ''}
      ${deferred && os === 'and' ? '<p style="margin-bottom:18px"><button class="btn primary" id="doinst" type="button">Instalar agora</button></p>' : ''}
      <div class="filters" role="tablist"><button class="chip ${os === 'ios' ? 'on' : ''}" data-os="ios" type="button">iPhone</button><button class="chip ${os === 'and' ? 'on' : ''}" data-os="and" type="button">Android</button></div>
      <ol class="steps">${steps.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>
      ${state.profile ? '' : '<p class="muted small" style="margin-top:18px">Depois de instalar, abra o app e entre com a sua conta.</p>'}</div>`;
    const b = root.querySelector('#doinst');
    if (b) b.onclick = async () => { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; draw(); };
  };
  root.onclick = (e) => { const c = e.target.closest('[data-os]'); if (c) { os = c.dataset.os; draw(); } };
  const on = () => draw();
  document.addEventListener('gm-installable', on);
  draw();
  return () => document.removeEventListener('gm-installable', on);
}
