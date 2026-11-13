import { state } from './store.js';
import { esc } from './lib/util.js';
import { logoUrl } from './theme.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Brasas subindo, desenhadas em canvas (pausa quando a aba fica oculta). */
export function initEmbers() {
  const c = document.getElementById('embers');
  if (!c) return;
  const ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w = 0, h = 0, raf = 0, last = performance.now();
  const P = [];
  const mk = (init) => ({
    x: Math.random() * w, y: init ? Math.random() * h : h + 10,
    r: 0.6 + Math.random() * 2, vy: 0.18 + Math.random() * 0.6,
    ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.2,
    hue: Math.random() < 0.25 ? 8 : 28 + Math.random() * 16, a: 0.25 + Math.random() * 0.6,
  });
  const size = () => { w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  addEventListener('resize', size);
  const N = innerWidth < 700 ? 38 : 76;
  for (let i = 0; i < N; i++) P.push(mk(true));

  function frame(t) {
    raf = 0;
    const dt = Math.min(40, t - last) / 16.7; last = t;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of P) {
      if (!reduce) { p.y -= p.vy * dt; p.ph += 0.02 * p.sp * dt; p.x += Math.sin(p.ph) * 0.35 * dt; }
      if (p.y < -10) Object.assign(p, mk(false));
      const tw = 0.55 + 0.45 * Math.sin(p.ph * 3);
      const al = p.a * tw * Math.min(1, (h - p.y) / 120);
      ctx.fillStyle = `hsla(${p.hue},95%,${55 + tw * 15}%,${al})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = `hsla(${p.hue},95%,50%,${al * 0.18})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
    }
    if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reduce && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
}

/** Parallax do herói e brilho que segue o cursor nas placas. */
export function initPointer() {
  document.addEventListener('pointermove', (e) => {
    const hero = e.target.closest?.('.hero');
    if (hero) {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * 2);
      hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * 2);
    }
    const pl = e.target.closest?.('.plate.lit');
    if (pl) {
      const r = pl.getBoundingClientRect();
      pl.style.setProperty('--mx', `${e.clientX - r.left}px`);
      pl.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
  }, { passive: true });
}

/** Abertura em letterbox: roda uma vez por sessão; clique para pular. */
export function runIntro() {
  const el = document.getElementById('intro');
  if (!el || reduce) return;
  try {
    if (sessionStorage.getItem('gm_intro')) return;
    sessionStorage.setItem('gm_intro', '1');
  } catch { /* storage bloqueado: mostra mesmo assim */ }
  el.innerHTML = `<div class="bar t"></div><div class="bar b"></div><div class="glow"></div>
    <div class="mark"><img src="${esc(logoUrl())}" alt=""><h1>${esc(state.settings.guild_name)}</h1><p>${esc(state.settings.texts.intro_tagline || '')}</p></div>`;
  const end = () => { el.innerHTML = ''; };
  el.onclick = end;
  setTimeout(end, 4100);
}
