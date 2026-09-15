import type { Chapter, Annex } from "../../schema/template.schema";
import type { CompletionSummary, DueForReview, EditionSummary } from "../api/types";
import { DocumentStatus, type ViewMode, type DocStatus } from "./DocumentStatus";

export type Section = "chapter" | "annexes" | "jurisdiction" | "export" | "history";

export interface DocumentNavProps {
  chapters: Chapter[];
  annexes: Annex[];
  completionByChapter: CompletionSummary["byChapter"];
  activeSection: Section;
  activeChapter: number;
  onSelect: (section: Section, chapterNumber?: number) => void;
  chaptersWithComments: Set<number>;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  docStatus: DocStatus;
  editions: EditionSummary[];
  historicalEdition: number;
  setHistoricalEdition: (n: number) => void;
  hasPendingComments: boolean;
  /** False for the Inspector persona (FR-SMF-08) — an inspector never
   * sees an unapproved working draft, only approved/historical editions. */
  allowDraftView: boolean;
  dueForReview: DueForReview;
}

/**
 * Document navigation column — sits between the rail and the panel,
 * extends the rail's visual language (same type scale as .rail-nav, same
 * spacing rhythm) on --wash rather than --navy-deep, per the brief. The
 * document status block is pinned at the top so it stays visible
 * regardless of which chapter is open.
 */
export function DocumentNav({
  chapters,
  annexes,
  completionByChapter,
  activeSection,
  activeChapter,
  onSelect,
  chaptersWithComments,
  viewMode,
  setViewMode,
  docStatus,
  editions,
  historicalEdition,
  setHistoricalEdition,
  hasPendingComments,
  allowDraftView,
  dueForReview,
}: DocumentNavProps) {
  const latest = editions.length;

  return (
    <nav className="doc-nav">
      <DocumentStatus
        viewMode={viewMode}
        docStatus={docStatus}
        editions={editions}
        historicalEdition={historicalEdition}
        hasPendingComments={hasPendingComments}
        dueForReview={dueForReview}
      />

      <div className="doc-view-switch">
        {allowDraftView && (
          <button type="button" className={viewMode === "current" ? "active" : ""} onClick={() => setViewMode("current")}>
            Current working copy
          </button>
        )}
        <button
          type="button"
          className={viewMode === "approved" ? "active" : ""}
          disabled={latest === 0}
          onClick={() => setViewMode("approved")}
        >
          Latest approved edition
        </button>
        <button
          type="button"
          className={viewMode === "historical" ? "active" : ""}
          disabled={latest < 2}
          onClick={() => {
            setViewMode("historical");
            setHistoricalEdition(Math.max(1, latest - 1));
          }}
        >
          Historical editions
        </button>
        {viewMode === "historical" && (
          <select
            value={historicalEdition}
            onChange={(e) => setHistoricalEdition(Number(e.target.value))}
            style={{ margin: "4px 10px 0", fontSize: 12 }}
          >
            {Array.from({ length: latest - 1 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Edition {n}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <div className="doc-nav-group-label">Chapters</div>
        <div className="doc-nav-list">
          {chapters.map((c) => {
            const percent = completionByChapter.find((cc) => cc.chapterNumber === c.number)?.percent ?? 0;
            const active = activeSection === "chapter" && activeChapter === c.number;
            const classes = ["doc-nav-item"];
            if (active) classes.push("active");
            if (percent === 100) classes.push("complete");
            if (chaptersWithComments.has(c.number)) classes.push("has-comment");
            return (
              <button key={c.id} type="button" className={classes.join(" ")} onClick={() => onSelect("chapter", c.number)}>
                <span className="num">{c.number}</span>
                <span className="label">{c.title}</span>
                <span className="pct">{percent}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="doc-nav-group-label">Annexes</div>
        <div className="doc-nav-list">
          <button
            type="button"
            className={activeSection === "annexes" ? "doc-nav-item active" : "doc-nav-item"}
            onClick={() => onSelect("annexes")}
          >
            <span className="num">§</span>
            <span className="label">Annexes 1–{annexes.length}</span>
          </button>
          <button
            type="button"
            className={activeSection === "jurisdiction" ? "doc-nav-item active" : "doc-nav-item"}
            onClick={() => onSelect("jurisdiction")}
          >
            <span className="num">GH</span>
            <span className="label">Ghana appendices</span>
          </button>
          <button
            type="button"
            className={activeSection === "export" ? "doc-nav-item active" : "doc-nav-item"}
            onClick={() => onSelect("export")}
          >
            <span className="num">⇩</span>
            <span className="label">Export preview</span>
          </button>
          <button
            type="button"
            className={activeSection === "history" ? "doc-nav-item active" : "doc-nav-item"}
            onClick={() => onSelect("history")}
          >
            <span className="num">⧗</span>
            <span className="label">Edition history</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
