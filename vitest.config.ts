import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["functions/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
