// `z` is re-exported from astro:content (not imported from a standalone
// `zod` dependency) deliberately — it's version-locked to whatever zod
// Astro bundles internally. A standalone `zod` install resolved v4 here
// while Astro 7.3.2 expects v3 internals, and TypeScript + the content
// layer's own schema introspection both broke as a result. The "'z' is
// deprecated" hint this causes is cosmetic; don't "fix" it back the
// other way.
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const insights = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/insights" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    // Every post right now is a placeholder — see LAUNCH-CHECKLIST.md.
    // Keeping this as an explicit field (rather than just writing
    // "[PLACEHOLDER]" into the body) means a future real post only has
    // to flip this to false, not restructure anything.
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { insights };
