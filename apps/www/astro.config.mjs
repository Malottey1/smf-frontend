import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// site: set to the real production domain before launch — required for a
// correct sitemap.xml and canonical/OG URLs. Placeholder until Numeric
// confirms the domain (see LAUNCH-CHECKLIST.md).
export default defineConfig({
  site: "https://www.numerictechnologies.example",
  integrations: [sitemap()],
  image: {
    // Astro's built-in Sharp-based pipeline: local images get AVIF/WebP
    // + fallback and explicit width/height for free via <Image />.
  },
});
