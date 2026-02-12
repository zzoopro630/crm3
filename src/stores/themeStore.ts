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
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        if (version === 0) {
          const old = persisted as { theme: Theme; fontScale: number };
          return {
            ...old,
            fontScaleCustomized: true, // 기존 사용자는 이미 커스터마이즈된 것으로 간주
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
