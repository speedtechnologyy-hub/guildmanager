import { sb, q } from '../supabase.js?v=20261122d';
import { esc } from './util.js?v=20261122d';

/**
 * Faixa no topo de qualquer tela: "Sorteio ao vivo, assistir" (rolando agora ou começou há pouco)
 * ou "Sorteio aberto" (criado e ainda sem resultado). Some dentro da tela de Sorteios.
 */
let ch = null, timer = 0, wake = 0, offset = 0, rows = [], dur = null;
const KEY = 'gm-draw-dismiss';
const dismissed = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
const dismiss = (id) => { try { localStorage.setItem(KEY, JSON.stringify([...dismissed(), id].slice(-30))); } catch { /* sem storage */ } };
const now = () => Date.now() + offset;
const onSorteios = () => /^#?\/sorteios/.test(location.hash.replace(/^#/, '#'));

async function drawDur(d) {
  dur ||= (await import('../pages/sorteios.js?v=20261122d')).drawDur;
  try { return dur(d); } catch { return 30000; }
}

export async function refreshDraws() {
  try {
    const since = new Date(Date.now() - 40 * 60e3).toISOString();
    rows = await q(sb.from('draws').select('id,title,mode,pool,status,started_at,seed,entrants,winners').or(`status.eq.open,and(status.eq.drawn,started_at.gte.${since})`).order('created_at', { ascending: false }).limit(6));
  } catch { return; }
  await paint();
}

export async function paint() {
  const bar = document.getElementById('drawBar');
  if (!bar) return;
  clearTimeout(wake);
  if (onSorteios()) { bar.hidden = true; return; }
  let live = null;
  for (const d of rows.filter((r) => r.status === 'drawn' && r.started_at)) {
    const end = new Date(d.started_at).getTime() + await drawDur(d) + 8000;
    if (end > now() && (!live || end > live.end)) live = { d, end };
  }
  const gone = dismissed();
  const open = rows.find((r) => r.status === 'open' && !gone.has(r.id));
  if (live) {
    wake = setTimeout(paint, Math.max(1000, live.end - now() + 500));
    bar.className = 'pendbar drawbar live'; bar.hidden = false;
    bar.innerHTML = `<button type="button" class="pbtn"><span class="pdot"></span><b>Sorteio ao vivo: ${esc(live.d.title)}</b><span class="pgo">Assistir</span></button>`;
  } else if (open) {
    bar.className = 'pendbar drawbar'; bar.hidden = false;
    bar.innerHTML = `<button type="button" class="pbtn"><b>Sorteio aberto: ${esc(open.title)}</b><span class="pgo">${open.pool === 'join' ? 'Participar' : 'Ver'}</span></button><button type="button" class="dx" aria-label="Dispensar aviso">×</button>`;
    bar.querySelector('.dx').onclick = () => { dismiss(open.id); paint(); };
  } else { bar.hidden = true; bar.innerHTML = ''; return; }
  bar.querySelector('.pbtn').onclick = () => { location.hash = '#/sorteios'; };
}

export async function startDraws() {
  if (ch) { paint(); return; }
  try { const t0 = Date.now(), r = await sb.rpc('server_now'); if (r.data) offset = new Date(r.data).getTime() + (Date.now() - t0) / 2 - Date.now(); } catch { /* relógio local */ }
  refreshDraws();
  ch = sb.channel('draws-live').on('postgres_changes', { event: '*', schema: 'public', table: 'draws' }, () => refreshDraws()).subscribe();
  timer = setInterval(() => { if (!document.hidden) refreshDraws(); }, 60000);
  addEventListener('hashchange', paint);
  document.addEventListener('visibilitychange', onVis);
}
export function stopDraws() {
  if (!ch) return;
  sb.removeChannel(ch); ch = null; clearInterval(timer); clearTimeout(wake); rows = [];
  removeEventListener('hashchange', paint);
  document.removeEventListener('visibilitychange', onVis);
}
const onVis = () => { if (!document.hidden) refreshDraws(); };
