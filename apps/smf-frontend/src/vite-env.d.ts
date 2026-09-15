/// <reference types="vite/client" />

/** Set only by vite.artifact.config.ts — see main.tsx. */
declare const __ARTIFACT_BUILD__: boolean | undefined;

/** Set only by vite.demo.config.ts — see main.tsx. A real production
 * build (vite.config.ts, npm run build) never sets this, so it never
 * starts the mock backend; a demo deployment (npm run build:demo) does,
 * since there's no real backend yet for it to talk to. */
declare const __DEMO_BUILD__: boolean | undefined;
