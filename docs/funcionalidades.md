# CalcJud — Funcionalidades e Correções

Este documento reúne, em ordem cronológica, tudo o que foi corrigido, ajustado
ou implementado no CalcJud desde que o projeto foi clonado para o ambiente
local de desenvolvimento (28/08/2026).

Cada entrada indica a data, um resumo do que foi feito e, quando relevante, o
status atual (corrigido, aguardando publicação em produção, ou pendência
identificada).

---

## 28/08/2026 — Início da documentação do projeto

- Criada a documentação completa do sistema na pasta `docs/` (visão geral,
  telas, regras de cálculo), servindo de base para todo o trabalho seguinte.
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
- Resultado registrado em `docs/Resumo-Reuniao-AGOI.md`, preparado para
  apresentação à contadoria (AGOI/DCAL).

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
  em `docs/supabase-migracao.md`, com o script pronto para um administrador
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
  Documentado em `docs/recalculo_imposto_a_pagar_restituir.md`.

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
- **Publicação em produção** de todas as correções feitas em ambiente local
  desde 09/09/2026 — depende de autorização/acesso ao repositório de
  produção.
