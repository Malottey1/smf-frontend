import type { Chapter, Field } from "../../schema/template.schema";

export function findFieldById(chapters: Chapter[], id: string): Field | undefined {
  for (const c of chapters) {
    for (const sc of c.subClauses) {
      const f = sc.fields.find((x) => x.id === id);
      if (f) return f;
    }
  }
  return undefined;
}
