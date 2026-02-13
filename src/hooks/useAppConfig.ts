import { useMemo } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { AppSetting } from '@/types/appSettings';

export interface AppConfig {
  sessionTimeoutMinutes: number;
  logoutCountdownSeconds: number;
  defaultFontSize: number; // px
}

const EMPTY_SETTINGS: AppSetting[] = [];

export function useAppConfig(): AppConfig {
  const { data: settings = EMPTY_SETTINGS } = useAppSettings();
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings) {
      if (s.key.startsWith('app:') && s.value) map[s.key] = s.value;
    }
    return {
      sessionTimeoutMinutes: Number(map['app:session_timeout_minutes']) || 60,
      logoutCountdownSeconds: Number(map['app:logout_countdown_seconds']) || 30,
      defaultFontSize: Number(map['app:default_font_size']) || 15,
    };
  }, [settings]);
}
