import { state } from '../store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const initial = (s) => (String(s || '?').trim()[0] || '?').toUpperCase();

/* ---------- cargos ---------- */
export const ROLES = ['member', 'mod', 'sub', 'leader', 'owner'];
export const ROLE_LABEL = { member: 'Membro', mod: 'Mod', sub: 'Sublíder', leader: 'Líder', owner: 'Dono' };
export const rank = (r) => ROLES.indexOf(r);
export const can = (min) => !!state.profile && state.profile.status === 'active' && rank(state.profile.role) >= rank(min);
export function crown(role) {
  if (role !== 'leader' && role !== 'owner' && role !== 'sub') return '';
  const gold = role !== 'sub' ? ' gold' : '';
  return `<svg class="crown${gold}" viewBox="0 0 24 24" fill="currentColor" aria-label="${ROLE_LABEL[role]}"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>`;
}

/* ---------- classes do jogo ---------- */
const KNOWN = { TK: '229,115,107', FM: '232,192,90', BM: '180,150,240', HT: '111,207,151' };
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
export function clsRgb(code) {
  if (KNOWN[code]) return KNOWN[code];
  let h = 0;
  for (const ch of String(code)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return hslToRgb(h, 0.6, 0.68).join(',');
}
const ICONS = {
  TK: '<path d="M12 2.5l2.2 3.2V14H9.8V5.7z"/><path d="M7 14h10M12 14v6.5"/>',
  FM: '<path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.6.8-2.6 1.6-3.6.2 1 .7 1.6 1.2 1.9C10.6 7 11 5 12 3z"/><path d="M12 15v6"/>',
  BM: '<path d="M7 4c2 5 2 11 0 16M12 3c2 6 2 12 0 18M17 4c2 5 2 11 0 16"/>',
  HT: '<path d="M6 3c8 3 8 15 0 18M6 3v18M6 12h14M17 9l3 3-3 3"/>',
};
export const clsIcon = (c, cls = 'emb') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[c] || '<circle cx="12" cy="12" r="6"/>'}</svg>`;
export const clsBadge = (c) => (c ? `<span class="cls" style="--c:${clsRgb(c)}">${clsIcon(c, 'ci')}${esc(c)}</span>` : '');
export const className = (code) => state.classes.find((c) => c.code === code)?.name || code;
export const lineageName = (id) => state.lineages.find((l) => l.id === id)?.name || '';
export const mainChar = (chars = []) => chars.find((c) => c.is_main) || chars[0] || null;
export const nickOf = (p) => mainChar(p?.characters)?.nick || p?.display_name || '—';

/* ---------- datas (sempre no fuso da guild) ---------- */
const tzName = () => state.settings.timezone || 'America/Sao_Paulo';
const cache = {};
const fmt = (key, opts) => (cache[key + tzName()] ??= new Intl.DateTimeFormat('pt-BR', { timeZone: tzName(), ...opts }));
export const fmtTime = (d) => fmt('t', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
export const dayKey = (d) => fmt('k', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
export const fmtDayLong = (d) => fmt('dl', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(d));
export const fmtShort = (d) => fmt('ds', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(d));
export const fmtDate = (d) => fmt('d', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(d));
export const fmtDateTime = (d) => fmt('dt', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
export function relDay(d) {
  const k = dayKey(d), now = Date.now();
  if (k === dayKey(now)) return 'Hoje';
  if (k === dayKey(now + 864e5)) return 'Amanhã';
  return fmtDayLong(d);
}
export function fmtDur(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (h >= 48) return `${Math.floor(h / 24)} dias`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
export function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return (h > 0 ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
/** 'YYYY-MM-DDTHH:mm' (horário da guild) -> ISO em UTC */
export function zonedToISO(local) {
  const guess = new Date(local + ':00Z');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tzName(), hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(guess);
  const g = (t) => +parts.find((p) => p.type === t).value;
  const asUTC = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return new Date(guess.getTime() - (asUTC - guess.getTime())).toISOString();
}

/** Atualiza contagens regressivas e anéis a cada segundo. */
export function tick() {
  const now = Date.now();
  $$('[data-cd]').forEach((el) => {
    const d = new Date(el.dataset.cd).getTime() - now;
    el.textContent = d <= 0 ? (el.dataset.done || 'agora') : el.dataset.mode === 'clock' ? fmtClock(d) : fmtDur(d);
  });
  $$('[data-ring]').forEach((el) => {
    const [a, b] = el.dataset.ring.split('|').map((x) => new Date(x).getTime());
    el.style.setProperty('--p', Math.min(1, Math.max(0, (b - now) / (b - a))).toFixed(4));
  });
}
export const startTicker = () => { setInterval(tick, 1000); tick(); };

/* ---------- WhatsApp ---------- */
export function maskPhone(v) {
  let d = String(v).replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}
export function fmtPhone(n) {
  const d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) return `+55 ${maskPhone(d.slice(2))}`;
  return d ? `+${d}` : '';
}

/* ---------- markdown mínimo e seguro (escapa tudo antes) ---------- */
export function md(src) {
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return esc(src).split(/\n{2,}/).map((b) => {
    const lines = b.trim().split('\n');
    if (!lines[0]) return '';
    const h = lines[0].match(/^(#{1,3}) (.*)$/);
    if (h) {
      const rest = lines.slice(1).join('<br>');
      return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>${rest ? `<p>${inline(rest)}</p>` : ''}`;
    }
    if (lines.every((l) => /^[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${inline(lines.join('<br>'))}</p>`;
  }).join('');
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
export const every = (ms, fn) => { const id = setInterval(fn, ms); return () => clearInterval(id); };
