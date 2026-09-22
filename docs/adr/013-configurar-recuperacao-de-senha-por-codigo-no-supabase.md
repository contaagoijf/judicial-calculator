# ADR 013: Configurar recuperação de senha por código no Supabase

**Date:** 18/09/2026

**Status:** Deferred — adiado até a migração do projeto para a Fábrica de Cálculos (ver [ADR 015](015-definir-fabrica-de-calculos-como-producao-final.md))

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

O fluxo "Esqueceu a senha?" da tela de Acesso administrativo foi implementado usando o recovery nativo
do Supabase Auth: o usuário informa o e-mail cadastrado, recebe um código de 6 dígitos, digita o código
e define uma nova senha. Duas configurações fora do código-fonte são necessárias para esse fluxo
funcionar de ponta a ponta — nenhuma delas foi aplicada ainda.

**Atualização (22/09/2026):** as duas pendências abaixo dependem de configuração avançada do Supabase
(SMTP próprio ou upgrade de plano) que o Tribunal não autoriza fazer no ambiente atual (Vercel/Supabase
é só desenvolvimento/validação — ver [ADR 015](015-definir-fabrica-de-calculos-como-producao-final.md)).
Por isso, ficam adiadas para quando o projeto for migrado para a Fábrica de Cálculos, em vez de
resolvidas agora. O passo a passo abaixo continua válido como referência para quando isso acontecer.

## Decision

Aplicar as duas pendências abaixo.

### 1. Aplicar a migração `is_registered_admin_email` no banco de produção

Permite checar, sem sessão autenticada, se um e-mail já pertence a um administrador cadastrado — usado
para mostrar a mensagem correta antes de disparar o código de recuperação. Migrações neste projeto são
aplicadas manualmente via SQL Editor do Supabase (não há pipeline automático).

1. Abrir o [SQL Editor](https://supabase.com/dashboard/project/xitpsqtcxraejzlxvvmn/sql) do projeto
   (`xitpsqtcxraejzlxvvmn`).
2. Colar e rodar o conteúdo de `supabase/migrations/20260918000000_forgot_password_check.sql`:

   ```sql
   CREATE OR REPLACE FUNCTION public.is_registered_admin_email(check_email TEXT)
   RETURNS BOOLEAN
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1
       FROM public.admin_users
       WHERE email = lower(trim(check_email))
     );
   $$;
   ```

3. Verificar com uma consulta de teste:

   ```sql
   select public.is_registered_admin_email('email-de-um-admin-existente@exemplo.com'); -- true
   select public.is_registered_admin_email('email-que-nao-existe@exemplo.com');        -- false
   ```

### 2. Configurar o template de e-mail "Reset Password" para enviar um código

Por padrão, o e-mail de recuperação do Supabase Auth traz um **link** (`{{ .ConfirmationURL }}`); a
tela espera um **código de 6 dígitos**, que exige a variável `{{ .Token }}` no template.

**Pré-requisito — restrição do plano free-tier**: desde 03/06/2026, projetos free-tier sem SMTP próprio
não podem mais editar templates de e-mail (o botão "Source" mostra "You need additional permissions to
edit templates"). Projetos criados antes dessa data e projetos Pro não são afetados. Se aparecer essa
mensagem, é preciso primeiro configurar um SMTP próprio (Resend, SendGrid, Postmark ou Amazon SES, em
Authentication → Emails → SMTP Settings) ou fazer upgrade para o plano Pro.

1. Authentication → Email Templates → **Reset Password**.
2. No corpo do e-mail, substituir (ou complementar) a variável de link por uma que mostre o código:

   ```html
   <p>Seu código de verificação é:</p>
   <h2>{{ .Token }}</h2>
   ```

3. Salvar.

## Consequences

- Sem a migração, o botão "Enviar" da tela "Esqueceu a senha?" retorna erro.
- Sem o template ajustado, o usuário recebe um link em vez do código de 6 dígitos esperado pela tela.
- Teste após aplicar as duas: solicitar recuperação na tela, confirmar que o e-mail recebido mostra um
  código de 6 dígitos, digitá-lo e concluir a troca de senha.
