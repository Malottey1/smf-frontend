/**
 * Injects schema/template.json into scripts/preview-app.template.html to
 * produce a standalone, interactive HTML build of the schema-driven SMF
 * renderer — a working prototype of the actual product (not documentation
 * about it), for stakeholder demo before the real Vite/RHF/MSW app exists.
 *
 * Run: npx tsx scripts/build-app-preview.ts <output-path>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { TemplateSchema } from "../schema/template.schema.ts";

const outPath = process.argv[2];
if (!outPath) {
  console.error("Usage: tsx scripts/build-app-preview.ts <output-path>");
  process.exit(1);
}

const templateRaw = JSON.parse(readFileSync(resolve(import.meta.dirname, "../schema/template.json"), "utf-8"));
const template = TemplateSchema.parse(templateRaw);

const html = readFileSync(resolve(import.meta.dirname, "preview-app.template.html"), "utf-8");
const marker = /\/\*__TEMPLATE_JSON__\*\/\{\}\/\*__END_TEMPLATE_JSON__\*\//;
if (!marker.test(html)) {
  console.error("Template marker not found in preview-app.template.html");
  process.exit(1);
}
const out = html.replace(marker, JSON.stringify(template));

writeFileSync(outPath, out, "utf-8");
console.log(`Wrote ${outPath} (${(out.length / 1024).toFixed(1)} KB)`);
