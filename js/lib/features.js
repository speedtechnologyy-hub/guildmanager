import { state } from '../store.js';
import { can } from './util.js';

/** Funções que o GuildMaster liga e desliga no Estúdio. `route` é a página do roteador. */
export const FEATURES = [
  { id: 'wars', label: 'Guerras', desc: 'Chamada de guerra, presença e histórico.', path: '/guerras', route: 'wars' },
  { id: 'ranking', label: 'Ranking', desc: 'Presença e fama por membro.', path: '/ranking', route: 'ranking' },
  { id: 'members', label: 'Membros', desc: 'Lista de guerreiros e personagens.', path: '/membros', route: 'members' },
  { id: 'voice', label: 'Voz (Discord)', desc: 'Botão e página da sala de voz.', path: '/voz', route: 'voice' },
  { id: 'login_google', label: 'Login com Google', desc: 'Botão Google na tela de entrada.' },
  { id: 'login_discord', label: 'Login com Discord', desc: 'Botão Discord na tela de entrada.' },
];

/** Efeitos visuais globais. */
export const EFFECTS = [
  { id: 'embers', label: 'Brasas subindo', desc: 'Partículas de fogo no fundo.' },
  { id: 'grain', label: 'Granulado de filme', desc: 'Textura sutil sobre a tela.' },
  { id: 'vignette', label: 'Vinheta escura', desc: 'Escurece as bordas da tela.' },
  { id: 'intro', label: 'Abertura com portões', desc: 'Animação ao entrar no site.' },
  { id: 'parallax', label: 'Movimento do cenário', desc: 'Cenário do topo acompanha o mouse.' },
];

/** Seções do lobby que podem ser reordenadas e ocultadas. */
export const LOBBY_BLOCKS = [
  { id: 'chars', label: 'Seus personagens' },
  { id: 'announcements', label: 'Avisos' },
  { id: 'pulse', label: 'Números da guild' },
  { id: 'podium', label: 'Os mais presentes' },
  { id: 'discord', label: 'Chamada de voz (Discord)' },
  { id: 'call', label: 'Chamada de guerra (repete a do topo)', off: true },
  { id: 'classes', label: 'Classes', off: true },
];

/** Telas padrão onde dá para colocar blocos extras no topo e no rodapé. */
export const SCREENS = [
  { id: 'wars', label: 'Guerras', path: '/guerras' },
  { id: 'ranking', label: 'Ranking', path: '/ranking' },
  { id: 'members', label: 'Membros', path: '/membros' },
  { id: 'voice', label: 'Voz', path: '/voz' },
  { id: 'profile', label: 'Perfil', path: '/perfil' },
];

const ROUTE_FEATURE = Object.fromEntries(FEATURES.filter((f) => f.route).map((f) => [f.route, f.id]));
const PATH_FEATURE = Object.fromEntries(FEATURES.filter((f) => f.path).map((f) => [f.path, f.id]));

export const featureCfg = (id) => ({ enabled: true, min_role: 'member', ...(state.settings.features?.[id] || {}) });
export const featureOn = (id) => featureCfg(id).enabled !== false;
/** A função está ligada e o usuário atual tem o cargo exigido? */
export function featureAllowed(id) {
  const c = featureCfg(id);
  return c.enabled !== false && can(c.min_role || 'member');
}
export const routeFeature = (page) => ROUTE_FEATURE[page] || null;
export const pathFeature = (path) => PATH_FEATURE[path] || null;

export const effectOn = (id) => state.settings.effects?.[id] !== false;

/** Ordem do lobby: o que foi salvo, mais qualquer seção nova que ainda não esteja na lista. */
export const lobbyLayout = () => normalizeLobby(state.settings.layouts?.lobby);
export function normalizeLobby(list) {
  const saved = Array.isArray(list) ? list : [];
  const known = new Set(LOBBY_BLOCKS.map((b) => b.id));
  const out = saved.filter((b) => b.custom || known.has(b.id)).map((b) => ({ on: true, ...b }));
  LOBBY_BLOCKS.forEach((b) => { if (!out.some((x) => x.id === b.id)) out.push({ id: b.id, on: !b.off }); });
  return out;
}
export const screenBlocks = (screen, where) => (state.settings.layouts?.[`${where}_${screen}`] || []).filter((b) => b.on !== false);
