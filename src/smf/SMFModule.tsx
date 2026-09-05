import { lazy, Suspense, useEffect, useState } from "react";
import template from "../../schema/template.json";
import type { Template } from "../../schema/template.schema";
import { DocumentNav, type Section } from "./DocumentNav";
import { ChapterPanel, type ReviewComment } from "./ChapterPanel";
import { AnnexesPanel } from "./AnnexesPanel";
import { JurisdictionPanel } from "./JurisdictionPanel";
import { EditionHistoryPanel } from "./EditionHistoryPanel";
import { SMFSidebar } from "./SMFSidebar";
import type { ViewMode, DocStatus } from "./DocumentStatus";
import { useChapterAutosave } from "./useChapterAutosave";
import { useAnnexesAutosave } from "./useAnnexesAutosave";
import { useJurisdictionAppendicesAutosave } from "./useJurisdictionAppendicesAutosave";
import {
  useChapterRefs,
  useDocument,
  useEditions,
  useComments,
  useJurisdictionProfiles,
  useSubmitDocumentMutation,
  useReviewDocumentMutation,
  useFlagDueForReviewMutation,
} from "../api/hooks";
import { ApiError } from "../api/client";
import "./smf.css";

// Lazy-loaded: pagedjs is a heavy dependency (~700KB) that only the
// export preview needs. Code-splitting it keeps it out of the bundle
// every other screen has to load.
const ExportPreview = lazy(() => import("./export/ExportPreview").then((m) => ({ default: m.ExportPreview })));

const TEMPLATE = template as Template;

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const ALL_CHAPTER_REFS = TEMPLATE.chapters.flatMap((c) => c.subClauses.map((sc) => sc.ref));
const ALL_ANNEX_IDS = TEMPLATE.annexes.map((a) => a.id);
const ALL_APPENDIX_IDS = (TEMPLATE.jurisdictionProfiles[0]?.supplementaryAppendices ?? []).map((a) => a.id);

export type SmfRole = "factory_user" | "inspector";

export interface SMFModuleProps {
  role: SmfRole;
}

/**
 * Top-level SMF module: wires the document navigation column, the
 * chapter/annex/jurisdiction panels, and the sidebar to the real API
 * client (src/api/) — every read is a TanStack Query, every write is a
 * mutation against src/mocks/handlers.ts (MSW) with real optimistic
 * concurrency. No component here holds document content in useState
 * directly; only client-only UI state (which chapter is open, reject
 * form fields) does.
 *
 * `role` demonstrates FR-SMF-08's Inspector persona without a real
 * login: an inspector never sees an unapproved working draft, only
 * approved/historical editions — see the effect below and
 * `allowDraftView` passed to DocumentNav.
 */
export function SMFModule({ role }: SMFModuleProps) {
  const [activeSection, setActiveSection] = useState<Section>("chapter");
  const [activeChapter, setActiveChapter] = useState(4);
  const [rawViewMode, setViewMode] = useState<ViewMode>("current");
  const [historicalEdition, setHistoricalEdition] = useState(1);
  const [showReject, setShowReject] = useState(false);
  const [rejectChapter, setRejectChapter] = useState(1);
  const [rejectText, setRejectText] = useState("");
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const allowDraftView = role !== "inspector";
  // Derived, not just effect-corrected: an inspector must never see even
  // one render of a draft's editable content while switching roles — the
  // effect below keeps the underlying state tidy for next time, but
  // `viewMode` itself is already safe on the very first render.
  const viewMode: ViewMode = !allowDraftView && rawViewMode === "current" ? "approved" : rawViewMode;
  useEffect(() => {
    if (!allowDraftView && rawViewMode === "current") setViewMode("approved");
  }, [allowDraftView, rawViewMode]);

  const editionsQuery = useEditions("current");
  const editions = editionsQuery.data ?? [];
  const latestApproved = editions.length > 0 ? Math.max(...editions.map((e) => e.editionNumber)) : 0;
  const editionIdForView = viewMode === "current" ? "current" : viewMode === "approved" ? String(latestApproved) : String(historicalEdition);

  const documentQuery = useDocument(editionIdForView);
  const commentsQuery = useComments("current");
  const jurisdictionProfilesQuery = useJurisdictionProfiles();
  const reviewComments: ReviewComment[] = (commentsQuery.data ?? []).map((c) => ({ chapterRef: c.chapterRef, text: c.text }));
  const hasPendingComments = reviewComments.length > 0;

  const docStatus: DocStatus = documentQuery.data?.status === "qa_review" ? "qa_review" : "draft";
  const editable = viewMode === "current" && docStatus === "draft";

  const chapter = TEMPLATE.chapters.find((c) => c.number === activeChapter)!;
  const chapterAutosave = useChapterAutosave(editionIdForView, chapter, editable);
  const annexesAutosave = useAnnexesAutosave(editionIdForView, ALL_ANNEX_IDS, viewMode === "current");
  const appendicesAutosave = useJurisdictionAppendicesAutosave(editionIdForView, ALL_APPENDIX_IDS, viewMode === "current");

  // Only fetched once Export preview is actually opened — every chapter's
  // sub-clauses, not just the active one, since the export covers the
  // whole document.
  const allChaptersQuery = useChapterRefs(editionIdForView, ALL_CHAPTER_REFS, activeSection === "export");
  const exportValues = Object.assign({}, ...allChaptersQuery.map((q) => q.data?.values ?? {}));

  const submitMutation = useSubmitDocumentMutation("current");
  const reviewMutation = useReviewDocumentMutation("current");
  const flagDueForReviewMutation = useFlagDueForReviewMutation("current");

  function onSelect(section: Section, chapterNumber?: number) {
    setActiveSection(section);
    if (chapterNumber) setActiveChapter(chapterNumber);
    setWorkflowError(null);
  }

  function sendForReview() {
    if (!documentQuery.data) return;
    setWorkflowError(null);
    submitMutation.mutate(documentQuery.data.revision, {
      onError: (err) => setWorkflowError(err instanceof ApiError ? err.message : "Could not submit for review."),
    });
  }

  function approve() {
    if (!documentQuery.data) return;
    reviewMutation.mutate({ revision: documentQuery.data.revision, decision: "approve" });
  }

  function submitReject() {
    if (!documentQuery.data) return;
    reviewMutation.mutate(
      {
        revision: documentQuery.data.revision,
        decision: "reject",
        comments: [{ chapterRef: String(rejectChapter), text: rejectText || "Please review and revise." }],
      },
      {
        onSuccess: () => {
          setShowReject(false);
          setRejectText("");
        },
      },
    );
  }

  const comment = editable ? reviewComments.find((c) => c.chapterRef === String(activeChapter)) : undefined;

  const reviewIntervalMonths = jurisdictionProfilesQuery.data?.[0]?.reviewIntervalMonths ?? 24;
  const exportEffectiveDate = documentQuery.data?.effectiveDate ?? "Not yet effective";
  const exportMeta = {
    manufacturerAndSite: documentQuery.data?.manufacturerName
      ? `${documentQuery.data.manufacturerName} — ${documentQuery.data.siteAddress}`
      : "Manufacturer name and site address not yet entered",
    editionLabel:
      viewMode === "approved"
        ? `Edition ${latestApproved}`
        : viewMode === "historical"
          ? `Edition ${historicalEdition} (superseded)`
          : docStatus === "qa_review"
            ? `Pending — edition ${latestApproved + 1} awaiting QA review`
            : `Draft — working on edition ${latestApproved + 1}`,
    effectiveDate: exportEffectiveDate ?? "Not yet effective",
    nextReviewDate:
      exportEffectiveDate && exportEffectiveDate.match(/^\d{4}-\d{2}-\d{2}$/) ? addMonths(exportEffectiveDate, reviewIntervalMonths) : "—",
  };
  const annexDatesForExport = Object.fromEntries(TEMPLATE.annexes.map((a) => [a.id, annexesAutosave.annexById[a.id]?.effectiveDate ?? ""]));

  // Guard against a real flash-of-wrong-content bug: editions defaults to
  // [] while editionsQuery is still loading, which made the edition
  // number briefly render as "Ed. 1" (computed from an empty list) before
  // correcting itself to the real "Ed. 2" once data arrived — exactly
  // the kind of momentary wrong status this app can't show (found by
  // e2e/FR-SMF-03.spec.ts, not by inspection). Show a plain loading state
  // instead of any document status/completion numbers until both the
  // edition list and the viewed document have actually resolved.
  if (editionsQuery.isLoading || documentQuery.isLoading) {
    return (
      <div className="content">
        <div className="export-loading">Loading Site Master File…</div>
      </div>
    );
  }

  return (
    <>
      {showReject && (
        <div className="reject-bar">
          <select value={rejectChapter} onChange={(e) => setRejectChapter(Number(e.target.value))}>
            {TEMPLATE.chapters.map((c) => (
              <option key={c.number} value={c.number}>
                Chapter {c.number} — {c.title}
              </option>
            ))}
          </select>
          <textarea placeholder="What needs to change?" value={rejectText} onChange={(e) => setRejectText(e.target.value)} />
          <button className="btn btn-primary" onClick={submitReject}>
            Send rejection
          </button>
        </div>
      )}
      <div className="content">
        <DocumentNav
          chapters={TEMPLATE.chapters}
          annexes={TEMPLATE.annexes}
          completionByChapter={documentQuery.data?.completion.byChapter ?? []}
          activeSection={activeSection}
          activeChapter={activeChapter}
          onSelect={onSelect}
          chaptersWithComments={new Set(reviewComments.map((c) => Number(c.chapterRef)))}
          viewMode={viewMode}
          setViewMode={setViewMode}
          docStatus={docStatus}
          editions={editions}
          historicalEdition={historicalEdition}
          setHistoricalEdition={setHistoricalEdition}
          hasPendingComments={hasPendingComments}
          allowDraftView={allowDraftView}
          dueForReview={documentQuery.data?.dueForReview ?? { isDue: false, reason: null }}
        />

        {activeSection === "chapter" && (
          <ChapterPanel
            chapter={chapter}
            values={chapterAutosave.values}
            onFieldChange={chapterAutosave.onFieldChange}
            viewMode={viewMode}
            docStatus={docStatus}
            hasPendingComments={hasPendingComments}
            comment={comment}
            savingLabel={workflowError ?? chapterAutosave.savingLabel}
            conflict={chapterAutosave.conflict}
            onResolveKeepMine={chapterAutosave.resolveKeepMine}
            onResolveDiscardMine={chapterAutosave.resolveDiscardMine}
            onSendForReview={sendForReview}
            onApprove={approve}
            onOpenReject={() => setShowReject(true)}
          />
        )}
        {activeSection === "annexes" && (
          <AnnexesPanel
            annexes={TEMPLATE.annexes}
            annexById={annexesAutosave.annexById}
            savingByAnnex={annexesAutosave.savingByAnnex}
            conflict={annexesAutosave.conflict}
            onDateChange={annexesAutosave.onDateChange}
            onResolveKeepMine={annexesAutosave.resolveKeepMine}
            onResolveDiscardMine={annexesAutosave.resolveDiscardMine}
            editable={viewMode === "current"}
          />
        )}
        {activeSection === "jurisdiction" && jurisdictionProfilesQuery.data?.[0] && (
          <JurisdictionPanel
            profile={jurisdictionProfilesQuery.data[0]}
            files={appendicesAutosave.filesByAppendix}
            onFilesChange={appendicesAutosave.setFiles}
            editable={viewMode === "current"}
            conflict={appendicesAutosave.conflict}
            onResolveKeepMine={appendicesAutosave.resolveKeepMine}
            onResolveDiscardMine={appendicesAutosave.resolveDiscardMine}
          />
        )}
        {activeSection === "export" && (
          <Suspense fallback={<div className="export-preview-shell export-loading">Loading export preview…</div>}>
            <ExportPreview
              template={TEMPLATE}
              values={exportValues}
              annexDates={annexDatesForExport}
              jurisdictionFiles={appendicesAutosave.filesByAppendix}
              meta={exportMeta}
            />
          </Suspense>
        )}
        {activeSection === "history" && (
          <EditionHistoryPanel
            editions={editions}
            editionIdForDiff="current"
            canLogMajorChange={allowDraftView && !documentQuery.data?.dueForReview.isDue}
            onLogMajorChange={() => flagDueForReviewMutation.mutate()}
          />
        )}

        {activeSection !== "export" && activeSection !== "history" && (
          <SMFSidebar activeSection={activeSection} activeChapter={activeChapter} />
        )}
      </div>
    </>
  );
}
