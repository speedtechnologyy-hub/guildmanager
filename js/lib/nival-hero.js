import { state } from '../store.js?v=20261117a';
import { esc, clsRgb, clsIcon, className, relDay, fmtTime } from './util.js?v=20261117a';
import { rsvpButtons } from './rsvp.js?v=20261117a';
import { toast } from './ui.js?v=20261117a';
import { featureAllowed } from './features.js?v=20261117a';
import { sceneHTML } from '../layout.js?v=20261117a';
import { logoUrl } from '../theme.js?v=20261117a';

/** cada personagem inclina o tom do herói: [matiz, saturação] */
const TINT = [['2deg', 1.2], ['0deg', .42], ['6deg', 1.3], ['0deg', .2], ['0deg', .68]];

const CHAIN = '<svg class="nv-chain" viewBox="0 0 151 48" aria-hidden="true"><path d="M43 4h22a20 20 0 0 1 0 40H43A20 20 0 0 1 43 4Zm0 8a12 12 0 0 0 0 24h22a12 12 0 0 0 0-24Z"/><path d="M86 4h22a20 20 0 0 1 0 40H86A20 20 0 0 1 86 4Zm0 8a12 12 0 0 0 0 24h22a12 12 0 0 0 0-24Z"/><path d="M0 24A20 20 0 0 1 20 4h4v8h-4a12 12 0 0 0 0 24h4v8h-4A20 20 0 0 1 0 24Zm151 0a20 20 0 0 1-20 20h-4v-8h4a12 12 0 0 0 0-24h-4V4h4a20 20 0 0 1 20 20Z"/></svg>';
const CHECK = '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.2 6.2 4.7 8.5 9.8 3"/></svg>';
const SOC = {
  discord: '<path d="M7.5 7.2A12 12 0 0 1 12 6c1.6 0 3 .3 4.5 1.2 1.2 1.7 2.3 4.4 2.5 8-1.1.9-2.3 1.4-3.6 1.8l-.9-1.5c.5-.2 1-.4 1.4-.7-.9-.5-2-.8-3.9-.8s-3 .3-3.9.8c.4.3.9.5 1.4.7l-.9 1.5C6.3 16.600 5.100 16.100 4 15.200c.2-3.600 1.300-6.300 2.500-8 .3-.1.700-.1 1-.0Z M9.700 11.800a1.100 1.300 0 1 0 0 2.600 1.100 1.300 0 0 0 0-2.600Zm4.600 0a1.100 1.300 0 1 0 0 2.600 1.100 1.300 0 0 0 0-2.600Z"/>',
  youtube: '<path d="M21 8.200c-.2-1-.9-1.700-1.800-1.900C17.600 6 12 6 12 6s-5.600 0-7.200.3c-.9.200-1.600.9-1.800 1.900C2.700 9.800 2.700 12 2.700 12s0 2.200.3 3.800c.2 1 .9 1.700 1.800 1.900C6.400 18 12 18 12 18s5.600 0 7.200-.3c.9-.2 1.600-.9 1.800-1.900.3-1.600.3-3.800.3-3.800s0-2.200-.3-3.800ZM10.200 14.600V9.400l4.500 2.600Z"/>',
  twitch: '<path d="M5 3 3.500 7v12.500H8V22h2.500l2.500-2.500h3.500L21 15V3Zm14 11-2.800 2.800h-4.400L9.300 19.300v-2.500H6V5h13Zm-3.500-6.500H17v4.500h-1.500Zm-4 0H13v4.500h-1.500Z"/>',
};
const socIcon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${SOC[k]}</svg>`;

let sel = 0;

/** Monta o herói do lobby no estilo Nival: título grande, palavras fantasma, cartão de vidro, galeria e holofote. */
/** versões da foto já tingidas de azul (evita filtro + mistura de cor em tempo real, que travava) */
const PRE = {};   // foto original, sem tingir

export function nivalHero({ war, mine, going, people, open, cities, main, chars, nick }) {
  const g = state.settings.guild_name || 'Guild';
  const t = state.settings.texts || {};
  const slots = chars.slice(0, 5);
  const gal = Array.from({ length: 5 }, (_, i) => {
    const c = slots[i];
    if (c) return `<button type="button" class="nv-av ${i === sel ? 'active' : ''}" data-av="${i}" aria-label="${esc(c.nick)}" style="--c:${clsRgb(c.class_code)}"><span class="nv-av-in">${clsIcon(c.class_code, 'nv-gl')}<b>${esc(c.nick)}</b></span></button>`;
    if (i === slots.length) return `<a class="nv-av nv-add" href="#chars" data-add aria-label="Adicionar personagem"><span class="nv-av-in"><i>+</i><b>Novo</b></span></a>`;
    return '<span class="nv-av nv-void" aria-hidden="true"></span>';
  }).join('');
  const links = [['/guerras', 'Guerras'], ['/ranking', 'Ranking'], ['/sorteios', 'Sorteios']].filter(([p]) => featureAllowed(p.slice(1)) !== false);
  const soc = [
    state.settings.discord?.invite_url ? `<a class="nv-soc" href="${esc(state.settings.discord.invite_url)}" target="_blank" rel="noopener" aria-label="Discord" data-name="Discord">${socIcon('discord')}</a>` : '',
    `<a class="nv-soc" href="#/videos" aria-label="Youtuber" data-name="Youtuber">${socIcon('youtube')}</a>`,
    `<a class="nv-soc" href="#/streamer" aria-label="Streamer" data-name="Streamer">${socIcon('twitch')}</a>`,
  ].join('');
  const tagline = `Salve, ${nick}. ${t.hero_tagline || ''}`.trim();

  // a mesma foto de hero que já está no site (banner do painel); sem foto, usa o cenário gerado
  const ph = state.settings.banner_url;
  const bg = ph
    ? [`<div class="nv-bg${PRE[ph] ? ' pre' : ''}" style="background-image:url('${esc(encodeURI(PRE[ph] || ph))}')"></div>`, '']
    : [`<div class="nv-bg nv-bgscene">${sceneHTML('nv')}</div>`, ''];
  return `<div class="nv-bgwrap${PRE[ph] ? ' pre' : ''}" aria-hidden="true">${bg[0]}<div class="nv-tint"></div><div class="nv-shade"></div>${bg[1]}</div><div class="nv-stage">
    <h1 class="nv-sr" id="home" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">${esc(g)}</h1>
    <div class="nv-feats">${links.map(([p, l], i) => `<a class="nv-feat" href="#${p}"><span>${l}</span><b>/0${i + 1}</b></a>`).join('')}</div>
    ${main ? `<div class="nv-creator"><i class="nv-ver">${CHECK}</i><div><div>Por ${esc(main.nick)}</div><div class="nv-series">${esc(className(main.class_code))} · lv ${esc(String(main.level ?? ''))}</div></div></div>` : ''}
    <div class="nv-art">
      <div class="nv-ghost g1" aria-hidden="true">H<i class="nv-gap"></i>NRA</div>
      <div class="nv-ghost g2" aria-hidden="true">GUERRA</div>
    </div>
    ${war && mine === 'going' ? '' : `    <aside class="nv-card" aria-label="Próxima guerra">
      <div class="nv-top"><div class="nv-count"><strong>${people}</strong><small>guerreiros</small></div></div>
      <p class="nv-copy">${esc(tagline)}</p>
      ${war ? `<div class="nv-bottom"><div class="nv-start">${esc(war.event_types?.name || 'Guerra')} · ${relDay(war.starts_at)}, ${fmtTime(war.starts_at)}<br><strong data-cd="${war.starts_at}" data-done="É AGORA">--</strong>${cities.length ? `<small>Cidades: ${cities.map((c) => esc(c.city)).join(', ')}</small>` : ''}${war.bet_closes_at && new Date(war.bet_closes_at) > Date.now() ? `<small>Aposta fecha em <b data-cd="${war.bet_closes_at}" data-done="encerrada"></b></small>` : ''}</div>
        <div class="nv-acts">${rsvpButtons(war, mine, { go: 'Eu vou', no: 'Não vou' })}</div></div>` : '<div class="nv-bottom"><div class="nv-start">Sem guerra marcada<br><strong>Descanse</strong></div></div>'}
    </aside>`}
    <a class="nv-mat" href="#/guerras"><span class="nv-thumb"><img src="${esc(logoUrl())}" alt=""></span><span class="nv-pill"><span class="nv-mc">${war ? (mine === 'going' ? 'Presença<br>confirmada' : open ? 'Chamada<br>aberta' : 'Próxima<br>guerra') : 'Ver<br>guerras'}</span><span class="nv-next"><svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="#06192f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 8 24 25M12 25h12V13"/></svg></span></span></a>
    <div class="nv-gal" role="group" aria-label="Seus personagens">${gal}</div>
    <div class="nv-socs">${soc}</div>
  </div>`;
}

/** Liga a imagem, o holofote e os cliques do herói. Chame uma vez por tela; depois de cada render chame paint(). */
export function bindNival(head) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const m = { x: -9999, y: -9999 }, s = { x: -9999, y: -9999 };
  let last = 0, raf = 0, alive = true;
  const stack = () => head;

  head.addEventListener('pointermove', (e) => {
    const st = stack(); if (!st) return;
    const r = st.getBoundingClientRect();
    m.x = e.clientX - r.left; m.y = e.clientY - r.top; last = performance.now();
  }, { passive: true });
  head.addEventListener('pointerleave', () => { m.x = m.y = -9999; s.x = s.y = -9999; const l = head.querySelector('.nv-lens'); if (l) l.style.transform = 'translate3d(-9999px,-9999px,0)'; }, { passive: true });
  head.addEventListener('click', (e) => {
    const av = e.target.closest('[data-av]');
    if (av) { choose(head, +av.dataset.av); return; }
    const so = e.target.closest('.nv-soc'); if (so) toast(`${so.dataset.name}`);
    if (e.target.closest('[data-add]')) { e.preventDefault(); document.getElementById('chars')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
  });

  function loop(now) {
    if (!alive) return;
    const st = stack();
    if (st && !document.hidden) {
      const touch = matchMedia('(pointer: coarse)').matches;
      const rr = head.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > innerHeight) { raf = requestAnimationFrame(loop); return; }
      if (!reduce && touch && now - last > 2500) {   // sem cursor (celular): o holofote passeia sozinho
        const w = st.offsetWidth, h = st.offsetHeight;
        m.x = w * (.5 + .3 * Math.sin(now / 2400)); m.y = h * (.42 + .2 * Math.sin(now / 1700 + 1));
      }
      let snapped = false;
      if (s.x < -5000 && m.x > -5000) { s.x = m.x; s.y = m.y; snapped = true; }   // chegou agora: aparece sob o cursor, sem voar de fora
      const dx = m.x - s.x, dy = m.y - s.y;
      if (snapped || Math.abs(dx) > .4 || Math.abs(dy) > .4) {   // parado: não mexe em nada
        s.x += dx * .1; s.y += dy * .1;
        // a "lente" é um círculo pequeno que se move só com transform (GPU); a foto em cores dentro dela anda ao contrário
        const lens = st.querySelector('.nv-lens'), inner = lens?.firstElementChild;
        if (lens) {
          const bw = st.querySelector('.nv-bgwrap'), R = lens.offsetWidth / 2;
          if (inner.offsetWidth !== bw.offsetWidth || inner.offsetHeight !== bw.offsetHeight) { inner.style.width = bw.offsetWidth + 'px'; inner.style.height = bw.offsetHeight + 'px'; }
          const lx = s.x - R, ly = s.y - R;
          lens.style.transform = `translate3d(${lx.toFixed(1)}px,${ly.toFixed(1)}px,0)`;
          inner.style.transform = `translate3d(${(-lx).toFixed(1)}px,${(-ly).toFixed(1)}px,0)`;
        }
      }
    }
    raf = requestAnimationFrame(loop);
  }
  return () => { alive = false; cancelAnimationFrame(raf); };
}

function choose(head, i) {
  sel = i;
  head.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('active', +b.dataset.av === i));
  const [h, sa] = TINT[i % 5];
  head.style.setProperty('--hero-hue', h); head.style.setProperty('--hero-sat', sa);
}

/** Depois de cada render: liga o estado "acordado" (chamada confirmada). */
export function paintNival(head, awake) {
  head.classList.toggle('awake', !!awake);
}
