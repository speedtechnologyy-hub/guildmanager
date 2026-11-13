import { sb } from '../supabase.js?v=20261113h';
import { state, setSetting, loadPages } from '../store.js?v=20261113h';

/** Chaves que mudam só o visual (CSS) e não pedem para redesenhar a página aberta. */
const CSS_ONLY = new Set(['theme', 'custom_fonts', 'effects']);
const SKIP = new Set(['studio_backup']);

/**
 * Assina as mudanças do master em tempo real.
 * onChange({ keys, pages }) é chamado (com pequeno atraso) depois de qualquer alteração.
 */
export function startLive(onChange) {
  let timer = 0;
  const keys = new Set();
  let pages = false;
  const fire = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const k = [...keys], p = pages; keys.clear(); pages = false;
      onChange({ keys: k, pages: p, cssOnly: !p && k.every((x) => CSS_ONLY.has(x)) });
    }, 350);
  };

  sb.channel('gm-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (e) => {
      const key = (e.new?.key ?? e.old?.key);
      if (!key || SKIP.has(key)) return;
      setSetting(key, e.eventType === 'DELETE' ? undefined : e.new.value);
      keys.add(key); fire();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_pages' }, async () => {
      await loadPages();
      pages = true; fire();
    })
    .subscribe();
}

/** Dentro do iframe do Estúdio: recebe rascunhos do painel e avisa quando está pronto. */
export function listenPreview(onDraft) {
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'gm-draft') return;
    for (const [k, v] of Object.entries(e.data.settings || {})) setSetting(k, v);
    onDraft(Object.keys(e.data.settings || {}), e.data.pages);
  });
  parent.postMessage({ type: 'gm-ready' }, location.origin);
}
export const IS_PREVIEW = window.name === 'gm-studio' && window.parent !== window;
export { state };
