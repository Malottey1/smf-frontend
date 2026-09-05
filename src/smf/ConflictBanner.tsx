function stable(value: unknown): string {
  return JSON.stringify(value);
}

export interface ConflictInfo {
  /** Values as last read from the server, before the user's local edits. */
  baselineValues: Record<string, unknown>;
  /** What the user was trying to save. */
  pendingValues: Record<string, unknown>;
  /** The server's actual current values, from the 409 response. */
  currentValues: Record<string, unknown>;
}

export interface ConflictBannerProps {
  title: string;
  conflict: ConflictInfo;
  labelFor: (key: string) => string;
  onKeepMine: () => void;
  onDiscardMine: () => void;
}

/**
 * Shown on a 409: "another writer saved since this client last read"
 * (openapi/smf-api.yaml). Diffs three states per field — what we started
 * from, what we tried to save, what the server actually has now — rather
 * than just saying "conflict, try again." A field only the server changed
 * is informational; a field BOTH sides changed is a real conflict the
 * user has to decide about.
 */
export function ConflictBanner({ title, conflict, labelFor, onKeepMine, onDiscardMine }: ConflictBannerProps) {
  const { baselineValues, pendingValues, currentValues } = conflict;
  const keys = Array.from(new Set([...Object.keys(pendingValues), ...Object.keys(currentValues)]));
  const rows = keys
    .map((key) => {
      const serverChanged = stable(currentValues[key]) !== stable(baselineValues[key]);
      const mineChanged = stable(pendingValues[key]) !== stable(baselineValues[key]);
      if (!serverChanged && !mineChanged) return null;
      return { key, serverChanged, mineChanged, bothChanged: serverChanged && mineChanged };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="conflict-banner">
      <div className="conflict-head">
        <strong>Someone else saved changes to {title} while you were editing</strong>
        <p>Nothing was overwritten. Review what changed, then choose how to resolve it.</p>
      </div>
      <ul className="conflict-list">
        {rows.map((r) => (
          <li key={r.key} className={r.bothChanged ? "conflict-row conflict-row-clash" : "conflict-row"}>
            <span className="conflict-field-label">{labelFor(r.key)}</span>
            {r.bothChanged ? (
              <span className="conflict-tag conflict-tag-clash">You both changed this</span>
            ) : r.serverChanged ? (
              <span className="conflict-tag">Updated by someone else</span>
            ) : (
              <span className="conflict-tag">Your unsaved change</span>
            )}
          </li>
        ))}
      </ul>
      <div className="conflict-actions">
        <button type="button" className="btn btn-ghost" onClick={onDiscardMine}>
          Discard my changes, load latest
        </button>
        <button type="button" className="btn btn-primary" onClick={onKeepMine}>
          Keep my changes, save anyway
        </button>
      </div>
    </div>
  );
}
