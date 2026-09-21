# CalcJud

## Guia de Testes de Cálculo

*Ajuste Anual e Retificação de IRPF*

Tribunal Regional Federal da 2ª Região (TRF2)
31/08/2026 (compactado em 21/09/2026)

## Sumário

- [Objetivo deste documento](#objetivo-deste-documento)
- [1. Planilhas de referência (irpfanual.xlt e ir-recalculo.xlt)](#1-planilhas-de-referência-irpfanualxlt-e-ir-recalculoxlt)
- [2. Metodologia de investigação: Frente A (fórmula) e Frente B (dados)](#2-metodologia-de-investigação-frente-a-fórmula-e-frente-b-dados)
- [3. Testes preliminares já confirmados em produção](#3-testes-preliminares-já-confirmados-em-produção)
- [4. Credenciais do Supabase para rodar localmente](#4-credenciais-do-supabase-para-rodar-localmente)
- [5. Testes automatizados (Vitest e Playwright)](#5-testes-automatizados-vitest-e-playwright)
- [6. Deploy e acesso à Vercel](#6-deploy-e-acesso-à-vercel)

## Objetivo deste documento

Reúne o levantamento feito para apoiar os testes de cálculo do sistema **CalcJud** (Ajuste Anual e
Retificação), a metodologia usada para investigar divergências relatadas pela contadoria, e o passo a
passo para rodar o projeto localmente. A investigação original (divergência de juros SELIC/Poupança na
Retificação) já foi concluída — ver [ADR 007](007-corrigir-calculo-de-juros-selic-na-retificacao.md) —
mas a metodologia e as instruções de ambiente aqui continuam válidas para futuras investigações.

## 1. Planilhas de referência (irpfanual.xlt e ir-recalculo.xlt)

Os dois arquivos estão em [`docs/reference/planilhas/`](../reference/planilhas/), protegidos por senha
de abertura (RC4). A senha `scasca` recebida **não** é a senha de abertura do arquivo — é a senha do
projeto VBA (Alt+F11), usada só para ver o código-fonte das macros por trás dos botões de cálculo (útil
para comparar com `calculoIRPF.ts`).

As macros já foram destravadas cadastrando a pasta `docs/reference/planilhas` como **Local Confiável**
no Excel (Arquivo → Opções → Central de Confiabilidade → Locais Confiáveis) — mais seguro que "Habilitar
todas as macros", que libera macros para qualquer arquivo aberto depois. Se as opções estiverem
bloqueadas (cinza), a política de macros é controlada por GPO do TRF2 e exige acionar a equipe de TI.

## 2. Metodologia de investigação: Frente A (fórmula) e Frente B (dados)

Uma divergência de cálculo pode ter duas origens: a **fórmula** em si, ou a **base de índices/taxas**
usada como entrada (SELIC, INPC, IPCA, TR, poupança, salário mínimo, faixas de IR). Para isolar a causa,
a investigação se divide em duas frentes independentes:

- **Frente A — validar a fórmula isoladamente:** testar com dados fixos e conhecidos, sem depender do
  banco (testes Vitest — ver seção 5). Se bate com o esperado, a fórmula está correta para o cenário.
- **Frente B — validar os dados de índice:** conferir se os valores cadastrados em produção
  (`indices_economicos`, `taxas_historicas`, `ir_faixas`, `ir_parametros`, `salario_minimo`) batem com
  as fontes oficiais (BACEN, IBGE, Receita Federal), focando nos meses/anos do caso divergente. Consulta
  rápida sem painel do Supabase:

  ```bash
  curl "https://xitpsqtcxraejzlxvvmn.supabase.co/rest/v1/taxas_historicas?select=data_referencia,valor_percentual,fator_acumulado,indices_economicos(sigla)&order=data_referencia.desc&limit=20" \
    -H "apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>"
  ```

**Cruzamento dos resultados:**

| Frente A (fórmula) | Frente B (dados) | Conclusão |
|---|---|---|
| Bate certinho | Diverge da fonte oficial | Problema na **base de dados**. |
| Diverge, mesmo com dados fixos | Bate com a fonte oficial | Problema na **fórmula** (`calculoIRPF.ts`). |
| Bate isoladamente nas duas | O resultado na tela ainda diverge | Problema de **integração** — reproduzir o caso completo com os dados exatos do contador. |

Essa metodologia foi a usada para encontrar a causa da divergência de juros SELIC/Poupança documentada
no [ADR 007](007-corrigir-calculo-de-juros-selic-na-retificacao.md).

## 3. Testes preliminares já confirmados em produção

Dois cenários com resultado já conhecido (mesmo caso do teste automatizado interno,
`src/test/example.test.ts`) foram reproduzidos manualmente no site em produção, sem envolver índices de
correção monetária:

- **Ajuste Anual 2020**: rendimentos R$ 100.000,00, deduções R$ 30.000,00, incentivo R$ 10.000,00,
  imposto pago R$ 3.817,68, RRA R$ 5.000,00, com alterações aplicadas → **Valor a Restituir R$
  1.075,00**, idêntico ao esperado.
- **Retificação 2019+2020, sem correção monetária**: principal devido R$ 1.750,00, juros R$ 17,50,
  total da execução R$ 1.767,50, honorários (10%) R$ 175,00 — confirma que a agregação de múltiplos anos
  também funciona corretamente.

Isso confirma a lógica-base de cálculo quando **nenhum índice de correção monetária ou juros está em
jogo** — não cobre a Frente A com correção monetária, que é onde a divergência de juros SELIC foi
encontrada depois (seção 2 e ADR 007). Os parâmetros fiscais (`ir_parametros`/`ir_faixas`) cobrem hoje
os anos-calendário de 1990 a 2025; um teste com 2026 em diante falha com "Parâmetros não encontrados"
(mensagem esperada, não é bug).

## 4. Credenciais do Supabase para rodar localmente

As credenciais já estão versionadas no repositório — não é preciso pedir a ninguém. Estão fixas
(hardcoded) em `src/integrations/supabase/externalClient.ts` (é esse arquivo, não o `.env`, que a
aplicação realmente usa) e também em `.env.example`/`.env` (placeholder genérico desde 16/09/2026 — ver
[ADR 010](010-migrar-credenciais-versionadas-para-variaveis-de-ambiente.md)). É a chave pública **anon**
do Supabase, protegida por RLS — não é um segredo de administrador.

```bash
git clone https://github.com/contaagoijf/judicial-calculator
cd judicial-calculator
npm install
cp .env.example .env    # preencha com as credenciais do projeto Supabase (ver ADR 003, seção 2)
npm run dev
```

Servidor sobe em `http://localhost:8080`.

## 5. Testes automatizados (Vitest e Playwright)

- **Unitários (Vitest)**: validam as fórmulas de `src/services/calculoIRPF.ts` isoladamente (Frente A),
  sem navegador nem banco. `npm run test` (ou `test:watch` para modo interativo). Para um novo cenário,
  copie um bloco `it(...)` de `src/test/example.test.ts` e ajuste os dados — ou crie um arquivo
  `.test.ts` novo em `src/test/` para não misturar com o teste original.
- **End-to-end (Playwright)**: configurado, mas **não funcional neste ambiente** —
  `playwright.config.ts`/`playwright-fixture.ts` importam `lovable-agent-playwright-config`, um pacote
  privado da plataforma Lovable (usada no desenvolvimento original) que não existe no registro público
  do npm. Corrigir trocando essa importação por uma configuração padrão com `@playwright/test` (já
  instalado). Enquanto isso, testar manualmente pelo navegador em
  <https://calcjud.vercel.app/calculo/ajuste-anual> e `/calculo/retificacao`.

## 6. Deploy e acesso à Vercel

Acesso à Vercel só é necessário para publicar uma correção de código — não para testar os cálculos já
publicados em produção, que já são públicos. As variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
não estão configuradas no projeto Vercel hoje, o que não afeta a produção (ver seção 4). Para solicitar
acesso: peça um convite de membro ao *owner* do time Vercel (associado ao GitHub
`contaagoijf/judicial-calculator`), em Settings → Members → Invite Member.
