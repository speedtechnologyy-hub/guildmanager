import { sb, q } from './supabase.js?v=20261113h';

export const state = {
  session: null, user: null, profile: null, priv: null, chars: [], perms: {},
  settings: {}, classes: [], lineages: [], types: [], pages: [],
};

export const DEFAULTS = {
  guild_name: 'Guild Manager',
  timezone: 'America/Sao_Paulo',
  logo_url: null, favicon_url: null, banner_url: null,
  theme: {
    bg: '#060a14', surface: '#0e1526', text: '#efe8d8', muted: '#9aa3b5',
    primary: '#a3162b', accent: '#e2b552',
    heading_font: 'Montserrat', body_font: 'Inter', display_font: 'Cinzel',
    // opcionais: vazio = usa o padrão da pele
    frame: '', heading_color: '', hero_title: '', link: '', topbar_bg: '', footer_bg: '',
    btn_style: 'flat', btn_radius: 10, btn_bg: '', btn_text: '', btn_primary_text: '', btn_upper: false,
    radius: 14, wrap_w: 1120, font_scale: 100, hero_h: 70, hero_overlay: 40, topbar_style: 'glass',
    app_bg_dim: 70, login_dim: 55, nav_align: 'right',
  },
  features: {}, effects: {}, layouts: {}, custom_fonts: [], admin_access: {},
  texts: {
    login_title: 'Área de membros',
    login_subtitle: 'Entre com Google ou Discord. Ainda não tem conta? Peça um convite à liderança.',
    nick_hint: 'Escreva o nick exatamente como está no jogo, com as mesmas maiúsculas, minúsculas e símbolos.',
    hero_tagline: 'Quem responde a chamada, vai para a guerra.',
    intro_tagline: 'Área de membros',
    login_google: 'Entrar com Google',
    login_discord: 'Entrar com Discord',
    footer: '',
  },
  menu: [
    { label: 'Lobby', path: '/', min_role: 'member' },
    { label: 'Guerras', path: '/guerras', min_role: 'member' },
    { label: 'Ranking', path: '/ranking', min_role: 'member' },
    { label: 'Membros', path: '/membros', min_role: 'member' },
  ],
  discord: {},
  login_bg_url: null, app_bg_url: null, vitrine_url: null,
  // Player de rádio: endereço do stream (https) de cada estação. Vazio = a aba não aparece.
  music: {
    eletronica: 'https://stream.zeno.fm/dypkmcyizhktv',        // Só Track Boa 1.0 - JubsTones (house)
    funk: 'https://ice1.somafm.com/7soul-128-mp3',
    trap: 'https://ice1.somafm.com/fluid-128-mp3',
    rock: 'https://ice1.somafm.com/metal-128-mp3',
    sertanejo: 'https://sc4s.cdn.upx.com:8067/stream',        // Sertaneja 106.7
    jovempan: 'https://stream.zeno.fm/c45wbq2us3buv',          // Rádio Jovem Pan 100.9 FM
    gospel: 'https://stream3.svrdedicado.org/8070/stream',     // Gospel FM
    pordeus: 'https://stream.zenolive.com/92ptm8uua2zuv.aac',  // PorDeus.fm
  },
};;

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** Junta o que veio do banco com os padrões, sem deixar nada indefinido. */
export function normalize(s) {
  return {
    ...DEFAULTS, ...s,
    theme: { ...DEFAULTS.theme, ...(isObj(s.theme) ? s.theme : {}) },
    texts: { ...DEFAULTS.texts, ...(isObj(s.texts) ? s.texts : {}) },
    menu: Array.isArray(s.menu) && s.menu.length ? s.menu : DEFAULTS.menu,
    discord: isObj(s.discord) ? s.discord : {},
    music: { ...DEFAULTS.music, ...(isObj(s.music) ? s.music : {}) },
    features: isObj(s.features) ? s.features : {},
    effects: isObj(s.effects) ? s.effects : {},
    layouts: isObj(s.layouts) ? s.layouts : {},
    custom_fonts: Array.isArray(s.custom_fonts) ? s.custom_fonts : [],
    admin_access: isObj(s.admin_access) ? s.admin_access : {},
  };
}

export async function loadSettings() {
  try {
    const rows = await q(sb.from('site_settings').select('key,value'));
    const s = {};
    rows.forEach((r) => { s[r.key] = r.value; });
    state.raw = s;
    state.settings = normalize(s);
    state.offline = false;
  } catch (e) {
    state.offline = true;
    console.warn('configurações indisponíveis, usando padrão', e);
    state.raw = {};
    state.settings = normalize({});
  }
}

/** Aplica uma mudança vinda do tempo real (ou de uma prévia). value null = voltou ao padrão. */
export function setSetting(key, value) {
  state.raw = { ...(state.raw || {}) };
  if (value === undefined) delete state.raw[key]; else state.raw[key] = value;
  state.settings = normalize(state.raw);
}

/** Páginas criadas pelo master que este usuário pode ver (a RLS já filtra). */
export async function loadPages() {
  const { data } = await sb.from('cms_pages').select('id,slug,title,published,visibility,show_in_menu,menu_order').eq('published', true).order('menu_order');
  state.pages = data || [];
}

export async function loadProfile() {
  const uid = state.user?.id;
  state.profile = null; state.priv = null; state.chars = []; state.perms = {};
  if (!uid) return;
  const [prof, priv, chars, perms] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('profile_private').select('*').eq('id', uid).maybeSingle(),
    sb.from('characters').select('*').eq('user_id', uid).order('is_main', { ascending: false }).order('created_at'),
    sb.from('admin_perms').select('perms').eq('user_id', uid).maybeSingle(),
  ]);
  state.perms = perms.data?.perms || {};
  state.profile = prof.data;
  if (!prof.data) return;
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
