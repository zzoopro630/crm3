import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  fontScale: number;
  setTheme: (theme: Theme) => void;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      fontScale: 100,
      setTheme: (theme) => set({ theme }),
      increaseFontScale: () =>
        set((state) => ({ fontScale: Math.min(state.fontScale + 10, 150) })),
      decreaseFontScale: () =>
        set((state) => ({ fontScale: Math.max(state.fontScale - 10, 80) })),
    }),
    {
      name: "crm-theme",
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
