import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  fontSize: number;          // px 단위 (기본 15)
  fontSizeCustomized: boolean;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      fontSize: 15,
      fontSizeCustomized: false,
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      increaseFontSize: () =>
        set((state) => ({
          fontSize: Math.min(state.fontSize + 1, 22),
          fontSizeCustomized: true,
        })),
      decreaseFontSize: () =>
        set((state) => ({
          fontSize: Math.max(state.fontSize - 1, 12),
          fontSizeCustomized: true,
        })),
    }),
    {
      name: "crm-theme",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0) {
          // v0→v3: fontScale % → fontSize px (기존 base 14px)
          const oldScale = (state.fontScale as number) || 100;
          return {
            theme: state.theme || "light",
            fontSize: Math.round(14 * oldScale / 100),
            fontSizeCustomized: true,
          };
        }
        if (version === 1) {
          // v1→v3: fontScale % → fontSize px (기존 base 14px)
          const oldScale = (state.fontScale as number) || 100;
          return {
            theme: state.theme || "light",
            fontSize: Math.round(14 * oldScale / 100),
            fontSizeCustomized: state.fontScaleCustomized ?? true,
          };
        }
        if (version === 2) {
          // v2→v3: fontScale % (base 15.4px) → fontSize px
          const oldScale = (state.fontScale as number) || 100;
          return {
            theme: state.theme || "light",
            fontSize: Math.round(15.4 * oldScale / 100),
            fontSizeCustomized: state.fontScaleCustomized ?? true,
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
