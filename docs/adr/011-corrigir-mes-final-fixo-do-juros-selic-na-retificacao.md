# ADR 011: Corrigir contagem em duplicidade do mês final no juros SELIC da Retificação

**Date:** 2026-09-17

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

O [ADR 007](007-corrigir-calculo-de-juros-selic-na-retificacao.md) corrigiu o cálculo de juros SELIC/Poupança de Retificação para usar soma direta dos percentuais mensais, em vez de divisão de fatores acumulados. Naquele momento, o valor de referência da contadoria (372,77%) foi tratado como próximo o suficiente (o CalcJud calculado ao vivo deu 438,24%), já que a diferença foi atribuída à data em que cada relatório foi gerado — quanto mais tarde o CalcJud recalcula, mais SELIC se acumula.

Depois do ADR 007, a contadoria enviou uma nova série de esclarecimentos (arquivos `15` a `22` em `docs/contadoria/`) fixando **duas datas de referência específicas** (vencimento e pagamento) para eliminar essa variável e permitir comparação exata com a calculadora oficial da Receita Federal (Sicalc): vencimento 04/1997, pagamento 08/2026 → 372,77%.

Refazendo o teste com essas datas fixas, o CalcJud calculava **374,43%**, uma diferença de +1,66 ponto percentual. A causa raiz tinha duas partes, e a primeira hipótese testada para explicá-la estava errada:

1. **Hipótese testada e descartada**: a soma deveria começar um mês antes de `INICIO_CORRECAO` (campo de `ir_parametros`), porque o print do Sicalc rotula o resultado como "Selic acumulada **de** 04/1997 a 07/2026" e 04/1997 é o mês anterior a 05/1997 (`INICIO_CORRECAO` cadastrado para o caso de teste). Essa hipótese foi refutada numericamente: somando os percentuais mensais oficiais de 04/1997 a 07/2026 (usando a tabela oficial da Receita Federal, arquivo `22.Selic-Mensal.pdf`, e confirmando contra a série 4390 do Banco Central) o resultado é 373,43%, não 371,77%. Somando de 05/1997 (o mês seguinte, sem nenhum ajuste) a 07/2026, o resultado bate exatamente com 371,77%. O rótulo do Sicalc apenas ecoa o vencimento digitado pelo usuário, a soma real, por definição legal (juros contados a partir do mês seguinte ao vencimento), já começa no mês seguinte. Isso foi confirmado de forma independente com um segundo exemplo enviado pela contadoria (vencimento 02/1995, pagamento 09/2026): soma de 03/1995 a 08/2026 = 439,11% (bate), soma de 02/1995 a 08/2026 = 442,74% (não bate). Conclusão: `INICIO_CORRECAO`, como já está cadastrado na base, **já representa** o mês seguinte ao vencimento, nenhum deslocamento de mês é necessário no início da soma.
2. **Causa raiz confirmada**: o mês igual a `DATA_FIM` (a data em que o cálculo está sendo feito) nunca deve usar a taxa real cadastrada em `taxas_historicas` deve sempre somar 1,00 ponto percentual fixo, exatamente como o próprio Sicalc mostra ("Percentual em 08/2026: 1,00"), independentemente de já existir uma taxa real cadastrada para esse mês. Antes desta correção, o código somava a taxa real do mês de `DATA_FIM` dentro do laço **e** ainda adicionava um `+ 0,01` fixo separado, uma duplicidade que só não era percebida porque, até uma migração de dados feita nesta mesma sessão (ver histórico de conversas), o mês de `DATA_FIM` normalmente ainda não tinha taxa real cadastrada, então o `+0,01` fixo era, por coincidência, o único valor somado para aquele mês.

## Decision

- Em `src/services/calculoIRPF.ts`, introduzir a função auxiliar `somarJurosSelic()`, que envolve `somarValorPercentualNoPeriodo()` (já existente, do ADR 007) e aplica uma única regra: quando o fim do período somado é a própria `DATA_FIM` do cálculo, a soma real vai até o mês **anterior** a `DATA_FIM` (via novo helper `mesAnterior()`), e 1,00 ponto percentual fixo é somado por fora para o mês de `DATA_FIM`, substituindo (nunca somando-se a) a taxa real desse mês.
- Aplicar `somarJurosSelic()` nos três pontos de `calcularRetificacao()` que somam juros SELIC/Poupança/Percentual: Parte IV (até a distribuição), Parte VII/IX (`INICIO_CORRECAO` até `DATA_FIM`) e Parte VI (`fator_juros_fim`, de `DATA_DIST` até `DATA_FIM` — que antes desta correção não tinha nenhum tratamento de mês final fixo).
- Não alterar o início da soma em nenhum dos três pontos: `INICIO_CORRECAO` e `DATA_DIST` continuam sendo usados diretamente, sem deslocamento de mês (a hipótese do item 1 do Contexto foi implementada e depois revertida no mesmo dia, após a refutação numérica).

## Consequences

- O caso de referência da contadoria (ano-calendário 1996, vencimento 04/1997, pagamento 08/2026) passa a bater exatamente: 372,77% de juros, confirmado via teste isolado em Node (bundle de `calculoIRPF.ts` via esbuild, com dados reais do banco de produção, sem depender de automação de navegador).
- A Parte VI (`fator_juros_fim`) ganha, pela primeira vez, o tratamento correto de mês final fixo — antes desta correção, esse trecho específico não tinha nenhum ajuste de mês final (nem o antigo `+0,01`, nem o novo). Esse trecho só é exercido quando "Limita total na data do ajuizamento" = SIM; não havia caso de teste disponível nesta sessão para validar esse ramo especificamente, mas a mesma regra confirmada nos outros dois pontos se aplica por consistência lógica.
- Fica registrado, para consulta futura, que o rótulo textual do Sicalc ("Selic acumulada de MM/AAAA a MM/AAAA") não descreve literalmente o intervalo somado — descreve o vencimento e o mês anterior ao pagamento digitados pelo usuário, sendo o mês do vencimento sempre excluído da soma real.

---

## Detalhamento técnico e verificações realizadas

### Caso de teste (processo `0017608-12.2018.4.02.5101`, ano-calendário 1996)

| Item | Valor |
|---|---|
| Data de ajuizamento | 30/08/2001 |
| Tipo de correção | SELIC |
| Início da correção (cadastrado) | 01/05/1997 |
| Data de referência do cálculo | 30/08/2026 |
| Rendimentos tributáveis | R$ 40.510,26 |
| Deduções legais | R$ 13.326,62 |
| Imposto pago | R$ 2.342,81 |
| Ajuste anual declarado | R$ 673,10 |
| Alteração (31/12/1996): rendimento a subtrair | R$ 6.309,91 |

### Resultado antes e depois desta correção

| Item | Antes (ADR 007, sem mês final fixo correto) | Depois (esta correção) | Sicalc / contadoria |
|---|---|---|---|
| Diferença devida | R$ 1.504,85 | R$ 1.504,85 | R$ 1.504,85 |
| Juros/Selic (%) | 374,43% | **372,77%** | 372,77% |
| Valor dos juros | R$ 7.139,46 | R$ 7.114,48 | — |
| Total atualizado | R$ 8.644,31 | R$ 8.619,33 | — |

### Conferência independente da base de dados de SELIC

Antes de aceitar a hipótese do item 1 do Contexto, a soma de 04/1997 a 07/2026 registrada em `taxas_historicas` (373,43%) foi conferida mês a mês contra dois catálogos independentes: a tabela oficial "Taxa de juros Selic mensal" da Receita Federal (`docs/contadoria/22.Selic-Mensal.pdf`, emitida 16/09/2026) e a série 4390 do Banco Central (`api.bcb.gov.br/dados/serie/bcdata.sgs.4390`). As três fontes (base do sistema, tabela da Receita Federal e Banco Central) coincidem exatamente para os 352 meses do período — a divergência de 1,66 ponto percentual não está nos dados cadastrados, e sim na fórmula (o mês do início da soma, e depois se confirmou que era o tratamento do mês final).

### Verificações técnicas realizadas

- `npx tsc --noEmit`: sem erros de tipagem.
- `npm run test -- --run`: 4/4 testes automatizados existentes continuam passando.
- `npm run build`: build de produção sem erros.
- Teste isolado em Node: bundle de `src/services/calculoIRPF.ts` gerado via `esbuild` (CommonJS), executado com os dados reais das tabelas `ir_faixas`, `ir_parametros`, `salario_minimo`, `indices_economicos`, `taxas_historicas`, `templates_calculo` e `regras_subperiodo` (buscados do banco de produção), reproduzindo o caso de teste acima sem depender de automação de navegador — resultado: 372,77% exato.

## Próximos passos

1. Corrigir também o documento `docs/contadoria/23.Metodologia de aplicação dos juros pela Taxa Selic - Resumo.docx`, que descrevia a hipótese do item 1 do Contexto (deslocar o início da soma em um mês) como a correção necessária — essa hipótese foi refutada durante a implementação e não faz parte da correção final.
2. Publicar (deploy) esta correção em produção somente após validação adicional pela contadoria no ambiente de testes (ver `docs/contadoria/24.Metodologia de aplicação dos juros pela Taxa Selic - Correções.docx`).
3. Validar especificamente o ramo da Parte VI (`fator_juros_fim`, "Limita total na data do ajuizamento" = SIM) com um caso de teste real, quando disponível — não foi possível validar esse ramo nesta sessão por falta de um caso de referência.
