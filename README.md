# Guild Manager (WYD Reborn)

Site de gestão de guild: chamada de guerra (Vou / Não vou), personagens, bosses, agenda, Discord e avisos por WhatsApp (Evolution API). Tudo configurável pelo painel admin.

Site estático (sem build) + Supabase. Hospede a pasta inteira na Hostinger (`public_html`).

## Configuração (uma vez)
1. **Supabase > Authentication > Providers**: ative Google e Discord.
2. **Supabase > Authentication > URL Configuration**: coloque a URL do site em *Site URL* e em *Redirect URLs*.
3. **Supabase > Edge Functions > Secrets**: crie `EVOLUTION_API_KEY` com a chave da sua Evolution API.
4. Crie o primeiro dono: insira uma linha em `pending_members` com `role = 'owner'` e o seu `google_email` (ou `discord_id`); ao entrar pela primeira vez você vira dono.
5. No painel: Aparência (nome, logo, cores, Discord, endereço do site), Agenda (horários de guerra), WhatsApp (URL e instância da Evolution, QR code, regras de aviso).

Os avisos começam **pausados**. Teste com "Enviar teste para mim" e só então desmarque a pausa.

## Estrutura
- `index.html`, `css/`, `js/` (módulos ES, roteador por `#/`), `assets/`
- `supabase/functions/` (signup, whatsapp-admin, notify-dispatch)
- `.htaccess` (cabeçalhos de segurança, bloqueia `/supabase` e `.git`)
