import type { ReactNode } from "react";

export function Sidebar({ children }: { children: ReactNode }) {
  return <div className="side">{children}</div>;
}

export interface AuditItem {
  who: string;
  when: string;
  what: string;
}

export function AuditTrailCard({ items }: { items: AuditItem[] }) {
  return (
    <div className="side-card">
      <h3>Audit Trail</h3>
      {items.map((item, i) => (
        <div className="audit-item" key={i}>
          <span className="dot" />
          <div>
            <div className="who">{item.who}</div>
            <div className="when">{item.when}</div>
            <div className="what">{item.what}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface IntegrityRow {
  label: string;
  value: string;
}

/** Generic version of the mockup's "Data Integrity" card — same card,
 * reusable for any row-of-label/verified-value content (e.g. SMF's annex
 * revision status later), not hardcoded to the three ALCOA rows shown in
 * the mockup. */
export function StatusRowsCard({ title, rows }: { title: string; rows: IntegrityRow[] }) {
  return (
    <div className="side-card">
      <h3>{title}</h3>
      {rows.map((row, i) => (
        <div className="integrity-row" key={i}>
          <span>{row.label}</span>
          <span className="ok">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GuidanceCard({ children }: { children: ReactNode }) {
  return <TextCard title="Guidance">{children}</TextCard>;
}

/** Generic version of the mockup's "Batch Genealogy" card shape — a
 * titled card with a single help-text paragraph, title supplied by the
 * caller (GuidanceCard is the "Guidance"-titled special case of this). */
export function TextCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="side-card">
      <h3>{title}</h3>
      <div className="help-text">{children}</div>
    </div>
  );
}
