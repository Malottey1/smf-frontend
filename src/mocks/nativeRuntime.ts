import { setupServer } from "msw/native";
import { handlers } from "./handlers";

/**
 * Used only by the single-file Artifact preview build (see vite.artifact.
 * config.ts and main.tsx) — msw/native patches global fetch directly via
 * @mswjs/interceptors instead of registering a Service Worker, because a
 * published Artifact has no origin to serve /mockServiceWorker.js from.
 * Real dev and production builds never import this file.
 */
export const nativeServer = setupServer(...handlers);
