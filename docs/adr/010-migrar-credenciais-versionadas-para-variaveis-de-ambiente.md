# ADR 010: Migrar credenciais versionadas para variáveis de ambiente

**Date:** 10/09/2026

**Status:** Proposed — nenhuma mudança de código aplicada ainda; plano de ação para execução posterior

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Investigação realizada para verificar se o projeto tem credenciais importantes versionadas no repositório remoto (GitHub) e, avaliar como migrá-las para variáveis de ambiente locais (`.env`) sem quebrar o deploy automático em produção (Vercel).

A investigação identificou dois pontos importantes:

(1) a senha de um administrador de bootstrap em texto claro em `supabase/schema.sql` e numa migração versionada, já era uma pendência conhecida em [`calcjud_banco_de_dados.md`](003-calcjud_banco_de_dados.md);

(2) a URL e a chave `anon`/`publishable` do Supabase hardcoded em `src/integrations/supabase/externalClient.ts` (o cliente efetivamente usado pela aplicação), em vez de virem de `import.meta.env`.

A chave `anon`/`publishable` é, por natureza, uma chave pública protegida por RLS e já 100% visível no bundle JavaScript publicado, migrá-la para `.env` é boa prática de organização, mas não fecha uma vulnerabilidade real por si só. Já a senha do administrador de bootstrap é uma credencial de login real e precisa ser trocada no Supabase, não apenas removida do código.

Trocar o `externalClient.ts` para ler de `import.meta.env` sem antes configurar as variáveis correspondentes no painel do Vercel derrubaria a aplicação em produção (cliente Supabase criado com `undefined`), essa dependência está descrita em [ADR 008](008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md).

## Decision

- Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no painel do Vercel (Settings → Environment Variables) e confirmar com um redeploy de verificação **antes** de qualquer mudança de código.
- Só então alterar `src/integrations/supabase/externalClient.ts` para ler de `import.meta.env`, remover o arquivo `client.ts` (código morto) e corrigir `.env.example` para conter um placeholder genérico em vez do valor real.
- Tratar a rotação da senha do administrador de bootstrap (`agoiagoi`) como prioridade independente e mais urgente: trocar a senha real no Supabase (Authentication → Users) e redigir/remover o valor dos arquivos `supabase/schema.sql` e da migração de `admin_access_controls`, deixando um placeholder ou instrução de geração de senha nova.
- Decidir separadamente (fora do escopo imediato) se vale reescrever o histórico do Git para remover o rastro da senha antiga.

## Consequences

- Enquanto este ADR estiver `Proposed`, a URL/chave pública do Supabase continua hardcoded no código-fonte (risco de organização, não de segurança real) e a senha do administrador de bootstrap continua em texto claro no repositório (risco de segurança real, mitigado apenas quando a senha for rotacionada no Supabase).
- A migração da URL/chave depende de coordenação prévia com o painel do Vercel, não pode ser feita apenas no código, sob risco de derrubar a aplicação em produção.
- A rotação da senha de bootstrap não depende da migração de variáveis de ambiente e pode/deve ser feita antes, independentemente do restante deste ADR.

---

## Detalhamento da investigação

> Conteúdo original da investigação, preservado como registro detalhado.

## Resumo do que foi encontrado, por ordem de gravidade real

### 1. Achado crítico — senha de administrador em texto puro

Em **`supabase/schema.sql`** e **`supabase/migrations/20260428120000_admin_access_controls.sql`**
(ambos versionados), o script de instalação do banco cria/reseta o admin
`contaagoijf@gmail.com` com a senha em texto claro `agoiagoi`. Essa era uma
pendência já conhecida (documentada em [`calcjud_banco_de_dados.md`](003-calcjud_banco_de_dados.md),
linha 99), e a investigação confirmou que ela continua presente nos dois
arquivos.

Isso **não se resolve movendo para `.env`** — é uma credencial de login da
aplicação, gravada no banco de dados (tabela de usuários do Supabase Auth),
não uma variável de build/deploy. A correção correta é trocar essa senha de
verdade no Supabase e, à parte, redigir/remover o valor dos dois arquivos.
Removê-la do arquivo **não a apaga do histórico do Git** — isso exigiria
reescrever o histórico (`git filter-repo` ou similar), uma operação mais
invasiva que precisa ser alinhada separadamente.

### 2. Achado sobre o pedido específico — URL e chave do Supabase hardcoded

- `src/integrations/supabase/externalClient.ts` — **é o cliente realmente
  usado em toda a aplicação** (9 arquivos importam dele) — tem a URL e a
  chave `anon`/`publishable` do Supabase escritas direto no código-fonte, em
  vez de vir de `import.meta.env`.
- Existe também `src/integrations/supabase/client.ts`, um arquivo
  auto-gerado que já lê de `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
  — mas **não é usado em lugar nenhum** (código morto).
- `.env.example` (versionado) contém os valores **reais** de produção,
  idênticos ao `.env` local — quando o normal seria ter só um placeholder.

**Importante sobre gravidade real**: essa chave é a `anon`/`publishable`
key — por natureza, é uma chave pública, protegida por RLS (Row Level
Security) no Supabase, feita para rodar no navegador. Ela já está 100%
visível no bundle JavaScript publicado em `calcjud.vercel.app` (qualquer
pessoa pode abrir o DevTools do navegador e vê-la), independentemente de vir
de `.env` ou estar hardcoded no código. Ou seja: mover para `.env` é uma boa
prática de organização e manutenção, mas **não fecha uma vulnerabilidade
real** — não é da mesma natureza que a `service_role key` ou a senha do
item 1 acima, que essas sim precisam ficar fora do alcance público.

### 3. Análise de risco para o deploy em produção (Vercel)

Se os valores hardcoded do `externalClient.ts` forem trocados para
`import.meta.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, a
próxima build do Vercel (disparada automaticamente a cada push para `main`)
precisaria dessas variáveis já configuradas no **projeto Vercel** — senão o
cliente Supabase seria criado com `undefined`, e a aplicação inteira pararia
de funcionar em produção (nenhuma tela carregaria dados).

Essa é uma pendência já conhecida e documentada no [ADR 008](008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md):
as variáveis **não estão configuradas no Vercel hoje**, é justamente por
isso que a aplicação funciona mesmo sem elas (usa o valor fixo no código).

Foi verificado se seria possível configurar essas variáveis remotamente via
Vercel CLI, para aplicar a mudança com segurança: **não há Vercel CLI
instalado nem nenhum token de acesso configurado no ambiente usado na
investigação** (nem `VERCEL_TOKEN`, nem projeto vinculado via
`.vercel/project.json`). Não foi possível criar essas variáveis
remotamente. Por isso, a mudança do `externalClient.ts` **não deve ser
aplicada antes** de as variáveis existirem no painel do Vercel.

---

## Passo a passo do que precisa ser feito

### A. URL e chave do Supabase (`externalClient.ts` / `.env`)

1. No painel do Vercel do projeto CalcJud, ir em **Settings → Environment
   Variables** e adicionar:
   - `VITE_SUPABASE_URL` — mesmo valor de `.env.example`/`.env` local.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — mesmo valor de `.env.example`/`.env`
     local.
2. Disparar um redeploy manual no Vercel (ou aguardar o próximo push) e
   confirmar que o site continua funcionando normalmente com as variáveis
   configuradas — nesse ponto o código ainda usa o valor hardcoded, então
   nada deve mudar visualmente; é só para confirmar que as variáveis foram
   salvas corretamente antes do próximo passo.
3. Só então aplicar a mudança de código:
   - Trocar `src/integrations/supabase/externalClient.ts` para ler de
     `import.meta.env.VITE_SUPABASE_URL` e
     `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`, em vez dos valores
     fixos.
   - Remover o arquivo `src/integrations/supabase/client.ts` (código morto,
     não usado — ou, alternativamente, unificar os dois em um só arquivo).
   - Corrigir `.env.example` para conter um placeholder genérico em vez do
     valor real (ex.: `"sua-chave-aqui"`), mantendo `.env` (local, já
     ignorado pelo Git) com o valor real de fato.
4. Fazer commit e push para `main`, acompanhar o deploy automático no
   Vercel e conferir que o site em produção carrega normalmente.

### B. Senha do administrador de bootstrap (`agoiagoi`)

1. **Prioridade alta, independente do item A**: trocar a senha real da
   conta `contaagoijf@gmail.com` no painel do Supabase, em
   **Authentication → Users**.
2. Redigir/remover o valor `agoiagoi` (e o e-mail, se fizer sentido) dos
   arquivos `supabase/schema.sql` e
   `supabase/migrations/20260428120000_admin_access_controls.sql`, deixando
   um placeholder ou instrução para gerar uma senha nova a cada nova
   instalação do banco.
3. Decidir se vale reescrever o histórico do Git para remover de vez o
   rastro da senha antiga (`git filter-repo` ou equivalente) — operação
   mais invasiva, que reescreve hashes de commit e exige coordenação com
   quem mais usa o repositório. Não é estritamente necessário se a senha já
   tiver sido rotacionada (o valor antigo deixa de ser válido), mas é uma
   boa prática de higiene caso o repositório seja ou venha a ser público.

---

## Status

- [ ] A.1 — Variáveis criadas no Vercel
- [ ] A.2 — Redeploy de confirmação feito
- [x] A.3a — `.env.example` corrigido para placeholder genérico (16/09/2026)
- [ ] A.3b — Código do `externalClient.ts` corrigido (depende de A.1/A.2 antes)
- [ ] A.4 — Deploy final conferido em produção
- [ ] B.1 — Senha do admin de bootstrap rotacionada no Supabase
- [ ] B.2 — Arquivos `schema.sql`/migração corrigidos
- [ ] B.3 — Decisão sobre reescrever histórico do Git
