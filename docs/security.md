# CalcJud — Investigação de credenciais versionadas no repositório

Tribunal Regional Federal da 2ª Região (TRF2)
10/09/2026

## Contexto

Investigação feita a pedido, para verificar se o projeto tem credenciais
importantes versionadas no repositório remoto (GitHub) e, se sim, avaliar
como migrá-las para variáveis de ambiente locais (`.env`) sem quebrar o
deploy automático em produção (Vercel).

**Nenhuma mudança de código foi aplicada ainda** — este documento é o
resultado da investigação e o plano de ação, para execução posterior.

---

## Resumo do que foi encontrado, por ordem de gravidade real

### 1. Achado crítico — senha de administrador em texto puro

Em **`supabase/schema.sql`** e **`supabase/migrations/20260428120000_admin_access_controls.sql`**
(ambos versionados), o script de instalação do banco cria/reseta o admin
`contaagoijf@gmail.com` com a senha em texto claro `agoiagoi`. Essa era uma
pendência já conhecida (documentada em `docs/CalcJud_Banco_de_dados.md`,
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

Essa é uma pendência já conhecida e documentada em `docs/supabase-migracao.md`:
as variáveis **não estão configuradas no Vercel hoje** — é justamente por
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
- [ ] A.3 — Código do `externalClient.ts`/`.env.example` corrigido
- [ ] A.4 — Deploy final conferido em produção
- [ ] B.1 — Senha do admin de bootstrap rotacionada no Supabase
- [ ] B.2 — Arquivos `schema.sql`/migração corrigidos
- [ ] B.3 — Decisão sobre reescrever histórico do Git
