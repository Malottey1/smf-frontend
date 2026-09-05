import templateJson from "../../schema/template.json";
import type { Template } from "../../schema/template.schema";
import { INITIAL_VALUES } from "../smf/seedData";

const TEMPLATE = templateJson as Template;

export interface UserRef {
  id: string;
  name: string;
  role: "factory_user" | "qa_reviewer" | "inspector" | "regulatory_analyst";
}

export type DocumentStatus = "draft" | "qa_review" | "approved";

export interface Revisioned {
  revision: string;
  updatedAt: string;
  updatedBy: UserRef;
}

export interface ChapterRecord extends Revisioned {
  chapterNumber: number;
  ref: string;
  values: Record<string, unknown>;
  ownerId: string | null;
}

export interface AnnexRecord extends Revisioned {
  id: string;
  number: number;
  effectiveDate: string;
  values: Record<string, unknown>;
  linkedFromRefs: string[];
}

export interface EditionRecord {
  editionNumber: number;
  status: "approved";
  effectiveDate: string;
  approvedBy: UserRef;
  approvedAt: string;
}

export interface ReviewCommentRecord {
  id: string;
  chapterRef: string;
  author: UserRef;
  text: string;
  createdAt: string;
}

export interface EditionSnapshot {
  chapters: Record<string, ChapterRecord>;
  annexes: Record<string, AnnexRecord>;
}

export interface DocumentRecord extends Revisioned {
  id: string;
  editionNumber: number; // last APPROVED edition number; 0 if never approved
  status: DocumentStatus;
  jurisdictionProfileId: string;
  manufacturerName: string;
  siteAddress: string;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  /** FR-SMF-07's on-demand trigger ("a major facility change is logged
   * elsewhere in the platform") — set via POST .../flag-due-for-review,
   * cleared automatically on the next approval. See dueForReview.ts for
   * how this combines with the date-based trigger. */
  manualReviewFlag: boolean;
}

export interface JurisdictionAppendixFilesRecord extends Revisioned {
  appendixId: string;
  files: { name: string; size: string }[];
}

export interface UploadRecord {
  id: string;
  length: number;
  metadata: string;
  received: number;
  createdAt: string;
}

const SYSTEM_USER: UserRef = { id: "system", name: "System", role: "factory_user" };
const FACTORY_USER: UserRef = { id: "u-ao", name: "Ama Owusu", role: "factory_user" };
const QA_REVIEWER: UserRef = { id: "u-ka", name: "Kwame Asante", role: "qa_reviewer" };

function newRevision(): string {
  return crypto.randomUUID();
}
function nowISO(): string {
  return new Date().toISOString();
}
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function buildChapters(): Record<string, ChapterRecord> {
  const out: Record<string, ChapterRecord> = {};
  for (const chapter of TEMPLATE.chapters) {
    for (const sc of chapter.subClauses) {
      const values: Record<string, unknown> = {};
      for (const f of sc.fields) {
        if (Object.prototype.hasOwnProperty.call(INITIAL_VALUES, f.id)) {
          values[f.id] = INITIAL_VALUES[f.id];
        }
      }
      out[sc.ref] = {
        chapterNumber: chapter.number,
        ref: sc.ref,
        values,
        ownerId: null,
        revision: newRevision(),
        updatedAt: nowISO(),
        updatedBy: SYSTEM_USER,
      };
    }
  }
  return out;
}

function buildAnnexes(): Record<string, AnnexRecord> {
  const out: Record<string, AnnexRecord> = {};
  const dates: Record<string, string> = {
    "annex-1": "2024-11-01",
    "annex-2": "2025-01-15",
    "annex-3": "2024-11-01",
    "annex-4": "2025-01-15",
    "annex-5": "2024-09-20",
    "annex-6": "2025-01-15",
    "annex-7": "2025-01-15",
    "annex-8": "2025-01-15",
  };
  for (const a of TEMPLATE.annexes) {
    const values: Record<string, unknown> = {};
    if (a.sourceFieldId && Object.prototype.hasOwnProperty.call(INITIAL_VALUES, a.sourceFieldId)) {
      values[a.sourceFieldId] = INITIAL_VALUES[a.sourceFieldId];
    }
    out[a.id] = {
      id: a.id,
      number: a.number,
      effectiveDate: dates[a.id] ?? "2025-01-15",
      values,
      linkedFromRefs: a.linkedFromRefs,
      revision: newRevision(),
      updatedAt: nowISO(),
      updatedBy: SYSTEM_USER,
    };
  }
  return out;
}

function buildJurisdictionAppendices(): Record<string, JurisdictionAppendixFilesRecord> {
  const out: Record<string, JurisdictionAppendixFilesRecord> = {};
  for (const profile of TEMPLATE.jurisdictionProfiles) {
    for (const ap of profile.supplementaryAppendices) {
      out[ap.id] = { appendixId: ap.id, files: [], revision: newRevision(), updatedAt: nowISO(), updatedBy: SYSTEM_USER };
    }
  }
  return out;
}

export interface Db {
  document: DocumentRecord;
  chapters: Record<string, ChapterRecord>;
  annexes: Record<string, AnnexRecord>;
  jurisdictionAppendices: Record<string, JurisdictionAppendixFilesRecord>;
  editions: EditionRecord[];
  editionSnapshots: Record<number, EditionSnapshot>;
  comments: ReviewCommentRecord[];
  uploads: Record<string, UploadRecord>;
}

function seed(): Db {
  const firstEditionDate = "2025-01-15";
  const chapters = buildChapters();
  const annexes = buildAnnexes();
  return {
    document: {
      id: "smf-danadams",
      editionNumber: 1,
      status: "draft",
      jurisdictionProfileId: "gh",
      manufacturerName: "Danadams Pharmaceutical Ind. Ltd",
      siteAddress: "Plot 14, Kaase Industrial Area, Kumasi, Ghana",
      effectiveDate: firstEditionDate,
      nextReviewDate: addMonths(firstEditionDate, TEMPLATE.jurisdictionProfiles[0]?.reviewIntervalMonths ?? 24),
      manualReviewFlag: false,
      revision: newRevision(),
      updatedAt: nowISO(),
      updatedBy: SYSTEM_USER,
    },
    chapters,
    annexes,
    jurisdictionAppendices: buildJurisdictionAppendices(),
    editions: [
      { editionNumber: 1, status: "approved", effectiveDate: firstEditionDate, approvedBy: QA_REVIEWER, approvedAt: nowISO() },
    ],
    editionSnapshots: { 1: { chapters: structuredClone(chapters), annexes: structuredClone(annexes) } },
    comments: [],
    uploads: {},
  };
}

// Module-level singleton — reset on full page reload, which is the point:
// this mock has no real persistence layer, same as production won't use
// localStorage for document content (see DECISIONS.md).
export const db: Db = seed();

export function resetDb(): void {
  Object.assign(db, seed());
}

export { newRevision, nowISO, addMonths, FACTORY_USER, QA_REVIEWER, SYSTEM_USER, TEMPLATE };
