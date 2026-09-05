import type { Field } from "../../../schema/template.schema";
import { isFilled } from "../completion";

export type ExportCell =
  | { kind: "text"; text: string }
  | { kind: "table"; columns: { id: string; label: string }[]; rows: Record<string, string>[] }
  | { kind: "image-slot"; files: { name: string; size: string }[] }
  | { kind: "chips"; items: string[] }
  | { kind: "empty" };

/** Chapters/annexes the URS names explicitly as "render inline as image,
 * not text" (FR-SMF-12): Chapters 4.1 / 4.1.2, Annexes 5-7. */
const INLINE_IMAGE_REFS = new Set(["4.1", "4.1.2"]);
const INLINE_IMAGE_ANNEXES = new Set(["annex-5", "annex-6", "annex-7"]);

export function fieldToExportCell(field: Field, value: unknown): ExportCell {
  if (!isFilled(field, value)) return { kind: "empty" };

  if (field.inputType === "fileUpload") {
    const files = value as { name: string; size: string }[];
    const isInlineImageField = INLINE_IMAGE_REFS.has(field.ref) || (field.annexLink != null && INLINE_IMAGE_ANNEXES.has(field.annexLink));
    return { kind: "image-slot", files: isInlineImageField ? files : files };
  }
  if (field.inputType === "repeatableTable") {
    return {
      kind: "table",
      columns: (field.columns ?? []).map((c) => ({ id: c.id, label: c.label })),
      rows: value as Record<string, string>[],
    };
  }
  if (field.inputType === "multiSelect") {
    return { kind: "chips", items: value as string[] };
  }
  if (field.inputType === "structuredNumeric") {
    if (field.range) {
      const v = value as { min: string; max: string };
      return { kind: "text", text: `${v.min} – ${v.max} ${field.unit ?? ""}`.trim() };
    }
    return { kind: "text", text: `${value as string} ${field.unit ?? ""}`.trim() };
  }
  if (field.inputType === "toggleWithText") {
    const v = value as { toggle?: boolean; text?: string };
    return { kind: "text", text: v.toggle ? v.text || "Yes" : "No" };
  }
  if (field.inputType === "mapPicker") {
    const v = value as { lat?: string; lng?: string; dunsNumber?: string; otherIdentifier?: string };
    const parts: string[] = [];
    if (v.lat && v.lng) parts.push(`${v.lat}, ${v.lng}`);
    if (v.dunsNumber) parts.push(`D-U-N-S ${v.dunsNumber}`);
    if (v.otherIdentifier) parts.push(v.otherIdentifier);
    return { kind: "text", text: parts.join(" · ") };
  }
  return { kind: "text", text: String(value) };
}

export function isInlineImageField(field: Field): boolean {
  return INLINE_IMAGE_REFS.has(field.ref) || (field.annexLink != null && INLINE_IMAGE_ANNEXES.has(field.annexLink));
}
