import type {
  AnnexContent,
  ChapterContent,
  ConflictErrorBody,
  EditionDiff,
  EditionSummary,
  JurisdictionAppendixFiles,
  ReviewComment,
  SmfDocument,
} from "./types";
import type { JurisdictionProfile } from "../../schema/template.schema";

const BASE = "/api/smf/v1";

/**
 * Thrown on 409 — carries the server's current state so the caller can
 * show the user what changed and let them resolve it, per the API
 * contract's optimistic-concurrency design note. Never treat this as a
 * generic error: a 409 means the write didn't happen, not that something
 * broke.
 */
export class ApiConflictError extends Error {
  currentRevision: string;
  currentValue: unknown;
  constructor(body: ConflictErrorBody) {
    super("revision_conflict");
    this.currentRevision = body.currentRevision;
    this.currentValue = body.currentValue;
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// `fetch` with a bare relative path has no implicit origin outside a real
// browser document (Node's fetch throws "Failed to parse URL"), which
// would otherwise make this whole module untestable under Vitest and
// fragile in any future non-browser context. Resolving explicitly against
// `location.href` when it exists keeps real browser behavior identical.
function resolve(path: string): string {
  const url = `${BASE}${path}`;
  return typeof location !== "undefined" ? new URL(url, location.href).toString() : new URL(url, "http://localhost").toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolve(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 409) {
    throw new ApiConflictError((await res.json()) as ConflictErrorBody);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown", message: res.statusText }));
    throw new ApiError(res.status, body.error ?? "unknown", body.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listJurisdictionProfiles: () => request<JurisdictionProfile[]>("/jurisdiction-profiles"),

  getDocument: (editionId: string) => request<SmfDocument>(`/documents/${editionId}`),

  listEditions: (editionId: string) => request<EditionSummary[]>(`/documents/${editionId}/editions`),

  getChapter: (editionId: string, chapterRef: string) =>
    request<ChapterContent>(`/documents/${editionId}/chapters/${encodeURIComponent(chapterRef)}`),

  saveChapter: (editionId: string, chapterRef: string, revision: string, values: Record<string, unknown>) =>
    request<ChapterContent>(`/documents/${editionId}/chapters/${encodeURIComponent(chapterRef)}`, {
      method: "PUT",
      headers: { "If-Match": revision },
      body: JSON.stringify({ values }),
    }),

  getAnnex: (editionId: string, annexId: string) => request<AnnexContent>(`/documents/${editionId}/annexes/${annexId}`),

  saveAnnex: (editionId: string, annexId: string, revision: string, values: Record<string, unknown>, effectiveDate: string) =>
    request<AnnexContent>(`/documents/${editionId}/annexes/${annexId}`, {
      method: "PUT",
      headers: { "If-Match": revision },
      body: JSON.stringify({ values, effectiveDate }),
    }),

  submitDocument: (editionId: string, revision: string) =>
    request<SmfDocument>(`/documents/${editionId}/submit`, { method: "POST", headers: { "If-Match": revision } }),

  reviewDocument: (
    editionId: string,
    revision: string,
    decision: "approve" | "reject",
    comments?: { chapterRef: string; text: string }[],
  ) =>
    request<SmfDocument>(`/documents/${editionId}/qa-review`, {
      method: "POST",
      headers: { "If-Match": revision },
      body: JSON.stringify({ decision, comments }),
    }),

  listComments: (editionId: string) => request<ReviewComment[]>(`/documents/${editionId}/comments`),

  diffEditions: (editionId: string, editionNumberA: number, editionNumberB: number) =>
    request<EditionDiff>(`/documents/${editionId}/editions/${editionNumberA}/diff/${editionNumberB}`),

  flagDueForReview: (editionId: string) => request<SmfDocument>(`/documents/${editionId}/flag-due-for-review`, { method: "POST" }),

  getJurisdictionAppendixFiles: (editionId: string, appendixId: string) =>
    request<JurisdictionAppendixFiles>(`/documents/${editionId}/jurisdiction-appendices/${appendixId}`),

  saveJurisdictionAppendixFiles: (editionId: string, appendixId: string, revision: string, files: { name: string; size: string }[]) =>
    request<JurisdictionAppendixFiles>(`/documents/${editionId}/jurisdiction-appendices/${appendixId}`, {
      method: "PUT",
      headers: { "If-Match": revision },
      body: JSON.stringify({ files }),
    }),
};
