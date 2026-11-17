import { state } from '../store.js?v=20261113h';
import { fn } from '../supabase.js?v=20261113h';
import { esc, fmtDate } from '../lib/util.js?v=20261113h';
import { empty, loadingHTML } from '../lib/ui.js?v=20261113h';
import { pauseRadio } from '../lib/player.js?v=20261113h';

const embed = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;

export default async function videos(root) {
  const yt = state.raw?.youtube || {};
  const name = yt.title || 'Canal da guild';
  const link = /^https:\/\/(www\.)?youtube\.com\//.test(yt.url || '') ? yt.url : '';
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Vídeos</h1><p>${esc(name)}${yt.handle ? ' · ' + esc(yt.handle) : ''}. Assista aqui mesmo, sem sair do site.</p></div>
    ${link ? `<p style="margin-bottom:18px"><a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir o canal no YouTube</a></p>` : ''}
    <div id="v">${loadingHTML}</div></div>`;
  const v = root.querySelector('#v');
  if (!/^UC[\w-]{22}$/.test(yt.channel_id || '')) { v.innerHTML = empty('O canal do YouTube ainda não foi configurado.'); return; }

  let list = [];
  try { list = (await fn('youtube-feed', { channel_id: yt.channel_id })).videos || []; } catch (e) { console.warn(e); }

  if (!list.length) {
    // sem a lista: ainda dá para assistir, pela playlist de envios do canal
    v.innerHTML = `<div class="vid-frame"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=UU${esc(yt.channel_id.slice(2))}" title="Vídeos do canal" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <p class="muted small" style="margin-top:12px">A lista de vídeos não carregou agora, mas o player mostra os envios do canal.</p>`;
    return;
  }

  let cur = list[0].id;
  const draw = (autoplay) => {
    const c = list.find((x) => x.id === cur) || list[0];
    v.innerHTML = `<div class="vid-frame"><iframe src="${esc(embed(c.id))}${autoplay ? '&autoplay=1' : ''}" title="${esc(c.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <h2 class="vid-title">${esc(c.title)}</h2><p class="muted small">${c.published ? 'Publicado em ' + fmtDate(c.published) : ''}</p>
      <div class="section"><h2>Mais vídeos</h2><div class="vid-grid">${list.map((x) => `<button type="button" class="vid-card ${x.id === cur ? 'on' : ''}" data-id="${esc(x.id)}"><span class="th"><img src="https://i.ytimg.com/vi/${esc(x.id)}/mqdefault.jpg" alt="" loading="lazy"></span><b>${esc(x.title)}</b><small>${x.published ? fmtDate(x.published) : ''}</small></button>`).join('')}</div></div>`;
  };
  draw(false);
  v.addEventListener('click', (e) => {
    const b = e.target.closest('.vid-card'); if (!b) return;
    cur = b.dataset.id; pauseRadio(); draw(true); v.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
