import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build config used ONLY to produce the single-file HTML preview
 * published as a Claude Artifact for live review. vite.config.ts (the
 * real production config) keeps ExportPreview code-split via
 * React.lazy/dynamic import, since pagedjs is a ~500KB dependency that
 * most users never need — that's the right call for an actual
 * deployment. But an Artifact is one static HTML file with no server to
 * fetch a second chunk from, so this config forces everything into a
 * single bundle instead. Never used for the real build/deploy.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    __ARTIFACT_BUILD__: "true",
    __DEMO_BUILD__: "false",
  },
  resolve: {
    alias: {
      // msw's package.json explicitly sets exports["./native"].browser to
      // null, which blocks normal resolution under Vite's default
      // "browser" condition (it's meant for React Native, not a web
      // build) — alias straight to the file so only this one import
      // bypasses that, rather than changing resolve.conditions globally.
      "msw/native": fileURLToPath(new URL("./node_modules/msw/lib/native/index.mjs", import.meta.url)),
    },
  },
  build: {
    outDir: "dist-artifact",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
