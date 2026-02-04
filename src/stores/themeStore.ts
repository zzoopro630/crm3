import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  fontSize: number;
  setTheme: (theme: Theme) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      fontSize: 14,
      setTheme: (theme) => set({ theme }),
      increaseFontSize: () =>
        set((state) => ({ fontSize: Math.min(state.fontSize + 1, 18) })),
      decreaseFontSize: () =>
        set((state) => ({ fontSize: Math.max(state.fontSize - 1, 12) })),
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
