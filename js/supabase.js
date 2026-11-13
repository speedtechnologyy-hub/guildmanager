import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=20261113h';

// Nenhuma ida ao servidor pode ficar pendurada para sempre: sem resposta em 15 s, a chamada falha e a tela avisa.
// (Envio de imagens e funções do servidor ficam de fora, porque podem demorar mais.)
function timedFetch(input, init = {}) {
  const url = String(input?.url || input);
  if (/\/(storage|functions)\/v1\//.test(url)) return fetch(input, init);
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  init.signal?.addEventListener('abort', () => c.abort());
  return fetch(input, { ...init, signal: c.signal }).finally(() => clearTimeout(t));
}

// Trava de sessão só dentro da aba. A trava padrão (navigator.locks) fica presa no Safari do iPhone
// quando outra aba ou o app instalado é congelado, e aí login e telas ficam carregando sem fim.
let queue = Promise.resolve();
function tabLock(_name, _timeout, fn) {
  const run = queue.then(() => fn());
  queue = run.catch(() => {});
  return run;
}

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // PKCE devolve o código na query (?code=) e não no hash, que é usado pelo roteador do site.
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, lock: tabLock },
  global: { fetch: timedFetch },
});

/** Resolve com os dados ou lança o erro do Supabase. */
export async function q(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

/** Chama uma Edge Function e devolve a mensagem de erro em português que ela enviou. */
export async function fn(name, body) {
  const { data, error } = await sb.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* sem corpo */ }
    throw new Error(msg);
  }
  return data;
}
