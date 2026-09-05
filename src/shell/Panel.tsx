import type { ReactNode } from "react";

export interface PanelProps {
  children: ReactNode;
}

/** Panel shell — ported unchanged from the mockup. */
export function Panel({ children }: PanelProps) {
  return <div className="panel">{children}</div>;
}

export interface PanelHeaderProps {
  title: string;
  /** Monospace identifier on the right — a draft placeholder string, a
   * record ID, or (for SMF) left empty and rendered by the document
   * status block instead; the panel header itself stays a per-chapter
   * label, not where document-level status lives (see DECISIONS.md). */
  identifier: string;
}

export function PanelHeader({ title, identifier }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <span className="id mono">{identifier}</span>
    </div>
  );
}

export interface PanelBodyProps {
  children: ReactNode;
}

export function PanelBody({ children }: PanelBodyProps) {
  return <div className="form-body">{children}</div>;
}

export interface PanelActionsProps {
  note: string;
  children: ReactNode;
}

export function PanelActions({ note, children }: PanelActionsProps) {
  return (
    <div className="form-actions">
      <span className="save-note">{note}</span>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
    </div>
  );
}
