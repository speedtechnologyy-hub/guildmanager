/**
 * Holofote do topo: uma segunda versão do cenário ("forja", em brasa) fica escondida
 * atrás de uma máscara redonda que segue o cursor com atraso suave.
 * No celular (sem cursor) ou quando o mouse para, o holofote passeia sozinho.
 */
export function spotlight(hero) {
  const base = hero?.querySelector('.scene-wrap .scene');
  if (!base || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const lit = base.cloneNode(true);
  lit.classList.add('lit');
  lit.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  base.after(lit);
  const glow = document.createElement('div');
  glow.className = 'spot-glow'; glow.setAttribute('aria-hidden', 'true');
  hero.insertBefore(glow, hero.querySelector('.hero-in'));

  let w = hero.clientWidth, h = hero.clientHeight;
  const cur = { x: -9999, y: -9999 }, tgt = { x: -9999, y: -9999 };
  let lastMove = 0, raf = 0, last = 0, seen = true, ready = false;
  const size = () => { w = hero.clientWidth; h = hero.clientHeight; hero.style.setProperty('--sr', Math.max(150, Math.min(240, w * 0.17)).toFixed(0) + 'px'); };
  size();

  const move = (e) => {
    const r = hero.getBoundingClientRect();
    tgt.x = e.clientX - r.left; tgt.y = e.clientY - r.top; lastMove = performance.now();
  };
  const leave = () => { lastMove = performance.now() - 1500; };
  hero.addEventListener('pointermove', move, { passive: true });
  hero.addEventListener('pointerleave', leave, { passive: true });

  function frame(now) {
    raf = 0;
    if (!seen || document.hidden) return;
    const dt = Math.min(64, now - (last || now)); last = now;
    if (now - lastMove > 2600) {            // sem cursor: passeia sozinho
      tgt.x = w * (0.5 + 0.3 * Math.sin(now / 2600));
      tgt.y = h * (0.56 + 0.17 * Math.sin(now / 1900 + 1));
    }
    if (!ready) { cur.x = tgt.x; cur.y = tgt.y; ready = true; }
    const k = 1 - Math.pow(0.9, dt / 16.7);  // 10% por quadro, independente do FPS
    cur.x += (tgt.x - cur.x) * k; cur.y += (tgt.y - cur.y) * k;
    hero.style.setProperty('--sx', cur.x.toFixed(1) + 'px');
    hero.style.setProperty('--sy', cur.y.toFixed(1) + 'px');
    raf = requestAnimationFrame(frame);
  }
  const run = () => { if (!raf && seen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) run(); }, { threshold: 0 });
  io.observe(hero);
  const ro = new ResizeObserver(size); ro.observe(hero);
  const vis = () => run(); document.addEventListener('visibilitychange', vis);
  run();

  return () => {
    cancelAnimationFrame(raf); raf = 0; seen = false;
    io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', vis);
    hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave);
    lit.remove(); glow.remove();
  };
}
