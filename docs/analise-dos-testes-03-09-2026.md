# CalcJud — Análise dos Testes de 03/09/2026

## Causa da divergência de cálculo identificada e confirmada

Tribunal Regional Federal da 2ª Região (TRF2)
03/09/2026

## 1. Contexto

Após a reunião com a contadoria, foi relatado que o erro do CalcJud está **no índice de correção monetária**, e o contador indicou que a tabela de índices usada como referência está na planilha oficial da DCAL (`Planilha-de-Cálculo-IRPF.xlsm`).

A partir dessa pista, foram feitos hoje dois testes comparativos diretos — o mesmo caso, calculado nos dois sistemas (planilha oficial da DCAL e CalcJud) — que permitiram **encontrar e confirmar a causa exata do problema**.

## 2. O teste comparativo

Foi reproduzido no CalcJud um caso já calculado pela planilha oficial da DCAL: uma Retificação envolvendo o ano-calendário de **1996**, com os mesmos dados de declaração (rendimentos R$ 40.510,26, deduções R$ 13.326,62, imposto pago R$ 2.342,81) e a mesma diferença apurada (R$ 1.504,85, com início da correção em 01/05/1997).

### Resultado da planilha oficial da DCAL

*(arquivo `0046269 CÁLCULO DAS PARCELAS DEVIDAS.pdf`)*

| Item | Valor |
|---|---|
| Diferença devida | R$ 1.504,85 |
| Início da correção | 01/05/1997 |
| Juros (%) | **372,77%** |
| Juros (valor) | R$ 5.609,63 |
| Valor atualizado | **R$ 7.114,48** |

### Resultado do CalcJud, para o mesmo caso

*(arquivo `RELATÓRIO DE CÁLCULO - RETIFICAÇÃO IRPF-e925e486-....pdf`)*

| Item | Valor |
|---|---|
| Diferença devida | R$ 1.504,85 |
| Início da correção | 01/05/1997 |
| Juros (%) | **6,77%** |
| Juros (valor) | R$ 101,90 |
| Valor atualizado | **R$ 1.606,75** |

**A diferença apurada é idêntica nos dois sistemas** — ou seja, a fórmula de cálculo do imposto (Ajuste Anual) está correta, confirmando o que os testes preliminares já indicavam. **O problema está exclusivamente nos juros SELIC aplicados sobre esse valor**: a planilha da DCAL calcula um juros acumulado de 372,77% para o período; o CalcJud calcula apenas 6,77% para o mesmo período — uma diferença de mais de 50 vezes.

## 3. Causa raiz confirmada

Foi possível rastrear exatamente onde essa diferença nasce, cruzando os dados reais do sistema com o código-fonte do CalcJud.

**Como o CalcJud guarda o histórico de SELIC:** para cada mês, o sistema guarda o valor da taxa daquele mês (correto) e também um "valor acumulado" que deveria representar o total acumulado até aquele mês. Para os juros (SELIC, Poupança e a taxa fixa de 1% a.m.), esse acumulado é calculado **somando** o valor de cada mês ao anterior — o que é exatamente a forma correta de acumular esse tipo de juros na prática judicial brasileira (é assim que a própria planilha da DCAL também soma, mês a mês, os percentuais de SELIC).

**Onde está o erro, então:** na hora de calcular o juros de um período específico (por exemplo, de 05/1997 até a data de hoje), o CalcJud pega o "valor acumulado" da data final e **divide** pelo "valor acumulado" da data inicial. Só que **dividir só faz sentido matematicamente quando o acumulado é calculado por multiplicação** (juros compostos) — e não é o caso aqui: o acumulado dos juros é uma **soma**, não um produto. Ao dividir dois números que foram somados (em vez de subtrair, que seria a operação correta para uma soma), o resultado sai completamente errado — e é exatamente esse erro que produz os 6,77% em vez dos 372,77% esperados.

Em termos simples: **é como se o sistema guardasse os juros em um "cofrinho" que soma mês a mês (do jeito certo), mas na hora de conferir quanto foi juntado num período, em vez de subtrair o que tinha antes do que tem depois, ele estivesse dividindo um valor pelo outro** — o que não faz sentido para algo que foi somado.

### Onde isso está no sistema (referência técnica)

- **Guarda corretamente por soma:** função `recalculate_taxas_historicas()`, em `supabase/schema.sql` (linhas 283–297), para índices de natureza "JUROS" (SELIC, Poupança, taxa fixa `PERCENTUAL`).
- **Usa incorretamente por divisão:** função `calcularRetificacao()`, em `src/services/calculoIRPF.ts` (linha 586: `fator_juros_fim = round8(juros_fim / juros_dist)`).
- Confirmado também diretamente nos dados de produção: os valores de SELIC mês a mês (`fator_multiplicador`) estão corretos; o "acumulado" (`fator_acumulado`) cresce por soma, não por produto — consistente com o código, e incompatível com a divisão feita depois.

## 4. Alcance do problema

- **Afeta:** qualquer cálculo de **Retificação** que use correção com juros SELIC ou SELIC+Poupança (os dois tipos de correção monetária disponíveis no sistema) — ou seja, praticamente todos os casos reais de Retificação com correção.
- **Não afeta:**
  - O módulo de **Ajuste Anual** (não usa juros/correção monetária de forma alguma).
  - Retificações do tipo **"sem correção"** (não entram nesse trecho de cálculo).
  - Os índices de **correção monetária** propriamente ditos (INPC, IPCA, UFIR, TR) — esses são acumulados por multiplicação nos dois lugares (armazenamento e uso), de forma consistente, e não apresentam esse problema.

Isso explica por que os dois testes preliminares apresentados na reunião com a AGOI (Ajuste Anual 2020 e Retificação sem correção monetária) passaram sem problema: nenhum dos dois passa pelo trecho de código onde está o erro.

## 5. Segundo achado, de menor impacto

Durante a análise da planilha da DCAL (aba "Calculo", memória de cálculo), também foi identificada uma pequena divergência na correção monetária por UFIR:

- Planilha da DCAL: UFIR aplicada de 01/1992 até **01/1996** (janeiro de 1996 incluso).
- CalcJud: UFIR cadastrada só até **12/1995** (dezembro de 1995) — falta o mês de janeiro de 1996.

Esse é um problema real, mas de escala muito menor que o dos juros SELIC (afeta só o mês de transição, quando o período de correção passa por janeiro de 1996) — vale corrigir junto, mas não é a causa principal da divergência relatada pelo contador.

## 6. Próximos passos recomendados

1. Corrigir `calcularRetificacao()` para calcular o fator de juros dos índices de natureza "JUROS" por **subtração** (compatível com a forma como o acumulado é somado), em vez de divisão.
2. Revisar se a mesma inconsistência divisão/soma existe em algum outro ponto do cálculo que também use `fator_acumulado` de índices de juros.
3. Corrigir a data final da regra de UFIR (de `1995-12-31` para `1996-01-31`) nos templates de correção.
4. Após corrigir, **repetir exatamente o teste feito hoje** (mesmo caso do ano-calendário 1996) e conferir se o CalcJud passa a bater com os R$ 7.114,48 da planilha da DCAL.
5. Testar também com o caso original relatado pelo contador, assim que os dados completos forem enviados (ver `Resumo-Reuniao-AGOI.md`, seção 4).

## 7. Resumo objetivo

- ✅ **Causa raiz encontrada e confirmada** com dados reais e código-fonte: o cálculo de juros SELIC/Poupança na Retificação usa uma divisão matematicamente incompatível com a forma como os dados são armazenados (soma).
- ✅ Confirmado, com um caso real comparado lado a lado, que a fórmula do imposto (Ajuste Anual) está correta — só os juros da correção estão errados.
- ⚠️ Achado secundário: um mês (janeiro/1996) de correção por UFIR está faltando no CalcJud.
- 📋 Próximo passo: aplicar as correções acima e reproduzir o mesmo teste para confirmar que o resultado passa a bater com a planilha oficial da DCAL.
