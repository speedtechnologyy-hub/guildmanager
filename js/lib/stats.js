import { sb, q } from '../supabase.js';

/** Presença nas guerras já realizadas dentro do período. days = 0 significa todo o histórico. */
export async function attendanceStats(days = 30) {
  const now = new Date().toISOString();
  let evq = sb.from('events').select('id,starts_at,event_types!inner(kind)').eq('event_types.kind', 'war').neq('status', 'cancelled').lt('starts_at', now);
  if (days) evq = evq.gte('starts_at', new Date(Date.now() - days * 864e5).toISOString());
  const evs = await q(evq);
  const ids = evs.map((e) => e.id);
  const rows = ids.length ? await q(sb.from('event_attendance').select('event_id,user_id,attended').in('event_id', ids)) : [];
  const marked = new Set(rows.map((r) => r.event_id));
  const total = evs.filter((e) => marked.has(e.id)).length;
  const per = {};
  rows.forEach((r) => { if (r.attended) per[r.user_id] = (per[r.user_id] || 0) + 1; });
  return { total, per, pct: (uid) => (total ? Math.round(((per[uid] || 0) / total) * 100) : 0) };
}
