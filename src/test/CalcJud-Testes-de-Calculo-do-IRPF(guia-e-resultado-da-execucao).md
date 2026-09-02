# CalcJud — Testes de Cálculo do IRPF (guia e resultado da execução)

## Objetivo

Guiar e registrar a validação da lógica de cálculo de IRPF do CalcJud (`src/services/calculoIRPF.ts`), usada nos módulos:

- **Ajuste Anual** — recálculo de um único ano-calendário.
- **Retificação** — recálculo multi-ano com correção monetária e juros.

O contador que solicitou os testes relatou que uma divergência encontrada pode estar **na fórmula de cálculo ou na base de índices/taxas** usada por ela (SELIC, INPC, IPCA, TR, poupança, salário mínimo, faixas de IR) — por isso os testes abaixo separam essas duas frentes.

## 1. Planilhas de referência (gabarito)

Arquivos: `docs/irpfanual.xlt` (Ajuste Anual) e `docs/ir-recalculo.xlt` (Retificação/recálculo), com o manual `docs/manualir.pdf`.

**Status: acessíveis.** As duas planilhas contêm macros VBA e chegaram a bloquear a execução das macros ao clicar em botões ("Não é possível executar a macro '...!b_cadastro'..."). Isso foi resolvido cadastrando a pasta `docs` como **Local Confiável** no Excel:

`Arquivo → Opções → Central de Confiabilidade → Configurações da Central de Confiabilidade → Locais Confiáveis → Adicionar novo local → OK`

Com isso as planilhas abrem e executam normalmente — podem ser usadas como gabarito para conferir os cálculos, e o código VBA por trás dos botões (Alt+F11 no Excel, com a senha de projeto já obtida) pode ser comparado diretamente com `calculoIRPF.ts`.

> Se o teste for repetido em outra máquina, o cadastro de Local Confiável precisa ser refeito lá (é uma configuração local do Excel, não do arquivo).

## 2. Cálculo × base de índices — como isolar o erro

### 2.1 Frente A — validar a fórmula (isolada, sem depender de nenhum dado externo)

Os testes Vitest (seção 4) já fazem isso: `ir_faixas` e `ir_parametros` são passados como **constantes fixas dentro do próprio teste**, não vêm de nenhum banco.

- Se o Vitest confirma o resultado esperado para um cenário **sem correção monetária** (`SEM_CORRECAO`), a lógica de Ajuste Anual está correta para esse caso — nenhum índice de correção/juros está envolvido.
- Para a **Retificação com correção**, crie um teste Vitest informando manualmente (como constante, no próprio teste) as taxas/fatores de um índice e período conhecidos — isso confere a fórmula de correção/juros (`calcularRetificacao`) isoladamente.
- Compare também com o código VBA das planilhas (seção 1) — é a forma mais direta de conferir se o CalcJud reproduz exatamente a mesma fórmula da planilha oficial.

### 2.2 Frente B — validar os dados de índice usados como entrada

Se a fórmula (Frente A) bater certinho com dados conhecidos, mas o resultado na tela ainda divergir, o problema pode estar nos **dados** de referência usados pelo cálculo, não na fórmula: `indices_economicos`, `taxas_historicas`, `ir_faixas`, `ir_parametros`, `salario_minimo`. Compare os valores usados no caso divergente contra fontes oficiais (SELIC/TR — BACEN; INPC/IPCA — IBGE; salário mínimo — decretos oficiais; faixas de IR — tabelas anuais da Receita Federal; UFIR — série histórica do período jan/1992–dez/1995), focando nos meses/anos exatos do caso relatado pelo contador, em vez de tentar validar a série inteira de uma vez.

### 2.3 Como cruzar os dois resultados

| Frente A (fórmula) | Frente B (dados) | Conclusão |
|---|---|---|
| Bate certinho | Diverge da fonte oficial num índice específico | O problema é na **base de dados** (índice/taxa/faixa), não no código. |
| Diverge, mesmo com dados fixos fornecidos por você | Bate com a fonte oficial | O problema é na **fórmula**, em `src/services/calculoIRPF.ts`. |
| Bate isoladamente nas duas frentes | O resultado na tela ainda diverge | Provável erro de **integração** (mês/ano errado buscado, arredondamento) — peça ao contador os números exatos do caso para reproduzir ponta a ponta. |

## 3. Pontos de atenção para os testes locais

1. A lógica de cálculo é **100% determinística e roda no front-end** — não depende de rede nem de banco para as fórmulas em si; por isso o Vitest é a ferramenta mais rápida para isolar um caso.
2. `ir_parametros`/`ir_faixas` cobrem os anos-calendário de **1990 a 2025**. Não monte casos de teste para 2026 em diante (não há parâmetros cadastrados para esses anos).
3. **Não existem** exemplos numéricos oficiais prontos no documento de especificação funcional do projeto original (foi verificado diretamente: só há tabelas de fórmulas e mockups de tela vazios, sem valores em R$). Não trate nenhum número "de memória" como gabarito sem confirmar a origem.
4. **Único gabarito numérico já confirmado e versionado no repositório**: o caso em [example.test.ts](example.test.ts) (Ajuste Anual, ano 2020, declaração completa), com todos os valores de entrada e o resultado esperado já calculado e conferido (`imposto_a_pagar = 1075`, etc.).

## 4. Testes unitários (Vitest) — passo a passo

1. Instalar dependências (se ainda não tiver feito): `npm install`.
2. Rodar os testes uma vez:
   ```bash
   npm run test
   ```
   ou, para o detalhamento por teste:
   ```bash
   npx vitest run --reporter=verbose
   ```
3. Modo observação (reexecuta ao salvar), útil durante o desenvolvimento de um caso:
   ```bash
   npm run test:watch
   ```
4. **Para testar um novo cenário** (ex.: o caso relatado pelo contador, ou um caso extraído da planilha já acessível — seção 1): abra [example.test.ts](example.test.ts), copie um bloco `it(...)` existente, ajuste `dados`, `faixas` e `parametros` para o cenário, chame `calcularAjusteAnual` ou `calcularRetificacao`, e compare o resultado com o valor que você já sabe que está correto (planilha, legislação ou relato do contador).
5. Alternativa sem alterar o arquivo original: criar um novo arquivo em `src/test/` (ex.: `src/test/meus-casos.test.ts`) com os cenários próprios, sem misturar com `example.test.ts`.

## 5. Resultado da última execução

### Ambiente de execução

| Item | Valor |
|---|---|
| Diretório | `...\judicial-calculator` |
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| Vitest | 3.2.7 (win32-x64) |
| Comando executado | `npx vitest run --reporter=verbose` (equivalente a `npm run test`, com detalhamento por teste) |

### Resultado por teste

| Arquivo | Suíte | Teste | Resultado | Tempo |
|---|---|---|---|---|
| `src/test/example.test.ts` | `calcularAjusteAnual` | reproduz corretamente o caso de ajuste anual de 2020 | ✅ PASSOU | 1ms |
| `src/test/example.test.ts` | `calcularAjusteAnual` | valida a consistência entre imposto devido original, ajuste anual e imposto pago | ✅ PASSOU | 0ms |
| `src/test/example.test.ts` | `calcularAjusteAnual` | identifica inconsistência quando ajuste anual e imposto pago não fecham com o imposto devido original | ✅ PASSOU | 0ms |
| `src/test/example.test.ts` | `calcularRetificacao` | agrega corretamente resultados de mais de um ano | ✅ PASSOU | 1ms |

```
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.7

 ✓ src/test/example.test.ts (4 tests) 4ms
   ✓ calcularAjusteAnual > reproduz corretamente o caso de ajuste anual de 2020 1ms
   ✓ calcularAjusteAnual > valida a consistência entre imposto devido original, ajuste anual e imposto pago 0ms
   ✓ calcularAjusteAnual > identifica inconsistência quando ajuste anual e imposto pago não fecham com o imposto devido original 0ms
   ✓ calcularRetificacao > agrega corretamente resultados de mais de um ano 1ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
  Start at   17:35:39
  Duration   1.12s (transform 59ms, setup 112ms, collect 66ms, tests 4ms, environment 539ms, prepare 152ms)
```

### Resumo

- **Arquivos de teste**: 1 (`src/test/example.test.ts`) — é o único arquivo de teste existente no repositório no momento desta execução.
- **Testes**: 4 de 4 passaram (100%).
- **Duração total**: ~1,12s.
- **Nenhuma falha ou erro** foi observado nesta execução.

### O que essa execução cobre (e o que não cobre)

- Cobre o gabarito já validado e versionado, o caso de Ajuste Anual do ano 2020, e a agregação de retificação sem correção monetária (`SEM_CORRECAO`) para dois anos.
- **Não cobre** o caso específico relatado pelo contador (ainda não reproduzido em um teste, por falta dos dados exatos de entrada) nem casos de Retificação **com** correção monetária/juros (SELIC, SELIC+poupança) — ambos continuam pendentes, conforme os itens 2 e 3 do checklist (seção 6).
- Portanto, este resultado confirma que a **lógica-base já implementada está estável** (Frente A, para os cenários já cobertos), mas ainda não isola a causa da divergência relatada pelo contador — os próximos passos continuam sendo os do checklist abaixo.

## 6. Checklist

1. [x] Planilhas de referência acessíveis (Local Confiável configurado) — seção 1.
2. [x] Frente A: testar a fórmula isolada via Vitest, com dados fixos — seção 2.1 (4/4 testes passaram, seção 5).
3. [ ] Reproduzir o caso relatado pelo contador (mesmos dados de entrada).
4. [ ] Frente B: comparar os índices/taxas do caso com as fontes oficiais — seção 2.2.
5. [ ] Cruzar os dois resultados (tabela da seção 2.3) para concluir onde está o erro.
6. [ ] Reportar a conclusão e o caso de entrada completo para reprodução.
