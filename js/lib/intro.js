/**
 * Entradas orquestadas (Web Animations API). Rodam uma vez por abertura de tela e se
 * limpam sozinhas ao terminar, deixando a página 100% estática.
 */
const TYPE = 'cubic-bezier(.16,1,.3,1)', SOFT = 'cubic-bezier(.22,.61,.36,1)';
const can = () => typeof Element.prototype.animate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 1.05 && r.bottom > 0; };

function timeline(k = 1) {
  const list = [];
  const run = (els, frames, dur, at = 0, stagger = 0, easing = SOFT) => {
    [...els].forEach((el, i) => list.push(el.animate(frames, { duration: dur * 1000 * k, delay: (at + i * stagger) * 1000 * k, easing, fill: 'both' })));
  };
  const fade = (from) => [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }];
  const done = (after) => {
    if (!list.length) return after?.();
    const last = list.reduce((a, b) => (b.effect.getComputedTiming().endTime > a.effect.getComputedTiming().endTime ? b : a));
    last.addEventListener('finish', () => { list.forEach((a) => a.cancel()); list.length = 0; after?.(); });
  };
  return { run, fade, done };
}

/** Lobby: o cenário acende, o título é revelado em máscara, a chamada entra pela direita e os blocos sobem em sequência. */
export function lobbyIntro(root, fast = false) {
  if (!can()) return;
  const k = fast ? 0.55 : 1, T = timeline(k), $ = (s) => root.querySelectorAll(s);
  T.run($('.scene-wrap'), [{ opacity: 0 }, { opacity: 1 }], 1.3, 0);
  T.run($('.hero .kicker'), T.fade('translateY(-10px)'), 0.5, 0.1, 0, TYPE);
  T.run($('.hero h1'), [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(.4em)' }, { clipPath: 'inset(-.3em -.1em -.3em -.1em)', transform: 'none' }], 0.95, 0.2, 0, TYPE);
  T.run($('.hero .tagline'), T.fade('translateY(14px)'), 0.7, 0.5, 0, TYPE);
  T.run($('.hero .nextwar'), T.fade('translateX(28px)'), 1, 0.55, 0, TYPE);
  T.run([...$('#body > .section')].filter(inView).slice(0, 5), T.fade('translateY(20px)'), 0.7, 0.85, 0.08, TYPE);
  T.done();
}

/** Outras telas: título em máscara e blocos subindo em sequência curta. */
export function pageReveal(host) {
  if (!can()) return;
  const T = timeline(1);
  const head = host.querySelectorAll('.page-head h1');
  T.run(head, [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(.35em)' }, { clipPath: 'inset(-.3em -.1em -.3em -.1em)', transform: 'none' }], 0.7, 0.02, 0, TYPE);
  T.run(host.querySelectorAll('.page-head p'), T.fade('translateY(10px)'), 0.55, 0.18, 0, TYPE);
  const blocks = [...host.querySelectorAll('.plate, .section, .tabs, .cc, .podium')].filter((el) => inView(el) && !el.closest('.plate .plate')).slice(0, 8);
  T.run(blocks, T.fade('translateY(16px)'), 0.55, 0.22, 0.05, TYPE);
  T.done();
}

/** Lobby: a foto aparece, depois saudação, frase, cartão e o bloco da direita entram em sequência curta. */
export function nivalIntro(root, fast = false) {
  if (!can()) return;
  const k = fast ? 0.55 : 1, T = timeline(k), $ = (q) => root.querySelectorAll(q);
  T.run($('.nv-bgwrap'), [{ opacity: 0, transform: 'scale(1.03)' }, { opacity: 1, transform: 'none' }], 1.2, 0, 0, SOFT);
  T.run($('.hx-hi'), T.fade('translateY(10px)'), 0.55, 0.3, 0, TYPE);
  T.run($('.hx-h'), [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(.4em)' }, { clipPath: 'inset(-.3em -.1em -.3em -.1em)', transform: 'none' }], 0.9, 0.4, 0, TYPE);
  T.run($('.hx-card'), T.fade('translateY(18px)'), 0.7, 0.75, 0, TYPE);
  T.run($('.hx-chips, .hx-status, .hx-socs'), T.fade('translateY(12px)'), 0.6, 0.85, 0.1, TYPE);
  T.run([...$('#body > .section')].filter(inView).slice(0, 3), T.fade('translateY(20px)'), 0.7, 1.0, 0.08, TYPE);
  T.done();
}
