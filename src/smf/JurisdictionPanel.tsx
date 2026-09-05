import type { JurisdictionProfile } from "../../schema/template.schema";
import { Panel, PanelHeader, PanelBody } from "../shell/Panel";
import { ConflictBanner } from "./ConflictBanner";
import type { AppendixConflict } from "./useJurisdictionAppendicesAutosave";

export interface JurisdictionPanelProps {
  profile: JurisdictionProfile;
  files: Record<string, { name: string; size: string }[]>;
  onFilesChange: (appendixId: string, files: { name: string; size: string }[]) => void;
  editable: boolean;
  conflict?: AppendixConflict | null;
  onResolveKeepMine?: () => void;
  onResolveDiscardMine?: () => void;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Advisory-only per FR-SMF-16 — nothing here blocks submission. Amber on
 * the "Advisory" tag stays inside the color-discipline rule since
 * advisory-not-yet-confirmed genuinely is a "flag this" state, not
 * decoration.
 *
 * Wired to a real resource (GET/PUT .../jurisdiction-appendices/{id} —
 * see useJurisdictionAppendicesAutosave) as of the Ghana-upload contract
 * extension; earlier this held files in local useState with nothing on
 * the server to round-trip through.
 *
 * Deliberately its own markup, not the shared `Field` wrapper — an
 * appendix isn't "a label for one input," it's a titled card (heading +
 * description + upload), so it gets a real `<h4>` and its own
 * `.appendix-card` container rather than reusing `role="group"` +
 * `aria-labelledby` built for single form fields.
 */
export function JurisdictionPanel({ profile, files, onFilesChange, editable, conflict, onResolveKeepMine, onResolveDiscardMine }: JurisdictionPanelProps) {
  return (
    <Panel>
      <PanelHeader title={`${profile.name} — supplementary appendices`} identifier="Advisory only — FR-SMF-16" />
      <PanelBody>
        {profile.supplementaryAppendices.map((ap) => {
          const apFiles = files[ap.id] ?? [];
          const isConflicted = conflict?.appendixId === ap.id;
          return (
            <div className="appendix-card" key={ap.id}>
              <div className="appendix-card-head">
                <h4>{ap.title}</h4>
                <span className="pill sel-amber" style={{ cursor: "default" }}>
                  Advisory · never blocks
                </span>
              </div>
              <p className="hint">{ap.description}</p>

              {isConflicted && conflict && onResolveKeepMine && onResolveDiscardMine && (
                <ConflictBanner
                  title={ap.title}
                  conflict={conflict.info}
                  labelFor={() => "Attached files"}
                  onKeepMine={onResolveKeepMine}
                  onDiscardMine={onResolveDiscardMine}
                />
              )}

              {apFiles.length > 0 && (
                <div className="file-chip-row">
                  {apFiles.map((f, i) => (
                    <span className="file-chip" key={i}>
                      {f.name} <span className="size">{f.size}</span>
                      {editable && (
                        <button type="button" onClick={() => onFilesChange(ap.id, apFiles.filter((_, j) => j !== i))}>
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {editable && (
                <label style={{ cursor: "pointer" }}>
                  <div className="upload-box">
                    <strong>Click to upload</strong>
                  </div>
                  <input
                    type="file"
                    aria-label={`Upload ${ap.title}`}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: formatBytes(f.size) }));
                      onFilesChange(ap.id, [...apFiles, ...picked]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              <p className="hint">{ap.provenance}</p>
            </div>
          );
        })}
      </PanelBody>
    </Panel>
  );
}
