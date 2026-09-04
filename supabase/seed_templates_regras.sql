-- seed_templates_regras.sql
-- Insere templates_calculo e regras_subperiodo.
-- Deve ser executado após a populacao de public.indices_economicos.

WITH desired_templates (nome, descricao) AS (
  VALUES
    ('Template_1', 'Juros simples de 1% até 12/1995 e após, SELIC. Correção pelo INPC/IPCA/UFIR até 12/1995 e após, sem correção.'),
    ('Template_2', 'Juros simples de 1% até 12/1995, 01/1996 até 06/2009 SELIC e após, rendimento da poupança. Correção pelo INPC/IPCA/UFIR até 12/1995, 01/1996 até 06/2009 sem correção e após, pela TR.'),
    ('Template_3', 'Sem correção/juros')
)
INSERT INTO public.templates_calculo (nome, descricao)
SELECT nome, descricao
FROM desired_templates t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.templates_calculo tc
  WHERE tc.nome = t.nome
);

WITH regras_raw AS (
  SELECT *
  FROM (VALUES
    -- A planilha oficial da DCAL corrige por UFIR até 01/1996 (inclusive),
    -- mas os juros já passam a ser SELIC a partir de 01/1996 — janeiro/1996
    -- é um mês de transição (correção por UFIR, juros por SELIC), por isso
    -- vira uma regra própria (ordem 4) entre a regra 3 (UFIR+PERCENTUAL) e
    -- a regra 5 (sem correção monetária, só SELIC).
    ('Template_1', '1991-03-01'::date, '1991-11-01'::date, 'INPC', 'PERCENTUAL', true, true, 1),
    ('Template_1', '1991-12-01'::date, '1991-12-01'::date, 'IPCA', 'PERCENTUAL', true, true, 2),
    ('Template_1', '1992-01-01'::date, '1995-12-31'::date, 'UFIR', 'PERCENTUAL', true, true, 3),
    ('Template_1', '1996-01-01'::date, '1996-01-31'::date, 'UFIR', 'SELIC', true, true, 4),
    ('Template_1', '1996-02-01'::date, '2026-04-01'::date, NULL, 'SELIC', false, true, 5),

    ('Template_2', '1991-03-01'::date, '1991-11-01'::date, 'INPC', 'PERCENTUAL', true, true, 1),
    ('Template_2', '1991-12-01'::date, '1991-12-01'::date, 'IPCA', 'PERCENTUAL', true, true, 2),
    ('Template_2', '1992-01-01'::date, '1995-12-31'::date, 'UFIR', 'PERCENTUAL', true, true, 3),
    ('Template_2', '1996-01-01'::date, '1996-01-31'::date, 'UFIR', 'SELIC', true, true, 4),
    ('Template_2', '1996-02-01'::date, '2009-06-30'::date, NULL, 'SELIC', false, true, 5),
    ('Template_2', '2009-07-01'::date, '2026-04-01'::date, 'TR', 'POUPANCA', false, true, 6),

    ('Template_3', '1991-01-01'::date, '2026-04-01'::date, NULL, NULL, false, false, 1)
  ) AS v(nome_template, data_inicio_vigencia, data_fim_vigencia, sigla_correcao, sigla_juros, aplicar_correcao, aplicar_juros, ordem)
), regras_joined AS (
  SELECT
    t.id AS id_template,
    r.data_inicio_vigencia,
    r.data_fim_vigencia,
    idx_corr.id AS id_indice_correcao,
    idx_juros.id AS id_indice_juros,
    r.aplicar_correcao,
    r.aplicar_juros,
    r.ordem
  FROM regras_raw r
  JOIN public.templates_calculo t ON t.nome = r.nome_template
  LEFT JOIN public.indices_economicos idx_corr ON idx_corr.sigla = r.sigla_correcao
  LEFT JOIN public.indices_economicos idx_juros ON idx_juros.sigla = r.sigla_juros
)
INSERT INTO public.regras_subperiodo (
  id_template,
  data_inicio_vigencia,
  data_fim_vigencia,
  id_indice_correcao,
  id_indice_juros,
  aplicar_correcao,
  aplicar_juros,
  ordem
)
SELECT
  id_template,
  data_inicio_vigencia,
  data_fim_vigencia,
  id_indice_correcao,
  id_indice_juros,
  aplicar_correcao,
  aplicar_juros,
  ordem
FROM regras_joined r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.regras_subperiodo existing
  WHERE existing.id_template = r.id_template
    AND existing.data_inicio_vigencia = r.data_inicio_vigencia
    AND existing.data_fim_vigencia = r.data_fim_vigencia
    AND existing.id_indice_correcao IS NOT DISTINCT FROM r.id_indice_correcao
    AND existing.id_indice_juros IS NOT DISTINCT FROM r.id_indice_juros
    AND existing.aplicar_correcao = r.aplicar_correcao
    AND existing.aplicar_juros = r.aplicar_juros
    AND existing.ordem = r.ordem
);
