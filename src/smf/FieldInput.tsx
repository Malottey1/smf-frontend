import type { Field } from "../../schema/template.schema";
import { DOSAGE_FORM_OPTIONS } from "./seedData";

function resolveOptions(field: Field): string[] {
  if (field.options) return field.options;
  if (field.optionsSource === "annex-2.dosageFormsList.dosageForm") return DOSAGE_FORM_OPTIONS;
  return [];
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface FieldInputProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Editable renderer for all 10 canonical input types. Every case here
 * reuses the mockup's own DOM/CSS vocabulary (input/select/textarea,
 * .pill, .upload-box) rather than inventing new form-control chrome. */
export function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.inputType) {
    case "text":
      return <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      return <input type="tel" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="+233 ..." />;
    case "richText":
      return (
        <textarea
          className="measure-capped"
          rows={4}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "dropdown": {
      const opts = resolveOptions(field);
      return (
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    case "multiSelect": {
      const opts = resolveOptions(field);
      const sel = (value as string[]) ?? [];
      return (
        <div className="pill-group">
          {opts.map((o) => {
            const active = sel.includes(o);
            return (
              <button
                key={o}
                type="button"
                className="pill chip-multi"
                aria-pressed={active}
                onClick={() => onChange(active ? sel.filter((x) => x !== o) : [...sel, o])}
              >
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    case "structuredNumeric": {
      if (field.range) {
        const v = (value as { min?: string; max?: string }) ?? {};
        return (
          <div className="numeric-row">
            <input type="number" value={v.min ?? ""} placeholder="Min" onChange={(e) => onChange({ ...v, min: e.target.value })} />
            <span className="sep">–</span>
            <input type="number" value={v.max ?? ""} placeholder="Max" onChange={(e) => onChange({ ...v, max: e.target.value })} />
            <span className="unit">{field.unit ?? ""}</span>
          </div>
        );
      }
      return (
        <div className="numeric-row">
          <input type="number" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          <span className="unit">{field.unit ?? ""}</span>
        </div>
      );
    }
    case "repeatableTable": {
      const rows = (value as Record<string, string>[]) ?? [];
      const cols = field.columns ?? [];
      const setCell = (ri: number, colId: string, v: string) =>
        onChange(rows.map((r, i) => (i === ri ? { ...r, [colId]: v } : r)));
      const addRow = () => onChange([...rows, Object.fromEntries(cols.map((c) => [c.id, ""]))]);
      const removeRow = (ri: number) => onChange(rows.filter((_, i) => i !== ri));
      return (
        <div className="rt-wrap">
          <table className="rt">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.id}>{c.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {cols.map((c) =>
                    c.inputType === "dropdown" ? (
                      <td key={c.id}>
                        <select value={row[c.id] ?? ""} onChange={(e) => setCell(ri, c.id, e.target.value)}>
                          <option value="">–</option>
                          {(c.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td key={c.id}>
                        <input value={row[c.id] ?? ""} onChange={(e) => setCell(ri, c.id, e.target.value)} />
                      </td>
                    ),
                  )}
                  <td>
                    <button type="button" className="rt-remove" aria-label="Remove row" onClick={() => removeRow(ri)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="rt-add" onClick={addRow}>
            + Add row
          </button>
        </div>
      );
    }
    case "fileUpload": {
      const files = (value as { name: string; size: string }[]) ?? [];
      return (
        <div>
          {files.length > 0 && (
            <div className="file-chip-row">
              {files.map((f, i) => (
                <span className="file-chip" key={i}>
                  {f.name} <span className="size">{f.size}</span>
                  <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <label style={{ cursor: "pointer" }}>
            <div className="upload-box">
              <strong>Click to upload</strong> — max {field.maxFiles ?? 1} file{(field.maxFiles ?? 1) === 1 ? "" : "s"}
            </div>
            <input
              type="file"
              multiple={field.maxFiles !== 1}
              style={{ display: "none" }}
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: formatBytes(f.size) }));
                onChange([...files, ...picked]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      );
    }
    case "toggleWithText": {
      const v = (value as { toggle?: boolean; text?: string }) ?? {};
      return (
        <div>
          <label className="switch-row">
            <span className="switch" data-on={!!v.toggle}>
              <input type="checkbox" checked={!!v.toggle} onChange={(e) => onChange({ ...v, toggle: e.target.checked })} />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
            </span>
            <span>{field.toggleLabel}</span>
          </label>
          <textarea placeholder={field.textLabel} value={v.text ?? ""} onChange={(e) => onChange({ ...v, text: e.target.value })} />
        </div>
      );
    }
    case "mapPicker": {
      const v = (value as { lat?: string; lng?: string; dunsNumber?: string; otherIdentifier?: string }) ?? {};
      return (
        <div>
          <div className="map-note">Interactive map disabled in this preview — production build uses a live map picker.</div>
          <div className="grid2">
            <input placeholder="Latitude" value={v.lat ?? ""} onChange={(e) => onChange({ ...v, lat: e.target.value })} />
            <input placeholder="Longitude" value={v.lng ?? ""} onChange={(e) => onChange({ ...v, lng: e.target.value })} />
            <input
              placeholder="D-U-N-S number"
              value={v.dunsNumber ?? ""}
              onChange={(e) => onChange({ ...v, dunsNumber: e.target.value })}
            />
            <input
              placeholder="Other identifier"
              value={v.otherIdentifier ?? ""}
              onChange={(e) => onChange({ ...v, otherIdentifier: e.target.value })}
            />
          </div>
        </div>
      );
    }
    default:
      return <span className="hint">Unsupported field type: {field.inputType}</span>;
  }
}
