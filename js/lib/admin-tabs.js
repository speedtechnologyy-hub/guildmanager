import { state } from '../store.js';
import { can } from './util.js';

/** Áreas do painel. `db` = o banco também barra quem não tem permissão (não só a tela). */
export const GROUPS = ['Guild', 'Guerra', 'Comunicação', 'Site'];
export const TABS = [
  { id: 'resumo', name: 'Visão geral', min: 'mod', group: 'Guild', icon: '◈', kw: 'resumo painel inicio gráficos checklist configurar' },
  { id: 'membros', name: 'Membros', min: 'leader', group: 'Guild', icon: '♜', kw: 'membros jogadores personagens notas banir remover cargo sub líder' },
  { id: 'convites', name: 'Convites e cadastro', min: 'mod', group: 'Guild', icon: '✉', kw: 'convite link cadastro novo membro aprovar' },
  { id: 'presenca', name: 'Presença', min: 'mod', group: 'Guerra', icon: '✓', kw: 'presença chamada marcar quem foi guerra', db: true },
  { id: 'agenda', name: 'Horários das guerras', min: 'sub', group: 'Guerra', icon: '◷', kw: 'horário agenda torres cidades noatun dias abre fecha' },
  { id: 'calendario', name: 'Calendário e prints', min: 'leader', group: 'Guerra', icon: '▦', kw: 'calendário prints cidades fama dia guerra imagens', db: true },
  { id: 'fama', name: 'Fama da semana', min: 'leader', group: 'Guerra', icon: '★', kw: 'fama torres soma aposta sábado', db: true },
  { id: 'jogo', name: 'Classes e linhagens', min: 'leader', group: 'Guerra', icon: '⚔', kw: 'classes linhagens tk fm ht bl jogo' },
  { id: 'avisos', name: 'WhatsApp e avisos', min: 'leader', group: 'Comunicação', icon: '✆', kw: 'whatsapp evolution qr code avisos mensagens lembrete' },
  { id: 'log', name: 'Registro de ações', min: 'leader', group: 'Comunicação', icon: '≡', kw: 'log histórico auditoria quem fez' },
  { id: 'estudio', name: 'Estúdio do site', min: 'owner', group: 'Site', icon: '✦', kw: 'estúdio cores fontes imagens menu funções páginas tema sub líderes acessos equipe' },
];
/** Quais áreas o master pode liberar ou bloquear para sub líderes. */
export const GRANTABLE = TABS.filter((t) => t.min !== 'owner');

export const tabAllowed = (t) => can(t.min) && (can('owner') || state.settings.admin_access?.[t.id] !== false);
