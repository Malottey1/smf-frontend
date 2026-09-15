import { useState } from "react";
import templateJson from "../../schema/template.json" with { type: "json" };
import type { Template } from "../../schema/template.schema";
import type { EditionSummary } from "../api/types";
import { Panel, PanelHeader, PanelBody } from "../shell/Panel";
import { useEditionDiff } from "../api/hooks";
import { findFieldById } from "./fieldLookup";

const TEMPLATE = templateJson as Template;

function formatDiffValue(value: unknown): string {
  if (value == null || value === "") return "Not provided";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Not provided";
    if (typeof value[0] === "string") return value.join(", ");
    if (typeof value[0] === "object") return `${value.length} row${value.length === 1 ? "" : "s"}`;
    return value.join(", ");
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("toggle" in v) return v.toggle ? String(v.text ?? "Yes") : "No";
    if ("lat" in v || "dunsNumber" in v) {
      const parts = [v.lat && v.lng ? `${v.lat}, ${v.lng}` : null, v.dunsNumber, v.otherIdentifier].filter(Boolean);
      return parts.length ? parts.join(" · ") : "Not provided";
    }
    if ("min" in v || "max" in v) return `${v.min ?? "—"} – ${v.max ?? "—"}`;
    return JSON.stringify(value);
  }
  return String(value);
}

export interface EditionHistoryPanelProps {
  editions: EditionSummary[];
  editionIdForDiff: string;
  /** False once already due, or for the Inspector persona — logging a
   * facility change is a Factory User/QA action, not something an
   * inspector triggers. */
  canLogMajorChange: boolean;
  onLogMajorChange: () => void;
}

/**
 * FR-SMF-08's second half: not just read-only access to the latest
 * approved edition (DocumentNav's view switch already covers that), but
 * "an inspector who can compare edition 3 to edition 4." Field-level diff
 * via GET .../editions/{a}/diff/{b} (src/mocks/handlers.ts), read
 * through useEditionDiff — nothing here recomputes the comparison
 * client-side.
 *
 * Also hosts FR-SMF-07's on-demand "Due for Review" trigger. In a real
 * platform this would be called BY another module (Equipment logging a
 * major change), not clicked here — this button stands in for that
 * external call so the behavior is demonstrable without that module
 * existing in this phase. Labelled as a simulation, not presented as if
 * it were the real triggering mechanism.
 */
export function EditionHistoryPanel({ editions, editionIdForDiff, canLogMajorChange, onLogMajorChange }: EditionHistoryPanelProps) {
  const sorted = [...editions].sort((a, b) => b.editionNumber - a.editionNumber);
  const [editionA, setEditionA] = useState<number | null>(sorted[1]?.editionNumber ?? null);
  const [editionB, setEditionB] = useState<number | null>(sorted[0]?.editionNumber ?? null);

  const diffQuery = useEditionDiff(editionIdForDiff, editionA, editionB);

  return (
    <Panel>
      <PanelHeader title="Edition history" identifier={`${editions.length} approved edition${editions.length === 1 ? "" : "s"}`} />
      <PanelBody>
        <div className="appendix-card" style={{ marginBottom: 20 }}>
          <div className="appendix-card-head">
            <h4>FR-SMF-07 — Due for review</h4>
          </div>
          <p className="hint">
            Flags the document "Due for Review" and notifies the Facility QA Reviewer — automatically as the review
            date approaches, or on demand when a major facility change is logged elsewhere in the platform (e.g. by
            the Equipment module, out of scope for this phase). This button stands in for that external trigger.
          </p>
          <button type="button" className="btn btn-ghost" disabled={!canLogMajorChange} onClick={onLogMajorChange}>
            {canLogMajorChange ? "Simulate: log a major facility change" : "Already flagged for review"}
          </button>
        </div>

        <div className="table-wrap" style={{ marginBottom: 22 }}>
          <table className="rt">
            <thead>
              <tr>
                <th>Edition</th>
                <th>Effective date</th>
                <th>Approved by</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.editionNumber}>
                  <td className="mono">{e.editionNumber}</td>
                  <td>{e.effectiveDate ?? "—"}</td>
                  <td>{e.approvedBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="field" role="group" aria-label="Compare editions">
          <label>Compare editions</label>
          <div className="grid2">
            <select value={editionA ?? ""} onChange={(e) => setEditionA(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select an edition…</option>
              {sorted.map((e) => (
                <option key={e.editionNumber} value={e.editionNumber} disabled={e.editionNumber === editionB}>
                  Edition {e.editionNumber}
                </option>
              ))}
            </select>
            <select value={editionB ?? ""} onChange={(e) => setEditionB(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Select an edition…</option>
              {sorted.map((e) => (
                <option key={e.editionNumber} value={e.editionNumber} disabled={e.editionNumber === editionA}>
                  Edition {e.editionNumber}
                </option>
              ))}
            </select>
          </div>
          <span className="hint">Fields identical between the two editions aren't listed — only what changed.</span>
        </div>

        {editionA != null && editionB != null && editionA === editionB && (
          <p className="hint">Pick two different editions to compare.</p>
        )}

        {diffQuery.isLoading && <p className="hint">Comparing editions…</p>}

        {diffQuery.data && (
          <div className="table-wrap">
            <table className="rt">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Ref</th>
                  <th>Edition {editionA}</th>
                  <th>Edition {editionB}</th>
                </tr>
              </thead>
              <tbody>
                {diffQuery.data.changedFields.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hint">
                      No differences between Edition {editionA} and Edition {editionB}.
                    </td>
                  </tr>
                ) : (
                  diffQuery.data.changedFields.map((c) => (
                    <tr key={c.fieldId}>
                      <td>{findFieldById(TEMPLATE.chapters, c.fieldId)?.label ?? c.fieldId}</td>
                      <td className="mono">{c.ref}</td>
                      <td>{formatDiffValue(c.from)}</td>
                      <td>{formatDiffValue(c.to)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
