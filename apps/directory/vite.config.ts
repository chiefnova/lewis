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
});
