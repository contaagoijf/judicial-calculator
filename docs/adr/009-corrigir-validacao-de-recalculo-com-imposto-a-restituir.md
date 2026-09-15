# ADR 009: Corrigir validação de recálculo quando a declaração original tem imposto a restituir

**Date:** 08/09/2026

**Status:** Accepted — publicado em produção (ver [`docs/CHANGELOG.md`](../CHANGELOG.md), 10–11/09/2026)

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Conforme conferência realizada pelo departamento AGOI em 04/09/2026 juntamente com a DCAL (Divisão de Cálculos), a tela de recálculo do CalcJud apresentava o erro "Valores inconsistentes, o Imposto Devido original deve ser igual à soma de Ajuste Anual e Imposto Pago" sempre que a declaração original tinha **imposto a restituir** (em vez de a pagar), mesmo com dados corretos, reproduzido com dois casos de referência (ano-calendário 1996, a pagar; ano-calendário 2019, a restituir).

A causa raiz tinha dois problemas distintos no mesmo ponto do sistema:

1. O campo "Ajuste Anual" da tela só aceitava valores positivos. Matematicamente, um saldo a restituir precisaria ser digitado como número negativo para a checagem de consistência (imposto devido = ajuste anual + imposto pago) fechar, mas a tela nunca permitiu isso, nem indicava que seria necessário.
2. Durante a investigação, foi encontrado um segundo problema independente: no relatório de Retificação, o rótulo "Imposto a pagar"/"Imposto a restituir" da tabela por ano estava com a comparação invertida (valores numéricos sempre corretos, só o rótulo trocado).

## Decision

- Em `src/pages/AjusteAnual.tsx` e `src/pages/Retificacao.tsx`: substituir o campo único "Ajuste Anual" por um valor sempre positivo mais um seletor "A pagar" / "A restituir" ao lado, o sistema aplica o sinal correto internamente, sem exigir que o usuário digite um número negativo.
- Em `src/pages/Relatorio.tsx` e `src/services/pdfGenerator.ts`: corrigir a comparação que decide o rótulo "a pagar"/"a restituir" na tabela por ano do relatório de Retificação, usando o mesmo critério já correto da tela de Ajuste Anual isolada.

## Consequences

- Nenhuma fórmula de cálculo de imposto foi alterada — a correção é só no modo de informar o dado de entrada e na comparação de consistência/rótulo de exibição.
- Passa a ser possível registrar corretamente uma declaração original com saldo a restituir, tanto em Ajuste Anual quanto em Retificação.
- Testado ao vivo com os dois casos reais fornecidos pela contadoria (1996 a pagar R$ 673,10; 2019 a restituir R$ 3.091,73), isoladamente e combinados numa Retificação — ver detalhamento abaixo.
- Ficou como recomendação de acompanhamento: confirmar com a contadoria se existem outros pontos do sistema que também assumem implicitamente "sempre imposto a pagar" na declaração original.

---

## Detalhamento da causa raiz e dos testes de confirmação

> Conteúdo original da investigação, preservado como registro detalhado.

## 2. Teste de confirmação — os dois cenários fornecidos pelo contador, reproduzidos ao vivo

Os dois casos do arquivo anexo foram reproduzidos ao vivo no navegador (ambiente local), primeiro isoladamente na tela de Ajuste Anual, depois combinados numa mesma Retificação de dois anos, com o cenário de teste mais próximo de acordo com o relato do contador.

### 2.1 Ajuste Anual isolado

| Item                            | Ano 1996 (a pagar)              | Ano 2019 (a restituir)                                         |
|---------------------------------|---------------------------------|----------------------------------------------------------------|
| Rendimentos                     | R$ 40.510,26                    | R$ 235.766,64                                                  |
| Deduções                        | R$ 13.326,62                    | R$ 31.982,37                                                   |
| Imposto pago                    | R$ 2.342,81                     | R$ 48.700,08                                                   |
| Saldo original informado        | R$ 673,10 — **A pagar**         | R$ 3.091,73 — **A restituir**                                  |
| Resultado do sistema            | **R$ 673,10 (Imposto a Pagar)** | **R$ 3.091,73 (Valor a Restituir)**                            |
| Bate com o arquivo do contador? | Sim                             | Sim                                                            |
| Erro "Valores inconsistentes"?  | Não (já funcionava antes)       | **Não** — antes da correção, este caso sempre disparava o erro |

### 2.2 Retificação combinando os dois anos (cenário mais próximo do teste do contador)

Os dois anos foram cadastrados no mesmo processo de Retificação (sem correção monetária, para isolar exatamente a lógica de consistência testada), um com saldo "A pagar" e outro "A restituir":

| Ano-calendário | Imposto devido | Imposto pago | Rótulo no relatório          | Valor        |
|----------------|----------------|--------------|------------------------------|--------------|
| 1996           | R$ 3.015,91    | R$ 2.342,81  | **Imposto a pagar (=)**      | R$ 673,10    |
| 2019           | R$ 45.608,35   | R$ 48.700,08 | **Imposto a restituir (=)**  | R$ 3.091,73  |

A simulação foi concluída sem nenhum erro de "Valores inconsistentes" para nenhum dos dois cenários, e o rótulo de cada ano agora corresponde à realidade (antes desta correção, os dois apareciam trocados — ver Decision acima). O segundo problema (rótulo invertido) só foi percebido justamente por causa desse teste combinado — reforça a importância de testar com o mesmo tipo de cenário composto usado pela contadoria no dia a dia, não só casos isolados.

### Evidência visual

Toda a simulação foi executada ao vivo no navegador local, incluindo o preenchimento dos dois cenários isolados e do cenário combinado de Retificação.

## 3. Verificações técnicas realizadas

- `npx tsc --noEmit`: sem erros de tipagem após as alterações.
- `npm run test`: os 4 testes automatizados existentes continuam passando sem alteração, nenhuma fórmula de cálculo de imposto foi tocada, só o modo de informar o saldo original e o rótulo de exibição.
- Teste manual ao vivo, reproduzindo exatamente os dois casos do arquivo fornecido pela contadoria, isoladamente e combinados numa Retificação.

Publicado em produção em 10–11/09/2026, conforme Status no topo deste documento (ver também [`docs/CHANGELOG.md`](../CHANGELOG.md)).
