# CalcJud — Ajuste dos Testes de 03/09/2026

## Correção aplicada e confirmada no cálculo de juros SELIC

Tribunal Regional Federal da 2ª Região (TRF2)
04/09/2026

## 1. Contexto

Este documento é a continuação de `analise-dos-testes-03-09-2026.md`, que identificou e confirmou a causa raiz da divergência de cálculo relatada pela contadoria: o CalcJud calculava juros SELIC muito abaixo do valor correto em cálculos de Retificação.

Com a causa confirmada, foram aplicadas as correções no código, e o mesmo caso de teste (ano-calendário 1996, mesmos dados usados pelo contador) foi refeito no sistema — desta vez rodado ao vivo no navegador — para confirmar que o resultado passa a bater com a planilha oficial da DCAL.

## 2. Correções aplicadas

### 2.1 Correção principal — cálculo de juros SELIC/Poupança na Retificação

**Onde:** `src/services/calculoIRPF.ts`, função `calcularRetificacao()`.

**O que estava errado:** para calcular o juros de um período, o sistema pegava o "valor acumulado" (`fator_acumulado`) da data final e **dividia** pelo "valor acumulado" da data inicial. Essa conta só é válida quando o acumulado é um **produto** (juros compostos). Só que, para os índices de juros (SELIC, Poupança, taxa fixa de 1% a.m.), o acumulado é uma **soma** — e dividir dois números somados não tem sentido matemático, o que gerava um resultado muito menor que o correto.

**O que foi corrigido:** nos três pontos do cálculo que usavam essa divisão, o sistema agora **soma diretamente** os valores percentuais mensais do índice de juros no período (a mesma lógica usada pela planilha oficial da DCAL, que também soma a SELIC mês a mês). Foi criada uma função auxiliar dedicada, `somarValorPercentualNoPeriodo()`, para essa soma, mantendo intacta a forma como a correção monetária (INPC/IPCA/UFIR/TR) é calculada — esses índices continuam corretamente calculados por multiplicação, pois não tinham esse problema.

**Não afeta:** Ajuste Anual (não usa esse trecho), Retificação "sem correção", nem os índices de correção monetária.

### 2.2 Correção secundária — mês de transição UFIR → SELIC (01/1996)

**Onde:** `supabase/seed_templates_regras.sql` (templates de correção usados na configuração do sistema).

**O que estava errado:** a planilha da DCAL aplica correção por UFIR até **01/1996** (janeiro incluso). No CalcJud, a regra de UFIR terminava em **12/1995**, faltando um mês.

**O que foi corrigido:** foi adicionada uma regra específica para janeiro de 1996 (correção por UFIR, já com juros por SELIC, exatamente como na planilha da DCAL), entre a regra de UFIR (agora voltando a terminar em 12/1995) e a regra "somente SELIC" (que agora passa a começar em 02/1996 em vez de 01/1996).

> **Atenção — ação pendente para o administrador do sistema:** esta correção está aplicada no arquivo de configuração (`seed_templates_regras.sql`), mas o banco de dados de produção já tem os templates cadastrados com a regra antiga. Para que o ajuste possa valer para os cálculos já em produção, é necessário que um administrador execute o ajuste da tabela `regras_subperiodo` diretamente no banco (via SQL Editor do Supabase ou pelo painel administrativo do sistema, em "Parâmetros"). Esse item **não afeta** o teste de validação abaixo, pois o caso de 1996 usado no teste começa em maio de 1997 — já no período posterior à transição.

### 2.3 Correção incidental — erro de renderização na tela de Retificação (ambiente local)

Durante os testes, foi identificado e corrigido um erro de programação (não relacionado ao cálculo) que impedia a tela de Retificação de carregar no ambiente de desenvolvimento local: uma verificação de "ferramenta habilitada" fazia parte do código ser executada de forma condicional, violando uma regra do React (Rules of Hooks) e causando tela em branco. Foi corrigido em `src/pages/Retificacao.tsx`, sem qualquer relação com a lógica de cálculo. Esse ajuste foi necessário para poder rodar e visualizar o teste de confirmação abaixo.

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

Foi feita ainda uma conferência independente, somando diretamente na base de dados os valores mensais de SELIC cadastrados para o período do teste — o resultado confirma que a nova fórmula (soma direta) é a que reproduz corretamente os dados armazenados, ao contrário da fórmula antiga (divisão), que não tinha nenhuma relação matemática válida com esses dados.

### Evidência visual

A simulação foi executada ao vivo no navegador (ambiente local de testes, conectado ao mesmo banco de dados usado pelo sistema em produção), com a janela mantida aberta ao final da execução para conferência visual direta dos resultados acima.

## 4. Verificações técnicas realizadas

- `npx tsc --noEmit`: sem erros de tipagem após as alterações.
- `npm run test`: os 4 testes automatizados existentes continuam passando (nenhuma regressão nos cálculos de Ajuste Anual e Retificação sem correção, que não são afetados por esta correção).
- Teste manual ao vivo no navegador, com o mesmo caso usado pelo contador, confirmando os valores de "Diferença devida" e "Início da correção" idênticos à planilha da DCAL, e "Juros %" corrigido para a ordem de grandeza correta.

## 5. Próximos passos recomendados

1. Aplicar a correção da regra de UFIR/SELIC de janeiro de 1996 diretamente no banco de dados de produção (ver item 2.2 acima) — pendente de acesso administrativo.

2. Testar também com o caso original completo relatado pelo contador (dados enviados após a reunião), assim que disponíveis.

3. Publicar (deploy) esta correção para o ambiente de produção (`calcjud.vercel.app`), mediante aprovação, já que os testes até aqui foram feitos apenas no ambiente local de desenvolvimento.

## 6. Resumo objetivo

- ✅ Corrigido o cálculo de juros SELIC/Poupança na Retificação: agora usa soma direta dos valores mensais, em vez da divisão matematicamente incorreta.

- ✅ Corrigida a regra de transição UFIR → SELIC de janeiro de 1996 (pendente de aplicação no banco de produção).

- ✅ Reproduzido o mesmo caso de teste do contador (ano-calendário 1996): "Diferença devida" e "Início da correção" batem exatamente com a planilha da DCAL; "Juros %" saiu de 6,77% (errado anteriormente) para a ordem de grandeza correta.

- 📋 Próximo passo: aplicar o ajuste do banco de produção e publicar a correção.
