# Pendências do fluxo "Esqueceu a senha?" — passo a passo

Duas configurações fora do código-fonte precisam ser feitas manualmente antes do fluxo
"Esqueceu a senha?" (tela de login administrativo) funcionar de ponta a ponta em produção.

## 1. Aplicar a migração `is_registered_admin_email` no banco de produção

Essa função permite checar, a partir de um usuário não autenticado, se um e-mail já é de
um administrador cadastrado (`public.admin_users`) — usada para mostrar a mensagem "O
e-mail informado não existe!" antes de disparar o código de recuperação.

Arquivo já criado no repositório: `supabase/migrations/20260918000000_forgot_password_check.sql`.

### Passo a passo

1. Acesse o [painel do Supabase](https://supabase.com/dashboard) e selecione o projeto do
   sistema (`xitpsqtcxraejzlxvvmn`).
2. No menu lateral, abra **SQL Editor**.
3. Clique em **New query** para abrir uma consulta em branco.
4. Copie e cole o conteúdo abaixo (é exatamente o conteúdo do arquivo
   `supabase/migrations/20260918000000_forgot_password_check.sql`):

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

5. Clique em **Run** (ou `Ctrl+Enter`) para executar.
6. Confirme que apareceu "Success. No rows returned" (é normal — o comando só cria a
   função, não retorna dados).

### Como conferir se funcionou

Ainda no SQL Editor, rode uma consulta de teste substituindo pelo e-mail de um admin já
cadastrado no sistema e por um e-mail qualquer que não exista:

```sql
select public.is_registered_admin_email('email-de-um-admin-existente@exemplo.com'); -- deve retornar true
select public.is_registered_admin_email('email-que-nao-existe@exemplo.com');        -- deve retornar false
```

Se as duas consultas retornarem o valor esperado, a migração foi aplicada corretamente e
o botão "Enviar" da tela "Esqueceu a senha?" já pode checar e-mails sem dar erro.

## 2. Configurar o template de e-mail "Reset Password" para enviar um código, não um link

Por padrão, o e-mail de recuperação de senha do Supabase Auth traz um **link** de
confirmação (`{{ .ConfirmationURL }}`). Para o usuário receber um **código de 6 dígitos**
(como o sistema espera na etapa "Digite o código de 6 dígitos"), o template precisa
usar a variável `{{ .Token }}` em vez do link.

### Pré-requisito: plano free-tier pode bloquear a edição

Desde 03/06/2026, projetos **free-tier** que usam o e-mail padrão do Supabase (sem SMTP
próprio configurado) não podem mais editar os templates — o botão **Source** mostra a
mensagem "You need additional permissions to edit templates". Projetos free-tier criados
antes dessa data mantêm a edição normalmente; projetos Pro (pagos) nunca são afetados.
(Ref.: [Supabase Changelog](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).)

Se aparecer essa mensagem, é preciso primeiro liberar a edição por um dos dois caminhos:

- **Configurar um SMTP próprio (gratuito, recomendado):**
  1. Crie uma conta em um provedor de SMTP transacional (ex.: [Resend](https://resend.com),
     SendGrid, Postmark ou Amazon SES) e gere as credenciais SMTP (host, porta, usuário,
     senha) e um remetente verificado.
  2. No painel do Supabase, vá em **Authentication → Emails → SMTP Settings**.
  3. Ative **"Enable Custom SMTP"** e preencha host, porta, usuário, senha, "Sender email"
     e "Sender name".
  4. Salve. O botão "Source" do template passa a ficar editável.
- **Ou fazer upgrade do projeto para o plano Pro**, que remove essa restrição mesmo usando
  o e-mail padrão do Supabase.

### Passo a passo

1. No [painel do Supabase](https://supabase.com/dashboard), abra o projeto do sistema.
2. No menu lateral, vá em **Authentication** → **Emails** → **Reset Password**
   ou acesse o Link:  https://supabase.com/dashboard/project/xitpsqtcxraejzlxvvmn/auth/templates/reset-password
3. **Reset Password** é o template dos e-mails enviados por `supabase.auth.resetPasswordForEmail`
4. A aba Source é desabilitada para usuários, somente o admin pode alterar o corpo do e-mail (HTML),
   com acesso admin, localize a linha que contém a variável de link, algo como:

   ```html
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   ```

5. Substitua (ou complemente) por um trecho que exiba o código numérico, por exemplo:

   ```html
   <p>Seu código de verificação é:</p>
   <h2>{{ .Token }}</h2>
   <p>Este código expira em pouco tempo. Se você não pediu essa alteração, ignore este e-mail.</p>
   ```

   > Pode manter o link `{{ .ConfirmationURL }}` no mesmo e-mail, se preferir oferecer as
   > duas opções — o sistema hoje só usa o código (`{{ .Token }}`), então o link não
   > atrapalha, mas também não é necessário.

6. Clique em **Save** para salvar o template.

### Como conferir se funcionou

1. Na tela do sistema, clique em "Login admin" → "Esqueceu a senha?".
2. Informe um e-mail de um administrador já cadastrado e clique em "Enviar".
3. Abra a caixa de entrada desse e-mail e confirme que a mensagem recebida mostra um
   **código numérico de 6 dígitos** (não apenas um link).
4. Digite esse código na tela "Esqueceu a senha?" e clique em "Verificar" — deve abrir a
   tela "Nova senha" em seguida.

Se o e-mail recebido ainda mostrar só um link, revise o passo 5 — a variável `{{ .Token }}`
precisa estar presente no corpo do template salvo.


### Como configurar SMTP customizado

Crie uma conta em um provedor de SMTP transacional — o mais rápido para testar é o Resend (free tier generoso, setup simples). Outras opções: SendGrid, Postmark, Amazon SES.

No provedor, gere as credenciais SMTP (host, porta, usuário, senha) e um remetente verificado (e-mail ou domínio).
No painel do Supabase, vá em Authentication → Emails → SMTP Settings.
Ative "Enable Custom SMTP" e preencha host, porta, usuário, senha, "Sender email" e "Sender name".
Salve.
Volte para Authentication → Email Templates → Reset Password — o botão "Source" deve estar editável agora, sem a mensagem de permissão.
Edite o template incluindo {{ .Token }} como já documentado.

Alternativa, sem SMTP: fazer upgrade do projeto para o plano Pro, que remove essa restrição mesmo usando o e-mail padrão do Supabase.


## Resumo

| Pendência | Onde resolver | Feito? |
|---|---|---|
| Aplicar migração `is_registered_admin_email` | SQL Editor do Supabase | ⬜ |
| Template "Reset Password" com `{{ .Token }}` | Authentication → Email Templates | ⬜ |

Sem as duas, o fluxo "Esqueceu a senha?" já implementado no código (`AdminAuthDialog.tsx`,
`AuthContext.tsx`) não funciona de ponta a ponta: sem a migração, o botão "Enviar" retorna
erro; sem o template ajustado, o usuário recebe um link em vez do código de 6 dígitos que a
tela pede.

