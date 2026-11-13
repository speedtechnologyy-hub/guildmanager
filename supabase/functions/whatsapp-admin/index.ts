// Gerencia a conexão do WhatsApp (Evolution API v2) pelo painel. Só o dono usa.
// Ações: status, connect (devolve o QR code), logout, test.
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

class Fail extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}
const MESSAGES: Record<string, string> = {
  unauthorized: 'Faça login para continuar.',
  forbidden: 'Só o dono pode gerenciar o WhatsApp.',
  not_configured: 'Informe a URL do servidor e o nome da instância e salve antes de conectar.',
  no_key: 'A chave da Evolution ainda não foi adicionada aos segredos do Supabase (EVOLUTION_API_KEY).',
  evolution_error: 'A Evolution API respondeu com erro. Confira a URL, a chave e o nome da instância.',
  no_whatsapp: 'Cadastre o seu WhatsApp no perfil para receber o teste.',
};

async function requireOwner(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Fail('unauthorized', 401);
  const { data: prof } = await admin.from('profiles').select('role,status').eq('id', data.user.id).maybeSingle();
  if (!prof || prof.role !== 'owner' || prof.status !== 'active') throw new Fail('forbidden', 403);
  return data.user;
}

async function config() {
  const { data } = await admin.from('integration_settings').select('*').eq('id', 1).maybeSingle();
  if (!data?.evolution_base_url || !data?.evolution_instance) throw new Fail('not_configured');
  const key = Deno.env.get('EVOLUTION_API_KEY');
  if (!key) throw new Fail('no_key');
  return {
    base: data.evolution_base_url.replace(/\/+$/, ''),
    name: data.evolution_instance as string,
    inst: encodeURIComponent(data.evolution_instance),
    key,
  };
}

async function evo(c: { base: string; key: string }, method: string, path: string, body?: unknown) {
  try {
    const res = await fetch(`${c.base}${path}`, {
      method,
      headers: { apikey: c.key, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    throw new Fail('evolution_error', 502);
  }
}

const setConnected = (v: boolean) => admin.from('integration_settings').update({ whatsapp_connected: v }).eq('id', 1);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const user = await requireOwner(req);
    const { action } = await req.json().catch(() => ({}));
    const c = await config();

    if (action === 'status') {
      const r = await evo(c, 'GET', `/instance/connectionState/${c.inst}`);
      const state = r.ok ? (r.data?.instance?.state ?? r.data?.state ?? 'unknown') : r.status === 404 ? 'not_created' : 'error';
      await setConnected(state === 'open');
      return reply({ state });
    }

    if (action === 'connect') {
      let r = await evo(c, 'GET', `/instance/connect/${c.inst}`);
      if (r.status === 404) {
        r = await evo(c, 'POST', '/instance/create', {
          instanceName: c.name,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });
        if (!r.ok) throw new Fail('evolution_error', 502);
        return reply({ state: 'connecting', qr: r.data?.qrcode?.base64 ?? null, pairing: r.data?.qrcode?.pairingCode ?? null });
      }
      if (!r.ok) throw new Fail('evolution_error', 502);
      if (r.data?.instance?.state === 'open') {
        await setConnected(true);
        return reply({ state: 'open', qr: null });
      }
      return reply({ state: 'connecting', qr: r.data?.base64 ?? null, pairing: r.data?.pairingCode ?? null });
    }

    if (action === 'logout') {
      await evo(c, 'DELETE', `/instance/logout/${c.inst}`);
      await setConnected(false);
      return reply({ ok: true });
    }

    if (action === 'test') {
      const { data: pp } = await admin.from('profile_private').select('whatsapp').eq('id', user.id).maybeSingle();
      if (!pp?.whatsapp) throw new Fail('no_whatsapp');
      const r = await evo(c, 'POST', `/message/sendText/${c.inst}`, {
        number: pp.whatsapp,
        text: 'Teste de aviso: o WhatsApp da guild está conectado e funcionando.',
      });
      if (!r.ok) throw new Fail('evolution_error', 502);
      return reply({ ok: true });
    }

    throw new Fail('bad_request');
  } catch (e) {
    const known = e instanceof Fail;
    if (!known) console.error(e);
    const code = known ? (e as Fail).code : 'server_error';
    return reply(
      { error: MESSAGES[code] ?? 'Algo deu errado. Tente novamente.', code },
      known ? (e as Fail).status : 500,
    );
  }
});
