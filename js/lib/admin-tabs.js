import { state } from '../store.js';
import { can } from './util.js';

/** Áreas do painel. `db` = o banco também barra quem não tem permissão (não só a tela). */
export const GROUPS = ['Guild', 'Guerra', 'Comunicação', 'Site'];
export const TABS = [
  { id: 'resumo', name: 'Visão geral', min: 'mod', group: 'Guild', icon: '◈', desc: 'Números, gráficos e o que falta configurar.', kw: 'resumo painel inicio gráficos checklist configurar' },
  { id: 'membros', name: 'Membros', min: 'leader', group: 'Guild', icon: '♜', desc: 'Jogadores, personagens, notas e cargos.', kw: 'membros jogadores personagens notas banir remover cargo sub líder' },
  { id: 'convites', name: 'Convites e cadastro', min: 'mod', group: 'Guild', icon: '✉', desc: 'Links de convite e novos cadastros.', kw: 'convite link cadastro novo membro aprovar' },
  { id: 'presenca', name: 'Presença', min: 'mod', group: 'Guerra', icon: '✓', desc: 'Marcar quem foi em cada guerra.', kw: 'presença chamada marcar quem foi guerra' },
  { id: 'agenda', name: 'Horários das guerras', min: 'sub', group: 'Guerra', icon: '◷', desc: 'Dias, horários e cidades das guerras.', kw: 'horário agenda torres cidades noatun dias abre fecha' },
  { id: 'calendario', name: 'Calendário e prints', min: 'leader', group: 'Guerra', icon: '▦', desc: 'Prints e cidades de cada dia de guerra.', kw: 'calendário prints cidades fama dia guerra imagens' },
  { id: 'fama', name: 'Fama da semana', min: 'leader', group: 'Guerra', icon: '★', desc: 'Fama por torre e soma da semana.', kw: 'fama torres soma aposta sábado' },
  { id: 'jogo', name: 'Classes e linhagens', min: 'leader', group: 'Guerra', icon: '⚔', desc: 'Lista de classes e linhagens do jogo.', kw: 'classes linhagens tk fm ht bl jogo' },
  { id: 'avisos', name: 'WhatsApp e avisos', min: 'leader', group: 'Comunicação', icon: '✆', desc: 'Conexão do WhatsApp e avisos automáticos.', kw: 'whatsapp evolution qr code avisos mensagens lembrete' },
  { id: 'log', name: 'Registro de ações', min: 'leader', group: 'Comunicação', icon: '≡', desc: 'Quem fez o quê no painel.', kw: 'log histórico auditoria quem fez' },
  { id: 'estudio', name: 'Estúdio do site', min: 'leader', group: 'Site', icon: '✦', desc: 'Cores, imagens, menu, funções e páginas.', kw: 'estúdio cores fontes imagens menu funções páginas tema sub líderes acessos equipe' },
];
export const GRANTABLE = TABS;

export const LEVELS = [['none', 'Sem acesso'], ['view', 'Só ver'], ['edit', 'Ver e editar']];
const NUM = { none: 0, view: 1, edit: 2, false: 0, true: 2 };
const norm = (v) => (v === undefined || v === null ? null : NUM[String(v)] ?? null);

/** Nível geral que o master definiu para os sub líderes (0, 1 ou 2). */
export const globalLevel = (id) => norm(state.settings.admin_access?.[id]) ?? (id === 'estudio' ? 0 : 2);
export const levelName = (n) => ['none', 'view', 'edit'][n];

/** Nível do usuário atual numa função: dono = sempre 2; senão pessoa > regra geral > padrão. */
export function levelOf(id) {
  if (can('owner')) return 2;
  return norm(state.perms?.[id]) ?? globalLevel(id);
}
export const canEdit = (id) => levelOf(id) >= 2;
export const tabAllowed = (t) => can(t.min) && levelOf(t.id) >= 1;

/**
 * Modo leitura: desliga campos e botões que alteram dados. Links, busca, abas e itens com
 * data-ro-ok continuam funcionando. O banco barra a escrita de qualquer forma.
 */
export function lockReadonly(root, keep = '') {
  const ok = `[data-ro-ok], input[type=search], summary, a, ${keep || '.__none'}`;
  const apply = () => root.querySelectorAll('input,select,textarea,button').forEach((el) => {
    if (el.matches(ok) || el.closest(keep || '.__none')) return;
    if (!el.disabled) { el.disabled = true; el.dataset.roLocked = '1'; }
  });
  apply();
  const mo = new MutationObserver(apply);
  mo.observe(root, { childList: true, subtree: true });
  root.classList.add('ro');
  return () => mo.disconnect();
}
