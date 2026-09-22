# ADR 014: Corrigir perda de declarações ao recarregar uma Retificação já salva

**Date:** 22/09/2026

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Relato: ao adicionar novas declarações (anos) numa Retificação, salvar ("Finalizar e Salvar") e até
exportar o relatório em PDF, sair da tela e voltar a acessar o mesmo processo pelo número, as
declarações adicionadas somem — permanece registrada só a declaração original de Ajuste Anual.

**Causa raiz confirmada**: uma condição de corrida no preenchimento automático de `Retificacao.tsx`. Ao
digitar o número de um processo já cadastrado, duas consultas independentes são disparadas em paralelo
— uma por declarações de Ajuste Anual (`useCalculosPorProcesso(processo, 'ajuste_anual')`) e outra por
Retificações já salvas (`useCalculosPorProcesso(processo, 'retificacao')`). O efeito que decide qual
fonte usar rodava assim que **qualquer uma das duas** respondia, sem esperar as duas terminarem:

- Se a consulta de Ajuste Anual respondia primeiro (comum, já que sempre existe pelo menos uma
  declaração de Ajuste Anual por processo, enquanto a Retificação é opcional), o efeito já concluía
  "não há Retificação anterior" (a segunda consulta ainda não tinha voltado) e preenchia o formulário só
  com as declarações de Ajuste Anual.
- Um controle (`autoFillProcessoRef`) marcava esse processo como "já preenchido" para não repetir o
  preenchimento — mas isso também **impedia** o efeito de rodar de novo quando a consulta de Retificação
  chegava logo em seguida, mesmo já contendo os dados completos (incluindo as declarações adicionadas).

Ou seja: a Retificação **era salva corretamente** no banco de dados o tempo todo — o problema era só na
hora de reabrir a tela, que às vezes (dependendo de qual das duas consultas respondia primeiro)
carregava a versão desatualizada (só o Ajuste Anual original) em vez da Retificação completa já salva.

## Decision

Em `src/pages/Retificacao.tsx`, o efeito de preenchimento automático passa a esperar as duas consultas
terminarem (`isLoading` de ambas) antes de decidir qual fonte usar, em vez de agir assim que qualquer
uma delas responder primeiro.

## Consequences

- Reabrir a tela de Retificação de um processo já salvo agora sempre carrega a versão mais recente e
  completa (todas as declarações adicionadas), independentemente da ordem em que as duas consultas
  respondem.
- `npx tsc --noEmit`, `npm run test` e `npm run build` sem erros.
- **Observação relacionada, fora do escopo desta correção**: `ResultadoRetificacao.tsx`
  (`handleFinalizar`) sempre insere uma **nova** linha na tabela `calculos` a cada "Finalizar e Salvar",
  em vez de atualizar a Retificação anterior do mesmo processo. Isso não causa perda de dados (a consulta
  de recarregamento já ordena por `criado_em` decrescente e pega a mais recente), mas acumula linhas
  antigas no banco a cada vez que o mesmo processo é salvo de novo — vale avaliar separadamente se
  convém atualizar a linha existente em vez de sempre inserir uma nova.
