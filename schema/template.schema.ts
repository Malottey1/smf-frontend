/**
 * Meta-schema for schema/template.json.
 *
 * This validates the STRUCTURE of the template itself (every field has a ref,
 * a valid inputType, a condition that points at a real field, etc.) — it is
 * not the per-document Zod validation used by React Hook Form at runtime.
 * That runtime schema is generated FROM a validated template.json so that
 * form validation cannot drift from this file (see DECISIONS.md).
 *
 * Run: npx tsx scripts/validate-template.ts
 */
import { z } from "zod";

export const INPUT_TYPES = [
  "text",
  "phone",
  "richText",
  "dropdown",
  "multiSelect",
  "structuredNumeric",
  "repeatableTable",
  "fileUpload",
  "toggleWithText",
  "mapPicker",
] as const;

export const InputTypeSchema = z.enum(INPUT_TYPES);

export const ConditionSchema = z
  .object({
    fieldId: z.string().min(1),
    operator: z.enum(["equals", "notEquals"]),
    value: z.union([z.string(), z.boolean(), z.number()]),
    /** Optional sub-path into a compound field's value, e.g. "toggle" for a toggleWithText field. */
    field: z.string().optional(),
  })
  .nullable();

export const TableColumnSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  inputType: InputTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const FieldSchema = z.object({
  id: z.string().min(1),
  ref: z.string().min(1),
  label: z.string().min(1),
  inputType: InputTypeSchema,
  required: z.boolean(),
  condition: ConditionSchema,
  annexLink: z.string().nullable(),
  helpText: z.string().nullable().optional(),
  whoCitation: z.string().min(1),
  note: z.string().optional(),
  derivedGatingField: z.boolean().optional(),

  // Type-specific extensions — presence validated contextually in scripts/validate-template.ts,
  // kept loose here since not every field type uses every extension.
  options: z.array(z.string()).optional(),
  optionsSource: z.string().optional(),
  columns: z.array(TableColumnSchema).optional(),
  minRows: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  range: z.boolean().optional(),
  accept: z.array(z.string()).optional(),
  maxFiles: z.number().int().positive().optional(),
  identifierTypes: z.array(z.string()).optional(),
  validation: z.record(z.string(), z.unknown()).optional(),
  toggleLabel: z.string().optional(),
  textLabel: z.string().optional(),
  textRequiredWhenToggleOn: z.boolean().optional(),
});
export type Field = z.infer<typeof FieldSchema>;

export const SubClauseSchema = z.object({
  ref: z.string().min(1),
  title: z.string().min(1),
  whoCitation: z.string().min(1),
  fields: z.array(FieldSchema).min(1),
});

export const ChapterSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(9),
  title: z.string().min(1),
  whoCitation: z.string().min(1),
  subClauses: z.array(SubClauseSchema).min(1),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const AnnexSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(8),
  title: z.string().min(1),
  whoCitation: z.string().min(1),
  inputType: InputTypeSchema,
  sourceFieldId: z.string().nullable(),
  linkedFromRefs: z.array(z.string()).min(1),
  independentDating: z.literal(true),
  columns: z.array(TableColumnSchema).optional(),
  accept: z.array(z.string()).optional(),
  note: z.string().optional(),
});
export type Annex = z.infer<typeof AnnexSchema>;

export const JurisdictionAppendixSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  inputType: InputTypeSchema,
  accept: z.array(z.string()).optional(),
  mandatory: z.boolean(),
  blocksSubmission: z.literal(false),
  status: z.string().min(1),
  provenance: z.string().min(1),
  exportOrder: z.number().int().min(0),
});

export const JurisdictionProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  authority: z.string().min(1),
  reviewIntervalMonths: z.number().int().positive(),
  reviewIntervalProvenance: z.string().min(1),
  exportOrder: z.object({
    chaptersFirst: z.literal(true),
    thenWhoAnnexes: z.literal(true),
    thenJurisdictionAppendices: z.literal(true),
  }),
  terminology: z.record(z.string(), z.string()),
  supplementaryAppendices: z.array(JurisdictionAppendixSchema),
});
export type JurisdictionProfile = z.infer<typeof JurisdictionProfileSchema>;

export const TemplateSchema = z.object({
  schemaVersion: z.string().min(1),
  documentStandard: z.object({
    name: z.string().min(1),
    citation: z.string().min(1),
    ursReference: z.string().min(1),
  }),
  inputTypes: z.array(InputTypeSchema),
  chapters: z.array(ChapterSchema).length(9),
  annexes: z.array(AnnexSchema).length(8),
  jurisdictionProfiles: z.array(JurisdictionProfileSchema),
});
export type Template = z.infer<typeof TemplateSchema>;
