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
