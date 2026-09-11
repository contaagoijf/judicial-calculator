-- Permite que administradores editem ou removam registros da tabela `calculos`.
-- Até aqui só existiam políticas de SELECT (público) e INSERT (público) para
-- essa tabela; UPDATE/DELETE eram bloqueados por padrão pelo RLS, mesmo para
-- um usuário logado como administrador (public.is_admin()).
--
-- Necessário para a tela de listagem de processos (/calculo/listaprocessos),
-- que permite a um administrador remover uma declaração cadastrada.

DROP POLICY IF EXISTS "Admin manage calculos" ON public.calculos;
DROP POLICY IF EXISTS "Admin delete calculos" ON public.calculos;

CREATE POLICY "Admin manage calculos" ON public.calculos
FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete calculos" ON public.calculos
FOR DELETE USING (public.is_admin());
