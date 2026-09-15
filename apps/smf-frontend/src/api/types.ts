/**
 * TypeScript mirror of the response/request shapes in openapi/smf-api.yaml.
 * Deliberately independent of src/mocks/db.ts's internal record shapes —
 * this is the contract the app codes against; src/mocks is one
 * implementation of it that happens to serialize the same fields. When a
 * real backend exists, this file doesn't change.
 */

export interface UserRef {
  id: string;
  name: string;
  role: "factory_user" | "qa_reviewer" | "inspector" | "regulatory_analyst";
}

export type DocumentStatus = "draft" | "qa_review" | "approved";

export interface CompletionSummary {
  overallPercent: number;
  byChapter: { chapterNumber: number; percent: number; requiredFieldCount: number; completedFieldCount: number }[];
}

export type DueForReviewReason = "date" | "major_change" | null;

export interface DueForReview {
  isDue: boolean;
  reason: DueForReviewReason;
}

export interface SmfDocument {
  revision: string;
  updatedAt: string;
  updatedBy: UserRef;
  id: string;
  editionNumber: number;
  status: DocumentStatus;
  jurisdictionProfileId: string;
  manufacturerName: string;
  siteAddress: string;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  completion: CompletionSummary;
  dueForReview: DueForReview;
}

export interface EditionSummary {
  editionNumber: number;
  status: DocumentStatus;
  effectiveDate: string | null;
  approvedBy: UserRef;
}

export interface ChapterContent {
  revision: string;
  updatedAt: string;
  updatedBy: UserRef;
  chapterNumber: number;
  ref: string;
  values: Record<string, unknown>;
  ownerId: string | null;
}

export interface AnnexContent {
  revision: string;
  updatedAt: string;
  updatedBy: UserRef;
  id: string;
  number: number;
  effectiveDate: string;
  values: Record<string, unknown>;
  linkedFromRefs: string[];
}

export interface EditionDiffField {
  fieldId: string;
  ref: string;
  from: unknown;
  to: unknown;
}

export interface EditionDiff {
  changedFields: EditionDiffField[];
}

export interface JurisdictionAppendixFiles {
  revision: string;
  updatedAt: string;
  updatedBy: UserRef;
  appendixId: string;
  files: { name: string; size: string }[];
}

export interface ReviewComment {
  id: string;
  chapterRef: string;
  author: UserRef;
  text: string;
  createdAt: string;
}

export interface ConflictErrorBody {
  error: "revision_conflict";
  currentRevision: string;
  currentValue: unknown;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
