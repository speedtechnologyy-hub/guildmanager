import { sb, q } from './supabase.js';

export const state = {
  session: null, user: null, profile: null, priv: null, chars: [],
  settings: {}, classes: [], lineages: [], types: [],
};

export const DEFAULTS = {
  guild_name: 'Guild Manager',
  timezone: 'America/Sao_Paulo',
  logo_url: null, favicon_url: null, banner_url: null,
  theme: {
    bg: '#0a0807', surface: '#14100d', text: '#efe6d8', muted: '#a39787',
    primary: '#a52525', accent: '#d4a017',
    heading_font: 'Cinzel', body_font: 'Alegreya Sans', display_font: 'Cinzel Decorative',
  },
  texts: {
    login_title: 'Área de membros',
    login_subtitle: 'Entre com Google ou Discord. Ainda não tem conta? Peça um convite à liderança.',
    nick_hint: 'Escreva o nick exatamente como está no jogo, com as mesmas maiúsculas, minúsculas e símbolos.',
    hero_tagline: 'Quem responde a chamada, vai para a guerra.',
    intro_tagline: 'Área de membros',
    footer: '',
  },
  menu: [
    { label: 'Lobby', path: '/', min_role: 'member' },
    { label: 'Guerras', path: '/guerras', min_role: 'member' },
    { label: 'Bosses', path: '/bosses', min_role: 'member' },
    { label: 'Agenda', path: '/agenda', min_role: 'member' },
    { label: 'Membros', path: '/membros', min_role: 'member' },
  ],
  discord: {},
};

export async function loadSettings() {
  try {
    const rows = await q(sb.from('site_settings').select('key,value'));
    const s = {};
    rows.forEach((r) => { s[r.key] = r.value; });
    state.settings = {
      ...DEFAULTS, ...s,
      theme: { ...DEFAULTS.theme, ...(s.theme || {}) },
      texts: { ...DEFAULTS.texts, ...(s.texts || {}) },
      menu: Array.isArray(s.menu) && s.menu.length ? s.menu : DEFAULTS.menu,
      discord: s.discord || {},
    };
  } catch (e) {
    console.warn('configurações indisponíveis, usando padrão', e);
    state.settings = { ...DEFAULTS };
  }
}

export async function loadProfile() {
  const uid = state.user?.id;
  state.profile = null; state.priv = null; state.chars = [];
  if (!uid) return;
  const { data } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
  state.profile = data;
  if (!data) return;
  const [priv, chars] = await Promise.all([
    sb.from('profile_private').select('*').eq('id', uid).maybeSingle(),
    sb.from('characters').select('*').eq('user_id', uid).order('is_main', { ascending: false }).order('created_at'),
  ]);
  state.priv = priv.data;
  state.chars = chars.data || [];
}

export async function loadChars() {
  if (!state.user) return;
  const { data } = await sb.from('characters').select('*').eq('user_id', state.user.id)
    .order('is_main', { ascending: false }).order('created_at');
  state.chars = data || [];
}

export async function loadGame() {
  const [c, l, t] = await Promise.all([
    sb.from('game_classes').select('*').order('sort'),
    sb.from('game_lineages').select('*').order('sort'),
    sb.from('event_types').select('*').order('sort'),
  ]);
  state.classes = c.data || [];
  state.lineages = l.data || [];
  state.types = t.data || [];
}
