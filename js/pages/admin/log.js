import { sb, q } from '../../supabase.js?v=20261113h';
import { esc, fmtDateTime } from '../../lib/util.js?v=20261113h';
import { empty } from '../../lib/ui.js?v=20261113h';

export default async function log(el) {
  const [rows, ps] = await Promise.all([q(sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(150)), q(sb.from('profiles').select('id,display_name'))]);
  const nm = Object.fromEntries(ps.map((p) => [p.id, p.display_name]));
  el.innerHTML = `<h2>Registro de ações</h2><p class="muted small">As últimas 150 alterações feitas no painel.</p>${rows.length ? `<div class="tbl-wrap" style="margin-top:14px"><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Onde</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${fmtDateTime(r.created_at)}</td><td>${esc(nm[r.actor_id] || 'sistema')}</td><td>${esc(r.action)}</td><td>${esc(r.entity)} <span class="muted small">${esc(r.entity_id || '')}</span></td></tr>`).join('')}</tbody></table></div>` : empty('Nada registrado ainda.')}`;
}
