import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  fontScale: number;  // % 단위 (기본 100)
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
      setTheme: (theme) => set({ theme }),
      setFontScale: (scale) => set({ fontScale: scale }),
      increaseFontScale: () =>
        set((state) => ({
          fontScale: Math.min(state.fontScale + 10, 150),
        })),
      decreaseFontScale: () =>
        set((state) => ({
          fontScale: Math.max(state.fontScale - 10, 80),
        })),
    }),
    {
      name: "crm-theme",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 || version === 1) {
          // v0/v1→v3: base 14px → 15.4px 변경 보정, 10 단위로 정규화
          const oldScale = (state.fontScale as number) || 100;
          const converted = Math.round(oldScale * 14 / 15.4);
          return {
            theme: state.theme || "light",
            fontScale: Math.round(converted / 10) * 10,
          };
        }
        if (version === 2) {
          // v2→v3: 기존 마이그레이션에서 10단위 정규화 누락된 값 보정
          const scale = (state.fontScale as number) || 100;
          return {
            theme: state.theme || "light",
            fontScale: Math.round(scale / 10) * 10,
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
