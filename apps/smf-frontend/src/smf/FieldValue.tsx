import type { Field } from "../../schema/template.schema";
import { isFilled } from "./completion";

export interface FieldValueProps {
  field: Field;
  value: unknown;
}

/**
 * Read-only presentation — values as text, not disabled inputs. The
 * mockup's disabled-field treatment (dashed border, --wash fill) works
 * for one locked identifier (.readonly-id) but breaks down across a
 * whole chapter of locked content, so this is a distinct component, not
 * <input disabled>. Retains the same label/grid structure as FieldInput
 * so nothing shifts when a chapter's mode changes.
 */
export function FieldValue({ field, value }: FieldValueProps) {
  if (!isFilled(field, value)) {
    return <div className="field-value empty">Not provided</div>;
  }
  switch (field.inputType) {
    case "text":
    case "phone":
    case "dropdown":
    case "richText":
      return <div className="field-value">{value as string}</div>;
    case "multiSelect":
      return (
        <div className="pill-group">
          {(value as string[]).map((o) => (
            <span className="pill" key={o}>
              {o}
            </span>
          ))}
        </div>
      );
    case "structuredNumeric": {
      if (field.range) {
        const v = value as { min: string; max: string };
        return (
          <div className="field-value">
            {v.min} – {v.max} {field.unit ?? ""}
          </div>
        );
      }
      return (
        <div className="field-value">
          {value as string} {field.unit ?? ""}
        </div>
      );
    }
    case "repeatableTable": {
      const rows = value as Record<string, string>[];
      const cols = field.columns ?? [];
      return (
        <div className="rt-wrap">
          <table className="rt">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c.id}>{row[c.id] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "fileUpload":
      return (
        <div className="file-chip-row">
          {(value as { name: string; size: string }[]).map((f, i) => (
            <span className="file-chip" key={i}>
              {f.name} <span className="size">{f.size}</span>
            </span>
          ))}
        </div>
      );
    case "toggleWithText": {
      const v = value as { toggle?: boolean; text?: string };
      return <div className="field-value">{v.toggle ? v.text || "Yes" : "No"}</div>;
    }
    case "mapPicker": {
      const v = value as { lat?: string; lng?: string; dunsNumber?: string; otherIdentifier?: string };
      const parts: string[] = [];
      if (v.lat && v.lng) parts.push(`${v.lat}, ${v.lng}`);
      if (v.dunsNumber) parts.push(`D-U-N-S ${v.dunsNumber}`);
      if (v.otherIdentifier) parts.push(v.otherIdentifier);
      return <div className="field-value">{parts.join(" · ")}</div>;
    }
    default:
      return <div className="field-value">—</div>;
  }
}
