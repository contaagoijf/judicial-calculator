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
        from: (t: string) => {
          select: (cols: string) => { range: (from: number, to: number) => Promise<{ data: unknown; error: unknown }> };
        };
      };
      // O PostgREST corta silenciosamente em 1000 linhas por padrão (sem erro,
      // sem aviso) — tabelas que já passaram desse tamanho, como
      // `taxas_historicas`, tinham parte dos meses descartados de forma
      // imprevisível (a ordem sem `.order()` não é garantida), distorcendo o
      // cálculo de juros. Paginar explicitamente até esgotar as linhas.
      const PAGE_SIZE = 1000;
      const fetchAll = async <T>(table: string, cols = '*'): Promise<T[]> => {
        const all: T[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await sb.from(table).select(cols).range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const page = (data ?? []) as T[];
          all.push(...page);
          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return all;
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
