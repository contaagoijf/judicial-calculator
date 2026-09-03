# CalcJud — Resumo para Reunião com a AGOI

## Testes preliminares de cálculo — apresentação dos primeiros resultados

Tribunal Regional Federal da 2ª Região (TRF2)
01/09/2026

## 1. Objetivo destes testes preliminares

O CalcJud substitui duas planilhas Excel que a contadoria (DCAL) usa manualmente há anos para calcular Ajuste Anual e Retificação de IRPF em processos judiciais. Um contador relatou uma **divergência** entre o resultado do CalcJud e o resultado esperado em um caso real, e apontou que a causa pode estar em dois lugares diferentes:

- na **fórmula de cálculo** implementada no sistema, ou
- na **base de índices/taxas** que a fórmula usa como entrada (SELIC, INPC, IPCA, TR, poupança, salário mínimo, faixas de IR).

Antes de investigar o caso específico relatado, o primeiro passo foi confirmar que o "motor de cálculo" do sistema funciona corretamente em cenários simples e já conhecidos — ou seja, estabelecer uma base de confiança mínima antes de procurar o erro. É isso que os dois testes preliminares abaixo fazem: eles rodam o CalcJud de ponta a ponta, do jeito que qualquer usuário usaria (pelo navegador, no site em produção), com dados de entrada já conferidos, e comparam o resultado apresentado na tela com o resultado que já sabíamos ser o correto.

**Importante:** esses dois testes preliminares **não reproduzem o caso relatado pelo contador** — eles usam casos de exemplo com dados já validados, apenas para confirmar que a lógica básica do sistema está funcionando. A investigação do caso relatado ainda depende de passos adicionais, explicados na seção 3.

## 2. O que cada teste demonstrou

### Por que o ano-calendário de 2020 foi usado como base destes testes

Os dois testes abaixo usam o **mesmo caso de exemplo, do ano-calendário de 2020**, em vez de dados de um processo real. Isso não foi uma escolha aleatória nem tem relação com o caso relatado pelo contador — a explicação é mais simples:

- Esse caso de 2020 já existia, **desde o início do desenvolvimento do sistema**, como um teste automatizado interno (rodado a cada atualização do código). Nele, todos os valores de entrada (rendimentos, deduções, alterações etc.) e o resultado esperado em cada etapa do cálculo (base de cálculo, alíquota, parcela de dedução, imposto devido, valor final) já estavam conferidos e documentados com precisão — é o único cenário do sistema com esse nível de detalhamento verificado, funcionando como um "gabarito" pronto.
- Como já existia um resultado certo e detalhado para conferir, foi o caso mais rápido e seguro para uma primeira verificação: em vez de criar um caso novo do zero (o que exigiria refazer as contas à mão para saber qual resultado esperar), reaproveitou-se esse gabarito já pronto.
- Usar exatamente os mesmos números do teste automatizado interno permite comparar **duas coisas ao mesmo tempo**: (1) se a fórmula de cálculo está correta — isso já era verificado pelo teste automatizado, que roda isolado, sem depender do site nem do banco de dados — e (2) se os dados de 2020 realmente cadastrados no sistema em produção (as faixas de alíquota e parâmetros daquele ano) também estão corretos. Como o resultado no site bateu exatamente com o valor já esperado, isso confirma as duas coisas juntas para esse ano.
- **Importante:** não é um caso real de nenhum contribuinte — é um exemplo com valores redondos, criado só para servir de conferência do sistema. E, como esse cenário de 2020 não envolve correção monetária/juros, ele não testa os índices (SELIC, INPC, IPCA, TR, poupança) — por isso a ressalva já feita na seção 2.3 continua valendo.

### 2.1 Teste 1 — Ajuste Anual do IRPF (ano-calendário 2020)

**Arquivo:** `Calculo-de-Ajuste-Anual-do-IRPF.md`

O teste simulou, no site em produção (calcjud.vercel.app), o preenchimento completo de um Ajuste Anual para o ano de 2020, com dados de entrada que já tinham um resultado esperado conferido de antemão (o mesmo caso usado como gabarito no teste automatizado de fórmula, ver seção 2.3 do documento técnico).

| Dado informado            | Valor         |
|---------------------------|---------------|
| Rendimentos tributáveis   | R$ 100.000,00 |
| Deduções legais           | R$ 30.000,00  |
| Deduções de incentivo     | R$ 10.000,00  |
| Imposto pago              | R$ 3.817,68   |
| Imposto devido RRA        | R$ 5.000,00   |
| Alterações aplicadas      | +R$ 5.000,00 rendimentos, -R$ 2.000,00 deduções, +R$ 1.000,00 incentivo, -R$ 2.000,00 RRA |

**Resultado no sistema: Valor a Restituir R$ 1.075,00 — idêntico ao valor esperado.**

**O que isso esclarece:** para um único ano-calendário, sem correção monetária envolvida, o CalcJud recalcula o imposto exatamente como esperado — a lógica de Ajuste Anual está correta para esse tipo de cenário.

### 2.2 Teste 2 — Retificação de dois anos (2019 e 2020), sem correção monetária

**Arquivo:** `Retificacao-2019-e-2020-sem-correção.md`

O teste simulou uma Retificação envolvendo dois anos-calendário (2019 e 2020) no mesmo processo, com o tipo de correção monetária definido como **"sem correção"** (isto é, sem aplicar nenhum índice de correção monetária — apenas o somatório das diferenças apuradas em cada ano).

| Resultado consolidado |   Valor     |
|-----------------------|-------------|
| Principal devido      | R$ 1.750,00 |
| Juros devido          | R$ 17,50    |
| Total da execução     | R$ 1.767,50 |
| Honorários (10%)      | R$ 175,00   |

**O que isso esclarece:** a lógica de **agregação de múltiplos anos** dentro de uma Retificação (somar as diferenças de cada ano, apurar totais e honorários) também está funcionando corretamente, pelo menos no cenário sem índices de correção monetária.

### 2.3 O que os dois testes, juntos, confirmam e o que eles ainda não respondem

- **Confirmam:** a lógica-base de cálculo do CalcJud (fórmula de Ajuste Anual e a agregação de anos da Retificação) reproduz corretamente resultados já conhecidos, quando **nenhum índice de correção monetária ou juros está em jogo**.

- **Não respondem:** nenhum dos dois testes usa os índices de correção monetária (SELIC, INPC, IPCA, TR, poupança) — que é justamente a hipótese levantada pelo próprio contador como possível origem do erro. Também não reproduzem o caso específico relatado por ele, porque os dados exatos desse caso ainda não foram recebidos pela equipe técnica.

Ou seja: os testes preliminares eliminam uma possibilidade (erro grosseiro na fórmula básica de cálculo), mas **não** eliminam a possibilidade mais provável levantada pelo contador, que está justamente na parte de correção monetária/juros — essa parte ainda precisa ser testada especificamente, como descrito a seguir.

## 3. Testes ainda pendentes: Frente A, Frente B e cruzamento dos resultados

**Estes testes ainda NÃO foram realizados.** Eles estão descritos no documento `CalcJud-Testes-de-Calculo-do-IRPF(guia-e-resultado-da-execucao).md` (seções 2.1 a 2.3) e são o próximo passo necessário para investigar a divergência relatada pelo contador.

### 3.1 Frente A — validar a fórmula isoladamente

Consiste em testar a fórmula de cálculo "no papel", usando números fixos e conhecidos (informados manualmente, sem depender de nenhum dado do banco do sistema) — de forma parecida com refazer a conta à mão ou numa planilha à parte, e comparar com o que o CalcJud calcula para os mesmos números. Isso já foi feito para o cenário sem correção (seção 2 acima); **ainda falta fazer especificamente para os casos com correção monetária e juros**, que é onde a fórmula é mais complexa e onde está a suspeita do contador.

**Por que importa:** se essa frente confirmar que a fórmula está certa mesmo em cenários com correção, isso descarta o código como causa do erro e direciona a investigação para os dados (Frente B).

### 3.2 Frente B — validar os dados de índice usados como entrada

Consiste em conferir se os valores de SELIC, INPC, IPCA, TR, poupança, salário mínimo e faixas de IR **cadastrados hoje no sistema** batem com as fontes oficiais (Banco Central, IBGE, Receita Federal), especificamente nos meses e anos do caso que apresentou divergência.

**Por que importa:** mesmo com a fórmula certa, se um índice estiver desatualizado, incompleto ou com o valor errado na base do sistema, o resultado final vai divergir do esperado — e esse tipo de erro só aparece comparando dado a dado com a fonte oficial, não testando a fórmula isoladamente.

### 3.3 Cruzamento dos dois resultados

Só depois de ter o resultado das Frentes A e B para o caso específico é possível concluir, com segurança, onde está o problema:

| Frente A (fórmula)                        | Frente B (dados)                               | Conclusão |
|-------------------------------------------|------------------------------------------------|-----------------------------------------------------------------------|
| Bate certinho                             | Diverge da fonte oficial num índice específico | O problema é na **base de dados**, não no código.                     |
| Diverge, mesmo com dados fixos conhecidos | Bate com a fonte oficial                       | O problema é na **fórmula** do sistema.                               |
| Bate isoladamente nas duas frentes        | O resultado na tela ainda diverge              | Problema provável de **integração** (dado errado sendo buscado,       |
                                                                                             | arredondamento) — só se resolve reproduzindo o caso completo.         |
|-------------------------------------------|------------------------------------------------|-----------------------------------------------------------------------|

**Por que importa:** sem esse cruzamento, qualquer correção feita corre o risco de atacar a causa errada — por exemplo, "consertar" a fórmula quando o problema real está num índice desatualizado, ou vice-versa.

## 4. Por que é essencial o contador informar os dados do cálculo que gerou o erro

Todas as três frentes acima (A, B e o cruzamento) só podem ser executadas para o **caso real que apresentou a divergência** — os testes preliminares deste documento usam casos de exemplo genéricos, exatamente porque os dados do caso relatado ainda não foram recebidos pela equipe técnica.

Para reproduzir o caso e isolar a causa da divergência, é necessário que o contador forneça:

- **Número do processo, ano(s)-calendário envolvido(s) e nome do autor** (ou dados equivalentes para identificação do caso).

- **Todos os dados de entrada** exatamente como foram informados no cálculo divergente: valores de rendimentos, deduções, deduções de incentivo, imposto pago, imposto sobre RRA, e todas as alterações (acréscimos/decréscimos) aplicadas, com datas.

- **O tipo de correção monetária utilizado** (SELIC, SELIC até 06/2009 + poupança, ou sem correção), data de ajuizamento/distribuição, e até quando o cálculo deveria ser atualizado.

- **Se possível, a memória de cálculo (demonstrativo) já gerada pela planilha antiga**, para o mesmo caso, para comparação número a número com o resultado do CalcJud.

Sem esses dados exatos, a equipe técnica só consegue testar cenários genéricos, como os dois testes preliminares apresentados na seção 2  que **não cobrem a parte de correção monetária/juros**, onde está a suspeita mais provável do próprio contador.

## 5. Resumo objetivo

- ✅ **2 testes preliminares concluídos e aprovados** (Ajuste Anual 2020 e Retificação sem correção monetária): confirmam que a lógica básica de cálculo do CalcJud está correta para esses cenários.

- ⏳ **Testes que miram diretamente o caso relatado (Frente A com correção monetária, Frente B e o cruzamento) ainda não foram realizados** — dependem dos dados exatos do caso divergente.

- 📋 **Próximo passo:** o contador enviar os dados completos do cálculo que apresentou a divergência (seção 4), para que a equipe técnica reproduza o caso e execute as Frentes A e B especificamente sobre ele.
