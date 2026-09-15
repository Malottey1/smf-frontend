import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __ARTIFACT_BUILD__: "false",
    __DEMO_BUILD__: "false",
  },
  resolve: {
    alias: {
      // Needed even though main.tsx's __ARTIFACT_BUILD__ branch never
      // runs in this config: Vite dev's esbuild-based dependency scanner
      // statically resolves every import() target it can find, including
      // ones behind a condition it doesn't evaluate — so it still tries
      // (and, without this alias, fails) to resolve msw/native's
      // exports["./native"].browser: null. Same fix as
      // vite.artifact.config.ts; harmless here since Rollup's production
      // build still tree-shakes the whole branch away via the `false`
      // define above (confirmed: dist/assets/ has no mock-related chunk).
      "msw/native": fileURLToPath(new URL("./node_modules/msw/lib/native/index.mjs", import.meta.url)),
    },
  },
});
