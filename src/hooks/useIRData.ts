import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';
import type { FaixaIR, ParametrosIR } from '@/services/calculoIRPF';

export function useParametrosIR() {
  return useQuery({
    queryKey: ['ir_parametros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ir_parametros')
        .select('*')
        .order('ano_calendario', { ascending: false });
      if (error) throw error;
      return data as ParametrosIR[];
    },
  });
}

export function useFaixasIR(anoCalendario: number | null) {
  return useQuery({
    queryKey: ['ir_faixas', anoCalendario],
    queryFn: async () => {
      if (!anoCalendario) return [];
      const { data, error } = await supabase
        .from('ir_faixas')
        .select('*')
        .eq('ano_calendario', anoCalendario)
        .order('limite_inferior');
      if (error) throw error;
      return data as FaixaIR[];
    },
    enabled: !!anoCalendario,
  });
}

export function useFaixasIRAll() {
  return useQuery({
    queryKey: ['ir_faixas', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ir_faixas')
        .select('*')
        .order('ano_calendario', { ascending: false })
        .order('limite_inferior');
      if (error) throw error;
      return data as FaixaIR[];
    },
    enabled: true,
  });
}

export function useCalculo(id: string | null) {
  return useQuery({
    queryKey: ['calculo', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('calculos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/** Busca cálculos já cadastrados para um número de processo (opcionalmente filtrando por tipo), para autopreenchimento/detecção de duplicidade. */
export function useCalculosPorProcesso(numeroProcesso: string | null, tipoCalculo?: 'ajuste_anual' | 'retificacao') {
  return useQuery({
    queryKey: ['calculos_por_processo', numeroProcesso, tipoCalculo ?? 'all'],
    queryFn: async () => {
      if (!numeroProcesso) return [];
      let query = supabase
        .from('calculos')
        .select('*')
        .eq('numero_processo', numeroProcesso);
      if (tipoCalculo) query = query.eq('tipo_calculo', tipoCalculo);
      const { data, error } = await query.order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!numeroProcesso && numeroProcesso.replace(/\D/g, '').length === 20,
  });
}
