# ADR 016: Corrigir tolerância de arredondamento na validação de consistência do Ajuste Anual

**Date:** 24/09/2026

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Relato da contadoria (DCAL): ao cadastrar uma declaração completa de ano-calendário 2019 com os dados da
planilha de referência (Rendimentos Tributáveis R$ 363.610,27, Deduções Legais R$ 46.051,70, Imposto
Pago R$ 68.755,70, Saldo do Ajuste Anual R$ 8.140,58 "a pagar" — caso marcado como "CRITICA: OK" na
própria planilha da DCAL), o sistema recusava o cadastro com o erro:

> Valores Inconsistentes — O Imposto Devido original (76.896,29) deve ser igual à soma de Ajuste Anual e
> Imposto Pago (76.896,28). Corrija os dados de entrada para continuar.

**Causa raiz confirmada**: o Imposto Devido recalculado pelo sistema (76.896,28675, arredondado para
76.896,29) e a soma informada pela contadoria (Ajuste Anual + Imposto Pago = 76.896,28) divergem em
exatamente 1 centavo — uma diferença de arredondamento normal entre ferramentas/planilhas independentes,
não um erro de cadastro real. A função `validarConsistenciaAjusteAnual`
(`src/services/calculoIRPF.ts`) já previa essa tolerância, mas usava `Math.abs(diferenca) < 0.01`
(estritamente menor que 1 centavo) em vez de `<= 0.01` — excluindo exatamente o caso de diferença de 1
centavo exato que a tolerância deveria cobrir.

## Decision

Em `validarConsistenciaAjusteAnual`, trocar a comparação de `Math.abs(diferenca) < 0.01` para
`Math.abs(diferenca) <= 0.01`, permitindo diferenças de até 1 centavo (inclusive) entre o Imposto Devido
recalculado pelo sistema e a soma de Ajuste Anual + Imposto Pago informada.

## Consequences

- Declarações com diferença de arredondamento de exatamente 1 centavo — caso legítimo e esperado ao
  comparar com planilhas/ferramentas externas — deixam de ser bloqueadas incorretamente.
- A validação continua rejeitando diferenças reais de 2 centavos ou mais, preservando a checagem de
  consistência como proteção contra erro de digitação nos dados de entrada.
- Mesma função usada tanto no Ajuste Anual (`src/pages/AjusteAnual.tsx`) quanto na Retificação
  (`src/services/calculoIRPF.ts`, cálculo por período) — a correção vale para os dois fluxos.
- Caso relatado (ano-calendário 2019, dados acima) testado isoladamente com a função corrigida:
  `consistente` passa de `false` para `true`, sem alterar o valor do Imposto Devido calculado.
- `npx tsc --noEmit`, `npm run test` e `npm run build` sem erros.
