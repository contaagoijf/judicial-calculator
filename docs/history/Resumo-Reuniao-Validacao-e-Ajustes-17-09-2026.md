# Resumo da reunião de Validação e Ajustes — 17/09/2026

Reunião realizada coma a contadoria (DCAL/AGOI), 
[`docs/contadoria/26.Honorários.docx`](../contadoria/26.Honorários.docx) (prints
enviados pelo contador da aba "Honorários Advocatícios" do
[Projef Web](https://www.jfrs.jus.br/projefweb/), usado como referência).

## 1. Correções já validadas pelo contador (nenhuma ação pendente)

- **Mês final fixo (1,00 p.p.) no juros Selic da Retificação** — testado ao
  vivo pelo contador com um caso próprio antes da reunião e confirmado batendo
  (arquivo 27, 00:00:00–00:02:46: *"Tá batendo direitinho... foi feita a
  correção daquele 1%... mas agora bateu direitinho"*). Corresponde à correção
  do [ADR 011](../adr/011-corrigir-mes-final-fixo-do-juros-selic-na-retificacao.md),
  já publicada em produção.
- **Botão de colar no número do processo** — já implementado (CHANGELOG
  15/09/2026); mencionado no arquivo 27 (00:06:46–00:07:02) como funcionando.

## 2. Correção validada na reunião: base de cálculo dos Honorários Advocatícios

**Implementado em 17/09/2026** (`ResultadoRetificacao.tsx`, `Relatorio.tsx`, `pdfGenerator.ts`
passaram a usar `r.total_execucao`). `tsc`, `npm run test` e `npm run build` sem erros.
Pendente: conferência visual em navegador e validação com um caso real da contadoria.

### O problema (arquivo 27, 00:22:52–00:26:10 e 00:32:40–00:33:10)

O percentual de honorários está sendo calculado só sobre o "Principal
Devido", mas deveria ser sobre "Principal Devido + Juros Devidos" (o total da
execução) — o contador reproduziu isso ao vivo, mostrando o total da execução
em R$ 307 mil (R$ 126 mil de principal + R$ 181 mil de juros) e o sistema
aplicando o percentual só sobre os R$ 126 mil:

> *"O honorário não está incluído... o honorário está incluído só sobre o
> principal devido, não está incluído os juros, tem que somar esses dois pra
> ser base dos honorários."* (00:26:14–00:26:22, aproximado)

Ele relatou o mesmo defeito numa versão feita por outra pessoa no Projef Web:
*"ela botou os honorários com uma regra que só pega o principal, não pegava o
principal conjunto"* (~00:46:53–00:47:20).

### Causa raiz confirmada no código

Três lugares calculam `honorariosValue`/`honorariosTotal` somando
`p.valor_devido` (só o principal) em vez de usar o total já pronto
`r.total_execucao` (= `principal_devido + juros_devido`, calculado em
`calculoIRPF.ts:685`):

- [`src/pages/ResultadoRetificacao.tsx:92-94`](../../src/pages/ResultadoRetificacao.tsx)
- [`src/pages/Relatorio.tsx:79-81`](../../src/pages/Relatorio.tsx)
- [`src/services/pdfGenerator.ts:179-181`](../../src/services/pdfGenerator.ts)

### Passo a passo para implementar

1. Em cada um dos três arquivos acima, trocar
   `(r.periodos ?? []).reduce((sum, p) => sum + p.valor_devido, 0)` por
   `r.total_execucao` (o campo já existe no retorno de `calcularRetificacao()`
   — não precisa de nenhum cálculo novo).
2. Conferir que `r.total_execucao` está disponível em todos os pontos onde
   `honorariosValue`/`honorariosTotal` é calculado (já está, é campo de
   `ResultadoRetificacao`).
3. Reproduzir o caso do contador (total da execução ≈ R$ 307 mil, principal
   ≈ R$ 126 mil, juros ≈ R$ 181 mil, honorários 10%) e confirmar que o valor
   de honorários passa a ser 10% de R$ 307 mil, não de R$ 126 mil.
4. Rodar `npx tsc --noEmit`, `npm run test -- --run` e conferir visualmente a
   tela de Resultado da Retificação e o PDF exportado.

## 3. Ajuste solicitado: novo critério de cálculo de honorários (art. 85, §3º do CPC)

**Implementado em 17/09/2026** — `calcularBaseHonorarios()` e
`calcularHonorariosEscalonados()` em `calculoIRPF.ts`, campos novos em
`DadosEntradaRetificacao`, seletor "Base de cálculo", checkbox "Escalonar
honorários" e tabela de faixas editável em `Retificacao.tsx`, exibição
atualizada em `ResultadoRetificacao.tsx`, `Relatorio.tsx` e `pdfGenerator.ts`.
A lógica progressiva foi conferida isoladamente (Node) contra valores
calculados manualmente e bate exatamente. `tsc`, `npm run test` e
`npm run build` sem erros.

**Validado em 17/09/2026 com um caso real enviado pelo contador**
(`docs/contadoria/29.Apuração de honorários.pdf` e
`30.Modo_de_Calculo_Valor_da_Condenação.jpg`, especificamente escolhido para
apurar em todas as 5 faixas): valor da condenação R$ 162.360.000,00
(R$ 100.000.000,00 de principal + R$ 62.360.000,00 de juros Selic), salário
mínimo R$ 1.621,00, percentuais 10/8/5/3/1% — resultado esperado
R$ 5.617.744,00. Confirmado batendo exatamente tanto isoladamente (Node)
quanto ao vivo na tela de Retificação (Base de cálculo = Valor certo,
Escalonar honorários marcado).

**Segundo bug encontrado e corrigido em 18/09/2026**, ao repetir esse mesmo
teste ao vivo no navegador com um processo distribuído em data antiga
(01/08/2001): o escalonamento usava `r.salario_min`, o salário mínimo vigente
na **data de distribuição do processo** (campo já existente, usado para o
teto dos Juizados Especiais) — nesse caso R$ 180,00 (valor histórico de
2001) — em vez do salário mínimo vigente na **data do cálculo**
(R$ 1.621,00 em 2026), que é a referência correta para o escalonamento de
honorários do art. 85, §3º do CPC. Isso produzia R$ 2.067.120,00 em vez de
R$ 5.617.744,00. Corrigido adicionando o campo `salario_min_atual` a
`ResultadoRetificacao` (calculado a partir de `DATA_FIM`, com `salario_min`
como retrocompatibilidade quando não há `DATA_FIM`), usado agora pelas três
telas que calculam o escalonamento. Reconfirmado em seguida: R$ 5.617.744,00
exato, com `tsc`, `npm run test` e `npm run build` sem erros.

### O pedido (arquivo 27, 00:26:22–00:44:20; prints em `26.Honorários.docx`)

Hoje o sistema só tem um critério de honorários: percentual simples sobre a
base (item 2 acima). O contador explica que ~50% dos casos reais usam esse
critério, mas os outros ~50% precisam do critério escalonado do **art. 85,
§3º do CPC** (honorários contra a Fazenda Pública), como já existe no Projef
Web — ver prints extraídos de `26.Honorários.docx`:

- Um seletor **"Modo de Cálculo"** com as opções: `Nenhum`, `Valor da
  Condenação`, `Valor da Causa ou Proveito Econômico`, `Valor Certo`, `Valor
  da Condenação - Sem descontos`, `Valor da Condenação - Descontos até...`
  (o contador anotou no print: *"Deve constar essas opções na escolha da base
  dos honorários"*).
- Um checkbox **"Escalonar honorários (se Fazenda Pública for parte - art.
  85, §3º do CPC)"**, que ao ser marcado abre uma tabela editável com 5
  faixas por múltiplo de salário mínimo (valores do CPC, mas com percentual
  editável, pois o juiz pode fixar valor diferente):
  - Inciso I — até 200 SM: até 20%
  - Inciso II — acima de 200 até 2.000 SM: até 10%
  - Inciso III — acima de 2.000 até 20.000 SM: até 8%
  - Inciso IV — acima de 20.000 até 100.000 SM: até 5%
  - Inciso V — acima de 100.000 SM: até 3%
- O cálculo escalonado é progressivo: aplica o percentual de cada faixa só
  sobre a parte do valor que cai naquela faixa (igual à lógica do IR por
  faixas que o sistema já implementa em `calcularAjusteAnual`), usando o
  salário mínimo vigente na data do cálculo (`buscarSalarioMin`, já existe).
- É necessário criar um novo dado de entrada: **"Valor da condenação"** (e,
  se o modo escolhido for esse, também "Valor da causa") — hoje o sistema só
  tem a tabela de salário mínimo, não tem esse valor.

### Passo a passo para implementar

1. **Modelo de dados**: adicionar em `DadosEntradaRetificacao`
   (`calculoIRPF.ts`) os campos necessários: `modo_calculo_honorarios`
   (`'NENHUM' | 'VALOR_CONDENACAO' | 'VALOR_CAUSA' | 'VALOR_CERTO' | ...`),
   `escalonar_honorarios: boolean`, `valor_condenacao`, `valor_causa` (quando
   aplicável), e as 5 faixas do art. 85 §3º como percentuais editáveis (com os
   tetos do CPC como valor padrão sugerido, não fixo).
2. **UI (Retificacao.tsx)**: substituir/complementar o campo único
   "Percentual de honorários" por: seletor "Modo de Cálculo", campo de valor
   correspondente (condenação/causa/certo), checkbox "Escalonar honorários"
   e, quando marcado, a tabela das 5 faixas editáveis — replicando o layout
   dos prints de `26.Honorários.docx`.
3. **Cálculo (`calculoIRPF.ts`)**: nova função `calcularHonorariosEscalonados()`
   que recebe o valor base (condenação/causa/certo — **já somando principal +
   juros**, ver correção do item 2) e o salário mínimo vigente, aplica as 5
   faixas de forma progressiva (mesmo padrão de `calcularAjusteAnual`) e
   retorna o valor total de honorários.
4. Manter o critério "percentual simples" como está (corrigido pelo item 2)
   para quando `modo_calculo_honorarios` não usa escalonamento.
5. **Teste de referência**: pedir ao contador um caso real já calculado
   manualmente com escalonamento (valor da condenação, salário mínimo da
   época, e o valor de honorários esperado) para validar a implementação,
   nos mesmos moldes usados para validar a correção do juros Selic.
6. Atualizar o relatório (`Relatorio.tsx`, `pdfGenerator.ts`) para exibir o
   modo de cálculo escolhido e, se escalonado, o detalhamento por faixa.

## 4. Ajustes solicitados: fluxo de cadastro e navegação

- **Cadastrar mais de uma declaração na tela de Ajuste Anual** (arquivo 27,
  00:07:07–00:18:42): hoje só é possível cadastrar uma declaração por vez
  nessa tela — para um segundo ano do mesmo processo, o sistema redireciona
  direto para a Retificação (ver diálogo "Processo já registrado" em
  [`src/pages/AjusteAnual.tsx:450-462`](../../src/pages/AjusteAnual.tsx)). O
  contador pede um botão "Nova declaração" na própria tela de Ajuste Anual
  (mesmo padrão do botão "Adicionar ano" que já existe na Retificação), para
  poder cadastrar todas as declarações de um processo antes de ir para a
  Retificação. **Implementado em 17/09/2026** de forma mais simples do que o
  passo a passo original previa: em vez de um novo estado de lista, o diálogo
  "Processo já registrado" (que antes só oferecia ir direto para a
  Retificação) ganhou uma segunda opção, "Nova declaração deste processo",
  que mantém o número do processo e o nome do autor, limpa os demais campos e
  permite cadastrar o próximo ano-calendário sem sair do Ajuste Anual — o
  botão "Ir para Retificação" continua disponível para quando o usuário
  terminar de cadastrar todas as declarações. *Passo a passo original (não
  utilizado)*: adicionar estado de lista de declarações em
  `AjusteAnual.tsx` (hoje trata uma única declaração por vez), botão "Nova
  declaração" que salva a atual e limpa o formulário para a próxima, mantendo
  o mesmo número de processo.
- **Perguntar se deseja incluir mais uma declaração** ao cadastrar um
  processo novo na tela inicial (00:24:13–00:24:23: *"a gente até tinha
  conversado isso, acabou que eu não implementei"*) — consequência direta do
  item anterior.
- **Botão "Voltar" do relatório final não retorna para a Retificação**
  (00:21:20–00:23:xx): **investigado em 17/09/2026, nenhuma correção
  aplicada** — os dois botões "Voltar ao Formulário" que já existem nas telas
  de resultado (`ResultadoRetificacao.tsx:130` e `Resultado.tsx:88`) já
  navegam corretamente de volta para o formulário de origem (Retificação ou
  Ajuste Anual), preservando os dados digitados. O botão "Início"
  (`Relatorio.tsx`, topo da página do relatório final) e o "Voltar"
  (`AjusteAnual.tsx`/`Retificacao.tsx`, topo do formulário) navegam para `/`
  de propósito — é o padrão de breadcrumb do site, existe também um botão
  "Refazer" separado no relatório final para reabrir o formulário com os
  dados carregados. Como a transcrição desse trecho específico está
  fragmentada e não há como apontar com certeza qual botão o contador estava
  testando, nenhuma mudança foi feita aqui para evitar quebrar o
  comportamento correto. **Pendência**: confirmar com o contador, no próprio
  sistema, qual botão exatamente apresenta o problema antes de alterar
  qualquer navegação.

## 5. Pendências administrativas (não são correções de código)

- Login administrativo existe, mas não leva a nenhuma tela de gestão
  (00:15:15–00:15:47: *"você faz o login como administrador, mas não tem
  nenhuma funcionalidade pra administrador"*). Pedido: criar uma tela
  administrativa que dê acesso à gestão das tabelas do sistema (Selic
  mensal, faixas de IR, salário mínimo e a nova tabela de "valor da
  condenação" do item 3) diretamente pela interface, sem depender de acesso
  direto ao Supabase. Isso é maior que um ajuste pontual — tratar como uma
  funcionalidade própria, a planejar separadamente.
- Cadastro do contador como segundo administrador no sistema ficou pendente
  na própria reunião (e-mail de convite não chegou a tempo, 00:12:44–00:13:11)
  — confirmar se o convite foi recebido e o acesso concluído.

## Próximos passos

1. ~~Implementar e testar a correção do item 2 (base dos honorários)~~ —
   ✅ implementado e ✅ confirmado ao vivo no navegador em 18/09/2026: R$ 861,93
   de honorários = 10% de R$ 8.619,33 (principal + juros), com o caso de
   referência do juros Selic (processo-teste, ano-calendário 1996).
2. ~~Implementar o item 3 (escalonamento art. 85 §3º CPC)~~ — ✅ implementado
   e ~~validar com um caso real do contador~~ ✅ validado em 17/09/2026 (ver
   seção 3 acima) — resultado idêntico ao Projef Web (R$ 5.617.744,00).
   Reconfirmado ao vivo no navegador em 18/09/2026, já com a correção do
   `salario_min_atual` (ver seção 3).
3. Item 4: ~~"Nova declaração" na tela de Ajuste Anual~~ ✅ implementado em
   17/09/2026 e ✅ confirmado ao vivo no navegador em 18/09/2026: cadastrada
   uma declaração, finalizada, digitado o mesmo processo novamente, o diálogo
   "Processo já registrado" apareceu com as duas opções, e "Nova declaração
   deste processo" manteve número do processo e nome do autor, limpando os
   demais campos corretamente. A "pergunta se deseja incluir mais uma
   declaração" na tela inicial já fica coberta pelo novo diálogo. O item
   "Voltar não retorna para a Retificação" foi investigado e **não teve
   correção aplicada** — não foi possível identificar com certeza, a partir
   da transcrição, qual botão apresenta o problema; os botões óbvios já
   funcionam corretamente. Pendente confirmar com o contador qual botão
   exatamente falha.
4. Item 5 fica registrado como pendência de produto/acesso, fora do escopo
   de código desta rodada.
5. Testar ao vivo no navegador (Retificação com honorários escalonados,
   Ajuste Anual com múltiplas declarações do mesmo processo) antes de
   considerar esta rodada de ajustes pronta para produção.
