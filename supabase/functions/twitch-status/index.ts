// Diz se um canal da Twitch está ao vivo agora (sem chave de API): usa o serviço público decapi.me.
// Devolve { live: true|false|null, uptime }. live=null quer dizer "não deu para saber".
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { channel } = await req.json().catch(() => ({}));
    if (!/^[A-Za-z0-9_]{3,25}$/.test(String(channel || ''))) return reply({ error: 'Canal inválido.' }, 400);
    const key = String(channel).toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return reply(hit.data);

    let data: { live: boolean | null; uptime: string | null } = { live: null, uptime: null };
    try {
      const r = await fetch(`https://decapi.me/twitch/uptime/${key}`, { signal: AbortSignal.timeout(6000) });
      const t = (await r.text()).trim();
      if (r.ok && /offline/i.test(t)) data = { live: false, uptime: null };
      else if (r.ok && /^\d+\s+(second|minute|hour|day)/i.test(t)) data = { live: true, uptime: t };
    } catch { /* sem resposta: fica como desconhecido */ }
    cache.set(key, { at: Date.now(), data });
    return reply(data);
  } catch (e) {
    console.error(e);
    return reply({ error: 'Não foi possível consultar a Twitch.' }, 500);
  }
});
