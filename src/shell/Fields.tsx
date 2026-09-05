import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * A real <h3> (every caller sits under a PanelHeader's <h2>), styled
 * identically to the mockup's own div.section-title — same class, same
 * look, purely a semantic-element swap. The mockup's plain <div> here
 * means a screen reader's heading navigation skips every section inside
 * a panel entirely, which the brief's own WCAG 2.2 AA target doesn't
 * allow porting over as-is.
 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="section-title">{children}</h3>;
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid2">{children}</div>;
}

export interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  /** Full-width, outside the two-column grid — for long text per the
   * "two-column grid for short fields, full width for long text" rule. */
  fullWidth?: boolean;
}

/**
 * Every field type from single inputs to repeatable tables renders through
 * this one wrapper, so label association is handled once, here, instead
 * of per input type. A plain sibling <label> (the mockup's own markup)
 * has no programmatic relationship to its control at all — a WCAG 2.2 AA
 * miss the brief itself sets as a target. `role="group"` +
 * `aria-labelledby` covers every field shape uniformly, including
 * multi-control ones (multiSelect, repeatableTable) where `htmlFor`
 * pointing at a single input wouldn't make sense anyway.
 */
export function Field({ label, hint, children, fullWidth }: FieldProps) {
  const labelId = useId();
  return (
    <div className="field" role="group" aria-labelledby={labelId} style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label id={labelId}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function ReadonlyId({ value }: { value: string }) {
  return <input className="readonly-id mono" value={value} disabled readOnly />;
}

export type PillTone = "red" | "amber" | "grey" | "neutral";

export interface PillOption {
  value: string;
  label: string;
  tone: PillTone;
}

export interface PillGroupProps {
  options: PillOption[];
  value: string | null;
  onChange: (value: string) => void;
}

/** Severity/classification pills — teal is never used here; tone comes
 * from the option itself (red/amber reserved for classification, per the
 * "colour discipline" rule — never decorative). */
export function PillGroup({ options, value, onChange }: PillGroupProps) {
  return (
    <div className="pill-group">
      {options.map((opt) => {
        const selected = opt.value === value;
        const toneClass = selected && opt.tone !== "neutral" ? ` sel-${opt.tone}` : "";
        return (
          <button
            key={opt.value}
            type="button"
            className={`pill${toneClass}`}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function UploadBox({ children }: { children: ReactNode }) {
  return (
    <div className="upload-box">
      <strong>Click to upload</strong> {children}
    </div>
  );
}

export function Button({ variant = "ghost", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const cls = variant === "primary" ? "btn btn-primary" : "btn btn-ghost";
  return <button type="button" {...rest} className={rest.className ? `${cls} ${rest.className}` : cls} />;
}
