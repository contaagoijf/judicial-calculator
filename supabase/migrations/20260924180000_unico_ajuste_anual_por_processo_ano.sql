-- Impede duplicidade de declaracao de ajuste_anual para o mesmo processo/ano-calendario a nivel de
-- banco, fechando uma condicao de corrida entre a checagem feita em Resultado.tsx (SELECT antes do
-- INSERT) e o INSERT em si -- duas chamadas concorrentes (duplo clique, duas abas abertas) podiam
-- passar pela mesma checagem antes de qualquer uma delas commitar o INSERT. Ver ADR 017.
--
-- IMPORTANTE: antes de aplicar esta migracao em producao, resolver manualmente qualquer duplicata ja
-- existente (ver ADR 017) -- o CREATE UNIQUE INDEX falha se houver linhas duplicadas na tabela.
CREATE UNIQUE INDEX IF NOT EXISTS idx_calculos_ajuste_anual_unico
ON public.calculos (numero_processo, ano_calendario)
WHERE tipo_calculo = 'ajuste_anual';
