import type { Annex } from "../../schema/template.schema";
import type { AnnexContent } from "../api/types";
import { Panel, PanelHeader, PanelBody } from "../shell/Panel";
import { ConflictBanner } from "./ConflictBanner";
import type { AnnexConflict } from "./useAnnexesAutosave";

export interface AnnexesPanelProps {
  annexes: Annex[];
  annexById: Record<string, AnnexContent | undefined>;
  savingByAnnex: Record<string, { state: "saving" | "saved"; time?: string }>;
  conflict: AnnexConflict | null;
  onDateChange: (annexId: string, date: string) => void;
  onResolveKeepMine: () => void;
  onResolveDiscardMine: () => void;
  editable: boolean;
}

/**
 * Extends the mockup's single dashed drop-zone into an annex card per
 * FR-SMF-03: uploaded file, independent effective date, real revision id,
 * and which chapter clause references it. Each annex saves on its own
 * timeline against its own revision — changing Annex 6's date never
 * touches Chapters 1–9 or any other annex's in-flight save.
 */
export function AnnexesPanel({
  annexes,
  annexById,
  savingByAnnex,
  conflict,
  onDateChange,
  onResolveKeepMine,
  onResolveDiscardMine,
  editable,
}: AnnexesPanelProps) {
  return (
    <Panel>
      <PanelHeader title="Annexes 1–8" identifier="Independently dated (FR-SMF-03)" />
      <PanelBody>
        <div className="grid2">
          {annexes.map((a) => {
            const content = annexById[a.id];
            const saving = savingByAnnex[a.id];
            const isConflicted = conflict?.annexId === a.id;
            return (
              <div className="field" key={a.id} style={{ gridColumn: "1 / -1" }}>
                <label>
                  Annex {a.number} — {a.title}
                </label>
                <div className="upload-box" style={{ textAlign: "left" }}>
                  <strong>{a.sourceFieldId ? "Linked to chapter field" : "Standalone record"}</strong>{" "}
                  — referenced from clause{a.linkedFromRefs.length > 1 ? "s" : ""} {a.linkedFromRefs.join(", ")}
                </div>

                {isConflicted && conflict && (
                  <ConflictBanner
                    title={`Annex ${a.number}`}
                    conflict={conflict.info}
                    labelFor={(key) => (key === "effectiveDate" ? "Effective date" : key)}
                    onKeepMine={onResolveKeepMine}
                    onDiscardMine={onResolveDiscardMine}
                  />
                )}

                <div className="grid2" style={{ marginTop: 8 }}>
                  <div className="field">
                    <label>Effective date</label>
                    <input
                      type="date"
                      disabled={!editable || !content}
                      value={content?.effectiveDate ?? ""}
                      onChange={(e) => onDateChange(a.id, e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Revision</label>
                    <input className="readonly-id mono" disabled readOnly value={content?.revision.slice(0, 8) ?? "—"} />
                  </div>
                </div>
                <span className="hint">
                  {a.whoCitation}
                  {saving && editable ? ` · ${saving.state === "saving" ? "Saving…" : `Saved ${saving.time}`}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}
