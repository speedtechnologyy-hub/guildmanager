import { state } from '../store.js?v=20261122a';
import { esc, clsRgb, clsIcon, className, relDay, fmtTime } from './util.js?v=20261122a';
import { rsvpButtons } from './rsvp.js?v=20261122a';
import { toast } from './ui.js?v=20261122a';
import { featureAllowed } from './features.js?v=20261122a';
import { sceneHTML } from '../layout.js?v=20261122a';
import { logoUrl } from '../theme.js?v=20261122a';

const SOC = {
  discord: '<path d="M7.5 7.2A12 12 0 0 1 12 6c1.6 0 3 .3 4.5 1.2 1.2 1.7 2.3 4.4 2.5 8-1.1.9-2.3 1.4-3.6 1.8l-.9-1.5c.5-.2 1-.4 1.4-.7-.9-.5-2-.8-3.9-.8s-3 .3-3.9.8c.4.3.9.5 1.4.7l-.9 1.5C6.3 16.600 5.100 16.100 4 15.200c.2-3.600 1.300-6.300 2.500-8 .3-.1.700-.1 1-.0Z M9.700 11.800a1.100 1.300 0 1 0 0 2.600 1.100 1.300 0 0 0 0-2.600Zm4.600 0a1.100 1.300 0 1 0 0 2.600 1.100 1.300 0 0 0 0-2.600Z"/>',
  youtube: '<path d="M21 8.200c-.2-1-.9-1.700-1.800-1.900C17.600 6 12 6 12 6s-5.600 0-7.200.3c-.9.200-1.600.9-1.800 1.900C2.700 9.800 2.700 12 2.700 12s0 2.200.3 3.800c.2 1 .9 1.700 1.800 1.900C6.400 18 12 18 12 18s5.600 0 7.200-.3c.9-.2 1.600-.9 1.800-1.900.3-1.600.3-3.800.3-3.800s0-2.200-.3-3.800ZM10.200 14.600V9.400l4.500 2.600Z"/>',
  twitch: '<path d="M5 3 3.500 7v12.500H8V22h2.500l2.500-2.500h3.500L21 15V3Zm14 11-2.800 2.800h-4.400L9.300 19.300v-2.500H6V5h13Zm-3.500-6.500H17v4.500h-1.500Zm-4 0H13v4.500h-1.500Z"/>',
};
const socIcon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${SOC[k]}</svg>`;


const HD = { '/assets/hero-fatality.jpg': ['/assets/hero-fatality-hd.jpg', '/assets/hero-fatality-hd-m.jpg'] };

/** Hero do lobby: a foto do site de fundo, saudação + frase da guild, o cartão da próxima guerra e um bloco de status. */
export function nivalHero({ war, mine, going, people, open, cities, nick }) {
  const t = state.settings.texts || {};
  const tag = (t.hero_tagline || '').trim();
  const soc = [
    state.settings.discord?.invite_url ? `<a class="hx-soc" href="${esc(state.settings.discord.invite_url)}" target="_blank" rel="noopener" aria-label="Discord" data-name="Discord">${socIcon('discord')}</a>` : '',
    `<a class="hx-soc" href="#/videos" aria-label="Youtuber" data-name="Youtuber">${socIcon('youtube')}</a>`,
    `<a class="hx-soc" href="#/streamer" aria-label="Streamer" data-name="Streamer">${socIcon('twitch')}</a>`,
  ].join('');

  const ph0 = state.settings.banner_url;
  // a foto padrão do site tem versões em alta resolução (aumentadas por IA); outras fotos enviadas no painel vão como estão
  const ph = HD[ph0] ? (innerWidth > 900 ? HD[ph0][0] : HD[ph0][1]) : ph0;
  const bg = ph ? `<div class="nv-bg" style="background-image:url('${esc(encodeURI(ph))}')"></div>`
    : `<div class="nv-bg nv-bgscene">${sceneHTML('nv')}</div>`;

  const confirmed = !!war && mine === 'going';
  const card = war && !confirmed ? `<aside class="hx-card" aria-label="Próxima guerra">
      <div class="hx-when">${esc(war.event_types?.name || 'Guerra')} · ${relDay(war.starts_at)}, ${fmtTime(war.starts_at)}</div>
      <div class="hx-cd" data-cd="${war.starts_at}" data-done="É AGORA">--</div>
      <div class="hx-meta">${going} ${going === 1 ? 'confirmado' : 'confirmados'}${cities.length ? ` · ${cities.map((c) => esc(c.city)).join(', ')}` : ''}${war.bet_closes_at && new Date(war.bet_closes_at) > Date.now() ? ` · aposta fecha em <b data-cd="${war.bet_closes_at}" data-done="encerrada"></b>` : ''}</div>
      <div class="hx-acts">${rsvpButtons(war, mine, { go: 'Eu vou', no: 'Não vou' })}</div>
    </aside>` : '';

  const status = confirmed
    ? `<a class="hx-status ok" href="#/guerras"><span class="hx-tick" aria-hidden="true">✓</span><span><b>Presença confirmada</b><small>${esc(war.event_types?.name || 'Guerra')} · <span data-cd="${war.starts_at}" data-done="é agora">--</span></small></span></a>`
    : !war ? `<a class="hx-status" href="#/guerras"><span><b>Sem guerra marcada</b><small>Ver guerras anteriores</small></span></a>` : '';

  return `<div class="nv-bgwrap" aria-hidden="true">${bg}<div class="nv-shade"></div></div>
  <div class="hx">
    <div class="hx-left">
      <p class="hx-hi">Salve, <b>${esc(nick)}</b></p>
      <h1 class="hx-sr" id="home">${esc(state.settings.guild_name || '')}</h1>
      ${card}
    </div>
    <div class="hx-right">
      <div class="hx-chips"><span><b>${people}</b> ${people === 1 ? 'guerreiro' : 'guerreiros'}</span>${war ? `<span><b>${going}</b> ${going === 1 ? 'confirmado' : 'confirmados'}</span>` : ''}</div>
      ${status}
      <div class="hx-socs">${soc}</div>
    </div>
  </div>`;
}

/** Liga os cliques do hero. Chame uma vez por tela. */
export function bindNival(head) {
  const onClick = (e) => {
    const so = e.target.closest('.hx-soc'); if (so && so.getAttribute('href') === '#') toast(`${so.dataset.name}`);
  };
  head.addEventListener('click', onClick);
  return () => head.removeEventListener('click', onClick);
}

/** Depois de cada render: marca o estado "chamada confirmada". */
export function paintNival(head, awake) {
  head.classList.toggle('awake', !!awake);
}
