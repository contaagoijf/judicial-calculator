# ADR 010: Migrar credenciais versionadas para variáveis de ambiente

**Date:** 10/09/2026

**Status:** Proposed — nenhuma mudança de código aplicada ainda; plano de ação para execução posterior

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Links de acesso do projeto

Links de acesso do CalcJud em cada provedor usado atualmente (ver [ADR 015](015-definir-fabrica-de-calculos-como-producao-final.md)
sobre esse ambiente ser desenvolvimento/validação, não o destino final de produção):

- **GitHub** (código-fonte): <https://github.com/contaagoijf/judicial-calculator>
- **Vercel** (build e deploy do front-end): <https://vercel.com/agois-projects>
- **Supabase** (banco de dados e autenticação): <https://supabase.com/dashboard/project/xitpsqtcxraejzlxvvmn>

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
- ~~Tratar a rotação da senha do administrador de bootstrap como prioridade independente e mais
  urgente: trocar a senha real no Supabase (Authentication → Users) e redigir/remover o valor dos
  arquivos `supabase/schema.sql` e da migração de `admin_access_controls`, deixando um placeholder ou
  instrução de geração de senha nova.~~ ✅ concluído em 24/09/2026 — senha real rotacionada via SQL
  Editor (o painel do Supabase não ofereceu mais uma opção de definir senha diretamente pela interface),
  e os dois arquivos corrigidos para gerar uma senha aleatória apenas na criação inicial, sem repetir
  nenhum valor fixo.
- Decidir separadamente (fora do escopo imediato) se vale reescrever o histórico do Git para remover o
  rastro da senha antiga — ver a Fase 3 do plano abaixo.

## Consequences

- A senha do administrador de bootstrap já foi rotacionada no Supabase e os arquivos `schema.sql`/
  migração já não contêm mais nenhum valor fixo (24/09/2026) — o risco de segurança real desse achado
  está mitigado no código e no banco atuais. O valor antigo ainda existe nos commits antigos do
  histórico do Git; ver Fase 3 do plano abaixo.
- A URL/chave pública do Supabase ainda está hardcoded no código-fonte (risco de organização, não de
  segurança real, já que é uma chave protegida por RLS e visível no bundle publicado).
- A migração da URL/chave depende de coordenação prévia com o painel do Vercel, não pode ser feita
  apenas no código, sob risco de derrubar a aplicação em produção.

---

## Detalhamento da investigação

> Conteúdo original da investigação, preservado como registro detalhado.

## Resumo do que foi encontrado, por ordem de gravidade real

### 1. Achado crítico — senha de administrador em texto puro (corrigido em 24/09/2026)

Em **`supabase/schema.sql`** e **`supabase/migrations/20260428120000_admin_access_controls.sql`**
(ambos versionados), o script de instalação do banco criava/resetava o admin
`contaagoijf@gmail.com` com uma senha fixa em texto claro. Essa era uma
pendência já conhecida (documentada em [`calcjud_banco_de_dados.md`](003-calcjud_banco_de_dados.md),
linha 99), e a investigação confirmou que ela continuava presente nos dois
arquivos — o valor real não é repetido aqui de propósito, já que essa senha foi rotacionada e os
arquivos corrigidos (ver Fase 1 e 2 do plano abaixo).

Isso **não se resolvia só movendo para `.env`** — era uma credencial de login da
aplicação, gravada no banco de dados (tabela de usuários do Supabase Auth),
não uma variável de build/deploy. A correção aplicada foi trocar essa senha de
verdade no Supabase (via SQL Editor) e, à parte, corrigir os dois arquivos para gerar uma senha
aleatória apenas na criação inicial do banco, nunca mais um valor fixo. Isso não apaga o valor antigo
do histórico do Git — isso ainda exigiria reescrever o histórico (`git filter-repo` ou similar), uma
operação mais invasiva tratada separadamente na Fase 3 do plano abaixo.

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

### 4. Configuração de acesso ao banco de produção (Supabase)

Levantamento confirmado em [`calcjud_banco_de_dados.md`](003-calcjud_banco_de_dados.md) (seção 2) e nos
arquivos do repositório:

- **Projeto Supabase de produção:** `xitpsqtcxraejzlxvvmn`
  (`VITE_SUPABASE_URL=https://xitpsqtcxraejzlxvvmn.supabase.co`, em `.env` /
  `.env.example` na raiz do repositório).
- **Chave disponível no repositório:** apenas a chave `anon`/`publishable`
  (`VITE_SUPABASE_PUBLISHABLE_KEY`). Essa chave permite **somente leitura** nas tabelas protegidas por
  RLS que exigem `public.is_admin()` (ex.: `regras_subperiodo`) — qualquer `INSERT`/`UPDATE`/`DELETE`
  exige um administrador autenticado.
- **Não existem no repositório nem no ambiente local:**
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, senha do usuário
  `postgres`, connection string, nem projeto Supabase linkado via CLI.
- **`supabase/config.toml` aponta para o projeto errado:** o arquivo referencia `bydirbbhuhihxrgxvrlb`,
  projeto **diferente** do de produção (`xitpsqtcxraejzlxvvmn`). Se alguém rodar `supabase db push`
  confiando nesse arquivo, vai atingir o projeto errado — vale corrigir.
- **Como obter acesso administrativo real:** ver [`calcjud_banco_de_dados.md`](003-calcjud_banco_de_dados.md),
  seções 2.1 (convite/login no painel) e 2.2 (senha do usuário `postgres` para `psql`).

---

## Passo a passo do que precisa ser feito

**Escopo ampliado (23/09/2026):** além da URL/chave do Supabase e da senha de bootstrap, a limpeza
passou a incluir reescrever o histórico do Git para remover todo o rastro de: a senha antiga
(`agoiagoi`), qualquer credencial versionada, assinaturas `Co-Authored-By: Claude` (ou variações), e
menções a "Claude", "Anthropic", "Claude Code", "Agents", "Skills" ou termos equivalentes de ferramentas
de IA em mensagens de commit, descrições de PR, código-fonte, comentários ou qualquer arquivo
versionado — conforme a regra fixa do projeto sobre não mencionar IA no repositório público.

A ordem abaixo existe para uma razão específica: **reescrever o histórico antes de corrigir o
código/documentação atuais não adianta nada** — o próximo commit reintroduziria o mesmo conteúdo no
histórico "limpo". Por isso, a sequência é sempre: primeiro corrigir o presente (Fase 1 e 2), só depois
mexer no passado (Fase 3), e por último confirmar que nada quebrou (Fase 4).

### Fase 1 — Corrigir o código e a documentação atuais (antes de reescrever qualquer histórico)

1. **URL e chave do Supabase** (`externalClient.ts` / `.env`) — as variáveis `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_SUPABASE_ANON_KEY` já foram confirmadas no ambiente de
   **Production** do Vercel e já existem no `.env` local (23/09/2026), então este passo já pode ser
   aplicado com segurança:
   - Trocar `src/integrations/supabase/externalClient.ts` para ler de `import.meta.env.VITE_SUPABASE_URL`
     e `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`, em vez dos valores fixos.
   - Remover o arquivo `src/integrations/supabase/client.ts` (código morto, não usado — ou,
     alternativamente, unificar os dois em um só arquivo).
   - `.env.example` já está corrigido com placeholder genérico (16/09/2026).
   - Fazer commit e push para `main`, acompanhar o deploy automático no Vercel e conferir que o site em
     produção carrega normalmente **antes de seguir para o próximo item**.
2. **Corrigir `supabase/config.toml`** — trocar a referência de `bydirbbhuhihxrgxvrlb` para
   `xitpsqtcxraejzlxvvmn` (projeto de produção), evitando que um `supabase db push` local atinja o
   projeto errado.
3. ✅ **Concluído em 24/09/2026 — Redigir o valor literal da senha de bootstrap nos arquivos atuais**:
   - `supabase/schema.sql`
   - `supabase/migrations/20260428120000_admin_access_controls.sql`
   - Este próprio ADR (a citação do achado explica o que foi encontrado, sem repetir o valor literal).
4. ✅ **Concluído em 24/09/2026 — Corrigir a lógica que resetava a senha a cada reexecução**: tanto
   `schema.sql` quanto a migração faziam `UPDATE auth.users SET encrypted_password = crypt(...)` no
   branch `ELSE` (ou seja, se o admin já existisse, o script sobrescrevia a senha atual pela antiga toda
   vez que fosse rodado de novo). Corrigido para não mexer mais na senha de um admin já existente — a
   senha só é gerada (de forma aleatória, nunca um valor fixo) na criação inicial do usuário, e um
   `RAISE NOTICE` mostra esse valor uma única vez, na hora da instalação, para quem estiver rodando o
   script pela primeira vez.
5. **Confirmar que não sobra nenhuma menção a IA no `main` atual** — rodar
   `git grep -liE "claude|anthropic|co-authored-by"` (fora do `.gitignore`, que menciona `CLAUDE.md` de
   propósito) e conferir manualmente qualquer resultado antes de seguir para a Fase 3.
6. **Decidir o que fazer com a branch `ajuste-calcjud`** (publicada também em
   `origin/ajuste-calcjud` no GitHub) — ela diverge de `main` desde 16/09/2026 e tem, hoje, **13 dos seus
   22 commits** com menções a "agente de IA"/`SKILL.md`, expostas publicamente no GitHub agora mesmo
   (independente de qualquer reescrita de histórico do `main`). Se for uma linha de trabalho já
   superada pelas reorganizações feitas depois em `main`: a forma mais simples de resolver é apagar a
   branch (local e remota). Se ainda tiver algo relevante não incorporado ao `main`: precisa ser
   reescrita junto na Fase 3, senão a exposição continua ali mesmo depois de limpar o `main`.
7. Rodar `npx tsc --noEmit`, a suíte de testes e `npm run build` antes de cada commit desta fase, como já
   é praxe no projeto.

### Fase 2 — Rotacionar a senha do administrador de bootstrap (Supabase)

1. ✅ **Concluído — pessoa responsável avisada antes da troca.** Quem efetivamente usa o login
   `contaagoijf@gmail.com` para acessar o CalcJud foi avisado antes da troca, já que ela é imediata e
   invalida a senha atual assim que aplicada.
2. ✅ **Concluído em 24/09/2026 — senha real rotacionada.** As opções do próprio painel
   (**Authentication → Users**) acabaram não servindo neste caso: "Send password recovery" e "Send magic
   link" só mandam um e-mail com **link**, mas a tela de "Esqueceu a senha?" do CalcJud só sabe
   processar um **código de 6 dígitos** digitado manualmente — não existe nenhuma página na aplicação
   preparada para receber esses links, então clicar neles não leva a lugar nenhum. As versões atuais do
   Studio também não têm mais um campo para digitar a senha nova direto na lista de usuários. A forma que
   funcionou foi rodar diretamente no **SQL Editor** do painel (mesmo mecanismo que os arquivos de
   instalação do banco usam):
   ```sql
   UPDATE auth.users
   SET encrypted_password = extensions.crypt('<senha-nova>', extensions.gen_salt('bf')),
       updated_at = now()
   WHERE email = 'contaagoijf@gmail.com';
   ```
3. **Não foi necessária nenhuma ação adicional de "sincronização" na configuração do Supabase** — a
   tabela `auth.users` é a única fonte de verdade, lida a cada tentativa de login; a troca pelo SQL
   Editor já vale imediatamente para qualquer cliente (app CalcJud, painel do Supabase, etc.). O ponto de
   atenção que existia — a Fase 1, item 4, sem a qual uma reexecução futura de `schema.sql` reverteria a
   senha de volta para o valor antigo — já foi corrigido antes desta rotação.
4. Confirmar com a pessoa responsável que o login com a senha nova funciona (o comando da SQL foi
   executado com sucesso; falta só a confirmação de login para marcar este item como concluído).

### Fase 3 — Reescrever o histórico do Git

1. **Confirmar que é seguro reescrever**: ninguém mais tem um clone local de `main` com trabalho
   pendente que dependeria dos commits atuais (trabalho solo neste projeto até o momento).
2. **Backup de segurança**: criar uma branch local a partir do `main` atual antes de qualquer reescrita
   (ex.: `backup/main-antes-limpeza-<data>`) — regra fixa do projeto sempre que o histórico da `main`
   for reescrito, por causa das credenciais que ainda estão nele.
3. **Rodar a reescrita** (`git filter-repo`, preferível a `filter-branch`) removendo de todos os commits
   antigos do `main` (e de `ajuste-calcjud`, se ela for mantida — ver Fase 1, item 6):
   - o valor literal `agoiagoi`;
   - qualquer trailer `Co-Authored-By: Claude ...` (e variações) de mensagens de commit;
   - qualquer menção a "Claude", "Anthropic", "Claude Code", "Agents", "Skills" ou equivalentes de
     ferramentas de IA, tanto em mensagens de commit quanto em conteúdo de arquivos antigos (ex.: os
     arquivos de tooling de agente de IA já removidos do `main` atual, mas cujo conteúdo ainda existe em
     blobs de commits antigos).
4. Se `ajuste-calcjud` for considerada obsoleta (Fase 1, item 6): apagar a branch local e a remota
   (`git push origin --delete ajuste-calcjud`) em vez de reescrevê-la.
5. **Force-push com `--force-with-lease`** (nunca `--force` puro) de `main` para o GitHub — e de
   `ajuste-calcjud`, se ela tiver sido reescrita em vez de apagada.
6. Avaliar se as branches de backup locais antigas (`backup/main-antes-chamados-*`) ainda são necessárias
   ou podem ser removidas, já que elas preservam justamente o rastro que está sendo removido do `main`
   (elas nunca foram enviadas ao GitHub, então não afetam a exposição pública, mas continuam existindo
   localmente).

### Fase 4 — Verificação pós-limpeza (resumo de que a produção não foi afetada)

Registrar o resultado de cada item abaixo (data e conferido por quem) como evidência de que a limpeza
não teve impacto negativo em produção:

1. **Conteúdo idêntico:** `git diff <branch-de-backup> main --stat` (ou `HEAD` após a reescrita) retorna
   vazio para qualquer intervalo em que só o histórico mudou — confirma que a reescrita alterou apenas
   metadados de commit, não o conteúdo final dos arquivos.
2. **Deploy Vercel:** o deploy mais recente (disparado pelo push da Fase 3) terminou com sucesso, e
   `calcjud.vercel.app` carrega normalmente — login administrativo, Ajuste Anual, Retificação e Consulta
   pública testados manualmente.
3. **Supabase:** nenhum erro de `undefined`/conexão no console do navegador (confirma que
   `externalClient.ts` está lendo as variáveis de ambiente corretamente em produção).
4. **Login do admin de bootstrap:** a pessoa responsável por `contaagoijf@gmail.com` confirma que
   conseguiu entrar com a senha nova.
5. **Nenhum rastro restante:** `git grep` (ou uma busca equivalente do GitHub) confirma que não há mais
   `agoiagoi`, `Co-Authored-By: Claude` nem menções a IA em nenhum commit de nenhuma branch publicada.
6. **GitHub são:** issues, pull requests e links para commits antigos (se algum já tiver sido
   compartilhado por hash) podem quebrar depois do force-push, já que os hashes mudam — conferir se
   existe algum link externo importante que precise ser atualizado.

---

## Status

- [ ] 1.1 — `externalClient.ts` corrigido para ler de variáveis de ambiente e deploy conferido
- [ ] 1.2 — `supabase/config.toml` corrigido para apontar para o projeto de produção
- [x] 1.3 — Valor literal da senha antiga redigido em `schema.sql`/migração/este ADR (24/09/2026)
- [x] 1.4 — Lógica de reset de senha em `schema.sql`/migração corrigida — senha aleatória só na
      criação inicial, nunca mais sobrescrita (24/09/2026)
- [x] 1.5a — `.env.example` corrigido para placeholder genérico (16/09/2026)
- [ ] 1.5b — Confirmado (`git grep`) que `main` não tem menções a IA
- [x] 1.6 — Branch `ajuste-calcjud` apagada do GitHub e do local (23/09/2026; backup local em
      `backup/ajuste-calcjud-antes-delete-20260923`)
- [x] 2.1 — Pessoa responsável por `contaagoijf@gmail.com` avisada
- [x] 2.2 — Senha do admin de bootstrap rotacionada no Supabase via SQL Editor (24/09/2026)
- [ ] 2.3 — Novo acesso confirmado pela pessoa responsável (SQL executado; falta a confirmação de login)
- [ ] 3.1 — Backup de segurança da `main` atual criado
- [ ] 3.2 — Histórico reescrito (`git filter-repo`) removendo senha antiga, `Co-Authored-By: Claude` e
      menções a IA
- [ ] 3.3 — `ajuste-calcjud` reescrita ou apagada do GitHub
- [ ] 3.4 — Force-push com `--force-with-lease` feito
- [ ] 4.1 — Verificação pós-limpeza registrada (Fase 4 completa, sem impacto negativo em produção)
