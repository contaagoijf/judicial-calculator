-- Cadastra os meses de SELIC ainda faltantes na base (identificados em 14/09/2026:
-- abril a agosto de 2026), para eliminar a diferença residual apontada pelo
-- contador entre o percentual de Juros/Selic do sistema e da planilha oficial.
--
-- SUBSTITUA os valores 0.00 abaixo pelo percentual mensal oficial da SELIC
-- (Banco Central / planilha da DCAL) de cada mês, antes de executar. Não
-- inventar/estimar esses valores — usar sempre a taxa oficial publicada.
--
-- Basta informar o id_indice e o valor_percentual de cada mês: fator_multiplicador
-- e fator_acumulado são recalculados automaticamente pelos triggers já existentes
-- em taxas_historicas (on_taxas_historicas_before_write / _after_write, ver
-- supabase/schema.sql), então não precisam ser calculados manualmente aqui.
--
-- Este mesmo modelo serve como procedimento padrão para cadastrar qualquer mês
-- futuro da SELIC (ou de outro índice): um INSERT com id_indice, data_referencia
-- (sempre o dia 1º do mês) e valor_percentual, com ON CONFLICT para o caso de já
-- existir uma linha para aquele mês (reexecução segura, idempotente).

INSERT INTO public.taxas_historicas (id_indice, data_referencia, valor_percentual)
SELECT idx.id, v.data_referencia, v.valor_percentual
FROM (VALUES
  ('2026-04-01'::date, 0.00::numeric),  -- TODO: taxa oficial SELIC de abril/2026
  ('2026-05-01'::date, 0.00::numeric),  -- TODO: taxa oficial SELIC de maio/2026
  ('2026-06-01'::date, 0.00::numeric),  -- TODO: taxa oficial SELIC de junho/2026
  ('2026-07-01'::date, 0.00::numeric),  -- TODO: taxa oficial SELIC de julho/2026
  ('2026-08-01'::date, 0.00::numeric)   -- TODO: taxa oficial SELIC de agosto/2026
) AS v(data_referencia, valor_percentual)
CROSS JOIN LATERAL (SELECT id FROM public.indices_economicos WHERE sigla = 'SELIC') AS idx
ON CONFLICT (id_indice, data_referencia) DO UPDATE
SET valor_percentual = EXCLUDED.valor_percentual;

-- Conferência recomendada após executar (deve trazer os 5 meses acima, cada um
-- já com fator_multiplicador/fator_acumulado preenchidos pelo trigger):
--
-- SELECT data_referencia, valor_percentual, fator_multiplicador, fator_acumulado
-- FROM public.taxas_historicas t
-- JOIN public.indices_economicos i ON i.id = t.id_indice
-- WHERE i.sigla = 'SELIC' AND t.data_referencia >= '2026-04-01'
-- ORDER BY t.data_referencia;
