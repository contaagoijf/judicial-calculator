# CalcJud

## Resultado do Teste E2E

**Cálculo de Ajuste Anual do IRPF - Ajuste Anual 2020 - gabarito do example.test.ts**

Status: PASSOU

| Status | Duração | URL base | Gerado em | Pasta de resultados |
|---|---|---|---|---|
| PASSOU | 2.9s | https://calcjud.vercel.app | 31/08/2026, 18:35:12 | `\judicial-calculator\src\test` |

## Dados inputados no teste

### Dados do processo

| Campo | Valor |
|---|---|
| Número do processo | 0000000-00.2024.4.02.5101 |
| Nome do autor | Caso de teste - gabarito Vitest 2020 |

### Parâmetros do cálculo

| Campo | Valor |
|---|---|
| Tipo de declaração | Completa |
| Ano calendário | 2020 |

### Dados da declaração

| Campo | Valor |
|---|---|
| Rendimentos tributáveis | R$ 100.000,00 |
| Deduções legais | R$ 30.000,00 |
| Deduções de incentivo | R$ 10.000,00 |
| Imposto pago | R$ 3.817,68 |
| Imposto devido RRA | R$ 5.000,00 |
| Ajuste anual | R$ 0,00 |

### Alterações da declaração

| Campo | Somar | Subtrair |
|---|---|---|
| Rendimentos | R$ 5.000,00 | R$ 0,00 |
| Deduções legais | R$ 0,00 | R$ 2.000,00 |
| Deduções de incentivo | R$ 1.000,00 | R$ 0,00 |
| Imposto RRA | R$ 0,00 | R$ 2.000,00 |

## Resultado

**Processo:** 0000000-00.2024.4.02.5101 &nbsp;&nbsp; **Autor:** Caso de teste - gabarito Vitest 2020 &nbsp;&nbsp; **Ano:** 2020

**Valor a Restituir**

## R$ 1.075,00

### A — Tabela de alterações

| Descrição | Valor original | Acréscimo | Decréscimo | Recalculado |
|---|---|---|---|---|
| Rendimentos tributáveis | R$ 100.000,00 | R$ 5.000,00 | R$ 0,00 | R$ 105.000,00 |
| Deduções | R$ 30.000,00 | R$ 0,00 | R$ 2.000,00 | R$ 28.000,00 |
| Deduções de incentivo | R$ 10.000,00 | R$ 1.000,00 | R$ 0,00 | R$ 11.000,00 |
| Imposto RRA | R$ 5.000,00 | R$ 0,00 | R$ 2.000,00 | R$ 3.000,00 |
| Imposto pago | R$ 3.817,68 | R$ 0,00 | R$ 0,00 | R$ 3.817,68 |

### B — Cálculo

| Descrição | Valor |
|---|---|
| Total de rendimentos tributáveis (+) | R$ 105.000,00 |
| Total das deduções (-) | R$ 28.000,00 |
| Base de cálculo recalculado (=) | R$ 77.000,00 |
| Alíquota aplicável (x) | 27,5% |
| Parcela de dedução (-) | R$ 10.432,32 |
| Total das deduções de incentivo (-) | R$ 11.000,00 |
| Imposto devido RRA (+) | R$ 3.000,00 |
| Imposto devido (=) | R$ 2.742,68 |
| Total do imposto pago (-) | R$ 3.817,68 |
| Imposto a pagar / restituir | R$ 1.075,00 |

## Prints do teste

### Home

![Home](01-home.png)

### Formulario preenchido

![Formulario preenchido](02-formulario-preenchido.png)

### Resultado

![Resultado](03-resultado.png)
