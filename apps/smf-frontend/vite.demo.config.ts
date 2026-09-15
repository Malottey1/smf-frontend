import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build config used ONLY for a shared stakeholder-preview deployment
 * (Vercel, via `npm run build:demo` — see vercel.json), never for a real
 * production build. The one difference from vite.config.ts:
 * __DEMO_BUILD__ tells main.tsx to start the MSW browser worker even
 * though this is a production build — there's no real backend for this
 * deployment to talk to yet, and without the mock every request would
 * 404 against a domain serving only this static bundle.
 *
 * Unlike the Artifact build, this needs no msw/native workaround: a real
 * Vercel deployment has a real origin, so the genuine Service-Worker-based
 * msw/browser path (public/mockServiceWorker.js, served normally) works
 * as-is. A real production deployment (once a backend exists) must keep
 * using vite.config.ts / `npm run build`, not this file.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    __ARTIFACT_BUILD__: "false",
    __DEMO_BUILD__: "true",
  },
  build: {
    outDir: "dist-demo",
  },
});
