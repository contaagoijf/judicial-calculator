import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/externalClient';

export type SystemSettings = {
  id: boolean;
  system_enabled: boolean;
  ajuste_anual_enabled: boolean;
  retificacao_enabled: boolean;
  updated_at?: string;
  updated_by?: string | null;
};

export const defaultSystemSettings: SystemSettings = {
  id: true,
  system_enabled: true,
  ajuste_anual_enabled: true,
  retificacao_enabled: false,
};

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*').single();

      if (error) {
        throw error;
      }

      return (data ?? defaultSystemSettings) as SystemSettings;
    },
  });
}
