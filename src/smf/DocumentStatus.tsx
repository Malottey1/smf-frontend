import type { DueForReview, EditionSummary } from "../api/types";

export type ViewMode = "current" | "approved" | "historical";
export type DocStatus = "draft" | "qa_review";
export type { EditionSummary };

export interface DocumentStatusProps {
  viewMode: ViewMode;
  docStatus: DocStatus;
  editions: EditionSummary[];
  historicalEdition: number;
  hasPendingComments: boolean;
  dueForReview: DueForReview;
}

/**
 * "A user must never be uncertain which they are looking at." Anchored at
 * the top of the document nav column so it's visible regardless of which
 * chapter is open (see DECISIONS.md — this is deliberately NOT in the
 * panel header, which stays a per-chapter label).
 *
 * Color use stays inside the mockup's discipline: draft/historical are
 * neutral ink (not amber — a draft isn't a problem state), QA review
 * borrows the same teal-wash/teal treatment as .badge-role (informational,
 * not an action), and Approved is the one state that earns solid teal
 * fill — teal is documented in the mockup's own palette as meaning
 * "completion," which Approved literally is. A pending rejection, and
 * FR-SMF-07's "Due for Review" flag, both show as a separate amber flag —
 * amber is reserved for exactly this kind of problem/attention state.
 * Due-for-review only renders on the live document (current draft/QA
 * review) — a frozen historical or approved snapshot isn't something
 * anyone acts on by reviewing it again.
 */
export function DocumentStatus({ viewMode, docStatus, editions, historicalEdition, hasPendingComments, dueForReview }: DocumentStatusProps) {
  const latest = editions.length;

  if (viewMode === "approved") {
    const ed = editions[editions.length - 1];
    return (
      <div className="doc-status status-approved">
        <div className="edition-num mono">Ed. {latest}</div>
        <div className="edition-label">Approved</div>
        <div className="status-line">
          <span className="status-dot" />
          Effective {ed?.effectiveDate ?? "—"}
        </div>
      </div>
    );
  }

  if (viewMode === "historical") {
    const ed = editions[historicalEdition - 1];
    return (
      <div className="doc-status status-historical">
        <div className="edition-num mono">Ed. {historicalEdition}</div>
        <div className="edition-label">Historical · read only</div>
        <div className="status-line">
          <span className="status-dot" />
          Superseded{ed ? ` · was effective ${ed.effectiveDate}` : ""}
        </div>
      </div>
    );
  }

  if (docStatus === "qa_review") {
    return (
      <div className="doc-status status-review">
        <div className="edition-num mono">Ed. {latest + 1}</div>
        <div className="edition-label">Pending</div>
        <div className="status-line">
          <span className="status-dot" />
          Awaiting QA review
        </div>
        {dueForReview.isDue && <DueForReviewFlag reason={dueForReview.reason} />}
      </div>
    );
  }

  return (
    <div className="doc-status status-draft">
      <div className="edition-num mono">Ed. {latest + 1}</div>
      <div className="edition-label">Draft</div>
      <div className="status-line">
        <span className="status-dot" />
        Working copy
      </div>
      {hasPendingComments && (
        <div className="rejected-flag">
          <span>⚑</span> Returned by QA — see chapter comments
        </div>
      )}
      {dueForReview.isDue && <DueForReviewFlag reason={dueForReview.reason} />}
    </div>
  );
}

function DueForReviewFlag({ reason }: { reason: DueForReview["reason"] }) {
  return (
    <div className="rejected-flag">
      <span>⚑</span> Due for review — {reason === "major_change" ? "major facility change logged" : "review date approaching"}
      {" · Facility QA Reviewer notified"}
    </div>
  );
}
