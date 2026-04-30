/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { gateVitePlugin } from "../../packages/gate/src/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), gateVitePlugin()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    // E2E specs live under e2e/ and run via Playwright. Exclude them from
    // the Vitest unit/integration run; the default vitest excludes
    // (node_modules, dist) are kept because overriding `exclude` replaces
    // rather than extends.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
});
