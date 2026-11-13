import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.10/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // PKCE devolve o código na query (?code=) e não no hash, que é usado pelo roteador do site.
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
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
