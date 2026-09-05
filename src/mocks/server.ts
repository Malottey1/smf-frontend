import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Node-side mock server, for Vitest — see src/mocks/handlers.test.ts. */
export const server = setupServer(...handlers);
