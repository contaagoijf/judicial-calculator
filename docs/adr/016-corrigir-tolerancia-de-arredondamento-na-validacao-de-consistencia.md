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

## Por que a margem foi ajustada para aceitar diferenças até 1 centavo (em vez de perseguir a igualdade exata)

A dúvida natural diante desse achado é: por que não fazer o sistema bater **exatamente** com a planilha da
DCAL, em vez de só tolerar a diferença? A resposta curta é que **é possível eliminar a diferença por
completo**, mas só descobrindo exatamente onde, no cálculo, a planilha da DCAL arredonda diferente do
sistema — informação que não temos hoje.

### Por que duas ferramentas corretas podem dar 1 centavo de diferença

O cálculo do Imposto Devido, nesse caso, é `base de cálculo × alíquota − parcela a deduzir`. Com os
números do caso relatado:

```
317.558,57 × 27,5% = 87.328,60675
87.328,60675 − 10.432,32 = 76.896,28675
```

Esse valor (`76.896,28675`) tem mais de 2 casas decimais — em algum ponto, alguém precisa arredondar. A
questão é **quando**:

- O sistema carrega o valor com precisão total e só arredonda para 2 casas no resultado final → dá
  `76.896,29`.
- Se a planilha da DCAL arredonda **antes**, num passo intermediário (por exemplo, arredondando a base de
  cálculo, ou o resultado da multiplicação pela alíquota, antes de subtrair a parcela a deduzir), o
  resultado final pode sair `76.896,28` — 1 centavo diferente, mesmo com a fórmula sendo idêntica.

Ambos os valores estão "certos" pela fórmula oficial — a diferença é só sobre **em que etapa** o
arredondamento acontece, não um erro de cálculo de nenhum dos dois lados.

### Como eliminar essa diferença de vez, se um dia fizer sentido

Seria preciso descobrir o passo a passo exato da planilha da DCAL (ou do programa oficial da Receita
Federal que ela usa como referência) — especificamente, em qual etapa e com quantas casas decimais cada
valor intermediário é arredondado — e replicar exatamente essa mesma sequência no sistema.

### Por que a tolerância foi a solução escolhida agora

Perseguir a igualdade exata entre dois sistemas construídos independentemente é um problema conhecido em
software financeiro/tributário — por isso é prática comum (não só neste sistema) aceitar uma margem
pequena de conciliação em vez de tentar replicar bit a bit o arredondamento de outra ferramenta. Um
centavo não tem impacto prático em nenhum caso real, e a alternativa (perseguir a igualdade exata) exigiria
acesso a uma informação que hoje não temos (a metodologia de arredondamento célula a célula da planilha
de referência).
