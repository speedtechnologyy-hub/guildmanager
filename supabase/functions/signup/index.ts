// Cadastro: valida convite, valida o WhatsApp na Evolution e cria o membro.
// Ações: invite-info (público), check-whatsapp, complete, set-whatsapp (precisam de login).
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
  invalid_invite: 'Esse convite não é válido, expirou ou já foi usado por todas as vagas.',
  no_invite: 'Não encontramos convite nem cadastro prévio para a sua conta. Peça um link de convite à liderança.',
  already_member: 'Essa conta já está cadastrada.',
  whatsapp_invalid: 'Número de WhatsApp inválido. Use o DDD e o número.',
  whatsapp_not_found: 'Esse número não foi encontrado no WhatsApp. Confira o DDD e o número.',
  whatsapp_taken: 'Esse WhatsApp já está cadastrado em outra conta.',
  whatsapp_unavailable: 'Não foi possível validar o WhatsApp agora. Tente de novo em instantes.',
  name_invalid: 'Informe um nome entre 2 e 40 caracteres.',
  unauthorized: 'Faça login para continuar.',
  no_profile: 'Cadastro não encontrado.',
};

function normalize(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d.length >= 12 && d.length <= 15 ? d : null;
}

async function checkWhatsapp(number: string) {
  const { data: cfg } = await admin
    .from('integration_settings')
    .select('evolution_base_url,evolution_instance')
    .eq('id', 1)
    .maybeSingle();
  const key = Deno.env.get('EVOLUTION_API_KEY');
  // Evolution ainda não configurada: aceita o número sem validar (fica como não verificado).
  if (!cfg?.evolution_base_url || !cfg?.evolution_instance || !key) {
    return { checked: false, exists: true, number };
  }
  let res: Response;
  try {
    res = await fetch(
      `${cfg.evolution_base_url.replace(/\/+$/, '')}/chat/whatsappNumbers/${encodeURIComponent(cfg.evolution_instance)}`,
      {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: [number] }),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new Fail('whatsapp_unavailable', 502);
  }
  if (!res.ok) throw new Fail('whatsapp_unavailable', 502);
  const data = await res.json().catch(() => null);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.exists) return { checked: true, exists: false, number };
  const canonical = String(row.jid ?? row.number ?? number).split('@')[0].replace(/\D/g, '');
  return { checked: true, exists: true, number: canonical.length >= 12 ? canonical : number };
}

async function authUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Fail('unauthorized', 401);
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'invite-info') {
      const code = String(body.code ?? '').trim();
      const { data: inv } = await admin
        .from('invites')
        .select('active,expires_at,max_uses,uses')
        .eq('code', code)
        .maybeSingle();
      const valid = !!inv && inv.active &&
        (!inv.expires_at || new Date(inv.expires_at) > new Date()) &&
        (inv.max_uses == null || inv.uses < inv.max_uses);
      return reply({ valid });
    }

    if (body.action === 'check-whatsapp') {
      await authUser(req);
      const number = normalize(body.whatsapp);
      if (!number) throw new Fail('whatsapp_invalid');
      const w = await checkWhatsapp(number);
      if (!w.exists) throw new Fail('whatsapp_not_found');
      return reply({ ok: true, checked: w.checked, number: w.number });
    }

    if (body.action === 'complete') {
      const user = await authUser(req);
      const name = String(body.display_name ?? '').trim();
      if (name.length < 2 || name.length > 40) throw new Fail('name_invalid');
      const number = normalize(body.whatsapp);
      if (!number) throw new Fail('whatsapp_invalid');
      const w = await checkWhatsapp(number);
      if (!w.exists) throw new Fail('whatsapp_not_found');

      // só vale o e-mail confirmado (evita reivindicar cadastro prévio com e-mail não verificado)
      const email = user.email_confirmed_at ? (user.email ?? null) : null;
      const discord = user.identities?.find((i) => i.provider === 'discord');
      const discordId = discord
        ? String(discord.identity_data?.provider_id ?? discord.identity_data?.sub ?? discord.id)
        : null;

      // Cadastro prévio feito pelo admin tem prioridade sobre o link de convite.
      let code: string | null = String(body.invite_code ?? '').trim() || null;
      const { data: pend } = await admin.from('pending_members').select('google_email,discord_id').is('claimed_by', null);
      const hasPending = (pend ?? []).some((p) =>
        (email && p.google_email?.toLowerCase() === email.toLowerCase()) ||
        (discordId && p.discord_id === discordId)
      );
      if (hasPending) code = null;

      const { error } = await admin.rpc('claim_membership', {
        p_user_id: user.id,
        p_invite_code: code,
        p_display_name: name,
        p_whatsapp: w.number,
        p_email: email,
        p_discord_id: discordId,
      });
      if (error) {
        const m = error.message ?? '';
        if (m.includes('invalid_invite')) throw new Fail('invalid_invite');
        if (m.includes('no_invite')) throw new Fail('no_invite');
        if (m.includes('already_member')) throw new Fail('already_member');
        if (error.code === '23505' && m.includes('whatsapp')) throw new Fail('whatsapp_taken');
        throw error;
      }
      if (!w.checked) {
        await admin.from('profile_private').update({ whatsapp_verified_at: null }).eq('id', user.id);
      }
      return reply({ ok: true });
    }

    if (body.action === 'set-whatsapp') {
      const user = await authUser(req);
      const { data: prof } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (!prof) throw new Fail('no_profile', 404);
      const number = normalize(body.whatsapp);
      if (!number) throw new Fail('whatsapp_invalid');
      const w = await checkWhatsapp(number);
      if (!w.exists) throw new Fail('whatsapp_not_found');
      const { error } = await admin
        .from('profile_private')
        .update({ whatsapp: w.number, whatsapp_verified_at: w.checked ? new Date().toISOString() : null })
        .eq('id', user.id);
      if (error) {
        if (error.code === '23505') throw new Fail('whatsapp_taken');
        throw error;
      }
      return reply({ ok: true, number: w.number });
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
