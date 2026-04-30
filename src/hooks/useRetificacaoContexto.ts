import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import type {
  ContextoCalculo,
  FaixaIR,
  IndiceEconomico,
  ParametrosIR,
  RegraSubperiodo,
  SalarioMinimo,
  TaxaHistorica,
  TemplateCalculo,
} from '@/services/calculoIRPF';

/**
 * Carrega todas as tabelas auxiliares necessárias para o cálculo de retificação.
 * As tabelas são pequenas o suficiente para serem mantidas em memória e o cache
 * do React Query evita chamadas repetidas.
 */
export function useRetificacaoContexto() {
  return useQuery<ContextoCalculo>({
    queryKey: ['retificacao-contexto'],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => { select: (cols: string) => Promise<{ data: unknown; error: unknown }> };
      };
      const fetchAll = async <T>(table: string, cols = '*'): Promise<T[]> => {
        const { data, error } = await sb.from(table).select(cols);
        if (error) throw error;
        return (data ?? []) as T[];
      };

      const [faixas, parametros, salariosMinimos, indices, taxas, templates, regras] = await Promise.all([
        fetchAll<FaixaIR>('ir_faixas'),
        fetchAll<ParametrosIR>('ir_parametros'),
        fetchAll<SalarioMinimo>('salario_minimo'),
        fetchAll<IndiceEconomico>('indices_economicos'),
        fetchAll<TaxaHistorica>('taxas_historicas'),
        fetchAll<TemplateCalculo>('templates_calculo'),
        fetchAll<RegraSubperiodo>('regras_subperiodo'),
      ]);

      return { faixas, parametros, salariosMinimos, indices, taxas, templates, regras };
    },
    staleTime: 5 * 60 * 1000,
  });
}
