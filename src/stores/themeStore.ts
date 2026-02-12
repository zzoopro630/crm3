import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  fontScale: number;
  fontScaleCustomized: boolean;
  setTheme: (theme: Theme) => void;
  setFontScale: (scale: number) => void;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      fontScale: 100,
      fontScaleCustomized: false,
      setTheme: (theme) => set({ theme }),
      setFontScale: (scale) => set({ fontScale: scale }),
      increaseFontScale: () =>
        set((state) => ({
          fontScale: Math.min(state.fontScale + 10, 150),
          fontScaleCustomized: true,
        })),
      decreaseFontScale: () =>
        set((state) => ({
          fontScale: Math.max(state.fontScale - 10, 80),
          fontScaleCustomized: true,
        })),
    }),
    {
      name: "crm-theme",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0) {
          // v0→v2: fontScaleCustomized 추가 + 기준 px 변경 보정
          const oldScale = (state.fontScale as number) || 100;
          return {
            ...state,
            fontScaleCustomized: true,
            fontScale: Math.round(oldScale * 14 / 15.4),
          };
        }
        if (version === 1) {
          // v1→v2: 기준 px 14→15.4 변경 보정 (동일 렌더 크기 유지)
          const oldScale = (state.fontScale as number) || 100;
          return {
            ...state,
            fontScale: Math.round(oldScale * 14 / 15.4),
          };
        }
        return persisted as ThemeState;
      },
    }
  )
);

// Apply theme to document
export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  // 모든 테마 클래스 제거
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}
