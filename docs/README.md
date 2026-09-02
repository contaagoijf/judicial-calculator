# CALCJUD — Ferramenta de Cálculos Judiciais de IRPF

## Sumário

1. [Contexto e origem do projeto](#contexto-e-origem-do-projeto)
2. [Objetivo](#objetivo)
3. [Como utilizar](#como-utilizar)
4. [Detalhes Técnicos](#detalhes-técnicos)
5. [Regras de versionamento (Git)](#regras-de-versionamento-git)
6. [Referências e materiais relacionados](#referências-e-materiais-relacionados)
7. [Acesso ao Sistema](#acesso-ao-sistema)

## Contexto e origem do projeto

O CALCJUD nasceu como iniciativa para **unificar duas planilhas Excel** mantidas pela **DCAL (Divisão de Cálculos)** do TRF2/JFRJ, hoje distribuídas pela intranet e usadas manualmente pelas contadorias:

- **Planilha de Cálculo de Ajuste Anual de IRPF** (arquivo `irpfanual.xlt`, acompanhado do manual `manualir.pdf`) — calcula o ajuste anual do Imposto de Renda Pessoa Física de um único ano, com acréscimo/decréscimo de valores não tributáveis.
- **Planilha de Cálculo de Declaração Anual do Imposto de Renda** (arquivo `ir-recalculo.xlt`, seção "Soluções para Contadorias") — recalcula uma declaração de IRPF já entregue, aplicando alterações (acréscimos e decréscimos) aos valores originais de qualquer rubrica, para múltiplos anos.

Ambas as planilhas são mantidas pela DCAL, foram atualizadas pela última vez em 22/08/2024 e estão protegidas por senha (a estrutura de fórmulas não pôde ser aberta para conferência direta); dúvidas sobre elas podem ser encaminhadas ao contato administrativo da intranet, **tssedus@jfrj.jus.br**.

O cálculo realizado não é uma declaração de IR "avulsa": é o **cálculo judicial de diferenças de Imposto de Renda dentro de um processo em trâmite** (por exemplo, discussão sobre a incidência de IR sobre determinados rendimentos), incluindo a apuração de correção monetária e juros de mora sobre a diferença, respeitando o teto de 60 salários mínimos dos Juizados Especiais/RPV, para juntada da memória de cálculo ao processo.

Um primeiro projeto de migração dessas planilhas para uma ferramenta única foi iniciado em parceria com a Assessoria de Governança da SG, mas foi interrompido com o desligamento da estagiária de TI responsável pelo desenvolvimento. O **CALCJUD** (este repositório) é a versão da ferramenta resultante desse esforço — já implementa, em [src/services/calculoIRPF.ts](../src/services/calculoIRPF.ts), a sequência de cálculo em 8 partes descrita na especificação funcional levantada naquele projeto (dados do processo → recálculo ano a ano → separação de diferenças antes/depois da distribuição → aplicação do teto do RPV → atualização até a data final → totais de principal e juros).

## Objetivo

Oferecer uma ferramenta web única, substituindo as duas planilhas manuais, para:

- **Ajuste Anual**: recalcular o imposto devido de um único ano-calendário a partir dos dados originais da declaração e de alterações (acréscimos/decréscimos) em rendimentos, deduções, incentivos e RRA (Rendimentos Recebidos Acumuladamente), apurando o imposto a pagar ou a restituir.
- **Retificação**: calcular, para um processo judicial com um ou mais anos-calendário, os valores devidos com correção monetária e juros até a data de distribuição e/ou até uma data final, aplicando o teto do RPV/Juizados Especiais (60 salários mínimos) e produzindo o resumo de principal devido, juros devidos e total de execução.
- **Consulta**: permitir a qualquer pessoa (parte, advogado, servidor) verificar a autenticidade de um cálculo já realizado a partir do seu ID único.
- **Transparência dos parâmetros**: expor publicamente as tabelas fiscais (faixas de IR, teto do simplificado, salário mínimo histórico, índices econômicos) usadas nos cálculos.
- **Relatório para juntada**: gerar a memória de cálculo completa em PDF, pronta para ser anexada ao processo.
- **Administração**: permitir que usuários administradores mantenham as tabelas auxiliares atualizadas e controlem a disponibilidade pública do sistema, sem depender de alteração de código.

O uso de cálculo em si (Ajuste Anual, Retificação e Consulta) é **público e não exige login**. O login administrativo é necessário apenas para alterar parâmetros, tabelas auxiliares e configurações do sistema.

## Como utilizar

### Página inicial

Apresenta três atalhos — **Ajuste Anual**, **Retificação** e **Buscar por ID** — cada um podendo estar habilitado ou desabilitado conforme a configuração de disponibilidade definida pelos administradores (ver [Disponibilidade](#administração-do-sistema) abaixo). Também há um atalho para **Visualizar parâmetros** e o botão de **Login admin**.

### Ajuste Anual (`/calculo/ajuste-anual`)

1. Informe o ano-calendário e o tipo de declaração (completa ou simplificada).
2. Preencha os dados originais da declaração: rendimentos tributáveis, deduções legais, deduções de incentivo (apenas na declaração completa), imposto sobre RRA, imposto pago/retido e o valor do ajuste anual já apurado na declaração original.
3. Informe as alterações a aplicar (valores a somar/subtrair de rendimentos, deduções, incentivo e RRA).
4. O sistema valida a consistência dos dados informados (o ajuste anual informado deve bater com o que a fórmula calcula a partir dos dados originais) e apresenta o resultado recalculado, com o imposto devido e o valor a pagar/restituir.

### Retificação (`/calculo/retificacao`)

1. Informe os **dados do processo**: número do processo, nome do autor e data do ajuizamento.
2. Escolha o **tipo de correção monetária**: SELIC, SELIC até 06/2009 seguida de rentabilidade da poupança, ou sem correção; informe também o percentual de honorários.
3. Quando há correção, defina se o total deve ser **limitado na data do ajuizamento** ("Limita total na data do ajuizamento") e até quando o cálculo deve ser atualizado ("Atualiza cálculo até").
4. Clique em **Adicionar ano** para incluir cada ano-calendário envolvido: preencha os dados originais da declaração daquele ano e, se necessário, uma ou mais **alterações** (cada uma com data, número de folha opcional, valores a somar/subtrair por rubrica e motivo/observação) — repita para quantos anos forem necessários.
5. Clique em **Simular Retificação** para calcular o resultado consolidado: diferenças por ano, separação entre valores "até a distribuição" e "depois da distribuição", aplicação do teto do RPV quando cabível, e os totais finais de principal devido, juros devidos e total de execução.

### Resultado e Relatório

Após simular um cálculo (Ajuste Anual ou Retificação), o sistema exibe uma tela de **Resultado** com o detalhamento da memória de cálculo. A partir dali é possível gerar o **Relatório** (`/relatorio/:id`, após persistido no banco) com a memória de cálculo completa e exportá-lo/baixá-lo em **PDF** — pronto para juntada ao processo — via [src/services/pdfGenerator.ts](../src/services/pdfGenerator.ts).

### Buscar por ID (`/consulta`)

Informe o ID (UUID) de um cálculo já realizado para abrir diretamente o respectivo relatório e conferir sua autenticidade e integridade.

### Parâmetros (`/parametros`)

Página com três abas:

- **Tabelas** — consulta pública (leitura) de qualquer uma das tabelas auxiliares usadas nos cálculos (parâmetros de IR, faixas de IR, salário mínimo, índices econômicos, taxas históricas, templates de cálculo e regras de sub-período). Em sessão administrativa, a tabela selecionada também pode ser criada, editada ou excluída.
- **Acesso admin** — (visível para qualquer visitante, mas só operável logado) permite a um administrador convidar novos administradores por e-mail e visualizar a lista de administradores ativos e de convites pendentes.
- **Disponibilidade** — permite a um administrador ligar/desligar o sistema inteiro ou, individualmente, os módulos de Ajuste Anual e Retificação para o público.

### Administração do sistema

Consulte a seção [Acesso ao Sistema](#acesso-ao-sistema) para o passo a passo de login administrativo, primeiro acesso e convite de novos administradores.

## Detalhes Técnicos

### Linguagens e principais tecnologias

- **Linguagem principal**: TypeScript (React com JSX/TSX) no front-end.
- **SQL / PL/pgSQL**: funções, triggers e políticas de segurança do banco de dados ([supabase/schema.sql](../supabase/schema.sql)).
- **Framework de UI**: React 18, com roteamento via `react-router-dom` (rotas em [src/App.tsx](../src/App.tsx), com *code splitting* por página via `React.lazy`).
- **Build / dev server**: Vite 5, com plugin `@vitejs/plugin-react-swc`. Configuração em [vite.config.ts](../vite.config.ts).
- **Estilização**: Tailwind CSS, com biblioteca de componentes shadcn/ui (baseada em Radix UI) em [src/components/ui/](../src/components/ui/).
- **Gerenciamento de estado assíncrono/cache**: TanStack Query (`@tanstack/react-query`), usado nos hooks de acesso a dados como [src/hooks/useIRData.ts](../src/hooks/useIRData.ts), [src/hooks/useRetificacaoContexto.ts](../src/hooks/useRetificacaoContexto.ts) e [src/hooks/useSystemSettings.ts](../src/hooks/useSystemSettings.ts).
- **Formulários e validação de esquema**: `react-hook-form` e `zod`.
- **Geração de PDF**: `jspdf` e `jspdf-autotable` ([src/services/pdfGenerator.ts](../src/services/pdfGenerator.ts)).
- **Gráficos** (quando aplicável na UI): `recharts`.
- **Testes**: Vitest para testes unitários ([src/test/](../src/test/)) e Playwright para testes end-to-end ([playwright.config.ts](../playwright.config.ts), [playwright-fixture.ts](../playwright-fixture.ts)).
- **Lint**: ESLint com `typescript-eslint`.
- **Gerenciador de pacotes**: Bun (arquivos `bun.lock`/`bun.lockb`); `npm` também funciona via `package-lock.json`.
- **Hospedagem/deploy**: Vercel, como aplicação estática *single-page* (rewrite de todas as rotas para `index.html`, ver [vercel.json](../vercel.json)).

### Arquitetura da aplicação

A aplicação é uma **SPA (Single Page Application)** sem backend próprio: todo o build é estático (gerado pelo Vite) e toda persistência/autenticação é feita diretamente do navegador para o **Supabase**, via SDK `@supabase/supabase-js`.

Existem dois clientes Supabase no código:

- [src/integrations/supabase/client.ts](../src/integrations/supabase/client.ts) — cliente "gerado" a partir de variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), usado como referência/base para outros ambientes Supabase.
- [src/integrations/supabase/externalClient.ts](../src/integrations/supabase/externalClient.ts) — aponta diretamente para o projeto Supabase de produção do CALCJUD e é o cliente efetivamente utilizado pela aplicação (autenticação, tabelas auxiliares, cálculos, configurações do sistema).

A **lógica de negócio do cálculo do IRPF é 100% front-end**, implementada de forma determinística em [src/services/calculoIRPF.ts](../src/services/calculoIRPF.ts):

- `calcularAjusteAnual` — cálculo de um único ano (usado tanto pela tela de Ajuste Anual quanto como base de cada ano dentro da Retificação).
- `calcularRetificacao` — orquestra as 8 partes do cálculo multi-ano (dados do processo, recálculo por ano, classificação "até/depois da distribuição", aplicação do teto do RPV, atualização até a data final, totais de principal e juros), consumindo as tabelas auxiliares carregadas do Supabase (faixas de IR, parâmetros por ano, salário mínimo, índices econômicos, taxas históricas, templates e regras de sub-período) por meio de [src/hooks/useRetificacaoContexto.ts](../src/hooks/useRetificacaoContexto.ts).

O banco de dados, portanto, funciona apenas como fonte dos **parâmetros e séries históricas de entrada** e como repositório dos **cálculos já realizados** — nenhuma fórmula fica armazenada ou executada no banco (à exceção do recálculo automático de fatores acumulados de correção/juros em `taxas_historicas`, feito via trigger).

### Estrutura de pastas (resumo)

```
src/
  components/        Componentes de UI reutilizáveis (formulários, tabelas, diálogos) e shadcn/ui em components/ui/
  contexts/           AuthContext.tsx — sessão, papel de admin, login/logout/primeiro acesso
  hooks/               useIRData, useRetificacaoContexto, useSystemSettings — acesso a dados via TanStack Query
  integrations/supabase/  Clientes Supabase e tipos gerados do banco
  lib/                 adminTables.ts — configuração declarativa das tabelas editáveis no painel admin
  pages/               Uma página por rota (Index, AjusteAnual, Retificacao, Resultado, ResultadoRetificacao, Relatorio, Consulta, Parametros, NotFound)
  services/            calculoIRPF.ts (regras de cálculo) e pdfGenerator.ts (geração do relatório em PDF)
  test/                 Testes unitários (Vitest)
supabase/
  schema.sql           Script idempotente com todo o esquema, funções, triggers e políticas de RLS
  migrations/           Migrações incrementais aplicadas ao projeto Supabase
  seed*.sql             Dados iniciais (índices econômicos e templates/regras de cálculo)
```

### Banco de dados

- **SGBD**: PostgreSQL, hospedado e gerenciado pelo **Supabase**, que também fornece autenticação (Supabase Auth), API REST/RPC automática (PostgREST) e Row Level Security (RLS).
- **Definição do esquema**: consolidada em [supabase/schema.sql](../supabase/schema.sql) (script idempotente, pode ser reaplicado com segurança) e versionada de forma incremental em [supabase/migrations/](../supabase/migrations/).

**Principais tabelas:**

| Tabela | Finalidade |
|---|---|
| `ir_parametros` | Parâmetros gerais de IR por ano-calendário: teto do desconto simplificado e data de início de correção do ano. |
| `ir_faixas` | Faixas progressivas de alíquota e parcela a deduzir, por ano-calendário. |
| `calculos` | Histórico de cálculos realizados (tipo — ajuste anual ou retificação —, ano, processo, autor, dados de entrada e resultado em JSONB); é a tabela usada na Consulta pública por ID. |
| `salario_minimo` | Série histórica de salário mínimo por data de referência, usada para apurar o teto do RPV (60 salários mínimos). |
| `indices_economicos` | Cadastro de índices de correção monetária e de juros. Na base de produção estão cadastrados 7 índices: `SELIC`, `POUPANCA` e `PERCENTUAL` (natureza `JUROS`) e `INPC`, `IPCA`, `UFIR` e `TR` (natureza `CORRECAO`). |
| `taxas_historicas` | Série mensal de percentuais por índice, com fator multiplicador e fator acumulado recalculados automaticamente (trigger `handle_taxas_historicas_write` / função `recalculate_taxas_historicas`) sempre que uma taxa é inserida, alterada ou removida. |
| `templates_calculo` | Templates de cálculo correspondentes aos tipos de correção disponíveis na Retificação: **Template_1** — juros simples de 1% até 12/1995 e, depois, SELIC; correção por INPC/IPCA/UFIR até 12/1995 e, depois, sem correção; **Template_2** — juros simples de 1% até 12/1995, SELIC de 01/1996 a 06/2009 e, depois, rendimento da poupança; correção por INPC/IPCA/UFIR até 12/1995, sem correção de 01/1996 a 06/2009 e, depois, pela TR; **Template_3** — sem correção/juros. |
| `regras_subperiodo` | Regras de correção/juros vigentes por sub-período dentro de cada template (qual índice de correção e de juros usar em cada intervalo de datas); a base de produção mantém 11 regras cadastradas entre os 3 templates. |
| `admin_invites` | Convites pendentes/aceitos de novos administradores, por e-mail. |
| `admin_users` | Usuários com privilégio de administrador (vinculados a `auth.users` do Supabase Auth). |
| `system_settings` | Chave única (linha singleton) com as chaves de disponibilidade pública: sistema inteiro, Ajuste Anual e Retificação. |

**Segurança dos dados:**

- Row Level Security (RLS) habilitada em todas as tabelas de negócio.
- Leitura pública (`SELECT`) liberada para as tabelas fiscais/paramétricas e para `calculos` e `system_settings`.
- Escrita (`INSERT`/`UPDATE`/`DELETE`) restrita a usuários administradores, verificados pela função `public.is_admin()` (`SECURITY DEFINER`, consulta a tabela `admin_users` a partir de `auth.uid()`).
- A promoção a administrador é automática: ao ser criado um usuário no Supabase Auth cujo e-mail conste em `admin_invites` como convite pendente, um trigger (`handle_auth_user_admin_sync` / `grant_admin_by_email`) grava a linha correspondente em `admin_users` e marca o convite como aceito.

**Volume de dados de referência** (base de produção, para dimensionamento): `ir_parametros` cobre os anos-calendário de 1990 a 2025 (36 registros); `ir_faixas` tem 145 faixas cadastradas para esse mesmo intervalo; `salario_minimo` tem 325 registros mensais, de 01/2000 a 01/2027; e `taxas_historicas` tem cerca de 1.147 registros mensais por índice, cobrindo 03/1991 a 04/2026.

### Acesso, manuseio e manutenção do banco de dados (Supabase Dashboard)

O banco de dados do CALCJUD é um projeto Supabase (PostgreSQL gerenciado). O acesso operacional (fora da aplicação) é feito pelo painel web do Supabase, não pelo código:

1. **Acessar o painel**: entre em <https://supabase.com/dashboard/organizations> e faça login com uma conta (e-mail/senha, GitHub ou Google) que já tenha sido convidada como membro da organização/projeto do CALCJUD.
   - Se o login não mostrar nenhuma organização, significa que a conta ainda não foi convidada — peça a quem hoje é *owner* do projeto (ver contato indicado na especificação original, seção [Referências](#referências-e-materiais-relacionados)) para adicioná-la em **Project Settings → Team**.
2. **Selecionar o projeto**: após entrar na organização, abra o projeto cujo *Project Ref* é **`xitpsqtcxraejzlxvvmn`** (mesmo valor de `VITE_SUPABASE_PROJECT_ID` em [.env.example](../.env.example) e da URL `https://xitpsqtcxraejzlxvvmn.supabase.co` usada em [externalClient.ts](../src/integrations/supabase/externalClient.ts)) — ou acesse diretamente `https://supabase.com/dashboard/project/xitpsqtcxraejzlxvvmn`.
3. **Áreas do painel mais usadas para manuseio e manutenção**:
   - **Table Editor**: navegar, filtrar e editar linhas de qualquer tabela (`ir_parametros`, `ir_faixas`, `calculos`, `salario_minimo`, `indices_economicos`, `taxas_historicas`, `templates_calculo`, `regras_subperiodo`, `admin_invites`, `admin_users`, `system_settings`) de forma visual — equivalente ao que a aba **Tabelas** de `/parametros` oferece a um administrador logado na aplicação, mas com acesso direto (ignora RLS, pois usa a *service role* do painel).
   - **SQL Editor**: executar manualmente [supabase/schema.sql](../supabase/schema.sql) (reaplicar o esquema completo — é idempotente), as migrações de [supabase/migrations/](../supabase/migrations/) ou os `seed*.sql` ([seed.sql](../supabase/seed.sql), [seed_indices.sql](../supabase/seed_indices.sql), [seed_templates_regras.sql](../supabase/seed_templates_regras.sql)), além de consultas avulsas de conferência/manutenção.
   - **Authentication → Users**: listar, criar, desativar ou redefinir a senha de contas de login (inclusive a conta administrativa inicial criada pelo bootstrap em `schema.sql` — ver alerta de segurança abaixo).
   - **Database → Tables / Policies**: conferir visualmente a estrutura das tabelas e as políticas de RLS que estão de fato aplicadas no projeto, para comparação com o que está versionado em `schema.sql`.
   - **Database → Backups**: pontos de restauração automáticos (e, conforme o plano contratado, *point-in-time recovery*) e opção de disparar um backup manual antes de qualquer manutenção mais arriscada.
   - **Project Settings → API**: obter a `Project URL` e as chaves `anon`/`public` (usada pela aplicação) e `service_role` (uso administrativo apenas — **nunca** deve ser exposta no front-end ou commitada no repositório).
   - **Project Settings → Database**: *connection string* para acesso direto via `psql` ou outra ferramenta de cliente PostgreSQL, quando o painel web não for suficiente.
   - **Logs / Advisors**: acompanhar erros de API/consulta e alertas automáticos de segurança e performance do próprio Supabase.
4. **Boa prática de manutenção recomendada**: tratar [supabase/schema.sql](../supabase/schema.sql) e [supabase/migrations/](../supabase/migrations/) como a fonte da verdade do esquema. Alterações estruturais (novas colunas, tabelas, políticas, funções) devem ser feitas primeiro nesses arquivos versionados e depois aplicadas ao projeto (via SQL Editor ou pela [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase db push`), em vez de alterar o esquema apenas pelo painel — isso evita que o banco em produção fique divergente do que está no repositório.
5. **Ação de segurança pendente**: como citado na observação abaixo, o script de bootstrap em `schema.sql` cria/atualiza uma conta administrativa com senha em texto claro no próprio script. Assim que possível, um administrador deve trocar essa senha por **Authentication → Users** no painel (ou pedindo redefinição de senha na tela de login admin da aplicação) e avaliar remover o trecho do histórico do repositório.

### Testes

- **Unitários** (Vitest): validam principalmente as regras de cálculo determinísticas de [src/services/calculoIRPF.ts](../src/services/calculoIRPF.ts). Rodar com `bun run test` (ou `npm run test`); `test:watch` para modo interativo.
- **End-to-end** (Playwright): fluxo de navegação/interação na aplicação real, configurado em [playwright.config.ts](../playwright.config.ts).

### Executando o projeto localmente

Pré-requisitos: Node.js 18+ e, preferencialmente, [Bun](https://bun.sh) instalado (`npm` também funciona).

```bash
git clone https://github.com/contaagoijf/judicial-calculator
cd judicial-calculator
bun install              # ou: npm install

cp .env.example .env      # preencha com as credenciais do projeto Supabase
bun run dev               # ou: npm run dev
```

O servidor de desenvolvimento sobe em `http://localhost:8080` (porta definida em [vite.config.ts](../vite.config.ts)).

**Scripts disponíveis** (ver [package.json](../package.json)):

| Script | Descrição |
|---|---|
| `dev` | Inicia o servidor de desenvolvimento (Vite). |
| `build` | Gera o build de produção. |
| `build:dev` | Gera o build em modo desenvolvimento (sem otimizações). |
| `preview` | Serve o build de produção localmente para conferência. |
| `lint` | Executa o ESLint. |
| `test` | Executa os testes unitários (Vitest) uma vez. |
| `test:watch` | Executa os testes unitários em modo observação. |

### Deploy

O deploy de produção é feito na **Vercel**, como site estático gerado por `vite build`, com todas as rotas reescritas para `index.html` (ver [vercel.json](../vercel.json)) para suportar o roteamento client-side do `react-router-dom`. As variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (quando aplicável ao cliente gerado) devem estar configuradas no projeto Vercel.

## Regras de versionamento (Git)

- **Não versionar arquivos `.docx` e `.pdf`.** Documentos Word e PDF (relatórios, atas de reunião, resumos, manuais, planilhas de referência exportadas etc.) gerados durante o trabalho no repositório **não devem ser enviados ao GitHub** — nem em `docs/`, nem em qualquer outra pasta do projeto.
- Essa regra já está aplicada em [.gitignore](../.gitignore) (`*.docx` e `*.pdf`), então esses arquivos ficam automaticamente fora de qualquer `git add`/`git commit` feito normalmente.
- Ao gerar um documento `.docx`/`.pdf` como entregável de uma tarefa, mantenha-o apenas localmente (ou em `C:\temp\...`/outra pasta fora do repositório); se for necessário um registro versionado do mesmo conteúdo, gere a versão equivalente em **Markdown (`.md`)** e versiona-se essa, não o binário.
- Antes de um `git add` amplo (`git add .`/`git add -A`), confira com `git status` se nenhum `.docx`/`.pdf` aparece para ser adicionado — caso apareça, é sinal de que o arquivo foi criado antes da regra do `.gitignore` existir, ou que o `.gitignore` precisa ser ajustado.

## Referências e materiais relacionados

- **Sistema em produção**: <https://calcjud.vercel.app/>
- **Repositório de código**: <https://github.com/contaagoijf/judicial-calculator>
- **Planilha de Cálculo de Ajuste Anual de IRPF** (DCAL, intranet JFRJ — acessível apenas a partir da rede interna do TRF2/JFRJ): <https://intranet.jfrj.jus.br/unidade/dcal/planilhas-para-calculo-simples-projef-web/planilha-de-calculo-de-ajuste-anual-de> — arquivo `irpfanual.xlt`, protegido por senha, com o manual `manualir.pdf`; atualizado em 22/08/2024.
- **Planilha de Cálculo de Declaração Anual do Imposto de Renda** (DCAL, intranet JFRJ — acessível apenas a partir da rede interna do TRF2/JFRJ): <https://intranet.jfrj.jus.br/unidade/dcal/solucoes-para-contadorias/planilha-de-calculo-de-declaracao-anual-do-imposto-de-renda> — arquivo `ir-recalculo.xlt`, protegido por senha; atualizado em 22/08/2024.
- **Conteúdo de referência das tabelas do banco de dados** (Nextcloud interno — acessível apenas a partir da rede interna do TRF2/JFRJ): <https://nuvem.trf2.jus.br/s/7P2xp6QLsWNf65q> — planilha `bd calcjud.xlsx`, um export de referência das tabelas `ir_faixas`, `ir_parametros`, `salario_minimo`, `indices_economicos`, `taxas_historicas`, `templates_calculo` e `regras_subperiodo`; foi conferida e é consistente com o [esquema do banco](../supabase/schema.sql) e com o conteúdo hoje semeado pelos scripts `seed*.sql` do repositório — útil como referência/backup para conferência dos dados cadastrados.
- **Documento de especificação funcional do projeto original** (Nextcloud interno — acessível apenas a partir da rede interna do TRF2/JFRJ): <https://nuvem.trf2.jus.br/s/xNMMC9ZrcRi3sXZ> — arquivo `retificação irpf-anual (varios anos).docx`; foi conferido e confirma o conteúdo já refletido nas seções deste documento (dados de entrada, cálculo em 8 partes, dados de saída, mockups de tela), sem detalhes adicionais além dos já incorporados.
- **Contato administrativo da DCAL** (planilhas na intranet JFRJ): tssedus@jfrj.jus.br

> **Observação de segurança**: as credenciais do Supabase (URL e chave pública/anon) usadas pela aplicação não concedem privilégios administrativos por si só — o acesso de administrador é controlado pela tabela `admin_users` e pelas políticas de RLS descritas acima. Foi identificado que o script [supabase/schema.sql](../supabase/schema.sql) contém, em texto claro, e-mail e senha de um administrador inicial usado no processo de bootstrap do banco; recomenda-se rotacionar essa senha e, se possível, remover o segredo do histórico do repositório.

## Acesso ao Sistema

O CALCJUD é uma aplicação web publicada como site estático e acessada por navegador — não requer instalação de cliente.

### Acesso público (uso comum)

1. Abra a URL de produção do sistema: **<https://calcjud.vercel.app/>**.
2. Nenhum login é necessário para realizar cálculos de Ajuste Anual, Retificação, consultar um cálculo por ID ou visualizar os parâmetros fiscais — desde que o respectivo módulo esteja habilitado pela administração (ver [Disponibilidade](#administração-do-sistema)).

### Acesso administrativo

1. Na página inicial (ou na página **Parâmetros**), clique em **Login admin**.
2. Na aba **Entrar**, informe e-mail e senha de uma conta já cadastrada como administradora.
3. Caso seja seu primeiro acesso após ter sido convidado por outro administrador (convite feito na aba **Acesso admin** da página Parâmetros), use a aba **Primeiro acesso**: informe o e-mail convidado e crie uma senha — a conta é ativada automaticamente caso exista um convite pendente para aquele e-mail.
4. Após autenticado, é possível trocar a própria senha na mesma janela de acesso administrativo.
5. Com a sessão administrativa ativa, ficam disponíveis:
   - Edição das tabelas auxiliares na página **Parâmetros** (aba **Tabelas**).
   - Convite de novos administradores e visualização de administradores/convites pendentes (aba **Acesso admin**).
   - Controle de disponibilidade pública do sistema e de cada módulo de cálculo (aba **Disponibilidade**).

### Acesso ao ambiente de desenvolvimento local

Para rodar uma cópia local do sistema (por exemplo, para desenvolvimento ou testes), siga as instruções em [Executando o projeto localmente](#executando-o-projeto-localmente), configurando o arquivo `.env` com as credenciais do projeto Supabase a ser utilizado.
