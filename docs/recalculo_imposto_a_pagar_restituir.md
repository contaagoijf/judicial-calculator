# CalcJud — Correção do recálculo com imposto a pagar ou a restituir

Tribunal Regional Federal da 2ª Região (TRF2)
08/09/2026

## 1. Contexto

Conforme conferência realizada pelo departamento AGOI no dia 04/09/2026, a tela de recálculo do CalcJud apresentava o erro, de acordo com exemplos fornecidos no arquivo `ANÁLISE DO IMPOSTO A PAGAR OU A RESTITUIR.docx` em anexo:

> "Valores inconsistentes, o Imposto Devido original (46.038,60) deve ser igual à soma de Ajuste Anual e Imposto Pago (52.371,49). Corrija os dados de entrada para continuar."

Foi identificado que o sistema **só funcionava corretamente quando a declaração original tinha imposto a pagar** — quando a declaração original tinha **imposto a restituir**, o sistema bloqueava o cálculo com esse erro, mesmo com os dados corretos. O arquivo anexo fornece dois casos de referência para reproduzir o problema:

- **Ano-calendário 1996** — imposto a **pagar**: rendimentos R$ 40.510,26, deduções R$ 13.326,62, imposto devido R$ 3.015,91, imposto retido R$ 2.342,81, **saldo R$ 673,10 a pagar**.

- **Ano-calendário 2019** — imposto a **restituir**: rendimentos R$ 235.766,64, deduções R$ 31.982,37, imposto devido R$ 45.608,35, imposto retido R$ 48.700,08, **saldo R$ 3.091,73 a restituir**.

Este documento explica a causa raiz encontrada, as correções aplicadas e o resultado nos dois cenários reproduzidos.

## 2. Causa raiz — dois problemas distintos, no mesmo ponto do sistema

### 2.1 Problema principal — o campo "Ajuste Anual" não conseguia representar um saldo a restituir

O sistema confere se os dados digitados fazem sentido comparando o imposto devido (recalculado pela tabela oficial) com a soma de dois campos que o usuário preenche: **"Ajuste Anual"** (o saldo que já constava na declaração original) e **"Imposto Pago"**. Essa conta só fecha certo quando o saldo original é **positivo** (imposto a pagar).

Quando a declaração original tem **imposto a restituir**, matematicamente esse saldo precisaria ser digitado como um número **negativo** para a conta fechar — mas o campo "Ajuste Anual" na tela nunca permitiu digitar valores negativos, e nada indicava que isso seria necessário. Ou seja: não existia, como informar corretamente um caso de restituição na declaração original. Por isso o contador encontrava o erro sempre que testava um ano com saldo a restituir, apesar de não ser uma falha pontual de cálculo, o erro existia na limitação da tela.

### 2.2 Problema secundário, encontrado durante a investigação — rótulo "a pagar"/"a restituir" invertido no relatório de Retificação

Ao reproduzir o cenário combinando os dois anos numa Retificação, foi encontrado um segundo problema, independente do primeiro: na tabela de memória de cálculo do relatório de Retificação, o rótulo que diz se o resultado do ano é "Imposto a pagar" ou "Imposto a restituir" estava com a comparação **trocada** — o ano de 1996 (que é, de fato, imposto a pagar) aparecia rotulado como "Imposto a restituir", e o ano de 2019 (que é, de fato, imposto a restituir) aparecia como "Imposto a pagar". Os valores em si sempre estiveram certos — só o rótulo (a palavra "pagar" ou "restituir") estava invertido. Esse problema não afeta a tela de Ajuste Anual isolada (que já usava a comparação certa), só a tabela por ano dentro do relatório de Retificação.

## 3. Correções aplicadas

### 3.1 Campo de saldo original com seletor "A pagar" / "A restituir"

**Onde:** `src/pages/AjusteAnual.tsx` (tela de Ajuste Anual) e `src/pages/Retificacao.tsx` (diálogo de cada ano na tela de Retificação).

**O que foi feito:** o campo único "Ajuste Anual" foi substituído por um valor (sempre digitado como número positivo, do jeito que consta na declaração) **mais** um seletor ao lado com duas opções: **"A pagar"** e **"A restituir"**. O sistema agora calcula sozinho o sinal correto internamente a partir dessa escolha, sem exigir que o usuário saiba ou precise digitar um número negativo. Isso é consistente com a forma como o próprio arquivo com os exemplos fornecidos pelo contador que apresenta os saldos ("R$ 673,10 a pagar", "R$ 3.091,73 a restituir") sempre um valor e uma direção, nunca um número com sinal.

Nenhuma fórmula de cálculo de imposto foi alterada, mas a correção é somente no modo de informar o dado de entrada e na comparação de consistência.

### 3.2 Rótulo "a pagar"/"a restituir" corrigido no relatório de Retificação

**Onde:** `src/pages/Relatorio.tsx` e `src/services/pdfGenerator.ts` (tabela "Cálculo da(s) declaração(ões) — variáveis parciais", uma por ano-calendário, dentro do relatório de Retificação).

**O que foi feito:** a comparação que decide qual rótulo mostrar foi corrigida para usar o mesmo critério já usado (corretamente) na tela de Ajuste Anual isolada.

## 4. Teste de confirmação — os dois cenários fornecidos pelo contador, reproduzidos ao vivo

Os dois casos do arquivo anexo foram reproduzidos ao vivo no navegador (ambiente local), primeiro isoladamente na tela de Ajuste Anual, depois combinados numa mesma Retificação de dois anos, com o cenário de teste mais próximo de acordo com o relato do contador.

### 4.1 Ajuste Anual isolado

| Item                            | Ano 1996 (a pagar)              | Ano 2019 (a restituir)                                         |
|---------------------------------|---------------------------------|----------------------------------------------------------------|
| Rendimentos                     | R$ 40.510,26                    | R$ 235.766,64                                                  |
| Deduções                        | R$ 13.326,62                    | R$ 31.982,37                                                   |
| Imposto pago                    | R$ 2.342,81                     | R$ 48.700,08                                                   |
| Saldo original informado        | R$ 673,10 — **A pagar**         | R$ 3.091,73 — **A restituir**                                  |
| Resultado do sistema            | **R$ 673,10 (Imposto a Pagar)** | **R$ 3.091,73 (Valor a Restituir)**                            |
| Bate com o arquivo do contador? | Sim                             | Sim                                                            |
| Erro "Valores inconsistentes"?  | Não (já funcionava antes)       | **Não** — antes da correção, este caso sempre disparava o erro |

### 4.2 Retificação combinando os dois anos (cenário mais próximo do teste do contador)

Os dois anos foram cadastrados no mesmo processo de Retificação (sem correção monetária, para isolar exatamente a lógica de consistência testada), um com saldo "A pagar" e outro "A restituir":

| Ano-calendário | Imposto devido | Imposto pago | Rótulo no relatório          | Valor        |
|----------------|----------------|--------------|------------------------------|--------------|
| 1996           | R$ 3.015,91    | R$ 2.342,81  | **Imposto a pagar (=)**      | R$ 673,10    |
| 2019           | R$ 45.608,35   | R$ 48.700,08 | **Imposto a restituir (=)**  | R$ 3.091,73  |

A simulação foi concluída sem nenhum erro de "Valores inconsistentes" para nenhum dos dois cenários, e o rótulo de cada ano agora corresponde à realidade (antes da correção do item 3.2, os dois apareciam trocados).

### Evidência visual

Toda a simulação foi executada ao vivo no navegador local, incluindo o preenchimento dos dois cenários isolados e do cenário combinado de Retificação.

## 5. Verificações técnicas realizadas

- `npx tsc --noEmit`: sem erros de tipagem após as alterações.

- `npm run test`: os 4 testes automatizados existentes continuam passando sem alteração, nenhuma fórmula de cálculo de imposto foi tocada, só o modo de informar o saldo original e o rótulo de exibição.

- Teste manual ao vivo, reproduzindo exatamente os dois casos do arquivo fornecidor pelo contador, isoladamente e combinados numa Retificação.

## 6. Comentários objetivos

- O problema relatado **não era um erro no cálculo do imposto** a fórmula de cálculo (base, alíquota, dedução, imposto devido) sempre esteve correta para os dois casos, inclusive no caso que acontecia o erro. O problema era que a tela **não tinha como representar** um saldo de restituição na declaração original, então a checagem de consistência (que existe para pegar erro de digitação) sempre acusava inconsistência nesses casos.

- A correção não muda nenhum resultado de cálculo já validado, muda **como o dado é informado** (um seletor "a pagar"/"a restituir" em vez de exigir um número negativo que a tela nem aceitava) e corrige um rótulo de exibição que estava invertido no relatório de Retificação.

- O segundo problema (rótulo invertido) só foi percebido porque o teste foi refeito com os dois anos combinados numa Retificação, e reforça a importância de testar com o mesmo tipo de cenário composto que o contador usa no dia a dia, não apenas casos isolados.

- Este ajuste ainda está apenas no ambiente local de desenvolvimento (mesmo banco de dados de produção, mas código ainda não publicado). Precisa de aprovação para deploy em `calcjud.vercel.app`.

- Recomendação: confirmar com o contador se há outros pontos do sistema (além do Ajuste Anual e da Retificação) que também assumem "sempre imposto a pagar" na declaração original, para não deixar nenhum caso parecido sem cobertura.

## 7. Resumo objetivo

- ✅ Causa raiz identificada: o campo de saldo original da declaração não conseguia representar um caso de restituição (exigiria um número negativo que a tela não aceitava), fazendo a checagem de consistência falhar sempre que o saldo original era a restituir.

- ✅ Corrigido: campo de saldo original agora tem um seletor "A pagar" / "A restituir" nas telas de Ajuste Anual e Retificação, sem exigir que o usuário digite valores negativos.

- ✅ Corrigido, adicionalmente: rótulo "Imposto a pagar" / "Imposto a restituir" que aparecia invertido na tabela por ano do relatório de Retificação.

- ✅ Confirmado ao vivo com os dois casos exatos do arquivo fornecido pelo contador (1996 a pagar, 2019 a restituir), isoladamente e combinados numa Retificação, sem erro de inconsistência, valores e rótulos batendo com a planilha de referência.

- 📋 Pendente: publicar a correção em produção, mediante aprovação.
