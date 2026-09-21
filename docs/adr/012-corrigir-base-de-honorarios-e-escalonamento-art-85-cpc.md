# ADR 012: Corrigir base de cálculo dos honorários e adicionar escalonamento do art. 85, §3º do CPC

**Date:** 17/09/2026

**Status:** Accepted

**Tribunal Regional Federal da 2ª Região (TRF2)**

## Context

Em reunião de validação com a contadoria (DCAL/AGOI) em 17/09/2026, com prints de referência do Projef
Web ([`docs/contadoria/26.Honorários.docx`](../contadoria/26.Honorários.docx)), foram identificados dois
problemas na Retificação relacionados a honorários advocatícios:

1. O percentual de honorários era calculado só sobre o "Principal Devido", quando deveria ser sobre
   "Principal Devido + Juros Devidos" (o total da execução) — três lugares no código somavam
   `p.valor_devido` (só o principal) em vez de usar `r.total_execucao`, campo já calculado em
   `calculoIRPF.ts:685`.
2. O sistema só tinha o critério de honorários por percentual simples; a contadoria informou que ~50%
   dos casos reais precisam do critério escalonado do **art. 85, §3º do CPC** (honorários contra a
   Fazenda Pública), já existente no Projef Web, com 5 faixas progressivas por múltiplo de salário
   mínimo (Incisos I a V, de até 20% a até 3%).

Na mesma reunião, foi também solicitado um botão para cadastrar mais de uma declaração por processo
diretamente na tela de Ajuste Anual (hoje o sistema redireciona para a Retificação ao detectar um
processo já cadastrado).

## Decision

- Em `ResultadoRetificacao.tsx`, `Relatorio.tsx` e `pdfGenerator.ts`, trocar o cálculo de honorários
  para usar `r.total_execucao` em vez de somar só `p.valor_devido`.
- Adicionar `calcularBaseHonorarios()` e `calcularHonorariosEscalonados()` em `calculoIRPF.ts`, com
  campos novos em `DadosEntradaRetificacao` (modo de cálculo, valor da condenação/causa, flag de
  escalonamento e as 5 faixas do art. 85 §3º como percentuais editáveis), seletor "Base de cálculo",
  checkbox "Escalonar honorários" e tabela de faixas editável em `Retificacao.tsx`; cálculo progressivo
  por faixa, no mesmo padrão já usado para as faixas de IR em `calcularAjusteAnual`.
- No diálogo "Processo já registrado" (`AjusteAnual.tsx`), adicionar a opção "Nova declaração deste
  processo" (mantém número do processo e autor, limpa os demais campos), ao lado da opção já existente
  de ir direto para a Retificação — mais simples do que criar um novo estado de lista de declarações.

## Consequences

- Validado com um caso real enviado pela contadoria (condenação R$ 162.360.000,00 = R$ 100.000.000,00
  de principal + R$ 62.360.000,00 de juros, salário mínimo R$ 1.621,00, percentuais 10/8/5/3/1%):
  resultado esperado R$ 5.617.744,00, batendo exatamente tanto isolado (Node) quanto ao vivo na tela.
- **Bug encontrado e corrigido em 18/09/2026**, ao repetir o teste com um processo distribuído em data
  antiga (01/08/2001): o escalonamento usava `r.salario_min` (salário mínimo vigente na *data de
  distribuição*, campo já existente para o teto dos Juizados Especiais) em vez do salário mínimo vigente
  na *data do cálculo* — referência correta para o art. 85 §3º. Produzia R$ 2.067.120,00 em vez de R$
  5.617.744,00. Corrigido com um novo campo `salario_min_atual` em `ResultadoRetificacao` (calculado a
  partir de `DATA_FIM`, com `salario_min` como retrocompatibilidade), usado pelas três telas afetadas.
- `npx tsc --noEmit`, `npm run test` e `npm run build` sem erros nas duas rodadas; confirmado ao vivo no
  navegador em 18/09/2026 (honorários simples: R$ 861,93 = 10% de R$ 8.619,33; escalonado: R$
  5.617.744,00 reconfirmado com `salario_min_atual`; "Nova declaração deste processo" testada de ponta a
  ponta, mantendo processo/autor e limpando os demais campos).
- Duas correções já confirmadas ao vivo pela contadoria na mesma reunião, sem pendência: o mês final
  fixo do juros SELIC ([ADR 011](011-corrigir-mes-final-fixo-do-juros-selic-na-retificacao.md)) e o
  botão de colar no número do processo (`docs/CHANGELOG.md`, 15/09/2026).

---

## Pendências relacionadas (fora do escopo desta decisão)

- **Painel administrativo**: o login admin existe, mas não leva a nenhuma tela de gestão das tabelas do
  sistema pela interface (Selic, faixas de IR, salário mínimo, valor da condenação) — pedido da
  contadoria, tratado como funcionalidade própria a planejar separadamente.
- **Segundo administrador**: convite ao contador para acesso administrativo ficou pendente de
  confirmação (e-mail não chegou a tempo da reunião).
- **Botão "Voltar" do relatório**: relato de que não retorna para a Retificação foi investigado em
  17/09/2026, mas os botões existentes (`ResultadoRetificacao.tsx:130`, `Resultado.tsx:88`) já navegam
  corretamente; sem uma transcrição clara de qual botão específico falha, nenhuma mudança foi aplicada.
  Pendente confirmar com a contadoria, no próprio sistema, qual botão apresenta o problema.
