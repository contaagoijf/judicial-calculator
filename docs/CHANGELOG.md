# Changelog — CalcJud: Funcionalidades e Correções

Este documento reúne, em ordem cronológica, tudo o que foi corrigido, ajustado
ou implementado no CalcJud desde que o projeto foi clonado para o ambiente
local de desenvolvimento (28/08/2026).

Cada entrada indica a data, um resumo do que foi feito e, quando relevante, o
status atual (corrigido, aguardando publicação em produção, ou pendência
identificada).

## Índice

- [28/08/2026 — Início da documentação do projeto](#28082026--início-da-documentação-do-projeto)
- [30 e 31/08/2026 — Documentação de banco de dados e organização dos arquivos](#30-e-31082026--documentação-de-banco-de-dados-e-organização-dos-arquivos)
- [02/09/2026 — Testes automatizados e primeira verificação do motor de cálculo](#02092026--testes-automatizados-e-primeira-verificação-do-motor-de-cálculo)
- [03/09/2026 — Reunião com a AGOI e organização da documentação](#03092026--reunião-com-a-agoi-e-organização-da-documentação)
- [04/09/2026 — Correção do cálculo de juros SELIC/Poupança e da regra UFIR](#04092026--correção-do-cálculo-de-juros-selicpoupança-e-da-regra-ufir)
- [09/09/2026 — Correção do recálculo com imposto a restituir na declaração original](#09092026--correção-do-recálculo-com-imposto-a-restituir-na-declaração-original)
- [09/09/2026 — Reunião com o contador Sérgio (DCAL) e novos itens levantados](#09092026--reunião-com-o-contador-sérgio-dcal-e-novos-itens-levantados)
- [10/09/2026 — Bateria de ajustes solicitados pela contadoria (AGOI/DCAL)](#10092026--bateria-de-ajustes-solicitados-pela-contadoria-agoidcal)
- [10/09/2026 — Aplicação da correção de juros SELIC/Poupança no banco de produção](#10092026--aplicação-da-correção-de-juros-selicpoupança-no-banco-de-produção)
- [11/09/2026 — Tela de listagem de todos os processos, com busca](#11092026--tela-de-listagem-de-todos-os-processos-com-busca)
- [14/09/2026 — Correção dos dois erros apontados pela contadoria na Retificação](#14092026--correção-dos-dois-erros-apontados-pela-contadoria-na-retificação)
- [15/09/2026 — Correção de bug crítico (tela em branco) e ajustes de layout na Retificação](#15092026--correção-de-bug-crítico-tela-em-branco-e-ajustes-de-layout-na-retificação)
- [17/09/2026 — Correção do mês final duplicado no juros SELIC da Retificação](#17092026--correção-do-mês-final-duplicado-no-juros-selic-da-retificação)
- [17 e 18/09/2026 — Correção da base de honorários e escalonamento por faixas (art. 85 do CPC)](#17-e-18092026--correção-da-base-de-honorários-e-escalonamento-por-faixas-art-85-do-cpc)
- [18/09/2026 — Implementação do fluxo "Esqueceu a senha?" no acesso administrativo](#18092026--implementação-do-fluxo-esqueceu-a-senha-no-acesso-administrativo)

---

## 28/08/2026 — Início da documentação do projeto

- Criada a documentação completa do sistema na pasta `docs/` (visão geral,
  telas, regras de cálculo).
- Gerada uma versão da documentação, para leitura por
  pessoas fora da equipe técnica.

## 30 e 31/08/2026 — Documentação de banco de dados e organização dos arquivos

- Criado manual de acesso, backup e manutenção do banco de dados (Supabase).
- Adicionada uma versão do CalcJud e das planilhas/manual de referência da
  DCAL em `docs/`, para uso na validação contábil dos cálculos.
- Definida a regra do projeto de **não versionar arquivos `.docx` e `.pdf`**
  no Git (ficam só localmente, gerados a partir dos `.md` quando necessário).

## 02/09/2026 — Testes automatizados e primeira verificação do motor de cálculo

- Adicionada infraestrutura de testes automatizados de navegador (Playwright)
  para o módulo de Ajuste Anual.
- Executados os primeiros testes de cálculo no sistema publicado, comparando
  o resultado da tela com um caso de referência já conferido manualmente
  (ano-calendário 2020), para confirmar que a fórmula básica do sistema
  estava correta antes de investigar problemas relatados pela contadoria.
- Resultado registrado em [ADR 002, seção 3](adr/002-guia-de-testes-de-calculo.md#3-testes-preliminares-já-confirmados-em-produção),
  preparado para apresentação à contadoria (AGOI/DCAL).

## 03/09/2026 — Reunião com a AGOI e organização da documentação

- Reunião com a AGOI para apresentar os testes preliminares; documentado o
  critério de escolha do caso de referência (ano-calendário 2020) usado nos
  testes do dia anterior.
- Adicionada seção de siglas ao README do projeto, para facilitar a leitura
  por quem não acompanha o projeto.

## 04/09/2026 — Correção do cálculo de juros SELIC/Poupança e da regra UFIR

**Corrigido no código; migração do banco de produção pendente.**

- **Causa raiz**: o cálculo de juros dos índices SELIC, Poupança e taxa fixa
  estava dividindo dois fatores acumulados — uma operação válida apenas para
  índices que se acumulam por produto (como a correção monetária), mas SELIC
  e Poupança se acumulam por **soma**. Isso gerava um percentual de juros
  muito abaixo do correto (6,77% em vez de mais de 370% num caso real
  comparado com a planilha da DCAL).
- **Correção**: substituída a divisão por soma direta dos valores mensais nos
  três pontos do cálculo onde o erro ocorria.
- Corrigida também a regra de transição de UFIR para SELIC em janeiro de
  1996 (mês em que a correção ainda era por UFIR mas os juros já passavam a
  ser calculados por SELIC), e um erro de "Rules of Hooks" em
  `Retificacao.tsx` que impedia a tela de carregar no ambiente local.
- **Pendência registrada**: a regra de transição corrigida está no arquivo de
  configuração do repositório (`supabase/seed_templates_regras.sql`), mas o
  **banco de dados de produção ainda não recebeu essa migração** — documentado
  no [ADR 008](adr/008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md), com o script pronto para um administrador
  aplicar. Essa pendência foi reconfirmada em 09/09/2026, durante a reunião
  com o contador Sérgio (ver seção 5 do resumo dessa reunião), ao reproduzir
  o mesmo tipo de divergência num teste em produção.

## 09/09/2026 — Correção do recálculo com imposto a restituir na declaração original

**Corrigido e commitado.**

Bug relatado pela contadoria: a tela de recálculo apresentava o erro "Valores
inconsistentes" sempre que a declaração original tinha **imposto a
restituir** (em vez de a pagar).

- **Causa raiz 1**: o campo "Ajuste Anual" só aceitava valores positivos, e
  não havia como digitar o número negativo necessário para representar um
  saldo a restituir na declaração original — a checagem de consistência
  (imposto devido = ajuste anual + imposto pago) falhava sempre nesse caso.
  **Correção**: adicionado um seletor "A pagar" / "A restituir" ao lado do
  campo (em `AjusteAnual.tsx` e `Retificacao.tsx`); o usuário digita sempre o
  valor positivo, como consta na declaração, e o sistema aplica o sinal
  correto internamente.
- **Causa raiz 2** (encontrada ao testar os dois cenários combinados numa
  Retificação): o rótulo "Imposto a pagar" / "Imposto a restituir" na tabela
  por ano do relatório de Retificação (`Relatorio.tsx`, `pdfGenerator.ts`)
  usava a comparação invertida, mostrando os dois casos trocados mesmo com os
  valores numéricos corretos.
- Nenhuma fórmula de cálculo de imposto foi alterada nesta correção.
- Testado ao vivo com os dois casos reais enviados pela contadoria (1996 a
  pagar R$ 673,10; 2019 a restituir R$ 3.091,73), isoladamente e combinados.
  Documentado no [ADR 009](adr/009-corrigir-validacao-de-recalculo-com-imposto-a-restituir.md).

## 09/09/2026 — Reunião com o contador Sérgio (DCAL) e novos itens levantados

- Itens levantados nessa reunião (detalhados e corrigidos na seção seguinte,
  10/09/2026): máscara do número de processo, máscara de moeda, linha do
  "ajuste anual" na memória de cálculo, renomeação de rótulos, e a
  necessidade de a Retificação reaproveitar dados já cadastrados no Ajuste
  Anual do mesmo processo.

## 10/09/2026 — Bateria de ajustes solicitados pela contadoria (AGOI/DCAL)

**Implementado e testes em ambiente de desenvolvimento; aguardando
autorização para publicar em produção (ainda não commitado).**

### Máscaras e validação de campos

- Máscara automática do **número do processo**, no padrão do e-Proc
  (`NNNNNNN-DD.AAAA.J.TR.OOOO`), nas telas de Ajuste Anual e Retificação.
- Máscara automática de **moeda (BRL)** em todos os campos de valor
  monetário — extraído um componente único `CampoMonetario`
  (`src/components/CampoMonetario.tsx`) usado pelas duas telas.
- **Validação do número do processo**: se o usuário digitar/colar um número
  incompleto ou fora do padrão e tentar continuar (saindo do campo,
  pressionando Enter, ou clicando em "Simular"), o sistema mostra um alerta
  ("Número de processo inválido") e **bloqueia a continuação** até o número
  ser corrigido.

### Transparência e nomenclatura do relatório

- Adicionada a linha **"Ajuste anual (declaração original) — a pagar/a
  restituir"** na memória de cálculo do relatório de Retificação (tela e
  PDF), mostrando explicitamente o saldo que já constava na declaração
  original, antes da linha "Total devido".
- Renomeado o rótulo **"Total das diferenças atualizadas"** para **"Principal
  Devido"** na tela de Simulação de Retificação.
- Renomeada a coluna **"Juros %"** para **"Juros/Selic %"** nas tabelas de
  correção monetária (tela e PDF), já que o campo representa a taxa SELIC
  acumulada.
- Renomeado o botão **"Simular Cálculo"** para **"Simular Declaração"** na
  tela de Ajuste Anual.

### Reaproveitamento de dados entre as telas

- **Detecção de processo já registrado** (Ajuste Anual): se o usuário digitar
  um número de processo que já tem declaração salva no sistema, aparece um
  aviso ("Este número de processo já foi registrado...") e, ao confirmar, o
  sistema redireciona para a Retificação, já com o número do processo, nome
  do autor e as declarações anteriores carregados — evitando duplicar o
  mesmo processo no banco de dados.
- **Autopreenchimento automático na Retificação**: ao digitar um número de
  processo que já tem declarações de Ajuste Anual (ou uma Retificação
  anterior) cadastradas, os dados são preenchidos automaticamente em todas as
  seções ("Dados do Processo", "Correção e honorários" quando houver
  histórico de Retificação, e "Dados de Declarações Anuais") — sem exigir
  nenhuma confirmação, diferente do Ajuste Anual.
- Testado com um processo de 3 declarações reais (1996, 2019 e 2023,
  incluindo um caso de declaração **Simplificada** em 2019 — tipo de
  declaração que ainda não tinha sido testado em Retificação), confirmando
  que o cálculo da dedução automática (20% dos rendimentos, limitada ao
  teto) funciona corretamente também nesse fluxo combinado.

### Ajustes de interface e identidade visual

- Aumentada a largura do campo "Saldo do ajuste anual" no diálogo de período
  da Retificação, que ficava pequeno demais para mostrar o valor completo.
- Corrigida a quebra de linha dos valores monetários (Rendimentos, Imposto
  pago, Ajuste anual) na tabela "Dados de Declarações Anuais".
- Adicionado espaço extra abaixo dos botões "Simular Declaração" e "Simular
  Retificação", para que o botão fique visível ao rolar a tela durante
  testes/demonstrações.
- Adicionado temporizador (4 segundos) na mensagem "Dados do processo
  carregados", para que ela desapareça automaticamente.
- Criado o ícone da aba do navegador (`public/calcjud.ico`) e alterado o
  título da aba de "Lovable App" para "CalcJud".

### Pendências em aberto (não resolvidas nesta bateria)

- **Migração do banco de produção da regra UFIR/SELIC** (ver 04/09/2026) —
  reconfirmada como pendente durante o teste em produção de 09/09/2026.
  **Resolvida em 10/09/2026**, ver seção correspondente abaixo.
- **Publicação em produção** de todas as correções feitas em ambiente local
  desde 09/09/2026 — depende de autorização/acesso ao repositório de
  produção. **Resolvida em 10 e 11/09/2026**, com a publicação de todas as
  correções e novas telas descritas nas seções seguintes.

## 10/09/2026 — Aplicação da correção de juros SELIC/Poupança no banco de produção

**Corrigido, publicado e validado em produção.**

- Aplicada manualmente, via SQL Editor do Supabase, a migração documentada no
  [ADR 008](adr/008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md) (pendente desde 04/09/2026): ajuste da regra de
  transição UFIR → SELIC de janeiro de 1996 nos templates de correção do
  banco de produção.
- Antes de aplicar, foi feito um backup rápido (cópia da tabela
  `regras_subperiodo` com Row Level Security ativado, sem políticas — acesso
  bloqueado para as chaves públicas do sistema).
- Validado o resultado direto em produção: o percentual de Juros/Selic de um
  caso real, que antes da correção calculava 6,77%, passou a calcular
  438,24%, consistente com a ordem de grandeza esperada (comparado
  anteriormente com a planilha da DCAL — ver 04/09/2026).
- Scripts avulsos de backup e migração manual do banco passaram a ficar fora
  do controle de versão (pasta local, não versionada), por não fazerem parte
  do código do sistema.

## 11/09/2026 — Tela de listagem de todos os processos, com busca

**Implementado, testado e publicado em produção.**

- Nova página `/calculo/listaprocessos`, mostrando a quantidade total de
  processos cadastrados ("Processos: N") e, para cada um, os dados gerais
  (número, autor, data do ajuizamento) e a tabela de declarações anuais
  cadastradas, com botão "Editar" (abre o Ajuste Anual já preenchido) e
  "Remover" (visível só para administradores logados).
- Adicionada uma seção de busca por número do processo, nome do autor ou data
  do ajuizamento: o filtro é aplicado automaticamente a cada digitação ou
  colagem, sem precisar clicar em nenhum botão, e um botão "Limpar" reseta os
  três campos de uma vez. O campo "Número do processo" usa a mesma máscara e
  validação já usada na tela de Ajuste Anual, e "Data do ajuizamento" aplica a
  máscara `dd/mm/aaaa` automaticamente.

### Pendência nova: permissão de remoção no banco de produção

- O botão "Remover" depende de uma política de acesso nova (UPDATE/DELETE)
  na tabela `calculos`, já criada no repositório
  (`supabase/migrations/20260911000000_admin_manage_calculos.sql`) — até
  hoje só existiam políticas de leitura e inserção pública para essa tabela.
  **Ainda não aplicada no banco de produção**; enquanto isso não for feito
  manualmente por um administrador (mesmo processo usado na migração de
  10/09/2026), o botão "Remover" retorna erro de permissão.

## 14/09/2026 — Correção dos dois erros apontados pela contadoria na Retificação

**Corrigido, testado e publicado em produção.**

A contadoria reportou dois problemas na tela de Retificação de IRPF, comparando o
sistema com a planilha oficial da DCAL (processo de referência: ano-calendário
1996, correção SELIC).

### Erro 1 — Tipo do saldo do ajuste anual definido manualmente

- **Causa**: o campo "A Pagar" / "A Restituir" era um seletor manual, sem
  vínculo com o imposto devido apurado a partir dos demais campos da
  declaração — podia ficar incompatível com o resultado real.
- **Correção**: o campo passou a ser calculado automaticamente pelo sistema
  (comparando o imposto devido apurado com o imposto pago) nas telas de
  Ajuste Anual e de Retificação; fica travado para edição.

### Erro 2 — Percentual de Juros/Selic muito acima do esperado (438,24% em vez de 372,77%)

Duas causas raiz independentes, ambas corrigidas:

- **Corte silencioso de dados históricos**: a Retificação carregava as
  tabelas de correção monetária e juros (SELIC, Poupança, UFIR etc.) sem
  paginação; o Supabase/PostgREST limita automaticamente qualquer consulta
  sem paginação a 1.000 linhas, sem aviso e sem erro. A tabela
  `taxas_historicas` já tinha 1.147 linhas, então cerca de 13% dos meses
  eram descartados a cada carregamento, de forma imprevisível. Corrigido em
  `useRetificacaoContexto.ts`, buscando os dados em lotes completos.
- **Fórmula de exibição do percentual**: a coluna "Juros/Selic %" (tela e
  PDF) exibia o multiplicador total do período (onde 100% = "sem juros")
  diretamente como se fosse o percentual de juros, somando 100 pontos
  percentuais a mais em todo valor exibido. Corrigido em `Relatorio.tsx`,
  `ResultadoRetificacao.tsx` e `pdfGenerator.ts`, descontando a base de 100%
  antes de exibir.
- **Pendência residual identificada**: mesmo após as duas correções, sobrava
  uma diferença de ~4,5 pontos percentuais em relação à planilha — não por
  erro de cálculo, mas porque a base de dados ainda não tinha os meses de
  abril a agosto de 2026 da SELIC cadastrados. **Resolvida no mesmo dia**,
  ver seção abaixo.

### Atualização da base de SELIC (abril a agosto de 2026)

- Obtidos os 5 percentuais oficiais faltantes diretamente na API pública do
  Banco Central do Brasil (SGS, série 4390 — "Taxa de juros - Selic
  acumulada no mês"), conferidos por cruzamento com os meses já cadastrados
  (jan-mar/2026, que bateram exatamente).
- Migração criada e aplicada em produção
  (`supabase/migrations/20260914000000_atualizar_taxas_selic_2026.sql`);
  procedimento documentado em
  [ADR 006](adr/006-atualizar_taxas_selic_banco_central_brasil.md),
  como referência reutilizável para atualizações futuras.

### Ajustes de layout

- Aumentadas as margens laterais dos diálogos "Editar ano" e "Nova
  alteração" (Retificação), que cortavam a borda de alguns campos.
- Aumentada a largura dos campos de valor monetário na tela "Editar ano" e
  na seção "Cálculo das parcelas devidas" da Retificação, para exibir a
  máscara completa `R$ 999.999,99`.

## 15/09/2026 — Correção de bug crítico (tela em branco) e ajustes de layout na Retificação

**Corrigido, testado e publicado em produção.**

### Bug crítico — tela em branco na Retificação

- **Causa**: ao automatizar o cálculo de "A Pagar/A Restituir" (14/09/2026),
  uma chamada à função `calcularAjusteAnual()` foi adicionada em
  `Retificacao.tsx` sem o import correspondente — gerando um
  `ReferenceError` que derrubava a tela inteira (sem *error boundary*) toda
  vez que esse trecho executava: ao digitar um processo com faixas de IR já
  cadastradas, ou ao abrir "Editar ano". **Esteve em produção desde a
  publicação do commit de 14/09/2026.**
- **Correção**: adicionado o import que faltava. Reproduzido e confirmado o
  problema e a correção ao vivo, no navegador, antes de publicar.

### Nova coluna e botões de colar

- Adicionada a coluna "Deduções" na tabela "Dados de Declarações Anuais" da
  Retificação (mesmo valor do campo "Total das deduções" da tela "Editar
  ano").
- Adicionado botão para colar da área de transferência nos campos "Número
  do Processo" (tela de Ajuste Anual) e "Nome do Autor", preenchendo o
  campo automaticamente a partir do conteúdo copiado.

### Correções de layout e usabilidade

- Corrigido o anel de foco (contorno ao clicar) que ficava cortado nos
  campos das bordas esquerda/direita dos diálogos "Editar ano" e "Nova
  alteração" — o contêiner interno de rolagem não tinha espaço suficiente
  para o anel, que se estende alguns pixels além da borda do campo.
- Aumentada a largura da página de Retificação e do diálogo "Editar ano"
  (até `max-w-7xl`), para caber a tabela "Alterações da Declaração" sem
  rolagem horizontal, mesmo com todos os campos monetários preenchidos com
  o valor máximo (`R$ 999.999,99`).
- Corrigida a coluna "Data" da tabela "Alterações da Declaração", que
  exibia a data crua do banco (`aaaa-mm-dd`) em vez do formato brasileiro
  (`dd/mm/aaaa`); aplicado `whitespace-nowrap` em todas as colunas dessa
  tabela para impedir quebra de linha.
- Aumentada a margem inferior após os botões "Editar" e "Finalizar e
  Salvar" na tela de Simulação de Retificação, e impedida a quebra de linha
  do rótulo "Juros/Selic %".

### Correções no ambiente de desenvolvimento

- Corrigido o travamento (`EBUSY`) do `npm run dev`, causado por dois
  motivos distintos: o perfil do navegador de testes automatizados
  (`glpi-profile/`) vivia dentro da pasta do projeto e o Chromium mantinha
  arquivos dele abertos; e arquivos em `docs/contador/` (materiais para
  reuniões com o contador) ficavam abertos por outros programas. O perfil
  do navegador foi movido para fora do projeto, e `docs/contador/` passou a
  ser ignorado pelo observador de arquivos do Vite.
- Adotados antecipadamente os *future flags* `v7_startTransition` e
  `v7_relativeSplatPath` do React Router, removendo os avisos de depreciação
  do console.

## 17/09/2026 — Correção do mês final duplicado no juros SELIC da Retificação

**Corrigido, testado e publicado em produção.**

A contadoria enviou uma nova série de esclarecimentos (arquivos `15` a `22` em
`docs/contadoria/`), fixando duas datas de referência específicas (vencimento
e pagamento) para permitir comparação exata com a calculadora oficial da
Receita Federal (Sicalc): vencimento 04/1997, pagamento 08/2026 → 372,77%.
Refazendo o teste com essas datas, o sistema calculava 374,43% — uma
diferença de +1,66 ponto percentual.

- **Causa raiz**: o mês igual à `DATA_FIM` do cálculo (a data em que o
  cálculo está sendo feito) somava, ao mesmo tempo, a taxa SELIC real
  cadastrada em `taxas_historicas` **e** um `+ 0,01` fixo adicional — uma
  duplicidade que só não era percebida antes porque, até a migração de
  14/09/2026 (ver seção correspondente), o mês de `DATA_FIM` normalmente
  ainda não tinha taxa real cadastrada, então o fixo era, por coincidência, o
  único valor somado para aquele mês.
- **Hipótese testada e descartada durante a investigação**: cogitou-se que a
  soma deveria começar um mês antes do campo "Início da correção", por causa
  de um esclarecimento da contadoria sobre a diferença entre esse campo e o
  vencimento usado no Sicalc. Essa hipótese foi refutada numericamente,
  cruzando dois exemplos independentes enviados pela contadoria com a tabela
  oficial de Selic mensal da Receita Federal e a série 4390 do Banco Central:
  o campo "Início da correção", como já está cadastrado no sistema, já
  representa corretamente o mês em que a soma deve começar — nenhum
  deslocamento é necessário aí.
- **Correção**: em `calculoIRPF.ts`, nova função auxiliar `somarJurosSelic()`
  garante que o mês de `DATA_FIM` sempre some 1,00 ponto percentual fixo no
  lugar da (nunca em conjunto com) taxa real cadastrada, aplicada nos três
  pontos do cálculo que somam juros SELIC/Poupança/Percentual.
- Validado o caso de referência (ano-calendário 1996, vencimento 04/1997,
  pagamento 08/2026) de forma isolada — bundle de `calculoIRPF.ts` gerado via
  `esbuild` e executado em Node com dados reais do banco de produção, sem
  depender de automação de navegador: resultado 372,77%, idêntico à
  contadoria e à calculadora oficial do Sicalc. Documentado no
  [ADR 011](adr/011-corrigir-mes-final-fixo-do-juros-selic-na-retificacao.md).
- Aproveitado o mesmo commit para renomear `docs/contador/` para
  `docs/contadoria/` no `.gitignore` (terminologia padronizada do projeto) e
  reorganizar as planilhas de referência em `docs/reference/planilhas/`,
  separando-as por período (`01`: 1996-2019/2023, `02`: 1996-2018).

## 17 e 18/09/2026 — Correção da base de honorários e escalonamento por faixas (art. 85 do CPC)

**Corrigido, testado e publicado em produção.**

Em reunião de validação com a contadoria (DCAL/AGOI), com prints de referência
do Projef Web, foram identificados dois problemas na Retificação relacionados
a honorários advocatícios.

### Base de cálculo dos honorários

- **Causa**: o percentual de honorários era calculado só sobre o "Principal
  Devido", quando deveria ser sobre "Principal Devido + Juros Devidos" (o
  total da execução).
- **Correção**: `ResultadoRetificacao.tsx`, `Relatorio.tsx` e
  `pdfGenerator.ts` passaram a usar o total da execução já calculado, em vez
  de somar só o principal.

### Escalonamento de honorários (art. 85, §3º do CPC)

- Adicionado um novo critério de cálculo, além do percentual simples já
  existente: escalonamento progressivo por faixas de múltiplo de salário
  mínimo (Incisos I a V do art. 85, §3º do CPC), com seletor "Base de
  cálculo", checkbox "Escalonar honorários" e tabela de faixas editável na
  tela de Retificação.
- Validado com um caso real da contadoria (condenação de
  R$ 162.360.000,00): resultado batendo exatamente com o Projef Web
  (R$ 5.617.744,00).
- **Bug encontrado e corrigido no dia seguinte (18/09/2026)**: o
  escalonamento usava o salário mínimo vigente na data de distribuição do
  processo em vez do salário mínimo vigente na data do cálculo — corrigido
  com um novo campo `salario_min_atual`.

### Nova declaração no mesmo processo

- Adicionada a opção "Nova declaração deste processo" no diálogo que já
  avisa quando um número de processo já cadastrado é digitado de novo na
  tela de Ajuste Anual, permitindo cadastrar mais de uma declaração do mesmo
  processo sem precisar ir direto para a Retificação.
- Documentado no [ADR 012](adr/012-corrigir-base-de-honorarios-e-escalonamento-art-85-cpc.md).

## 18/09/2026 — Implementação do fluxo "Esqueceu a senha?" no acesso administrativo

**Implementado no código; duas configurações fora do código-fonte ainda
pendentes.**

- Adicionado o link "Esqueceu a senha?" na tela de "Acesso administrativo":
  o usuário informa o e-mail cadastrado, recebe um código de 6 dígitos por
  e-mail e pode definir uma nova senha, usando o recurso nativo de
  recuperação de senha do Supabase.
- **Pendências para o fluxo funcionar de ponta a ponta em produção**,
  documentadas no [ADR 013](adr/013-configurar-recuperacao-de-senha-por-codigo-no-supabase.md):
  - aplicar manualmente, via SQL Editor do Supabase, a migração que permite
    checar se um e-mail já é de um administrador cadastrado;
  - configurar o template de e-mail "Reset Password" no painel do Supabase
    para enviar o código de 6 dígitos em vez do link padrão (pode exigir
    configurar um provedor de SMTP próprio, dependendo do plano do projeto).

