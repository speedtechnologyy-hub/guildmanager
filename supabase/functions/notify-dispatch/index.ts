// Envia os avisos pendentes da fila pelo WhatsApp (Evolution API v2).
// Chamada a cada minuto pelo pg_cron; autenticada por um segredo guardado no Vault do banco.
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH = 8;

Deno.serve(async (req) => {
  const { data: allowed } = await admin.rpc('check_cron_secret', { p: req.headers.get('x-cron-secret') ?? '' });
  if (!allowed) return json({ error: 'unauthorized' }, 401);

  const { data: cfg } = await admin.from('integration_settings').select('*').eq('id', 1).maybeSingle();
  const key = Deno.env.get('EVOLUTION_API_KEY');
  if (!cfg || cfg.sends_paused || !cfg.whatsapp_connected || !cfg.evolution_base_url || !cfg.evolution_instance || !key) {
    return json({ skipped: true });
  }
  const base = cfg.evolution_base_url.replace(/\/+$/, '');
  const inst = encodeURIComponent(cfg.evolution_instance);

  const { data: batch } = await admin
    .from('notification_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('send_after', new Date().toISOString())
    .order('send_after')
    .limit(BATCH);
  if (!batch?.length) return json({ sent: 0 });

  // "reserva" as linhas para que execuções simultâneas não enviem em dobro
  const { data: rows } = await admin
    .from('notification_queue')
    .update({ status: 'sending' })
    .in('id', batch.map((b) => b.id))
    .eq('status', 'pending')
    .select('id,user_id,body,attempts');

  let sent = 0;
  const list = rows ?? [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const { data: pp } = await admin.from('profile_private').select('whatsapp').eq('id', row.user_id).maybeSingle();
    if (!pp) {
      await admin.from('notification_queue').update({ status: 'skipped', last_error: 'sem WhatsApp' }).eq('id', row.id);
      continue;
    }
    try {
      const res = await fetch(`${base}/message/sendText/${inst}`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: pp.whatsapp, text: row.body }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      await admin
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1, last_error: null })
        .eq('id', row.id);
      sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      await admin
        .from('notification_queue')
        .update({
          status: attempts >= 3 ? 'failed' : 'pending',
          attempts,
          last_error: String(e).slice(0, 300),
          send_after: new Date(Date.now() + 2 * 60_000).toISOString(),
        })
        .eq('id', row.id);
    }
    if (i < list.length - 1) {
      const lo = Math.max(1, cfg.delay_min_s), hi = Math.max(lo, cfg.delay_max_s);
      await sleep((lo + Math.random() * (hi - lo)) * 1000);
    }
  }
  return json({ sent });
});
