import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./shell/shell.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A GMP document's fields shouldn't silently refetch and blow away
      // an in-progress edit; explicit invalidation (after a save/workflow
      // mutation — see src/api/hooks.ts) is how the cache updates instead.
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

/**
 * Starts the MSW browser worker before rendering, so the app is never
 * rendered against an un-mocked network. Import is dynamic so
 * `msw/browser` (and its service worker registration) never ships in a
 * REAL production bundle — this whole block disappears at build time
 * once a real backend exists, per openapi/smf-api.yaml's "one-line
 * change" note.
 *
 * Two build-time flags branch this, neither set by the real production
 * config (vite.config.ts):
 *   - __ARTIFACT_BUILD__ (vite.artifact.config.ts) swaps the
 *     Service-Worker-based browser mock for msw/native's interceptor-based
 *     one: a published Artifact is a single static HTML page with nothing
 *     to serve /mockServiceWorker.js from, so there's no origin for a
 *     real Service Worker to register against. msw/native patches global
 *     fetch directly instead — same handlers, same behavior, different
 *     transport, used ONLY for that preview mechanism.
 *   - __DEMO_BUILD__ (vite.demo.config.ts) starts the genuine
 *     Service-Worker-based mock even though this is a production build —
 *     used only for a shared stakeholder-preview deployment (Vercel) that
 *     has a real origin (so the real Service Worker path works) but no
 *     real backend yet to talk to.
 * A real production build sets neither, so mocking stays off — exactly
 * the "one real backend, no mock code shipped" architecture this is all
 * standing in for until one exists.
 */
async function enableMocking() {
  if (typeof __ARTIFACT_BUILD__ !== "undefined" && __ARTIFACT_BUILD__) {
    const { nativeServer } = await import("./mocks/nativeRuntime");
    nativeServer.listen({ onUnhandledRequest: "bypass" });
    return;
  }
  const isDemoBuild = typeof __DEMO_BUILD__ !== "undefined" && __DEMO_BUILD__;
  if (!import.meta.env.DEV && !isDemoBuild) return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
