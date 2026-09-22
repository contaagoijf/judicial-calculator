# ADR 015: Vercel/Supabase são ambiente provisório — produção final será a Fábrica de Cálculos

**Date:** 22/09/2026

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Esclarecimento do destino real de produção do sistema:

- Victor Leal (COSADM) informou que este projeto será migrado para a **Fábrica de Cálculos** que é a
  plataforma de produção institucional do TRF2.
- George (DCAL) informou que as contas usadas hoje na Vercel e no Supabase são do plano **gratuito**, o
  que já impõe limitações conhecidas (ex.: [ADR 013](013-configurar-recuperacao-de-senha-por-codigo-no-supabase.md),
  restrição de edição de template de e-mail no free-tier do Supabase desde 03/06/2026). Mais importante:
  **o Tribunal não autoriza o uso desses provedores externos (Vercel/Supabase) como ambiente de
  produção real** só é permitido desenvolver e testar neles; a operação de fato precisa acontecer na
  rede interna do Tribunal.

Ou seja, o ambiente Vercel + Supabase usado até aqui (e referenciado como "produção" em boa parte da
documentação anterior) é, na prática, um **ambiente de desenvolvimento e validação com a
contadoria** necessário para testar os cálculos com a DCAL antes da migração, mas não é o destino
final do sistema.

## Decision

- Continuar desenvolvendo, testando e validando normalmente no ambiente atual (Vercel + Supabase)
  nada muda no dia a dia de desenvolvimento nem na forma como os cálculos são testados com a contadoria.
- Funcionalidades que dependem de configuração avançada, paga ou institucionalmente restrita da
  Vercel/Supabase (ex.: SMTP próprio ou upgrade de plano para liberar edição de template de e-mail, ver
  [ADR 013](013-configurar-recuperacao-de-senha-por-codigo-no-supabase.md)) ficam **adiadas** para
  quando o projeto for migrado para a Fábrica de Cálculos, em vez de resolvidas agora nesse ambiente
  provisório.
- Onde a documentação existente usa "produção" para se referir ao ambiente Vercel/Supabase atual, deve
  ser entendido como o ambiente de desenvolvimento/validação vigente até a migração, não como o destino
  final de produção institucional.

## Consequences

- [ADR 013](013-configurar-recuperacao-de-senha-por-codigo-no-supabase.md) (recuperação de senha por
  código) passa de "pendência a resolver agora" para "a implementar quando o projeto migrar para a
  Fábrica de Cálculos".
- Nenhuma mudança é necessária no código ou nos dados já existentes no ambiente atual; a migração futura
  para a Fábrica de Cálculos está fora do escopo deste ADR e será tratada separadamente, quando ocorrer.
- `docs/README.md` e [ADR 005](005-calcjud_detalhes_tecnicos.md) (seção Deploy) passam a referenciar
  este ADR, deixando claro que descrevem o ambiente de desenvolvimento atual, não a produção
  institucional final.
