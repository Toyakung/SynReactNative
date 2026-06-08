/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev` we proxy /api to the backend AI proxy server so the
// browser never touches the Anthropic API key directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.TKONE_API_TARGET || "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx,mjs}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/engine/**", "src/ai/**", "server/handler.mjs"],
      thresholds: {
        // The pure decision engine + AI client + server handler are the
        // business-critical core and are held to 100%.
        "src/engine/**": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
