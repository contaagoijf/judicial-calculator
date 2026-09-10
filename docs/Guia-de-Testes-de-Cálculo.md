# CalcJud

## Guia de Testes de Cálculo

*Ajuste Anual e Retificação de IRPF*

Tribunal Regional Federal da 2ª Região (TRF2)
31/08/2026

## Sumário

- [Objetivo deste documento](#objetivo-deste-documento)
- [1. Planilhas de referência (irpfanual.xlt e ir-recalculo.xlt)](#1-planilhas-de-referência-irpfanualxlt-e-ir-recalculoxlt)
- [2. Indício do contador: o erro pode estar no cálculo ou na base de índices](#2-indício-do-contador-o-erro-pode-estar-no-cálculo-ou-na-base-de-índices)
- [3. Pontos identificados em docs/README.md relevantes para os testes](#3-pontos-identificados-em-docsreadmemd-relevantes-para-os-testes)
- [4. Credenciais do Supabase para rodar localmente](#4-credenciais-do-supabase-para-rodar-localmente)
- [5. Testes unitários (Vitest) — passo a passo](#5-testes-unitários-vitest--passo-a-passo)
- [6. Testes end-to-end (Playwright)](#6-testes-end-to-end-playwright)
- [7. Deploy e acesso à Vercel](#7-deploy-e-acesso-à-vercel)
- [8. Resumo executivo (o que fazer, em ordem)](#8-resumo-executivo-o-que-fazer-em-ordem)

## Objetivo deste documento

Este documento reúne o levantamento feito para apoiar os testes de cálculo do sistema **CalcJud**, nas duas modalidades:

- **Ajuste Anual** — <https://calcjud.vercel.app/calculo/ajuste-anual>
- **Retificação** — <https://calcjud.vercel.app/calculo/retificacao>

Inclui: verificação das planilhas de referência (senha/macros), a hipótese levantada pelo contador (cálculo × base de índices) e como investigá-la, pontos de atenção identificados em `docs/README.md` que afetam a eficiência dos testes, passo a passo para rodar o projeto localmente, passo a passo dos testes automatizados (Vitest e Playwright), e como proceder em relação ao acesso à Vercel.

## 1. Planilhas de referência (irpfanual.xlt e ir-recalculo.xlt)

Os dois arquivos foram baixados para `docs/irpfanual.xlt` e `docs/ir-recalculo.xlt`, junto com `docs/manualir.pdf`.

**Resultado da verificação técnica (inspeção direta da estrutura binária dos arquivos):**

- Os dois arquivos **contêm macros VBA** (existe um projeto `_VBA_PROJECT_CUR` dentro de cada um).
- Mas, mais importante: os dois arquivos têm um registro `FILEPASS` no stream `Workbook`, o que indica que o **conteúdo da planilha está criptografado (RC4) com senha de abertura** — não se trata apenas de proteção de estrutura/macro, e sim de proteção do arquivo inteiro. Na prática, isso significa que **o Excel vai pedir uma senha antes mesmo de exibir qualquer célula**, e não apenas para editar ou ver o código VBA.

**Sobre a senha recebida:**

Essa senha `scasca` foi utilizada para testes diretamente contra os dois arquivos (verificação criptográfica da senha de abertura RC4, sem precisar do Excel) — essa **não é a senha de abertura do arquivo**; a verificação falha nos dois arquivos (`irpfanual.xlt` e `ir-recalculo.xlt`).

Pelo padrão encontrado na estrutura interna do arquivo (um bloco `DPB=`/`CMG=` dentro do projeto VBA, separado do `FILEPASS` do workbook), essa é a senha pedida ao abrir o Editor VBA, Alt+F11, para ver/editar o código-fonte das macros — uma proteção **diferente e independente** da senha que o Excel pede para simplesmente abrir/visualizar a planilha.

Ou seja: **a senha sozinha não é a senha de abertura do arquivo.** Apesar disso, na prática as planilhas já foram abertas com sucesso no Excel (ver seção 1.1) — o bloqueio que restava era a execução das macros, já resolvido. Serve para inspecionar o código VBA por trás dos botões de cálculo da planilha — útil na Frente A da investigação (seção 2.1), caso o objetivo seja comparar a fórmula programada na planilha com a fórmula implementada em `calculoIRPF.ts`.

**O que fazer:**

1. Se aparecer a barra amarela "AVISO DE SEGURANÇA — Macros foram desabilitadas", clique em **Habilitar Conteúdo** (ou, em versões mais antigas, **Opções → Habilitar este conteúdo → OK**).
2. Caso a barra não apareça automaticamente, vá em **Arquivo → Opções → Central de Confiabilidade → Configurações da Central de Confiabilidade → Configurações de Macro** e marque "Habilitar todas as macros" apenas enquanto for usar este arquivo específico (não é recomendado deixar essa opção sempre ativa por padrão, por segurança).
3. Para ver o código VBA das macros (opcional, útil para comparar a fórmula da planilha com o código do CalcJud): pressione **Alt+F11** para abrir o Editor VBA e, se ele pedir senha do projeto, use a senha informada.

### 1.1 Erro "Não é possível executar a macro '...!b_cadastro'" ao clicar em um botão da planilha — RESOLVIDO

**Status:** O procedimento abaixo foi aplicado (opção "Locais Confiáveis", passo 6) e confirmado: as duas planilhas (`irpfanual.xlt` e `ir-recalculo.xlt`) já **abrem e executam as macros normalmente**, com a pasta `\judicial-calculator\docs` cadastrada como local confiável no Excel. Não foi necessário usar a opção "Habilitar todas as macros" (mais abrangente/menos segura). Esse ajuste vale apenas na máquina onde foi feito; se o teste for repetido em outro computador, o mesmo cadastro de local confiável precisa ser refeito lá.

Registro do problema original e do passo a passo aplicado, para referência:

A planilha já havia sido aberta com sucesso no Excel. Ao clicar em um botão (ex.: cadastro), aparecia o erro:

> Não é possível executar a macro "irpfanual2!b_cadastro". Talvez ela não esteja disponível nesta pasta de trabalho ou todas as macros estejam desabilitadas.

Essa é a mensagem padrão do Excel quando os botões da planilha estão programados para chamar uma macro, mas a execução de macros está bloqueada nas configurações de segurança — é diferente do aviso de senha da seção 1; o arquivo já abriu, só falta liberar a execução das macros. Passo a passo para habilitar:

1. **Feche a planilha sem salvar** (para não gravar nenhuma alteração acidental sobre o arquivo original).
2. No Excel, vá em **Arquivo → Opções**.
3. No menu à esquerda, clique em **Central de Confiabilidade** (*Trust Center*).
4. Clique no botão **Configurações da Central de Confiabilidade...** (*Trust Center Settings*).
5. No menu à esquerda dessa nova janela, clique em **Configurações de Macro** (*Macro Settings*).
6. Marque a opção **"Habilitar todas as macros (não recomendado; código potencialmente perigoso pode ser executado)"**.
   - Essa opção libera macros para **todos os arquivos** que você abrir depois, não só este — por isso, o mais seguro é usá-la temporariamente e voltar para a opção padrão ("Desabilitar todas as macros com notificação") depois de terminar os testes.
   - **Alternativa mais segura e recomendada**, em vez do passo 6: na mesma janela da Central de Confiabilidade, vá em **Locais Confiáveis** (*Trusted Locations*) → **Adicionar novo local** → aponte para a pasta onde estão os arquivos (`\judicial-calculator\docs`) → marque "As subpastas deste local também são confiáveis" se quiser → **OK**. Isso libera as macros só para os arquivos dessa pasta, mantendo a proteção padrão para qualquer outro arquivo `.xls`/`.xlt` que você abrir.
7. Clique em **OK** para fechar a Central de Confiabilidade, e **OK** de novo para fechar as Opções do Excel.
8. **Reabra o arquivo** `.xlt` (é preciso fechar e abrir de novo para a nova configuração valer). Se aparecer a barra amarela de aviso, clique em **Habilitar Conteúdo**.

Teste novamente o botão que gerou o erro.

**Se as opções acima estiverem "acinzentadas"/bloqueadas para edição:** normalmente significa que a política de macros está sendo controlada por Política de Grupo (GPO) do TRF2 no seu computador, e você não consegue alterá-la sozinho — nesse caso, é preciso acionar a equipe de TI/suporte para liberar a execução de macros (ou cadastrar a pasta como local confiável) na sua máquina.

**Outra causa possível (menos provável, mas rápida de checar):** se o arquivo foi baixado da internet/intranet, o Windows às vezes marca o arquivo como bloqueado ("Bloqueado" / *Mark of the Web*), o que ativa o Modo de Exibição Protegida e também impede as macros de rodar mesmo com "Habilitar Conteúdo". Para verificar: feche o Excel, clique com o botão direito no arquivo `.xlt` no Explorador de Arquivos → **Propriedades** → na aba **Geral**, se houver uma caixinha "Desbloquear" no rodapé, marque-a → **OK** → abra o arquivo novamente.

## 2. Indício do contador: o erro pode estar no cálculo ou na base de índices

O contador que solicitou os testes informou que a divergência encontrada pode ter **duas origens diferentes**: a fórmula de cálculo em si, ou os dados de índices/taxas usados como entrada dessa fórmula (SELIC, INPC, IPCA, TR, poupança, salário mínimo, faixas de IR). Isso muda a estratégia: não basta conferir se a fórmula está certa — é preciso também conferir se os dados usados por ela estão certos. Para isolar a causa, separo os testes em duas frentes independentes.

### 2.1 Frente A — Validar a lógica de cálculo (fórmulas), sem depender do banco

- Os testes Vitest já existentes fazem exatamente isso: `ir_faixas` e `ir_parametros` são passados como **constantes fixas dentro do próprio teste**, não vêm do banco de produção. Ver seção 5.
- Se o Vitest confirma o resultado esperado para um cenário **sem correção monetária** (`SEM_CORRECAO`), a lógica pura de Ajuste Anual está correta para esse caso — porque nenhum índice de correção/juros está envolvido.
- Para investigar especificamente a **Retificação com correção monetária**, crie um novo teste Vitest informando manualmente (na mão, como constante) as taxas/fatores de um índice e período conhecidos — isso confere a fórmula de correção/juros (`calcularRetificacao`) isoladamente, sem depender do que está cadastrado hoje em `taxas_historicas`.
- As planilhas já estão acessíveis (seção 1.1) — comparar o código VBA das macros (senha do projeto) com `calculoIRPF.ts` é a forma mais direta de conferir se o CalcJud reproduz exatamente a mesma fórmula da planilha oficial.

### 2.2 Frente B — Validar a base de índices (os dados)

- Conferir os valores realmente cadastrados hoje em produção (`indices_economicos`, `taxas_historicas`, `ir_faixas`, `ir_parametros`, `salario_minimo`) contra fontes oficiais:
  - **SELIC** mensal — Banco Central do Brasil (séries históricas do SGS/BACEN).
  - **INPC / IPCA** — IBGE.
  - **TR** — Banco Central do Brasil.
  - **Salário mínimo** — decretos/leis oficiais de cada período.
  - **Faixas de IR** (alíquota e parcela a deduzir, por ano) — tabelas progressivas anuais publicadas pela Receita Federal.
  - **UFIR** (jan/1992 a dez/1995) — série histórica oficial do período.
- Forma rápida de consultar o que está cadastrado hoje em produção, sem precisar do painel do Supabase (usa a mesma chave pública já documentada na seção 4):

  ```bash
  curl "https://xitpsqtcxraejzlxvvmn.supabase.co/rest/v1/taxas_historicas?select=data_referencia,valor_percentual,fator_acumulado,indices_economicos(sigla)&order=data_referencia.desc&limit=20" \
    -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>"
  ```

- O ideal é focar a conferência exatamente nos **meses/anos do caso que o contador identificou como divergente** — comparar linha a linha o que está em `taxas_historicas`/`ir_faixas` com a fonte oficial correspondente àquele período, em vez de tentar validar toda a série histórica de uma vez.

### 2.3 Como cruzar os dois resultados para isolar o erro

| Resultado da Frente A (fórmula) | Resultado da Frente B (dados) | Conclusão |
|---|---|---|
| Bate certinho | Diverge da fonte oficial num índice específico | O problema é na **base de dados** — corrigir/atualizar `taxas_historicas`, `ir_faixas`, `ir_parametros` ou `salario_minimo`, não o código. |
| Diverge, mesmo com dados fixos fornecidos por você | Bate com a fonte oficial | O problema é na **fórmula**, em `src/services/calculoIRPF.ts`. |
| Bate isoladamente nas duas frentes | O resultado na tela do CalcJud ainda diverge | O problema provavelmente está na **integração** entre as duas partes (ex.: mês/ano errado sendo buscado na tabela, arredondamento, ou um dado específico do caso relatado pelo contador que ainda não foi reproduzido nos testes) — peça ao contador os números exatos de entrada do caso divergente para reproduzir ponta a ponta. |

## 3. Pontos identificados em docs/README.md relevantes para os testes

Relação dos pontos do documento de análise que afetam diretamente a eficiência dos testes, com o que foi confirmado/adicionado nesta verificação:

1. A lógica de cálculo é **100% determinística e roda no front-end** (`src/services/calculoIRPF.ts`), sem depender do banco para as fórmulas em si. Isso significa que o caminho mais rápido para validar uma fórmula específica é reproduzir o caso em um teste Vitest (ver seção 5), sem precisar preencher a tela toda repetidamente. Ver também a Frente A da seção 2.1.
2. **Disponibilidade dos módulos em produção** (tabela `system_settings`) — na consulta à base de produção nesta análise, e neste momento, ambos os módulos estão habilitados publicamente:
   - `system_enabled = true`
   - `ajuste_anual_enabled = true`
   - `retificacao_enabled = true`

   Ou seja, hoje não é necessário login de administrador para acessar `/calculo/ajuste-anual` nem `/calculo/retificacao` em produção. Isso pode mudar a qualquer momento (é uma chave editável por um admin na aba **Disponibilidade** de `/parametros`) — se ao testar você encontrar a mensagem "Ferramenta temporariamente indisponível", confirme essa chave ou peça a um administrador para reativá-la.
3. **Cobertura de anos-calendário na base de produção** — também consultei diretamente: `ir_parametros`/`ir_faixas` cobrem os anos-calendário de **1990 a 2025**. Não há parâmetros cadastrados para 2026 em diante; um teste com ano-calendário 2026 vai falhar com erro "Parâmetros não encontrados para o ano 2026" (mensagem esperada, não é bug). Planeje os casos de teste dentro do intervalo 1990–2025.
4. **[Resolvido]** As planilhas `.xlt` chegaram a apresentar bloqueio de macro (ver seção 1.1), mas já estão totalmente acessíveis — abrem e executam normalmente com a pasta `docs` cadastrada como Local Confiável no Excel. Já podem ser usadas como gabarito para conferência cruzada direta dos cálculos.
5. Os "três exemplos numéricos" mencionados em levantamentos anteriores **não foram confirmados** no documento de especificação oficial. Verifiquei diretamente o conteúdo do documento de especificação funcional (baixado do Nextcloud interno e comparado com a cópia local mais antiga): todas as 9–10 tabelas existentes nos dois arquivos são tabelas de fórmulas (com nomes de variável, sem valores em R$ preenchidos); as imagens embutidas são mockups de tela vazios (telas de "Dados do Processo" e "Adicionar Ano", idênticas ao que já está implementado no CalcJud). Não encontrei nenhuma tabela de exemplo numérico com valores reais (o caso "R$ 13.750,00 → R$ 14.268,38" citado em um levantamento anterior não foi localizado em nenhum dos dois arquivos-fonte). **Recomendação:** tratar esse caso numérico como não verificado; não o use como gabarito até localizar sua origem real.
6. **Único gabarito numérico já confirmado e versionado no repositório**: o teste unitário existente em `src/test/example.test.ts` traz um caso completo de Ajuste Anual (ano 2020, declaração completa) com todos os valores de entrada e os resultados esperados já calculados e conferidos (`imposto_a_pagar = 1075`, etc.). É um bom ponto de partida como "caso conhecido correto" para comparar com o que a tela `/calculo/ajuste-anual` devolve para a mesma entrada.
7. **Testes end-to-end (Playwright) não estão funcionais no ambiente atual** (não estava no README) — ver seção 6.2. Isso significa que, por enquanto, os testes na interface real precisam ser feitos manualmente pelo navegador.
8. O arquivo `.env` não é, na prática, obrigatório para rodar a aplicação localmente: a aplicação usa em todas as telas o cliente `src/integrations/supabase/externalClient.ts`, que já tem a URL e a chave do Supabase de produção fixas no código-fonte (não lidas de variável de ambiente). O cliente que lê `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` do `.env` (`src/integrations/supabase/client.ts`) não é importado em nenhuma página ou hook do projeto atualmente. Ainda assim, seguir o passo `cp .env.example .env` não faz mal nenhum (e é o procedimento documentado) — só não é bloqueante caso esse passo seja pulado.

## 4. Credenciais do Supabase para rodar localmente

As credenciais já estão versionadas no próprio repositório — não é preciso pedir a ninguém:

- Em `.env.example`, já preenchido com valores reais (não são placeholders):

  ```
  VITE_SUPABASE_PROJECT_ID="xitpsqtcxraejzlxvvmn"
  VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGci...MdJXkgi6hVWVvg74ndI3iaAvKX-iCYmfdZHBPDm-js0"
  VITE_SUPABASE_URL="https://xitpsqtcxraejzlxvvmn.supabase.co"
  ```

- Os mesmos valores também estão fixos (hardcoded) em `src/integrations/supabase/externalClient.ts`.

Essa chave é a chave pública **anon** do Supabase (protegida por Row Level Security no banco) — não é um segredo de administrador; é normal e esperado que ela apareça no código-fonte do front-end, e é a mesma chave que pode ser usada para consultar a base de índices diretamente (seção 2.2).

**Passo a passo (verificado nesta análise, funcionando):**

```bash
git clone https://github.com/contaagoijf/judicial-calculator
cd judicial-calculator
npm install

cp .env.example .env    # os valores ja vêm preenchidos, não precisa editar nada

npm run dev
```

Resultado confirmado: servidor sobe em `http://localhost:8080`, e as rotas `http://localhost:8080/calculo/ajuste-anual` e `http://localhost:8080/calculo/retificacao` respondem normalmente (HTTP 200).

## 5. Testes unitários (Vitest) — passo a passo

Os testes unitários validam diretamente as fórmulas de `src/services/calculoIRPF.ts`, sem precisar de navegador nem de conexão com o banco — é a ferramenta certa para a Frente A da investigação (seção 2.1).

1. Instale as dependências (se ainda não tiver feito): `npm install`.
2. Rode os testes uma vez:

   ```bash
   npm run test
   ```

   Resultado obtido ao rodar nesta análise:

   ```
   ✓ src/test/example.test.ts (4 tests) 4ms

    Test Files  1 passed (1)
         Tests  4 passed (4)
   ```
3. Para desenvolvimento iterativo (reexecuta ao salvar o arquivo), use o modo observação:

   ```bash
   npm run test:watch
   ```
4. **Para testar um novo cenário de cálculo** (por exemplo, o caso específico que o contador identificou como divergente, ou um caso extraído diretamente da planilha, já acessível — ver seção 1.1): abra `src/test/example.test.ts`, copie um bloco `it(...)` existente, ajuste os valores de `dados`, `faixas` e `parametros` para o seu cenário, rode a aplicação (`calcularAjusteAnual` ou `calcularRetificacao`) e compare o resultado com o valor que você já sabe que está correto (da planilha, da legislação, ou do relato do contador). Isso evita ter que preencher a tela inteira do navegador a cada tentativa.
5. Alternativa sem alterar o repositório: crie um arquivo `.test.ts` novo em `src/test/` (por exemplo `src/test/meus-casos.test.ts`) com os cenários que você mesmo quer validar, sem misturar com o teste original.

## 6. Testes end-to-end (Playwright)

### 6.1 O que o README diz

> **End-to-end** (Playwright): fluxo de navegação/interação na aplicação real, configurado em `playwright.config.ts`.

### 6.2 O que foi encontrado ao tentar executar

- **Não existe nenhum arquivo de teste Playwright no repositório** (nenhum `*.spec.ts` fora de `node_modules`) — a suíte e2e está configurada, mas vazia.
- Ao tentar rodar `npx playwright test --list`, o comando falha imediatamente com:

  ```
  Error: Cannot find package 'lovable-agent-playwright-config' imported from playwright.config.ts
  ```

- Esse pacote (`lovable-agent-playwright-config`, usado em `playwright.config.ts` e `playwright-fixture.ts`) não está listado em `package.json`, não está instalado em `node_modules` e não existe no registro público do npm (retorna 404). É um pacote privado da plataforma Lovable, usado originalmente para desenvolver este projeto — só funciona dentro do ambiente Lovable.

**Conclusão prática:** hoje, `npx playwright test` **não roda de forma nenhuma** neste ambiente, mesmo sem nenhum teste escrito. Para os testes de cálculo pedidos, isso não é um bloqueio (o objetivo é conferir os *valores* calculados, não a navegação), mas vale registrar como um problema de tooling a ser corrigido pela equipe de desenvolvimento — a correção seria trocar, em `playwright.config.ts` e `playwright-fixture.ts`, a importação de `lovable-agent-playwright-config` por uma configuração padrão usando `@playwright/test` (que já está instalado como dependência).

### 6.3 Alternativa enquanto isso não é corrigido

Faça os testes manualmente pelo navegador, acessando diretamente:

- <https://calcjud.vercel.app/calculo/ajuste-anual>
- <https://calcjud.vercel.app/calculo/retificacao>

preenchendo os mesmos dados de entrada usados nos testes unitários/manuais e conferindo o resultado apresentado na tela (e no relatório em PDF gerado) contra o valor esperado.

## 7. Deploy e acesso à Vercel

### 7.1 O que o README diz sobre o deploy

> O deploy de produção é feito na **Vercel**, como site estático gerado por `vite build`, com todas as rotas reescritas para `index.html` (ver `vercel.json`) para suportar o roteamento client-side do `react-router-dom`. As variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (quando aplicável ao cliente gerado) devem estar configuradas no projeto Vercel.

### 7.2 Importante: acesso à Vercel NÃO é necessário para o seu teste

Como o objetivo da sua tarefa é **testar os cálculos já publicados** em <https://calcjud.vercel.app/>, e não alterar/publicar código, você **não precisa de acesso ao painel da Vercel** para isso — o site já está no ar e acessível a qualquer pessoa. Acesso à Vercel só seria necessário se, depois dos testes, alguém for corrigir um cálculo no código (ou uma taxa/índice, se o problema for de dados) e precisar publicar (deploy) a correção.

Reforçando o achado da seção 3.8: mesmo que as variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` não estejam configuradas no projeto Vercel, isso não afeta o funcionamento da aplicação em produção, porque o código que roda de fato usa o cliente com as credenciais fixas (`externalClient.ts`), e não o cliente baseado em variável de ambiente.

### 7.3 Passo a passo para solicitar acesso à Vercel (para quando for necessário publicar uma correção)

1. **Identifique o dono do projeto/time na Vercel.** Não há, no repositório ou nos artefatos disponíveis, um contato explícito do responsável pela conta Vercel. Os candidatos mais prováveis, pela ordem:
   - Quem hoje é *owner* do repositório GitHub `contaagoijf/judicial-calculator` (o deploy provavelmente foi conectado a esse GitHub via integração Vercel + GitHub).
   - A DCAL/contato administrativo já usado para as planilhas (tssedus@jfrj.jus.br), que pode indicar quem administra a infraestrutura do CalcJud.
   - Quem conduz hoje a continuidade do projeto (mencionado no contexto de origem como ligado à Assessoria de Governança/SG e à AGOI).
2. **Peça um convite como membro do time Vercel** informando seu e-mail. Quem for *owner*/*admin* do time deve:
   - Entrar em <https://vercel.com/> → time do projeto → **Settings → Members → Invite Member** → informar o seu e-mail e o papel (para apenas configurar variáveis de ambiente e redeploy, o papel **Member** já é suficiente; **Admin/Owner** só é necessário para gerenciar cobrança e outros membros).
3. **Depois de aceitar o convite**, para configurar as variáveis de ambiente:
4. Acesse <https://vercel.com/dashboard> e abra o projeto do CalcJud.
5. Vá em **Settings → Environment Variables**.
6. Adicione (ou confira, se já existirem):
   - `VITE_SUPABASE_URL` = `https://xitpsqtcxraejzlxvvmn.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (o mesmo valor já presente em `.env.example`)
7. Selecione os ambientes onde a variável deve valer (**Production**, **Preview**, **Development**, conforme o caso).
8. Clique em **Save**.
9. Uma alteração de variável de ambiente só entra em vigor em um **novo deploy** — vá em **Deployments**, abra o último deploy de produção e clique em **Redeploy** (ou apenas faça um novo `git push` para a branch conectada à produção).
10. Alternativa sem acesso ao painel web: quem já tem acesso pode rodar `vercel env add VITE_SUPABASE_URL production` (Vercel CLI) a partir de uma máquina já autenticada (`vercel login`) — útil se preferirem automatizar por linha de comando em vez de convidar um novo membro.

## 8. Resumo executivo (o que fazer, em ordem)

1. **[Concluído]** Já é possível abrir as planilhas `irpfanual.xlt` e `ir-recalculo.xlt` com as macros habilitadas, visto que a pasta `docs` foi cadastrada como Local Confiável no Excel (ver seção 1.1). Já é possível usá-las como gabarito e comparar o código VBA (senha `scasca`) com `calculoIRPF.ts`.
2. Reproduzir o caso relatado pelo contador (mesmos dados de entrada) para ter um cenário concreto de divergência — sem isso, a investigação fica genérica.
3. Rodar a **Frente A** (seção 2.1): testar a fórmula isoladamente via Vitest, com dados fixos (sem depender do banco), para descartar (ou confirmar) erro na fórmula.
4. Rodar a **Frente B** (seção 2.2): comparar os índices/taxas cadastrados em produção com as fontes oficiais (BACEN, IBGE, Receita Federal), focando no período do caso divergente, para descartar (ou confirmar) erro na base de dados.
5. Cruzar os dois resultados usando a tabela da seção 2.3 para concluir onde está o erro.
6. Paralelamente, rodar `npm install` (feito) → `cp .env.example .env` (não precisa editar) → `npm run dev` para ter uma cópia local, se quiser comparar local vs. produção.
7. Testar manualmente pelo navegador em <https://calcjud.vercel.app/calculo/ajuste-anual> e <https://calcjud.vercel.app/calculo/retificacao> (hoje ambos liberados publicamente), documentando entrada e saída de cada caso.
8. Ao final, reportar à equipe de desenvolvimento:
   - A conclusão sobre a origem do erro (fórmula, dados, ou ambos);
   - Ausência de testes Playwright funcionais, para correção do `playwright.config.ts`;
   - Qualquer divergência de cálculo encontrada, com o caso de entrada completo para reprodução.
