import { sb, q } from '../../supabase.js';
import { state, DEFAULTS } from '../../store.js';
import { applyTheme, applyBrand, CREST } from '../../theme.js';
import { renderShell } from '../../layout.js';
import { esc } from '../../lib/util.js';
import { toast, busy, errMsg } from '../../lib/ui.js';

const FONTS = ['Cinzel', 'Cinzel Decorative', 'Alegreya Sans', 'Alegreya', 'Lato', 'Cormorant Garamond', 'Philosopher', 'Marcellus', 'Uncial Antiqua', 'MedievalSharp', 'IM Fell English', 'Almendra', 'Merriweather', 'Playfair Display', 'Oswald', 'Rajdhani', 'Inter', 'Roboto'];
const COLORS = [['bg', 'Fundo'], ['surface', 'Painéis'], ['text', 'Texto'], ['muted', 'Texto secundário'], ['primary', 'Cor principal'], ['accent', 'Destaque']];
const TEXTS = [['hero_tagline', 'Frase do lobby'], ['intro_tagline', 'Frase da abertura'], ['login_title', 'Título do login'], ['login_subtitle', 'Subtítulo do login'], ['nick_hint', 'Dica do nick'], ['footer', 'Rodapé']];
const TZ = ['America/Sao_Paulo', 'America/Manaus', 'America/Bahia', 'America/Fortaleza', 'America/Cuiaba', 'America/Rio_Branco', 'Europe/Lisbon'];

const save = (key, value) => q(sb.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }));

export default async function aparencia(el) {
  const s = state.settings;
  const theme = { ...DEFAULTS.theme, ...(s.theme || {}) };
  const texts = { ...DEFAULTS.texts, ...(s.texts || {}) };
  const menu = (s.menu || DEFAULTS.menu).map((m) => ({ ...m }));
  const d = { ...(s.discord || {}) };
  const fontSel = (name, v) => `<select name="${name}">${[...new Set([v, ...FONTS])].map((f) => `<option ${f === v ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>`;
  const up = (k, label, wide) => `<div class="up"><div class="thumb ${wide ? 'wide' : ''}" id="th-${k}">${s[k + '_url'] ? `<img src="${esc(s[k + '_url'])}" alt="">` : 'sem imagem'}</div><div><strong>${label}</strong><div class="row" style="gap:8px;margin-top:6px"><label class="btn sm">Enviar<input type="file" accept="image/*" data-up="${k}" hidden></label>${s[k + '_url'] ? `<button class="btn sm" data-clear="${k}" type="button">Remover</button>` : ''}</div></div></div>`;

  el.innerHTML = `<h2>Aparência e textos</h2>
    <section class="section" style="margin-top:18px"><h3>Identidade</h3><div class="stack" style="margin-top:12px">
      <form id="gn" class="row" style="gap:10px;align-items:flex-end"><label class="f" style="flex:1">Nome da guild<input name="n" value="${esc(s.guild_name)}" required maxlength="40"></label><button class="btn">Salvar nome</button></form>
      ${up('logo', 'Logo')}${up('favicon', 'Ícone da aba')}${up('banner', 'Banner do topo (opcional, 1920x600 ou maior)', true)}
      <p class="muted small">Sem banner, o site usa o cenário de castelo gerado.</p></div></section>
    <section class="section"><h3>Cores e fontes</h3><form id="th" class="stack" style="margin-top:12px">
      <div class="swatches">${COLORS.map(([k, n]) => `<label class="f">${n}<input type="color" name="${k}" value="${esc(theme[k])}"></label>`).join('')}</div>
      <div class="form-grid"><label class="f">Fonte dos títulos<small>Logo e títulos de página</small>${fontSel('display_font', theme.display_font)}</label><label class="f">Fonte dos subtítulos${fontSel('heading_font', theme.heading_font)}</label><label class="f">Fonte do texto${fontSel('body_font', theme.body_font)}</label></div>
      <div class="row"><button class="btn primary" type="submit">Salvar visual</button><button class="btn" type="button" id="rst">Voltar ao padrão</button></div></form></section>
    <section class="section"><h3>Textos</h3><form id="tx" class="stack" style="margin-top:12px">${TEXTS.map(([k, n]) => `<label class="f">${n}<input name="${k}" value="${esc(texts[k] || '')}"></label>`).join('')}<div><button class="btn primary">Salvar textos</button></div></form></section>
    <section class="section"><h3>Menu</h3><p class="muted small">Endereços internos: / (lobby), /guerras, /bosses, /agenda, /membros, /voz, /p/nome-da-pagina.</p><form id="mn" class="stack" style="margin-top:12px"><div id="ml" class="stack"></div><div class="row"><button class="btn" type="button" id="ma">Adicionar item</button><button class="btn primary">Salvar menu</button></div></form></section>
    <section class="section"><h3>Discord</h3><form id="dc" class="stack" style="margin-top:12px"><label class="f">Link de convite do servidor<input name="invite_url" placeholder="https://discord.gg/..." value="${esc(d.invite_url || '')}"></label>
      <label class="f">Link da sala de voz<small>Botão Entrar na call. Cole o link do canal de voz.</small><input name="voice_url" value="${esc(d.voice_url || '')}"></label>
      <label class="f">ID do servidor para o widget<small>Ative o widget em Configurações do servidor > Widget no Discord.</small><input name="widget_id" inputmode="numeric" value="${esc(d.widget_id || '')}"></label><div><button class="btn primary">Salvar Discord</button></div></form></section>
    <section class="section"><h3>Geral</h3><form id="gl" class="stack" style="margin-top:12px"><label class="f">Fuso horário da guild<select name="tz">${[...new Set([s.timezone, ...TZ])].map((z) => `<option ${z === s.timezone ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <label class="f">Endereço do site<small>Usado nos links de convite e nos avisos. Ex.: https://suaguild.com.br</small><input name="site_url" value="${esc(s.site_url || '')}"></label><div><button class="btn primary">Salvar</button></div></form></section>`;

  const live = (f) => { const t = { ...theme }; new FormData(f).forEach((v, k) => { t[k] = v; }); return t; };
  const th = el.querySelector('#th'); th.oninput = () => applyTheme(live(th));
  const done = (m = 'Salvo.') => toast(m, 'ok');
  const wrap = (fn_) => (e) => { e.preventDefault(); busy(e.target.querySelector('[type=submit],button:not([type=button])'), async () => { try { await fn_(e.target); } catch (err) { toast(errMsg(err), 'bad'); } }); };

  el.querySelector('#gn').onsubmit = wrap(async (f) => { await save('guild_name', f.n.value.trim()); s.guild_name = f.n.value.trim(); applyBrand(); renderShell('full', true); done('Nome atualizado.'); });
  th.onsubmit = wrap(async (f) => { const t = live(f); await save('theme', t); s.theme = t; applyTheme(); done('Visual salvo.'); });
  el.querySelector('#rst').onclick = async () => { try { await save('theme', DEFAULTS.theme); s.theme = { ...DEFAULTS.theme }; applyTheme(); done('Visual padrão restaurado.'); setTimeout(() => location.reload(), 500); } catch (err) { toast(errMsg(err), 'bad'); } };
  el.querySelector('#tx').onsubmit = wrap(async (f) => { const t = { ...texts }; TEXTS.forEach(([k]) => { t[k] = f[k].value; }); await save('texts', t); s.texts = t; done('Textos salvos.'); });
  el.querySelector('#dc').onsubmit = wrap(async (f) => { const v = { invite_url: f.invite_url.value.trim(), voice_url: f.voice_url.value.trim(), widget_id: f.widget_id.value.replace(/\D/g, '') }; await save('discord', v); s.discord = v; renderShell('full', true); done('Discord salvo.'); });
  el.querySelector('#gl').onsubmit = wrap(async (f) => { await save('timezone', f.tz.value); await save('site_url', f.site_url.value.trim().replace(/\/$/, '')); s.timezone = f.tz.value; s.site_url = f.site_url.value.trim(); done(); });

  const ml = el.querySelector('#ml');
  const drawMenu = () => { ml.innerHTML = menu.map((m, i) => `<div class="row" style="gap:8px"><input data-m="label" data-i="${i}" value="${esc(m.label)}" placeholder="Nome" style="flex:1"><input data-m="path" data-i="${i}" value="${esc(m.path)}" placeholder="/caminho" style="flex:1"><select data-m="min_role" data-i="${i}">${[['member', 'Todos'], ['leader', 'Sub Líderes']].map(([k, v]) => `<option value="${k}" ${(m.min_role || 'member') === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn sm" type="button" data-up="${i}">↑</button><button class="btn sm danger" type="button" data-rm="${i}">×</button></div>`).join(''); };
  drawMenu();
  ml.oninput = (e) => { const t = e.target; if (t.dataset.m) menu[+t.dataset.i][t.dataset.m] = t.value; };
  ml.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.rm != null) menu.splice(+b.dataset.rm, 1); if (b.dataset.up != null && +b.dataset.up > 0) { const i = +b.dataset.up; [menu[i - 1], menu[i]] = [menu[i], menu[i - 1]]; } drawMenu(); };
  el.querySelector('#ma').onclick = () => { menu.push({ label: '', path: '/', min_role: 'member' }); drawMenu(); };
  el.querySelector('#mn').onsubmit = wrap(async () => { const v = menu.filter((m) => m.label && m.path).map((m) => ({ ...m, path: m.path.startsWith('/') ? m.path : '/' + m.path })); await save('menu', v); s.menu = v; renderShell('full', true); done('Menu salvo.'); });

  el.addEventListener('change', async (e) => {
    const inp = e.target.closest('[data-up]'); if (!inp || !inp.files?.[0]) return;
    const k = inp.dataset.up, file = inp.files[0];
    if (file.size > 4 * 1024 * 1024) return toast('A imagem passa de 4 MB.', 'bad');
    try {
      const path = `${k}-${Date.now()}.${(file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const { error } = await sb.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const url = sb.storage.from('branding').getPublicUrl(path).data.publicUrl;
      await save(k + '_url', url); s[k + '_url'] = url; applyBrand(); renderShell('full', true);
      el.querySelector('#th-' + k).innerHTML = `<img src="${esc(url)}" alt="">`; done('Imagem atualizada.');
    } catch (err) { toast(errMsg(err), 'bad'); }
  });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-clear]'); if (!b) return; const k = b.dataset.clear;
    try { await save(k + '_url', null); s[k + '_url'] = null; applyBrand(); renderShell('full', true); el.querySelector('#th-' + k).textContent = 'sem imagem'; b.remove(); done('Imagem removida.'); } catch (err) { toast(errMsg(err), 'bad'); }
  });
}
