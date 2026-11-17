// Lista os vídeos mais recentes de um canal do YouTube (feed RSS público, sem chave de API).
// O site chama com { channel_id } e mostra o player por dentro, sem sair do Guild Manager.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 10 * 60 * 1000;
const dec = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { channel_id } = await req.json().catch(() => ({}));
    if (!/^UC[\w-]{22}$/.test(String(channel_id || ''))) return reply({ error: 'Canal inválido.' }, 400);
    const hit = cache.get(channel_id);
    if (hit && Date.now() - hit.at < TTL) return reply(hit.data);

    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return reply({ error: 'O YouTube não respondeu agora.' }, 502);
    const xml = await r.text();
    const head = xml.split('<entry>')[0];
    const title = dec((head.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1];
      return {
        id: (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1],
        title: dec((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
        published: (e.match(/<published>([^<]*)<\/published>/) || [])[1] || null,
      };
    }).filter((v) => v.id);
    const data = { title, videos };
    cache.set(channel_id, { at: Date.now(), data });
    return reply(data);
  } catch (e) {
    console.error(e);
    return reply({ error: 'Não foi possível carregar os vídeos.' }, 500);
  }
});
