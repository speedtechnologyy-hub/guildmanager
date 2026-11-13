import { state } from './store.js?v=20261113h';

export const CREST = 'assets/crest.svg';
export const logoUrl = () => state.settings.logo_url || CREST;

/** Fontes prontas: [nome, estilo, pesos disponíveis no Google Fonts]. */
export const PRESET_FONTS = [
  ['Cinzel Decorative', 'Fantasia', [400, 700, 900]], ['Cinzel', 'Fantasia', [400, 500, 700, 900]],
  ['Uncial Antiqua', 'Fantasia', [400]], ['MedievalSharp', 'Fantasia', [400]], ['Metamorphous', 'Fantasia', [400]],
  ['Almendra', 'Fantasia', [400, 700]], ['Pirata One', 'Fantasia', [400]], ['New Rocker', 'Fantasia', [400]],
  ['Grenze Gotisch', 'Fantasia', [400, 700, 900]], ['UnifrakturCook', 'Fantasia', [700]], ['IM Fell English SC', 'Fantasia', [400]],
  ['Macondo', 'Fantasia', [400]], ['Eagle Lake', 'Fantasia', [400]], ['Berkshire Swash', 'Fantasia', [400]],
  ['Philosopher', 'Clássica', [400, 700]], ['Marcellus', 'Clássica', [400]], ['Cormorant Garamond', 'Clássica', [400, 500, 700]],
  ['Playfair Display', 'Clássica', [400, 700, 900]], ['Merriweather', 'Clássica', [400, 700, 900]], ['Alegreya', 'Clássica', [400, 500, 700, 900]],
  ['Orbitron', 'Gamer', [400, 700, 900]], ['Rajdhani', 'Gamer', [400, 500, 700]], ['Russo One', 'Gamer', [400]],
  ['Black Ops One', 'Gamer', [400]], ['Audiowide', 'Gamer', [400]], ['Press Start 2P', 'Gamer', [400]],
  ['Bebas Neue', 'Gamer', [400]], ['Teko', 'Gamer', [400, 500, 700]], ['Saira Condensed', 'Gamer', [400, 500, 700, 900]],
  ['Exo 2', 'Gamer', [400, 500, 700, 900]], ['Oswald', 'Moderna', [400, 500, 700]], ['Barlow Condensed', 'Moderna', [400, 500, 700, 900]],
  ['Alegreya Sans', 'Texto', [400, 500, 700]], ['Lato', 'Texto', [400, 700, 900]], ['Inter', 'Texto', [400, 500, 700, 900]],
  ['Roboto', 'Texto', [400, 500, 700, 900]], ['Poppins', 'Texto', [400, 500, 700, 900]], ['Montserrat', 'Texto', [400, 500, 700, 900]],
  ['Nunito', 'Texto', [400, 600, 700, 900]], ['Open Sans', 'Texto', [400, 600, 700]],
];
const WEIGHTS = new Map(PRESET_FONTS.map(([n, , w]) => [n, w]));

const FONT_OK = /^[A-Za-z0-9 ]{2,40}$/;
const COLOR_OK = /^#[0-9a-f]{3,8}$/i;
const loaded = new Set(['Cinzel', 'Cinzel Decorative', 'Alegreya Sans', 'Rajdhani']);

function ensureFont(name) {
  if (!name || !FONT_OK.test(name) || loaded.has(name)) return;
  if (state.settings.custom_fonts?.some((f) => f.name === name)) return;
  loaded.add(name);
  const w = WEIGHTS.get(name);
  const fam = name.trim().replace(/ /g, '+');
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${fam}${w && w.length > 1 ? ':wght@' + w.join(';') : ''}&display=swap`;
  // fonte digitada à mão pode não ter esses pesos: tenta de novo só com o peso normal
  if (!w) l.onerror = () => { l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`; l.onerror = null; };
  document.head.append(l);
}

/** Carrega de uma vez todas as fontes prontas (usado só na pré-visualização do Estúdio). */
export function loadAllPresetFonts() {
  if (document.getElementById('gm-all-fonts')) return;
  const l = document.createElement('link');
  l.id = 'gm-all-fonts'; l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${PRESET_FONTS.map(([n]) => 'family=' + n.replace(/ /g, '+')).join('&')}&display=swap`;
  document.head.append(l);
}

const FMT = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
function customFonts() {
  let el = document.getElementById('gm-fonts');
  if (!el) { el = document.createElement('style'); el.id = 'gm-fonts'; document.head.append(el); }
  el.textContent = (state.settings.custom_fonts || [])
    .filter((f) => FONT_OK.test(f.name || '') && /^https:\/\//.test(f.url || ''))
    .map((f) => `@font-face{font-family:'${f.name}';src:url('${encodeURI(f.url)}') format('${FMT[f.format] || 'woff2'}');font-display:swap;font-weight:100 900}`).join('\n');
}

const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

/** Aplica cores, fontes, botões, cartões e medidas do Estúdio. Aceita um tema parcial. */
export function applyTheme(theme = state.settings.theme) {
  const root = document.documentElement;
  const r = root.style;
  customFonts();
  const t = theme;
  const set = (name, v) => (v === '' || v == null ? r.removeProperty(name) : r.setProperty(name, v));
  const color = (v) => (COLOR_OK.test(v || '') ? v : '');

  for (const [k, v] of Object.entries({ bg: '--bg', surface: '--surface', text: '--text', muted: '--muted', primary: '--primary', accent: '--accent' })) set(v, color(t[k]));

  // fontes
  [t.heading_font, t.body_font, t.display_font].forEach(ensureFont);
  set('--font-head', FONT_OK.test(t.heading_font || '') ? `'${t.heading_font}', Georgia, serif` : '');
  set('--font-body', FONT_OK.test(t.body_font || '') ? `'${t.body_font}', system-ui, sans-serif` : '');
  set('--font-display', FONT_OK.test(t.display_font || '') ? `'${t.display_font}', Georgia, serif` : '');
  r.fontSize = `${Math.min(125, Math.max(85, +t.font_scale || 100))}%`;

  // molduras de metal seguem a cor escolhida (vazio = ouro)
  const fr = color(t.frame);
  if (fr) {
    set('--gold', fr); set('--gold-hi', mix(fr, 55, '#fff')); set('--gold-lo', mix(fr, 45, '#000'));
    set('--bronze', mix(fr, 25, '#000'));
    set('--metal', `linear-gradient(135deg, ${mix(fr, 50, '#fff')} 0%, ${fr} 22%, ${mix(fr, 45, '#000')} 48%, ${mix(fr, 25, '#000')} 58%, ${fr} 80%, ${mix(fr, 60, '#fff')} 100%)`);
    set('--metal-soft', `linear-gradient(135deg, ${mix(fr, 60, 'transparent')}, ${mix(fr, 45, 'transparent')} 45%, ${mix(fr, 55, 'transparent')})`);
    set('--metal-text', `linear-gradient(180deg, ${mix(fr, 35, '#fff')} 0%, ${fr} 55%, ${mix(fr, 75, '#000')} 100%)`);
  } else ['--gold', '--gold-hi', '--gold-lo', '--bronze', '--metal', '--metal-soft', '--metal-text'].forEach((v) => r.removeProperty(v));

  // botão principal acompanha a cor principal
  const p = color(t.primary) || '#a3162b';
  set('--ruby', `linear-gradient(180deg, ${mix(p, 78, '#fff')} 0%, ${p} 45%, ${mix(p, 45, '#000')} 100%)`);

  set('--heading-color', color(t.heading_color));
  set('--hero-title', color(t.hero_title));
  set('--link', color(t.link));
  set('--topbar-bg', color(t.topbar_bg));
  set('--footer-bg', color(t.footer_bg));
  set('--btn-bg', color(t.btn_bg));
  set('--btn-fg', color(t.btn_text));
  set('--btn-primary-fg', color(t.btn_primary_text));
  set('--btn-radius', `${Math.min(40, Math.max(0, +t.btn_radius || 0))}px`);
  set('--radius', `${Math.min(32, Math.max(0, +t.radius || 0))}px`);
  set('--wrap-w', `${Math.min(1600, Math.max(860, +t.wrap_w || 1120))}px`);
  set('--hero-h', `${Math.min(100, Math.max(30, +t.hero_h || 92))}vh`);
  set('--hero-dim', String(Math.min(100, Math.max(0, t.hero_overlay ?? 40)) / 100));
  set('--app-bg-dim', String(Math.min(100, Math.max(0, t.app_bg_dim ?? 70)) / 100));
  set('--login-dim', String(Math.min(100, Math.max(0, t.login_dim ?? 55)) / 100));

  // atributos que ligam estilos alternativos (veja css/studio.css)
  const d = root.dataset;
  d.btn = ['metal', 'flat', 'outline', 'glass', 'soft'].includes(t.btn_style) ? t.btn_style : 'metal';
  d.btnRound = +t.btn_radius > 0 ? '1' : '0';
  d.round = +t.radius > 0 ? '1' : '0';
  d.btnUpper = t.btn_upper === false ? '0' : '1';
  d.topbar = ['glass', 'solid', 'clear'].includes(t.topbar_style) ? t.topbar_style : 'glass';
  d.navAlign = ['left', 'center', 'right'].includes(t.nav_align) ? t.nav_align : 'right';
  d.headSolid = color(t.heading_color) ? '1' : '0';
  d.heroSolid = color(t.hero_title) ? '1' : '0';
  d.hasBg = state.settings.app_bg_url ? '1' : '0';
  d.topbarBg = color(t.topbar_bg) ? '1' : '0';
  d.footerBg = color(t.footer_bg) ? '1' : '0';
  const fx = state.settings.effects || {};
  for (const id of ['embers', 'grain', 'vignette', 'parallax']) d['fx' + id[0].toUpperCase() + id.slice(1)] = fx[id] === false ? '0' : '1';
  r.setProperty('--app-bg', state.settings.app_bg_url ? `url("${encodeURI(state.settings.app_bg_url)}")` : 'none');

  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg || '#0a0807');
}

export function applyBrand() {
  document.title = state.settings.guild_name || 'Guild Manager';
  const fav = document.getElementById('favicon');
  if (fav) fav.href = state.settings.favicon_url || logoUrl();
}
