# ADR 017: Corrigir declaração não mesclada na Retificação e duplicidade de Ajuste Anual

**Date:** 24/09/2026

**Status:** Accepted — correções de código e migração de banco aplicadas em produção

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Dois relatos da contadoria (DCAL) para o mesmo processo (5025983-04.2024.4.02.5101), investigados
consultando diretamente os dados reais do processo na tabela `calculos` (leitura pela chave anon):

| Hora (24/09/2026) | `tipo_calculo` | `ano_calendario` |
|---|---|---|
| 16:52:33 | ajuste_anual | 2020 |
| 16:52:34 | ajuste_anual | 2020 |
| 17:17:54 | ajuste_anual | 2021 |
| 17:20:16 | retificacao | 2020 |
| 17:26:07 | ajuste_anual | 2022 |
| 17:31:54 | retificacao | 2020 |

### 1. Ano-calendário 2020 duplicado

Confirmado: existem **duas** declarações de `ajuste_anual` para o ano 2020 do mesmo processo, criadas
com 1 segundo de diferença, com `dados_entrada` e `resultado` **idênticos**, reforça a
hipótese de duplo envio da mesma declaração, não dois cadastros com dados diferentes.
`Resultado.tsx` (`handleFinalizar`) já fazia uma checagem de duplicidade
(`SELECT` antes do `INSERT`) justamente para cobrir o caso de duas abas abertas ou duplo clique, mas essa
checagem não é atômica: duas chamadas simultâneas podem rodar o `SELECT` (que ainda não encontra nada)
antes de qualquer uma das duas concluir o `INSERT`, e ambas inserem. O botão "Finalizar e Salvar" também
não ficava desabilitado durante o envio, facilitando um duplo clique.

### 2. Ano-calendário 2022 não aparece na Retificação

A declaração de 2022 foi cadastrada às 17:26, **entre** as duas gravações de Retificação (17:20 e
17:31) mas mesmo a gravação das 17:31 (posterior ao cadastro de 2022) não inclui esse ano.

**Causa raiz confirmada** em `src/pages/Retificacao.tsx`: o preenchimento automático, ao encontrar
processo já com uma Retificação salva, carrega **só** os períodos daquela Retificação
(`retificacoesAnteriores[0].dados_entrada.periodos`) e ignora completamente qualquer declaração de
Ajuste Anual cadastrada depois, mesmo quando ela existe e está visível na consulta. Ou seja: uma vez
que a primeira Retificação é salva para um processo, novas declarações de Ajuste Anual cadastradas
depois nunca mais aparecem automaticamente na Retificação, a não ser que alguém adicione o ano
manualmente pelo botão "+ Adicionar ano", o que não é um comportamento óbvio para quem usa o sistema.

## Decision

- **`src/pages/Retificacao.tsx`**: o preenchimento automático passa a mesclar os períodos da Retificação
  salva com qualquer declaração de Ajuste Anual cujo ano ainda não esteja entre os períodos salvos,
  incluindo-a automaticamente na lista.
- **`src/pages/Resultado.tsx`**: o botão "Finalizar e Salvar" passa a ficar desabilitado (e com o texto
  "Salvando...") enquanto o envio está em andamento, evitando duplo clique.
- **Banco de dados**: nova migração (`20260924180000_unico_ajuste_anual_por_processo_ano.sql`) cria um
  índice único parcial em `calculos (numero_processo, ano_calendario) WHERE tipo_calculo = 'ajuste_anual'`,
  fechando a condição de corrida a nível de banco (a segunda inserção concorrente passa a falhar de
  verdade, em vez de depender só da checagem da aplicação). Replicada também em `supabase/schema.sql`
  para instalações novas do banco.

## Consequences

- Declarações de Ajuste Anual cadastradas depois de uma Retificação já salva passam a aparecer
  automaticamente ao reabrir a tela, sem precisar de ação manual.
- Duplo clique em "Finalizar e Salvar" não dispara mais dois envios.
- **Migração aplicada em produção (25/09/2026)**: a duplicata do processo 5025983-04.2024.4.02.5101
  (`ajuste_anual` de 2020, ids `b14ead0b-a4d7-4d43-9afb-2209fefc1aea` e
  `c9b94340-f00e-4fc6-aed4-e8b9e92099ec`) foi removida, e a migração
  `20260924180000_unico_ajuste_anual_por_processo_ano.sql` foi aplicada com sucesso no SQL Editor de
  produção, criando o índice único parcial que impede essa duplicidade a nível de banco.
- `npx tsc --noEmit`, `npm run test` e `npm run build` sem erros.
