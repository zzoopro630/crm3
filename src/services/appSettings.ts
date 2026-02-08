import type { AppSetting } from '@/types/appSettings';
import { apiRequest } from '@/lib/apiClient';

export async function fetchAppSettings(): Promise<AppSetting[]> {
  return apiRequest<AppSetting[]>('/api/settings');
}

export async function updateAppSettings(items: AppSetting[]): Promise<void> {
  await apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}
