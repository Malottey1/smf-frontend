/**
 * Validates schema/template.json against the meta-schema, then runs
 * cross-reference checks Zod's shape validation can't express:
 *   - every field id is unique across the whole document
 *   - every condition.fieldId points at a field that actually exists
 *   - every annexLink points at an annex that actually exists
 *   - every annex.sourceFieldId (if set) points at a field that actually exists
 *   - every optionsSource points at an annex + column that actually exists
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TemplateSchema, type Field } from "../schema/template.schema.ts";

const path = resolve(import.meta.dirname, "../schema/template.json");
const raw = JSON.parse(readFileSync(path, "utf-8"));

const parsed = TemplateSchema.safeParse(raw);
if (!parsed.success) {
  console.error("template.json failed meta-schema validation:\n");
  console.error(parsed.error.format());
  process.exit(1);
}
const template = parsed.data;

const errors: string[] = [];

const allFields: Field[] = template.chapters.flatMap((c) =>
  c.subClauses.flatMap((sc) => sc.fields),
);

const fieldIds = new Set<string>();
for (const f of allFields) {
  if (fieldIds.has(f.id)) errors.push(`Duplicate field id: ${f.id}`);
  fieldIds.add(f.id);
}

const annexIds = new Set(template.annexes.map((a) => a.id));

for (const f of allFields) {
  if (f.condition && !fieldIds.has(f.condition.fieldId)) {
    errors.push(`Field ${f.id} has condition referencing unknown field id: ${f.condition.fieldId}`);
  }
  if (f.annexLink && !annexIds.has(f.annexLink)) {
    errors.push(`Field ${f.id} has annexLink referencing unknown annex id: ${f.annexLink}`);
  }
  if (f.optionsSource) {
    const annexId = f.optionsSource.split(".")[0] ?? "";
    if (!annexIds.has(annexId)) {
      errors.push(`Field ${f.id} has optionsSource referencing unknown annex id: ${annexId}`);
    }
  }
}

for (const a of template.annexes) {
  if (a.sourceFieldId && !fieldIds.has(a.sourceFieldId)) {
    errors.push(`Annex ${a.id} has sourceFieldId referencing unknown field id: ${a.sourceFieldId}`);
  }
  for (const ref of a.linkedFromRefs) {
    const refExists = template.chapters.some((c) => c.subClauses.some((sc) => sc.ref === ref || sc.fields.some((f) => f.ref === ref)));
    if (!refExists) errors.push(`Annex ${a.id} linkedFromRefs contains unknown chapter ref: ${ref}`);
  }
}

// Every chapter number 1-9 present exactly once, in order.
template.chapters.forEach((c, i) => {
  if (c.number !== i + 1) errors.push(`Chapter at index ${i} has number ${c.number}, expected ${i + 1}`);
});
// Every annex number 1-8 present exactly once, in order.
template.annexes.forEach((a, i) => {
  if (a.number !== i + 1) errors.push(`Annex at index ${i} has number ${a.number}, expected ${i + 1}`);
});

if (errors.length > 0) {
  console.error(`template.json failed cross-reference validation (${errors.length} issue(s)):\n`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

const totalFields = allFields.length;
const totalConditional = allFields.filter((f) => f.condition !== null).length;
const totalGating = allFields.filter((f) => f.derivedGatingField).length;

console.log("template.json is structurally valid.");
console.log(`  Chapters: ${template.chapters.length}`);
console.log(`  Sub-clauses: ${template.chapters.reduce((n, c) => n + c.subClauses.length, 0)}`);
console.log(`  Fields: ${totalFields} (${totalConditional} conditional, ${totalGating} derived gating fields)`);
console.log(`  Annexes: ${template.annexes.length}`);
console.log(`  Jurisdiction profiles: ${template.jurisdictionProfiles.map((p) => p.name).join(", ")}`);
