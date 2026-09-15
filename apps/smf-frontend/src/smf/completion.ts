import type { Chapter, Field } from "../../schema/template.schema";

export type FieldValueMap = Record<string, unknown>;

export interface Condition {
  fieldId: string;
  operator: "equals" | "notEquals";
  value: string | boolean | number;
  field?: string;
}

export function evaluateCondition(condition: Condition | null, values: FieldValueMap): boolean {
  if (!condition) return true;
  const raw = values[condition.fieldId] as { toggle?: boolean } | undefined;
  const actual = condition.field === "toggle" ? !!raw?.toggle : (values[condition.fieldId] as unknown);
  return condition.operator === "equals" ? actual === condition.value : actual !== condition.value;
}

interface RangeValue {
  min?: string | number | null;
  max?: string | number | null;
}
interface ToggleValue {
  toggle?: boolean;
  text?: string;
}
interface MapValue {
  lat?: string;
  lng?: string;
  dunsNumber?: string;
  otherIdentifier?: string;
}

export function isFilled(field: Field, value: unknown): boolean {
  if (value == null) return false;
  switch (field.inputType) {
    case "text":
    case "phone":
    case "dropdown":
    case "richText":
      return typeof value === "string" && value.trim() !== "";
    case "multiSelect":
      return Array.isArray(value) && value.length > 0;
    case "structuredNumeric":
      if (field.range) {
        const v = value as RangeValue;
        return v.min != null && v.min !== "" && v.max != null && v.max !== "";
      }
      return value !== "" && value != null;
    case "repeatableTable":
      return Array.isArray(value) && value.length >= (field.minRows ?? 1);
    case "fileUpload":
      return Array.isArray(value) && value.length > 0;
    case "toggleWithText": {
      const v = value as ToggleValue;
      return !!(v.toggle || (v.text && v.text.trim() !== ""));
    }
    case "mapPicker": {
      const v = value as MapValue;
      return !!((v.lat && v.lng) || v.dunsNumber || v.otherIdentifier);
    }
    default:
      return false;
  }
}

export function fieldsForChapter(chapter: Chapter): Field[] {
  return chapter.subClauses.flatMap((sc) => sc.fields);
}

export interface CompletionResult {
  required: number;
  done: number;
  percent: number;
}

export function chapterCompletion(chapter: Chapter, values: FieldValueMap): CompletionResult {
  const fields = fieldsForChapter(chapter);
  let required = 0;
  let done = 0;
  for (const f of fields) {
    const counts = f.required || (f.condition != null && evaluateCondition(f.condition as Condition, values));
    if (!counts) continue;
    required++;
    if (isFilled(f, values[f.id])) done++;
  }
  return { required, done, percent: required === 0 ? 100 : Math.round((done / required) * 100) };
}

export function overallCompletion(chapters: Chapter[], values: FieldValueMap): CompletionResult {
  let required = 0;
  let done = 0;
  for (const c of chapters) {
    const r = chapterCompletion(c, values);
    required += r.required;
    done += r.done;
  }
  return { required, done, percent: required === 0 ? 100 : Math.round((done / required) * 100) };
}
