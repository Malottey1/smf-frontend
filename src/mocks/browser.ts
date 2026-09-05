import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Browser-side mock server. Started conditionally from main.tsx in dev.
 * When the real backend lands, deleting this file (and the main.tsx
 * hook that starts it) is the one-line change the OpenAPI spec promises —
 * nothing in app code should import from "./mocks" directly.
 */
export const worker = setupWorker(...handlers);
