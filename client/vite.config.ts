import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Enable real CSS processing so that ?raw imports return the actual file
    // text rather than an empty stub.  The Accessibility test (A11Y-01) reads
    // src/index.css?raw to audit colour tokens and :focus-visible rules.
    css: true,
  },
});
