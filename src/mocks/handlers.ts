import { http, HttpResponse, type HttpHandler } from "msw";
import {
  db,
  TEMPLATE,
  newRevision,
  nowISO,
  addMonths,
  FACTORY_USER,
  QA_REVIEWER,
  type ChapterRecord,
  type AnnexRecord,
  type DocumentRecord,
  type JurisdictionAppendixFilesRecord,
} from "./db";
import { overallCompletion, chapterCompletion, type FieldValueMap } from "../smf/completion";
import { computeDueForReview } from "./dueForReview";

// Leading "*" matches this path on any origin (msw's documented wildcard) —
// needed because relative-path handlers only resolve against
// `window.location` in a real browser; Node/Vitest has no such origin to
// resolve against, so plain "/api/smf/v1/..." patterns silently never match
// an absolute test URL like "http://localhost/api/smf/v1/...".
const BASE = "*/api/smf/v1";

function mergedValues(chapters: Record<string, ChapterRecord>): FieldValueMap {
  return Object.assign({}, ...Object.values(chapters).map((c) => c.values));
}

function completionFor(chapters: Record<string, ChapterRecord>) {
  const values = mergedValues(chapters);
  const overall = overallCompletion(TEMPLATE.chapters, values);
  return {
    overallPercent: overall.percent,
    byChapter: TEMPLATE.chapters.map((c) => {
      const r = chapterCompletion(c, values);
      return { chapterNumber: c.number, percent: r.percent, requiredFieldCount: r.required, completedFieldCount: r.done };
    }),
  };
}

function documentView(editionId: string): { doc: ReturnType<typeof buildDocResponse>; chapters: Record<string, ChapterRecord>; annexes: Record<string, AnnexRecord> } | null {
  if (editionId === "current") {
    return {
      doc: buildDocResponse(db.document, completionFor(db.chapters), db.document.manualReviewFlag),
      chapters: db.chapters,
      annexes: db.annexes,
    };
  }
  const num = Number(editionId);
  const edition = db.editions.find((e) => e.editionNumber === num);
  const snapshot = db.editionSnapshots[num];
  if (!edition || !snapshot) return null;
  const doc: DocumentRecord = {
    id: db.document.id,
    editionNumber: edition.editionNumber,
    status: "approved",
    jurisdictionProfileId: db.document.jurisdictionProfileId,
    manufacturerName: db.document.manufacturerName,
    siteAddress: db.document.siteAddress,
    effectiveDate: edition.effectiveDate,
    nextReviewDate: addMonths(edition.effectiveDate, TEMPLATE.jurisdictionProfiles[0]?.reviewIntervalMonths ?? 24),
    // A past approved edition doesn't carry the live document's on-demand
    // review flag — that flag is about the current working copy, not a
    // frozen historical record.
    manualReviewFlag: false,
    revision: `edition-${edition.editionNumber}`,
    updatedAt: edition.approvedAt,
    updatedBy: edition.approvedBy,
  };
  return { doc: buildDocResponse(doc, completionFor(snapshot.chapters), false), chapters: snapshot.chapters, annexes: snapshot.annexes };
}

function buildDocResponse(doc: DocumentRecord, completion: ReturnType<typeof completionFor>, manualReviewFlag: boolean) {
  const dueForReview = computeDueForReview(doc.nextReviewDate, manualReviewFlag, new Date());
  return { ...doc, completion, dueForReview };
}

function errorBody(error: string, message: string) {
  return { error, message };
}

function conflictBody(currentRevision: string, currentValue: unknown) {
  return { error: "revision_conflict", currentRevision, currentValue };
}

export const handlers: HttpHandler[] = [
  // ---------- jurisdiction profiles ----------
  http.get(`${BASE}/jurisdiction-profiles`, () => {
    return HttpResponse.json(TEMPLATE.jurisdictionProfiles);
  }),

  // ---------- documents ----------
  http.get(`${BASE}/documents`, () => {
    return HttpResponse.json([buildDocResponse(db.document, completionFor(db.chapters), db.document.manualReviewFlag)]);
  }),

  http.post(`${BASE}/documents`, async ({ request }) => {
    const body = (await request.json()) as { manufacturerName?: string; siteAddress?: string; jurisdictionProfileId?: string };
    if (!body.manufacturerName || !body.siteAddress || !body.jurisdictionProfileId) {
      return HttpResponse.json(errorBody("bad_request", "manufacturerName, siteAddress, and jurisdictionProfileId are required."), {
        status: 400,
      });
    }
    // This mock manages exactly one seeded document (Danadams); creating a
    // second is out of scope for the demo, but the shape is honored.
    return HttpResponse.json(buildDocResponse(db.document, completionFor(db.chapters), db.document.manualReviewFlag), { status: 201 });
  }),

  http.post(`${BASE}/documents/:editionId/flag-due-for-review`, ({ params }) => {
    if (String(params.editionId) !== "current") {
      return HttpResponse.json(errorBody("immutable_edition", "Only the current working document can be flagged for review."), { status: 422 });
    }
    db.document = { ...db.document, manualReviewFlag: true };
    return HttpResponse.json(buildDocResponse(db.document, completionFor(db.chapters), true));
  }),

  http.get(`${BASE}/documents/:editionId`, ({ params }) => {
    const view = documentView(String(params.editionId));
    if (!view) return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    return HttpResponse.json(view.doc);
  }),

  http.get(`${BASE}/documents/:editionId/editions`, ({ params }) => {
    if (String(params.editionId) !== "current" && !documentView(String(params.editionId))) {
      return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    }
    return HttpResponse.json(
      db.editions.map((e) => ({
        editionNumber: e.editionNumber,
        status: e.status,
        effectiveDate: e.effectiveDate,
        approvedBy: e.approvedBy,
      })),
    );
  }),

  http.get(`${BASE}/documents/:editionId/editions/:a/diff/:b`, ({ params }) => {
    const a = db.editionSnapshots[Number(params.a)];
    const b = db.editionSnapshots[Number(params.b)];
    if (!a || !b) return HttpResponse.json(errorBody("not_found", "One or both editions do not exist."), { status: 404 });
    const valuesA = mergedValues(a.chapters);
    const valuesB = mergedValues(b.chapters);
    const fieldIds = new Set([...Object.keys(valuesA), ...Object.keys(valuesB)]);
    const changedFields: { fieldId: string; ref: string; from: unknown; to: unknown }[] = [];
    for (const id of fieldIds) {
      const from = valuesA[id];
      const to = valuesB[id];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        const ref = Object.values(b.chapters).find((c) => id in c.values)?.ref ?? Object.values(a.chapters).find((c) => id in c.values)?.ref ?? "";
        changedFields.push({ fieldId: id, ref, from: from ?? null, to: to ?? null });
      }
    }
    return HttpResponse.json({ changedFields });
  }),

  // ---------- chapters (keyed by sub-clause ref, e.g. "4.1.2") ----------
  http.get(`${BASE}/documents/:editionId/chapters/:chapterRef`, ({ params }) => {
    const view = documentView(String(params.editionId));
    if (!view) return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    const chapter = view.chapters[String(params.chapterRef)];
    if (!chapter) return HttpResponse.json(errorBody("not_found", `No chapter ref '${params.chapterRef}'.`), { status: 404 });
    return HttpResponse.json(chapter);
  }),

  http.put(`${BASE}/documents/:editionId/chapters/:chapterRef`, async ({ params, request }) => {
    const editionId = String(params.editionId);
    const ref = String(params.chapterRef);
    const existing = db.chapters[ref];
    if (!existing) return HttpResponse.json(errorBody("not_found", `No chapter ref '${ref}'.`), { status: 404 });

    if (editionId !== "current") {
      return HttpResponse.json(errorBody("immutable_edition", "Only the current working draft can be edited; this edition is approved and immutable (FR-SMF-06)."), { status: 422 });
    }
    if (db.document.status !== "draft") {
      return HttpResponse.json(errorBody("not_draft", "Document not in Draft status."), { status: 422 });
    }
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch !== existing.revision) {
      return HttpResponse.json(conflictBody(existing.revision, existing), { status: 409 });
    }
    const body = (await request.json()) as { values: Record<string, unknown>; ownerId?: string | null };
    const updated: ChapterRecord = {
      ...existing,
      values: { ...existing.values, ...body.values },
      ownerId: body.ownerId !== undefined ? body.ownerId : existing.ownerId,
      revision: newRevision(),
      updatedAt: nowISO(),
      updatedBy: FACTORY_USER,
    };
    db.chapters[ref] = updated;
    return HttpResponse.json(updated);
  }),

  // ---------- annexes ----------
  http.get(`${BASE}/documents/:editionId/annexes/:annexId`, ({ params }) => {
    const view = documentView(String(params.editionId));
    if (!view) return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    const annex = view.annexes[String(params.annexId)];
    if (!annex) return HttpResponse.json(errorBody("not_found", `No annex '${params.annexId}'.`), { status: 404 });
    return HttpResponse.json(annex);
  }),

  http.put(`${BASE}/documents/:editionId/annexes/:annexId`, async ({ params, request }) => {
    const editionId = String(params.editionId);
    const id = String(params.annexId);
    const existing = db.annexes[id];
    if (!existing) return HttpResponse.json(errorBody("not_found", `No annex '${id}'.`), { status: 404 });
    if (editionId !== "current") {
      return HttpResponse.json(errorBody("immutable_edition", "This edition is approved and immutable (FR-SMF-06)."), { status: 422 });
    }
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch !== existing.revision) {
      return HttpResponse.json(conflictBody(existing.revision, existing), { status: 409 });
    }
    const body = (await request.json()) as { values: Record<string, unknown>; effectiveDate: string };
    // Independent dating (FR-SMF-03): this write touches only this annex's
    // own revision — never db.document.revision or any chapter's revision.
    const updated: AnnexRecord = {
      ...existing,
      values: { ...existing.values, ...body.values },
      effectiveDate: body.effectiveDate,
      revision: newRevision(),
      updatedAt: nowISO(),
      updatedBy: FACTORY_USER,
    };
    db.annexes[id] = updated;
    return HttpResponse.json(updated);
  }),

  http.get(`${BASE}/documents/:editionId/annexes/:annexId/revisions`, ({ params }) => {
    const annex = db.annexes[String(params.annexId)];
    if (!annex) return HttpResponse.json(errorBody("not_found", `No annex '${params.annexId}'.`), { status: 404 });
    // This mock keeps only the current annex revision plus what approved
    // edition snapshots happened to capture; a real backend keeps every
    // intermediate revision, not just ones that coincided with a document approval.
    const fromSnapshots = Object.values(db.editionSnapshots)
      .map((s) => s.annexes[String(params.annexId)])
      .filter((a): a is AnnexRecord => !!a);
    return HttpResponse.json([...fromSnapshots, annex]);
  }),

  // ---------- jurisdiction appendices (FR-SMF-15/16 — advisory only) ----------
  http.get(`${BASE}/documents/:editionId/jurisdiction-appendices/:appendixId`, ({ params }) => {
    const record = db.jurisdictionAppendices[String(params.appendixId)];
    if (!record) return HttpResponse.json(errorBody("not_found", `No jurisdiction appendix '${params.appendixId}'.`), { status: 404 });
    return HttpResponse.json(record);
  }),

  http.put(`${BASE}/documents/:editionId/jurisdiction-appendices/:appendixId`, async ({ params, request }) => {
    const id = String(params.appendixId);
    const existing = db.jurisdictionAppendices[id];
    if (!existing) return HttpResponse.json(errorBody("not_found", `No jurisdiction appendix '${id}'.`), { status: 404 });
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch !== existing.revision) {
      return HttpResponse.json(conflictBody(existing.revision, existing), { status: 409 });
    }
    const body = (await request.json()) as { files: { name: string; size: string }[] };
    const updated: JurisdictionAppendixFilesRecord = {
      ...existing,
      files: body.files,
      revision: newRevision(),
      updatedAt: nowISO(),
      updatedBy: FACTORY_USER,
    };
    db.jurisdictionAppendices[id] = updated;
    return HttpResponse.json(updated);
  }),

  // ---------- workflow ----------
  http.post(`${BASE}/documents/:editionId/submit`, ({ request }) => {
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch !== db.document.revision) {
      return HttpResponse.json(conflictBody(db.document.revision, db.document), { status: 409 });
    }
    if (db.document.status !== "draft") {
      return HttpResponse.json(errorBody("not_draft", "Document not in Draft status."), { status: 422 });
    }
    const completion = completionFor(db.chapters);
    if (completion.overallPercent < 100) {
      return HttpResponse.json(errorBody("incomplete", `Document is ${completion.overallPercent}% complete; all required fields must be filled before submission.`), { status: 422 });
    }
    db.document = { ...db.document, status: "qa_review", revision: newRevision(), updatedAt: nowISO(), updatedBy: FACTORY_USER };
    return HttpResponse.json(buildDocResponse(db.document, completion, db.document.manualReviewFlag));
  }),

  http.post(`${BASE}/documents/:editionId/qa-review`, async ({ request }) => {
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch !== db.document.revision) {
      return HttpResponse.json(conflictBody(db.document.revision, db.document), { status: 409 });
    }
    if (db.document.status !== "qa_review") {
      return HttpResponse.json(errorBody("not_in_review", "Document not in QA Review status."), { status: 422 });
    }
    const body = (await request.json()) as { decision: "approve" | "reject"; comments?: { chapterRef: string; text: string }[] };

    if (body.decision === "approve") {
      const newEditionNumber = db.document.editionNumber + 1;
      const effectiveDate = nowISO().slice(0, 10);
      db.editionSnapshots[newEditionNumber] = { chapters: structuredClone(db.chapters), annexes: structuredClone(db.annexes) };
      db.editions.push({ editionNumber: newEditionNumber, status: "approved", effectiveDate, approvedBy: QA_REVIEWER, approvedAt: nowISO() });
      db.comments = [];
      db.document = {
        ...db.document,
        editionNumber: newEditionNumber,
        status: "draft",
        effectiveDate,
        nextReviewDate: addMonths(effectiveDate, TEMPLATE.jurisdictionProfiles[0]?.reviewIntervalMonths ?? 24),
        // Approving a new edition IS the review FR-SMF-07's on-demand
        // flag was requesting — clear it rather than leaving a stale
        // "due for review" notice on a document that was just reviewed.
        manualReviewFlag: false,
        revision: newRevision(),
        updatedAt: nowISO(),
        updatedBy: QA_REVIEWER,
      };
      return HttpResponse.json(buildDocResponse(db.document, completionFor(db.chapters), false));
    }

    if (!body.comments || body.comments.length === 0) {
      return HttpResponse.json(errorBody("comments_required", "At least one comment is required to reject."), { status: 422 });
    }
    db.comments = body.comments.map((c) => ({
      id: crypto.randomUUID(),
      chapterRef: c.chapterRef,
      text: c.text,
      author: QA_REVIEWER,
      createdAt: nowISO(),
    }));
    db.document = { ...db.document, status: "draft", revision: newRevision(), updatedAt: nowISO(), updatedBy: QA_REVIEWER };
    return HttpResponse.json(buildDocResponse(db.document, completionFor(db.chapters), db.document.manualReviewFlag));
  }),

  http.get(`${BASE}/documents/:editionId/comments`, ({ params }) => {
    if (!documentView(String(params.editionId))) {
      return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    }
    return HttpResponse.json(db.comments);
  }),

  // ---------- uploads (tus-lite mock — see openapi/smf-api.yaml note) ----------
  http.post(`${BASE}/uploads`, ({ request }) => {
    const length = Number(request.headers.get("Upload-Length"));
    const metadata = request.headers.get("Upload-Metadata");
    if (!length || !metadata) {
      return HttpResponse.json(errorBody("bad_request", "Upload-Length and Upload-Metadata headers are required."), { status: 400 });
    }
    const id = crypto.randomUUID();
    db.uploads[id] = { id, length, metadata, received: 0, createdAt: nowISO() };
    return new HttpResponse(null, { status: 201, headers: { Location: `${BASE}/uploads/${id}` } });
  }),

  http.patch(`${BASE}/uploads/:uploadId`, async ({ params, request }) => {
    const upload = db.uploads[String(params.uploadId)];
    if (!upload) return HttpResponse.json(errorBody("not_found", "Unknown upload."), { status: 404 });
    const chunk = await request.arrayBuffer();
    upload.received += chunk.byteLength;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/uploads/:uploadId`, ({ params }) => {
    const upload = db.uploads[String(params.uploadId)];
    if (!upload) return HttpResponse.json(errorBody("not_found", "Unknown upload."), { status: 404 });
    return HttpResponse.json(upload);
  }),

  // ---------- export ----------
  http.get(`${BASE}/documents/:editionId/export/preview`, ({ params }) => {
    const view = documentView(String(params.editionId));
    if (!view) return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    const profile = TEMPLATE.jurisdictionProfiles.find((p) => p.id === db.document.jurisdictionProfileId);
    const tableOfContents = [
      ...TEMPLATE.chapters.map((c) => ({ ref: `chapter-${c.number}`, title: `${c.number}. ${c.title}`, level: 1 })),
      ...TEMPLATE.annexes.map((a) => ({ ref: `annex-${a.number}`, title: `Annex ${a.number} — ${a.title}`, level: 1 })),
      ...(profile ? [{ ref: "appendices", title: `${profile.name} Supplementary Appendices`, level: 1 }] : []),
    ];
    const sections = [
      ...TEMPLATE.chapters.map((c) => ({ kind: "chapter", number: c.number, title: c.title })),
      ...TEMPLATE.annexes.map((a) => ({ kind: "annex", number: a.number, title: a.title, effectiveDate: view.annexes[a.id]?.effectiveDate })),
      ...(profile ? [{ kind: "appendices", title: `${profile.name} Supplementary Appendices` }] : []),
    ];
    // Real pagination happens client-side with Paged.js against this same
    // data (src/smf/export/) — see that module for the honest page count.
    // This field is a rough server-side estimate only, per the spec.
    const estimatedBodyPageCount = Math.max(1, Math.ceil(Object.keys(mergedValues(view.chapters)).length / 12));
    return HttpResponse.json({
      coverPage: {
        manufacturerName: view.doc.manufacturerName,
        siteAddress: view.doc.siteAddress,
        editionNumber: view.doc.editionNumber,
        effectiveDate: view.doc.effectiveDate,
        nextReviewDate: view.doc.nextReviewDate,
      },
      tableOfContents,
      sections,
      estimatedBodyPageCount,
    });
  }),

  http.post(`${BASE}/documents/:editionId/export/pdf`, ({ params }) => {
    if (!documentView(String(params.editionId))) {
      return HttpResponse.json(errorBody("not_found", `No edition '${params.editionId}'.`), { status: 404 });
    }
    return HttpResponse.json(
      errorBody("not_implemented", "Server-side PDF/A generation is not implemented by this mock — out of scope for the frontend deliverable. See DECISIONS.md."),
      { status: 501 },
    );
  }),
];
