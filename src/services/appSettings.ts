import type { AppSetting } from '@/types/appSettings';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchAppSettings(): Promise<AppSetting[]> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateAppSettings(items: AppSetting[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to update settings');
}
