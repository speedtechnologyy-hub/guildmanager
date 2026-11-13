import { state } from './store.js';

export const CREST = 'assets/crest.svg';
export const logoUrl = () => state.settings.logo_url || CREST;

const FONT_OK = /^[A-Za-z0-9 ]{2,40}$/;
const COLOR_OK = /^#[0-9a-f]{3,8}$/i;
const loaded = new Set(['Cinzel', 'Cinzel Decorative', 'Alegreya Sans']);

function ensureFont(name) {
  if (!name || !FONT_OK.test(name) || loaded.has(name)) return;
  loaded.add(name);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${name.trim().replace(/ /g, '+')}:wght@400;500;700;900&display=swap`;
  document.head.append(l);
}

/** Aplica cores e fontes do painel (Aparência). Aceita um tema parcial para a pré-visualização ao vivo. */
export function applyTheme(theme = state.settings.theme) {
  const r = document.documentElement.style;
  const colors = { bg: '--bg', surface: '--surface', text: '--text', muted: '--muted', primary: '--primary', accent: '--accent' };
  for (const [k, v] of Object.entries(colors)) if (COLOR_OK.test(theme[k] || '')) r.setProperty(v, theme[k]);
  const { heading_font: hf, body_font: bf, display_font: df } = theme;
  [hf, bf, df].forEach(ensureFont);
  if (FONT_OK.test(hf || '')) r.setProperty('--font-head', `'${hf}', Georgia, serif`);
  if (FONT_OK.test(bf || '')) r.setProperty('--font-body', `'${bf}', system-ui, sans-serif`);
  r.setProperty('--font-display', FONT_OK.test(df || '') ? `'${df}', Georgia, serif` : `'Cinzel Decorative', 'Cinzel', serif`);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme.bg || '#0a0807');
}

export function applyBrand() {
  document.title = state.settings.guild_name || 'Guild Manager';
  const fav = document.getElementById('favicon');
  if (fav) fav.href = state.settings.favicon_url || logoUrl();
}
