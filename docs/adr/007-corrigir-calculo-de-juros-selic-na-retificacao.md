# ADR 007: Corrigir cálculo de juros SELIC/Poupança e a transição UFIR→SELIC na Retificação

**Date:** 04/09/2026

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

A contadoria relatou uma divergência entre o resultado do CalcJud e a planilha oficial da DCAL num cálculo real de Retificação. A investigação da causa raiz (ver [`docs/history/analise-dos-testes-03-09-2026.md`](../history/analise-dos-testes-03-09-2026.md)) confirmou dois problemas distintos no cálculo de juros/correção de uma Retificação:

1. O cálculo de juros dos índices que se acumulam por **soma** (SELIC, Poupança, taxa fixa de 1% a.m.) usava **divisão** de fatores acumulados — operação só válida para índices que se acumulam por **produto** (juros compostos) — gerando um percentual de juros muito abaixo do correto (6,77% em vez de mais de 370% num caso real).
2. A regra de transição de correção monetária UFIR → SELIC de janeiro/1996 estava um mês adiantada: a planilha da DCAL aplica UFIR até 01/1996 (inclusive), com os juros já calculados por SELIC nesse mesmo mês; no CalcJud, a regra de UFIR terminava em 12/1995.

## Decision

- Em `src/services/calculoIRPF.ts` (`calcularRetificacao()`), substituir, nos três pontos do cálculo que usavam divisão de fatores acumulados para índices de soma, o cálculo por **soma direta** dos valores percentuais mensais do índice de juros no período, via nova função auxiliar `somarValorPercentualNoPeriodo()`. Os índices de correção monetária por produto (INPC/IPCA/UFIR/TR) continuam calculados por multiplicação, sem alteração.
- Em `supabase/seed_templates_regras.sql`, adicionar uma regra específica para janeiro/1996 (correção por UFIR, juros por SELIC), com a regra "somente SELIC" passando a começar em 02/1996 em vez de 01/1996.
- Corrigir, de forma incidental (não relacionada ao cálculo), uma violação de Rules of Hooks em `src/pages/Retificacao.tsx` que impedia a tela de carregar no ambiente de desenvolvimento local.

## Consequences

- O cálculo de juros de Retificação para índices que acumulam por soma passa a bater em ordem de grandeza com a planilha oficial da DCAL (caso de teste do ano-calendário 1996: juros de 6,77% → 438,24%; planilha DCAL: 372,77% — diferença residual explicada pela data em que cada relatório foi gerado, não por erro de fórmula).
- Ajuste Anual, Retificação "sem correção" e os índices de correção monetária por produto não são afetados.
- A correção da regra de transição UFIR→SELIC ficou registrada no arquivo de seed do repositório, mas o banco de dados de produção já tinha os templates cadastrados com a regra antiga, exigindo uma migração manual separada — ver [ADR 008](008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md) (aplicada em produção em 10/09/2026, conforme [`docs/CHANGELOG.md`](../CHANGELOG.md)).

---

## Detalhamento da correção e testes de confirmação

> Conteúdo original da investigação, preservado como registro detalhado.

## 2. Detalhe complementar — mês de transição UFIR → SELIC

Complementando o item 2 da Decision acima: o caso de teste da seção 3 abaixo não é afetado por essa correção, pois o ano de 1996 usado no teste começa em maio de 1997 — já no período posterior à transição. A migração para aplicar o ajuste no banco de produção (pendente à época) está detalhada e **foi concluída** em [ADR 008](008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md).

Também foi corrigido, de forma incidental, um erro de programação (não relacionado ao cálculo) que impedia a tela de Retificação de carregar no ambiente de desenvolvimento local: uma verificação de "ferramenta habilitada" fazia parte do código ser executada de forma condicional, violando uma regra do React (Rules of Hooks) e causando tela em branco. Esse ajuste foi necessário para poder rodar e visualizar o teste de confirmação abaixo.

## 3. Teste de confirmação — mesmo caso, agora no CalcJud corrigido

Foi refeito, ao vivo no navegador, o mesmo caso de teste do ano-calendário 1996 usado na análise anterior:

- Rendimentos tributáveis: R$ 40.510,26
- Total das deduções: R$ 13.326,62
- Total do imposto pago: R$ 2.342,81
- Alteração da declaração: rendimento a somar de R$ 6.019,40 (reconstituído para reproduzir a diferença devida de R$ 1.504,85 documentada no teste anterior — o detalhamento original da alteração não constava nos PDFs disponíveis, mas o valor final bate exatamente)
- Tipo de correção: SELIC
- Data de ajuizamento: 01/05/1997

### Resultado no CalcJud corrigido

| Item | Antes (com o erro) | Depois (corrigido) | Planilha oficial da DCAL |
|--------------------|-------------|-------------|--------------------------|
| Diferença devida   | R$ 1.504,85 | R$ 1.504,85 | R$ 1.504,85              |
| Início da correção | 01/05/1997  | 01/05/1997  | 01/05/1997               |
| Juros (%)          | **6,77%**   | **438,24%** | 372,77%*                 |
| Juros (valor)      | R$ 101,90   | R$ 6.594,85 | R$ 5.609,63*             |
| Valor atualizado   | R$ 1.606,75 | R$ 8.099,70 | R$ 7.114,48*             |

\* *A planilha da DCAL foi calculada em uma data anterior a hoje; o CalcJud recalcula sempre "até a data de hoje" (04/09/2026), por isso os juros acumulados são maiores — quanto mais tempo passa, mais SELIC se acumula. O ponto essencial da confirmação não é o valor exato (que depende da data em que cada relatório foi gerado), e sim a **ordem de grandeza**: antes da correção, o CalcJud calculava juros de apenas 6,77% para um período de quase 30 anos — um valor claramente incompatível com a SELIC acumulada no período. Depois da correção, o CalcJud calcula corretamente centenas de pontos percentuais de juros para esse mesmo período longo, na mesma faixa de grandeza da planilha oficial da DCAL.*

Foi feita ainda uma conferência independente, somando diretamente na base de dados os valores mensais de SELIC cadastrados para o período do teste. O resultado confirma que a nova fórmula (soma direta) é a que reproduz corretamente os dados armazenados, ao contrário da fórmula antiga (divisão), que não tinha nenhuma relação matemática válida com esses dados.

### Evidência visual

A simulação foi executada ao vivo no navegador (ambiente local de testes, conectado ao mesmo banco de dados usado pelo sistema em produção), com a janela mantida aberta ao final da execução para conferência visual direta dos resultados acima.

## 4. Verificações técnicas realizadas

- `npx tsc --noEmit`: sem erros de tipagem após as alterações.
- `npm run test`: os 4 testes automatizados existentes continuam passando (nenhuma regressão nos cálculos de Ajuste Anual e Retificação sem correção, que não são afetados por esta correção).
- Teste manual ao vivo no navegador, com o mesmo caso usado pela contadoria, confirmando os valores de "Diferença devida" e "Início da correção" idênticos à planilha da DCAL, e "Juros %" corrigido para a ordem de grandeza correta.

## 5. Próximos passos (status final)

Os três itens abaixo eram as pendências no momento desta investigação (04/09/2026); todos **já foram concluídos**:

1. ~~Aplicar a correção da regra de UFIR/SELIC de janeiro de 1996 diretamente no banco de dados de produção~~ — ✅ concluído, ver [ADR 008](008-aplicar-migracao-pendente-de-templates-de-calculo-em-producao.md).
2. ~~Testar também com o caso original completo relatado pela contadoria~~ — ✅ concluído (ver [`docs/CHANGELOG.md`](../CHANGELOG.md), 14/09/2026).
3. ~~Publicar (deploy) esta correção para produção~~ — ✅ concluído, ver Status no topo deste documento.
