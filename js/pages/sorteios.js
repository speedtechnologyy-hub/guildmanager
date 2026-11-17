import { sb, q } from '../supabase.js?v=20261113h';
import { state } from '../store.js?v=20261113h';
import { esc, can, clsRgb, mainChar, fmtDateTime } from '../lib/util.js?v=20261113h';
import { plate, empty, loadingHTML, modal, closeModal, confirmBox, toast, busy, formData } from '../lib/ui.js?v=20261113h';

const MODES = {
  roleta: { name: 'Roleta', icon: '🎡', desc: 'Uma roda gira e para no vencedor, um de cada vez.' },
  slot: { name: 'Caça-níquel', icon: '🎰', desc: 'Os nomes passam voando e travam no sorteado.' },
  baus: { name: 'Baús', icon: '🎁', desc: 'Baús fechados. A liderança abre um por um até aparecerem os premiados.' },
  cartas: { name: 'Cartas', icon: '🃏', desc: 'Cartas viradas para baixo. Os perdedores viram juntos e os premiados no final.' },
  corrida: { name: 'Corrida', icon: '🏁', desc: 'Todo mundo corre até a linha de chegada. Os primeiros a cruzar levam.' },
  eliminacao: { name: 'Battle royale', icon: '⚔️', desc: 'Todo mundo entra na arena e vai caindo até sobrarem só os vencedores.' },
};
const POOLS = { all: 'Todos os membros ativos', join: 'Só quem clicar em Participar', manual: 'Escolher quem entra' };

const rpc = async (name, args) => { const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; };
const ease = (u) => 1 - Math.pow(1 - u, 3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = (e) => (e?.class_code ? clsRgb(e.class_code) : '163,151,135');

/** Gerador pseudo-aleatório com semente: todo mundo vê a mesma animação. */
function prng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------------------------------------------------------------------------
 * Cada modo é uma função do tempo: frame(t) desenha o que existe em t ms depois
 * da largada e devolve quantos vencedores já foram revelados. Quem entra tarde
 * vê o ponto certo; quem chega depois do fim vê o resultado.
 * ------------------------------------------------------------------------- */
function build(d) {
  const ent = d.entrants, by = Object.fromEntries(ent.map((e) => [e.id, e]));
  const wins = d.winners.map((id) => by[id]).filter(Boolean), W = wins.length;
  const rnd = prng(d.seed || 1);
  const losers = shuffle(ent.filter((e) => !d.winners.includes(e.id)), rnd);
  const f = { slot, roleta, eliminacao, baus, cartas, corrida }[d.mode] || slot;
  return { wins, ...f() };

  function slot() {
    const SL = 4800, L = 28;
    const seqs = wins.map((w) => {
      const pool = shuffle(ent.filter((e) => e.id !== w.id), rnd);
      const s = []; for (let i = 0; i < L - 1; i++) s.push(pool.length ? pool[i % pool.length] : w);
      s.push(w); return s;
    });
    let box, lbl, nm;
    return {
      dur: W * SL + 1200,
      mount(el) { el.innerHTML = '<div class="slot"><div class="slot-lbl"></div><div class="slot-box"><span class="slot-name"></span></div></div>'; box = el.querySelector('.slot-box'); lbl = el.querySelector('.slot-lbl'); nm = el.querySelector('.slot-name'); },
      frame(t) {
        const k = Math.min(W - 1, Math.floor(t / SL)), u = clamp((t - k * SL) / SL, 0, 1);
        const e = seqs[k][Math.min(L - 1, Math.floor(ease(u) * (L - 1)))];
        nm.textContent = e.nick; box.style.setProperty('--c', rgb(e));
        box.classList.toggle('lock', u >= 1); box.classList.toggle('spin', u < 1);
        lbl.textContent = t >= W * SL ? 'Sorteio encerrado' : W > 1 ? `Vencedor ${k + 1} de ${W}` : 'Sorteando…';
        return Math.min(W, Math.floor(t / SL));
      },
    };
  }

  function roleta() {
    const SL = 6800, S0 = 14;
    const spins = wins.map((w) => {
      const others = shuffle(ent.filter((e) => e.id !== w.id), rnd).slice(0, S0 - 1);
      const segs = shuffle([w, ...others], rnd), j = segs.findIndex((e) => e.id === w.id), a = 360 / segs.length;
      return { segs, target: 360 * 6 - (j + 0.5) * a + (rnd() - 0.5) * a * 0.6 };
    });
    let host, lbl, cur = -1;
    const draw = (k) => {
      const { segs } = spins[k], S = segs.length, R = 140, c = 150;
      const P = (deg) => { const r = (deg - 90) * Math.PI / 180; return [c + R * Math.cos(r), c + R * Math.sin(r)]; };
      const body = S === 1 ? `<circle cx="${c}" cy="${c}" r="${R}" fill="rgba(${rgb(segs[0])},.7)"/>` : segs.map((e, i) => {
        const [x0, y0] = P(i * 360 / S), [x1, y1] = P((i + 1) * 360 / S);
        return `<path d="M${c} ${c} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z" fill="rgba(${rgb(e)},${i % 2 ? '.55' : '.78'})" stroke="rgba(0,0,0,.45)" stroke-width="1"/>`;
      }).join('');
      const txt = segs.map((e, i) => `<text transform="rotate(${((i + 0.5) * 360 / S).toFixed(1)} ${c} ${c}) translate(${c} ${c - R + 12}) rotate(-90)" font-size="${S > 10 ? 10 : 12}" dy=".35em">${esc(e.nick.length > 13 ? e.nick.slice(0, 12) + '…' : e.nick)}</text>`).join('');
      host.innerHTML = `<svg viewBox="0 0 300 300" class="wh"><g class="rot">${body}<g fill="#fff" font-weight="700" style="paint-order:stroke" stroke="rgba(0,0,0,.6)" stroke-width="2.5">${txt}</g></g><circle cx="150" cy="150" r="16" fill="#14100d" stroke="var(--accent)" stroke-width="3"/></svg>`;
      cur = k;
    };
    return {
      dur: W * SL + 1200,
      mount(el) { el.innerHTML = '<div class="wheel"><i class="ptr"></i><div class="wh-host"></div></div><div class="slot-lbl"></div>'; host = el.querySelector('.wh-host'); lbl = el.querySelector('.slot-lbl'); },
      frame(t) {
        const k = Math.min(W - 1, Math.floor(t / SL)), u = clamp((t - k * SL) / SL, 0, 1);
        if (k !== cur) draw(k);
        host.querySelector('.rot').style.transform = `rotate(${(spins[k].target * ease(u)).toFixed(2)}deg)`;
        lbl.textContent = t >= W * SL ? 'Sorteio encerrado' : W > 1 ? `Vencedor ${k + 1} de ${W}` : 'Girando…';
        return Math.min(W, Math.floor(t / SL));
      },
    };
  }

  function eliminacao() {
    const L = losers.length, E = clamp(L * 380, 4000, 15000), T0 = 1400;
    const order = Object.fromEntries(losers.map((e, i) => [e.id, T0 + (i / Math.max(1, L)) * E]));
    const end = T0 + E + 600;
    let items = [], lbl;
    return {
      dur: end + 3200,
      mount(el) {
        el.innerHTML = `<div class="arena">${ent.map((e) => `<span class="dn" data-id="${esc(e.id)}" style="--c:${rgb(e)}">${esc(e.nick)}</span>`).join('')}</div><div class="slot-lbl"></div>`;
        items = [...el.querySelectorAll('.dn')]; lbl = el.querySelector('.slot-lbl');
      },
      frame(t) {
        let alive = ent.length;
        items.forEach((n) => {
          const id = n.dataset.id, out = order[id] != null && t >= order[id];
          if (out) alive--;
          n.classList.toggle('out', out);
          n.classList.toggle('win', t >= end && order[id] == null);
        });
        lbl.textContent = t < T0 ? 'Todos na arena…' : t >= end ? 'Sobreviventes!' : `Restam ${alive}`;
        return t >= end ? W : 0;
      },
    };
  }


  function corrida() {
    const F0 = 9000, GAP = 1600, lanes = clamp(Math.min(ent.length, Math.max(W + 3, 8)), W, 24);
    const field = shuffle([...wins.map((e, k) => ({ e, k })), ...losers.slice(0, lanes - W).map((e) => ({ e, k: -1 }))], rnd);
    const lastWin = F0 + (W - 1) * GAP;
    const rs = field.map((r) => ({
      ...r, ph: rnd() * 6.28, w: 0.0016 + rnd() * 0.0016, amp: 0.05 + rnd() * 0.05,
      F: r.k >= 0 ? F0 + r.k * GAP : lastWin / (0.74 + rnd() * 0.2),
    }));
    let items = [], lbl;
    const pos = (r, t) => {
      if (r.k >= 0 && t >= r.F) return 1;
      const b = clamp(t / r.F, 0, 1), p = b + r.amp * Math.sin(r.w * t + r.ph) * Math.sin(Math.PI * b) * (1 - b * 0.5);
      return r.k >= 0 ? clamp(p, 0, 0.995) : clamp(p, 0, 0.965);
    };
    return {
      dur: lastWin + 3200,
      mount(el) {
        el.innerHTML = `<div class="race">${rs.map((r) => `<div class="lane"><span class="rn" style="--c:${rgb(r.e)}"><i>🏇</i><b>${esc(r.e.nick)}</b><em></em></span></div>`).join('')}<span class="fin-line"></span></div><div class="slot-lbl"></div>`;
        items = [...el.querySelectorAll('.rn')]; lbl = el.querySelector('.slot-lbl');
      },
      frame(t) {
        let n = 0;
        rs.forEach((r, i) => {
          const done = r.k >= 0 && t >= r.F; if (done) n++;
          items[i].style.setProperty('--p', pos(r, t).toFixed(4));
          items[i].classList.toggle('done', done);
          items[i].querySelector('em').textContent = done ? `${r.k + 1}º` : '';
        });
        lbl.textContent = t < 1500 ? 'Preparar…' : n >= W ? 'Corrida encerrada' : n ? 'Chegando os premiados…' : 'Valendo!';
        return n;
      },
    };
  }

  function grid(skin) {
    const slots = clamp(Math.min(ent.length, 20), W, 20), nL = slots - W;
    const mixed = shuffle([...wins.map((e) => ({ e, w: 1 })), ...losers.slice(0, nL).map((e) => ({ e, w: 0 }))], rnd);
    const loserStep = skin === 'baus' ? 420 : 90, winStep = skin === 'baus' ? 2000 : 1800;
    const T0 = 1200, base = T0 + nL * loserStep + (skin === 'baus' ? 1000 : 1400);
    const at = []; let li = 0, wi = 0;
    mixed.forEach((m) => { at.push(m.w ? base + wi++ * winStep : T0 + li++ * loserStep); });
    let items = [], lbl;
    return {
      dur: base + W * winStep + 1800,
      mount(el) {
        el.innerHTML = `<div class="rg ${skin}">${mixed.map((m) => `<div class="it ${m.w ? 'w' : ''}" style="--c:${rgb(m.e)}"><div class="in"><div class="bk"><span>${skin === 'baus' ? '🎁' : '✦'}</span></div><div class="fr"><b>${esc(m.e.nick)}</b></div></div></div>`).join('')}</div><div class="slot-lbl"></div>`;
        items = [...el.querySelectorAll('.it')]; lbl = el.querySelector('.slot-lbl');
      },
      frame(t) {
        let n = 0, opened = 0;
        items.forEach((it, i) => { const o = t >= at[i]; it.classList.toggle('open', o); if (o) { opened++; if (mixed[i].w) n++; } });
        lbl.textContent = n >= W ? 'Sorteio encerrado' : opened < nL ? (skin === 'baus' ? 'Abrindo os baús…' : 'Virando as cartas…') : 'Agora os premiados…';
        return n;
      },
    };
  }
  function baus() { return grid('baus'); }
  function cartas() { return grid('cartas'); }
}

/** Duração total da animação (ms) de um sorteio já realizado. */
export const drawDur = (d) => build(d).dur;

/** Abre o palco da animação. getT() devolve ms desde a largada. */
function openStage(d, getT, { live } = {}) {
  document.getElementById('stage')?.remove();
  const mode = MODES[d.mode] || MODES.slot, run = build(d);
  const el = document.createElement('div');
  el.id = 'stage'; el.className = 'stage'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="st-in"><button class="st-x" type="button" aria-label="Fechar">×</button>
    <div class="st-hd"><span class="st-mode">${mode.icon} ${esc(mode.name)}${live ? ' <em>ao vivo</em>' : ''}</span><h2>${esc(d.title)}</h2>${d.prize ? `<p>Prêmio: <b>${esc(d.prize)}</b></p>` : ''}</div>
    <div class="st-art"></div>
    <div class="st-win"><h3>${run.wins.length > 1 ? 'Vencedores' : 'Vencedor'}</h3><ol></ol><p class="st-done" hidden>Parabéns! 🎉</p></div></div>`;
  document.body.append(el);
  document.body.classList.add('stage-open');
  run.mount(el.querySelector('.st-art'));
  const ol = el.querySelector('ol'), done = el.querySelector('.st-done');
  let shown = -1, raf = 0, closed = false;
  const paint = () => {
    if (closed) return;
    const t = Math.max(0, getT()), fin = t >= run.dur;
    const n = run.frame(fin ? run.dur : t);
    if (n !== shown) {
      shown = n;
      ol.innerHTML = run.wins.slice(0, n).map((e, i) => `<li style="--c:${rgb(e)}"><span>${i + 1}</span>${esc(e.nick)}</li>`).join('') || '<li class="wait">Aguardando o sorteio…</li>';
    }
    done.hidden = !fin;
    el.classList.toggle('fin', fin);
    if (!fin) raf = requestAnimationFrame(paint);
  };
  const close = () => { closed = true; cancelAnimationFrame(raf); el.remove(); document.body.classList.remove('stage-open'); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.querySelector('.st-x').onclick = close;
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  paint();
  return { close, dur: run.dur };
}

export default async function sorteios(root) {
  const staff = can('leader');
  root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Sorteios</h1><p>${staff ? 'Crie um sorteio, escolha o modo de jogo e sorteie ao vivo. Todo mundo acompanha pela tela.' : 'Participe dos sorteios da guild e acompanhe o resultado ao vivo.'}</p></div>
    ${staff ? '<p style="margin-bottom:20px"><button class="btn primary" id="novo" type="button">Novo sorteio</button></p>' : ''}
    <div id="v">${loadingHTML}</div></div>`;
  const v = root.querySelector('#v');
  let offset = 0, stage = null, off = false, alive = true;
  const played = new Set();
  // relógio do servidor: todo mundo larga junto
  try { const t0 = Date.now(), sv = new Date(await rpc('server_now')).getTime(); offset = sv + (Date.now() - t0) / 2 - Date.now(); } catch { /* usa o relógio local */ }
  const now = () => Date.now() + offset;

  const people = (d) => d.entrants?.length ? d.entrants : [];
  const winnersOf = (d) => d.winners.map((id) => d.entrants.find((e) => e.id === id)).filter(Boolean);
  const dn = (e) => `<span class="dn win" style="--c:${rgb(e)}">${esc(e.nick)}</span>`;

  async function load() {
    const ds = await q(sb.from('draws').select('*').order('created_at', { ascending: false }).limit(40));
    const openIds = ds.filter((d) => d.status === 'open').map((d) => d.id);
    const ents = openIds.length ? await q(sb.from('draw_entries').select('draw_id,user_id').in('draw_id', openIds)) : [];
    if (!alive) return;
    const cnt = {}, mine = new Set();
    ents.forEach((e) => { cnt[e.draw_id] = (cnt[e.draw_id] || 0) + 1; if (e.user_id === state.user.id) mine.add(e.draw_id); });
    const open = ds.filter((d) => d.status === 'open');
    const past = ds.filter((d) => d.status !== 'open' && (d.status === 'drawn' || staff));

    const card = (d) => {
      const m = MODES[d.mode] || MODES.slot;
      const who = d.pool === 'all' ? 'Todos os membros ativos participam.' : d.pool === 'join' ? `${cnt[d.id] || 0} inscrito(s). Quem quiser entra pelo botão.` : `${cnt[d.id] || 0} participante(s) escolhidos pela liderança.`;
      const joined = mine.has(d.id);
      return plate(`<div class="dr-row"><span class="dr-ic">${m.icon}</span><div class="dr-tx"><h3>${esc(d.title)}</h3>
        <p class="muted small">${esc(m.name)} · ${d.winners_count} vencedor${d.winners_count > 1 ? 'es' : ''}${d.prize ? ' · Prêmio: ' + esc(d.prize) : ''}</p><p class="small">${who}${d.exclude_staff ? ' A liderança fica de fora.' : ''}</p></div>
        <div class="dr-act">${d.pool === 'join' ? `<button class="btn ${joined ? '' : 'primary'}" data-join="${d.id}" data-on="${joined ? 0 : 1}" type="button">${joined ? 'Sair do sorteio' : 'Participar'}</button>` : ''}
        ${staff ? `<button class="btn primary" data-run="${d.id}" type="button">Sortear agora</button><button class="btn danger sm" data-cancel="${d.id}" type="button">Cancelar</button>` : ''}</div></div>`);
    };
    const done = (d) => {
      const m = MODES[d.mode] || MODES.slot, w = winnersOf(d);
      return plate(`<div class="dr-row"><span class="dr-ic">${d.status === 'cancelled' ? '🚫' : m.icon}</span><div class="dr-tx"><h3>${esc(d.title)}</h3>
        <p class="muted small">${d.status === 'cancelled' ? 'Cancelado' : esc(m.name) + ' · ' + fmtDateTime(d.started_at)}${d.prize ? ' · Prêmio: ' + esc(d.prize) : ''}</p>
        ${d.status === 'drawn' ? `<div class="dr-win">${w.map(dn).join('')}</div><p class="muted small">${people(d).length} participante(s)</p>` : ''}</div>
        <div class="dr-act">${d.status === 'drawn' ? `<button class="btn sm" data-replay="${d.id}" type="button">Rever sorteio</button>` : ''}${staff ? `<button class="btn danger sm" data-del="${d.id}" type="button">Excluir</button>` : ''}</div></div>`);
    };
    v.innerHTML = `<div class="section"><h2>Em aberto</h2>${open.length ? `<div class="dr-list">${open.map(card).join('')}</div>` : empty(staff ? 'Nenhum sorteio aberto. Clique em Novo sorteio para criar.' : 'Nenhum sorteio aberto agora. Quando a liderança criar um, ele aparece aqui.')}</div>
      <div class="section"><h2>Realizados</h2>${past.length ? `<div class="dr-list">${past.map(done).join('')}</div>` : empty('Os sorteios realizados aparecem aqui, com os vencedores.')}</div>`;
    v._ds = ds;
    return ds;
  }

  /** Sorteio novo chegou: abre o palco para quem está na tela. */
  function maybePlay(d) {
    if (!d || d.status !== 'drawn' || !d.started_at || played.has(d.id)) return;
    const el = now() - new Date(d.started_at).getTime();
    const dur = build(d).dur;
    if (el > dur + 6000) return;
    played.add(d.id);
    stage?.close();
    stage = openStage(d, () => now() - new Date(d.started_at).getTime(), { live: true });
  }

  v.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const ds = v._ds || [], get = (id) => ds.find((x) => x.id === id);
    if (b.dataset.join) return busy(b, async () => { await rpc('join_draw', { p_id: b.dataset.join, p_join: b.dataset.on === '1' }); toast(b.dataset.on === '1' ? 'Você está no sorteio!' : 'Você saiu do sorteio.'); await load(); });
    if (b.dataset.replay) { const d = get(b.dataset.replay); if (d) { const t0 = Date.now(); stage?.close(); stage = openStage(d, () => Date.now() - t0); } return; }
    if (b.dataset.run) {
      const d = get(b.dataset.run);
      if (!await confirmBox(`Sortear "${d.title}" agora? Todo mundo que estiver na tela vai assistir.`, 'Sortear', false)) return;
      return busy(b, async () => { await rpc('run_draw', { p_id: d.id }); const fresh = (await load()).find((x) => x.id === d.id); maybePlay(fresh); });
    }
    if (b.dataset.cancel) { if (await confirmBox('Cancelar este sorteio?', 'Cancelar sorteio')) busy(b, async () => { await rpc('cancel_draw', { p_id: b.dataset.cancel }); await load(); }); return; }
    if (b.dataset.del) { if (await confirmBox('Excluir este sorteio para sempre?', 'Excluir')) busy(b, async () => { await rpc('cancel_draw', { p_id: b.dataset.del, p_delete: true }); await load(); }); }
  });

  if (staff) root.querySelector('#novo').onclick = openCreate;

  function openCreate() {
    const m = modal(`<h3>Novo sorteio</h3>
      <form id="nf" class="stack" style="margin-top:14px">
        <label class="f">Nome do sorteio<input name="title" maxlength="80" required placeholder="Ex.: Sorteio de sexta"></label>
        <label class="f">Prêmio <small>Opcional. Aparece na tela do sorteio.</small><input name="prize" maxlength="120" placeholder="Ex.: 500 de cash"></label>
        <div class="f"><span>Modo de jogo</span><div class="modes">${Object.entries(MODES).map(([k, x], i) => `<label class="mode"><input type="radio" name="mode" value="${k}" ${i === 0 ? 'checked' : ''}><span><b>${x.icon} ${esc(x.name)}</b><small>${esc(x.desc)}</small></span></label>`).join('')}</div></div>
        <div class="form-grid">
          <label class="f">Quantos vencedores<input name="n" type="number" min="1" max="20" value="1" required></label>
          <label class="f">Quem participa<select name="pool">${Object.entries(POOLS).map(([k, x]) => `<option value="${k}">${esc(x)}</option>`).join('')}</select></label>
        </div>
        <label class="chk"><input type="checkbox" name="ex"> Deixar a liderança (Sub Líder, Master e Admin) de fora</label>
        <div id="pick" hidden></div>
        <div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Criar sorteio</button></div>
      </form>`, { wide: true });
    const f = m.querySelector('#nf'), pick = m.querySelector('#pick');
    m.querySelector('[data-x]').onclick = closeModal;
    let loaded = false;
    f.pool.onchange = async () => {
      pick.hidden = f.pool.value !== 'manual';
      if (pick.hidden || loaded) return;
      loaded = true; pick.innerHTML = loadingHTML;
      const ps = await q(sb.from('profiles').select('id,display_name,characters(*)').eq('status', 'active'));
      const rows = ps.map((p) => ({ id: p.id, nick: mainChar(p.characters)?.nick || p.display_name })).sort((a, b) => a.nick.localeCompare(b.nick));
      pick.innerHTML = `<div class="row" style="justify-content:space-between"><b>Escolha quem entra</b><span><button class="chip" type="button" data-all="1">Marcar todos</button> <button class="chip" type="button" data-all="0">Limpar</button></span></div>
        <div class="pick-list">${rows.map((r) => `<label class="chk"><input type="checkbox" name="u" value="${esc(r.id)}"> ${esc(r.nick)}</label>`).join('')}</div>`;
      pick.onclick = (e) => { const b = e.target.closest('[data-all]'); if (b) pick.querySelectorAll('input[name=u]').forEach((i) => { i.checked = b.dataset.all === '1'; }); };
    };
    f.onsubmit = (e) => {
      e.preventDefault();
      const d = formData(f), users = [...f.querySelectorAll('input[name=u]:checked')].map((i) => i.value);
      if (d.pool === 'manual' && !users.length) return toast('Marque pelo menos uma pessoa.', 'bad');
      busy(f.querySelector('[type=submit]'), async () => {
        await rpc('create_draw', { p_title: d.title, p_prize: d.prize || null, p_mode: d.mode, p_pool: d.pool, p_winners: +d.n, p_exclude_staff: !!d.ex, p_users: d.pool === 'manual' ? users : [] });
        closeModal(); toast('Sorteio criado.'); await load();
      });
    };
  }

  const ds = await load();
  // se abriu a tela no meio de um sorteio, entra nele
  maybePlay(ds.filter((d) => d.status === 'drawn' && d.started_at).sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]);

  const ch = sb.channel('sorteios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'draws' }, async (p) => {
      const list = await load();
      if (p.eventType !== 'DELETE') maybePlay(list?.find((x) => x.id === p.new.id));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'draw_entries' }, () => load())
    .subscribe();
  return () => { alive = false; off = true; stage?.close(); sb.removeChannel(ch); };
}
