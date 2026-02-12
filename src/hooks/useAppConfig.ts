import { useMemo } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

export interface AppConfig {
  sessionTimeoutMinutes: number;
  logoutCountdownSeconds: number;
  defaultFontSize: number; // px
}

export function useAppConfig(): AppConfig {
  const { data: settings = [] } = useAppSettings();
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
