# CalcJud — Obter e atualizar as taxas mensais da SELIC

Tribunal Regional Federal da 2ª Região (TRF2)
14/09/2026

## 1. Contexto

O CalcJud guarda, na tabela `taxas_historicas`, o percentual mensal da SELIC
usado no cálculo de juros das Retificações. Essa tabela precisa ser atualizada
periodicamente com os meses mais recentes. O Banco Central só publica a taxa
de um mês depois que ele termina, então a base do sistema sempre vai ficar
alguns meses atrás da data atual até alguém rodar essa atualização.

Este documento explica onde conseguir o percentual oficial de qualquer mês da
SELIC e como cadastrá-lo no banco, sem precisar calcular nada manualmente.

## 2. Fonte oficial

**Banco Central do Brasil — Sistema Gerenciador de Séries Temporais (SGS)**

- Série usada: **4390** — "Taxa de juros - Selic acumulada no mês".
- Essa é a mesma convenção (percentual mensal, não anualizado) já usada em
  todos os meses hoje cadastrados na tabela `taxas_historicas`.
- A API é **pública**, não exige chave nem autenticação.
- Consulta manual (para conferir no navegador): <https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do?method=prepararTelaLocalizarSeries> — buscar pelo código **4390**.

### URL da API (formato JSON)

```
https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA
```

- `dataInicial` e `dataFinal`: sempre no formato `DD/MM/AAAA`. Pode usar o dia
  1º de cada mês (ex.: `01/04/2026`) — a série já é mensal, então o dia exato
  não importa, só o mês e o ano.
- Exemplo (abril a agosto de 2026):

  ```
  https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados?formato=json&dataInicial=01/04/2026&dataFinal=31/08/2026
  ```

## 3. Passo a passo para consultar

1. Monte a URL da API (seção 2) com o intervalo de meses que falta cadastrar
   — dá pra conferir o que já existe na base com a consulta abaixo, direto no
   SQL Editor do Supabase:

   ```sql
   SELECT MAX(data_referencia) AS ultimo_mes_cadastrado
   FROM public.taxas_historicas t
   JOIN public.indices_economicos i ON i.id = t.id_indice
   WHERE i.sigla = 'SELIC';
   ```

2. Abra a URL montada no navegador, ou peça para alguém com acesso a
   ferramentas de requisição (`curl`, PowerShell `Invoke-RestMethod`, Postman
   etc.) buscar o conteúdo, apenas um GET simples, sem corpo e sem cabeçalhos
   especiais.
3. A resposta é uma lista de objetos `{"data": "DD/MM/AAAA", "valor": "X.XX"}`,
   um por mês, exatamente na ordem cronológica pedida. Exemplo de resposta:

   ```json
   [
     {"data": "01/04/2026", "valor": "1.09"},
     {"data": "01/05/2026", "valor": "1.07"},
     {"data": "01/06/2026", "valor": "1.12"},
     {"data": "01/07/2026", "valor": "1.22"},
     {"data": "01/08/2026", "valor": "1.09"}
   ]
   ```

4. **Conferência recomendada antes de usar os dados**: peça a mesma série para
   um intervalo que já está cadastrado no banco (ex.: os 3 meses anteriores ao
   último cadastrado) e compare, os valores devolvidos pela API têm que bater
   exatamente com o que já existe em `taxas_historicas`. Se bater, confirma
   que é a série certa; se não bater, pare e não use os dados sem entender a
   diferença primeiro.
5. Guarde os valores obtidos num arquivo de referência (ex.:
   `supabase/migrations/percentuais.txt`), citando a URL usada e a data em que
   foram consultados para manter rastreável de onde veio cada número.

## 4. Como cadastrar os valores no banco

Não é preciso calcular `fator_multiplicador` nem `fator_acumulado` à mão, a
tabela `taxas_historicas` já tem triggers (`on_taxas_historicas_before_write` /
`_after_write`, ver `supabase/schema.sql`) que recalculam essas duas colunas
sozinhos sempre que uma linha é inserida ou alterada. Basta informar
`id_indice`, `data_referencia` (sempre o dia 1º do mês) e `valor_percentual`.

Modelo de script (idempotente — pode rodar de novo sem duplicar nem quebrar
nada, graças ao `ON CONFLICT`):

```sql
INSERT INTO public.taxas_historicas (id_indice, data_referencia, valor_percentual)
SELECT idx.id, v.data_referencia, v.valor_percentual
FROM (VALUES
  ('2026-04-01'::date, 1.09::numeric),
  ('2026-05-01'::date, 1.07::numeric)
  -- ... um por mês obtido na seção 3
) AS v(data_referencia, valor_percentual)
CROSS JOIN LATERAL (SELECT id FROM public.indices_economicos WHERE sigla = 'SELIC') AS idx
ON CONFLICT (id_indice, data_referencia) DO UPDATE
SET valor_percentual = EXCLUDED.valor_percentual;
```

Um exemplo completo, já com os meses de abril a agosto de 2026 preenchidos,
está em `supabase/migrations/20260914000000_atualizar_taxas_selic_2026.sql` —
serve de modelo para a próxima atualização, só trocando as datas e os valores.

## 5. Conferência depois de aplicar

```sql
SELECT data_referencia, valor_percentual, fator_multiplicador, fator_acumulado
FROM public.taxas_historicas t
JOIN public.indices_economicos i ON i.id = t.id_indice
WHERE i.sigla = 'SELIC'
ORDER BY data_referencia DESC
LIMIT 10;
```

Confirme que os meses novos aparecem com `fator_multiplicador` e
`fator_acumulado` já preenchidos (não nulos, não zerados), isso indica que os
triggers rodaram corretamente.

## 6. Frequência recomendada

Como o Banco Central publica a SELIC do mês só depois que ele termina, o ideal
é rodar esse procedimento uma vez por mês (ou sempre que uma Retificação usar
uma data de cálculo mais recente do que o último mês cadastrado), para evitar
que o sistema fique sistematicamente alguns meses atrasado em relação à
planilha oficial de referência.
