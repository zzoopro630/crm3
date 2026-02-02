import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAppSettings, updateAppSettings } from '@/services/appSettings';
import type { AppSetting } from '@/types/appSettings';

export function useAppSettings() {
  return useQuery({
    queryKey: ['appSettings'],
    queryFn: fetchAppSettings,
    staleTime: 1000 * 60 * 10,
  });
}

export function useMenuLabels() {
  const { data: settings = [] } = useAppSettings();
  const labels: Record<string, string> = {};
  for (const s of settings) {
    if (s.key.startsWith('menu_label:') && s.value) {
      const href = s.key.replace('menu_label:', '');
      labels[href] = s.value;
    }
  }
  return labels;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: AppSetting[]) => updateAppSettings(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });
}
