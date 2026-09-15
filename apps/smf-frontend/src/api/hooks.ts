import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { queryKeys } from "./queryKeys";

export function useJurisdictionProfiles() {
  return useQuery({ queryKey: queryKeys.jurisdictionProfiles(), queryFn: api.listJurisdictionProfiles });
}

export function useDocument(editionId: string) {
  return useQuery({ queryKey: queryKeys.document(editionId), queryFn: () => api.getDocument(editionId) });
}

export function useEditions(editionId: string) {
  return useQuery({ queryKey: queryKeys.editions(editionId), queryFn: () => api.listEditions(editionId) });
}

export function useComments(editionId: string) {
  return useQuery({ queryKey: queryKeys.comments(editionId), queryFn: () => api.listComments(editionId) });
}

/** `enabled` defaults to requiring two distinct, real edition numbers —
 * there's nothing meaningful to diff otherwise (e.g. before a second
 * edition has ever been approved, or while the two pickers still match). */
export function useEditionDiff(editionId: string, editionNumberA: number | null, editionNumberB: number | null) {
  return useQuery({
    queryKey: ["edition-diff", editionId, editionNumberA, editionNumberB],
    queryFn: () => api.diffEditions(editionId, editionNumberA!, editionNumberB!),
    enabled: editionNumberA != null && editionNumberB != null && editionNumberA !== editionNumberB,
  });
}

/** One query per sub-clause ref in the active chapter — matches the API's
 * per-sub-clause save granularity (see DECISIONS.md §18/§19) rather than
 * fetching a whole chapter as one resource, since the contract doesn't
 * model chapters that way. */
export function useChapterRefs(editionId: string, refs: string[], enabled = true) {
  return useQueries({
    queries: refs.map((ref) => ({
      queryKey: queryKeys.chapter(editionId, ref),
      queryFn: () => api.getChapter(editionId, ref),
      enabled,
    })),
  });
}

export function useAnnex(editionId: string, annexId: string) {
  return useQuery({ queryKey: queryKeys.annex(editionId, annexId), queryFn: () => api.getAnnex(editionId, annexId) });
}

export function useAnnexes(editionId: string, annexIds: string[]) {
  return useQueries({
    queries: annexIds.map((id) => ({
      queryKey: queryKeys.annex(editionId, id),
      queryFn: () => api.getAnnex(editionId, id),
    })),
  });
}

/** One query per Ghana appendix (FR-SMF-15/16) — mirrors useAnnexes'
 * shape; there are only 4 today but this doesn't assume that number. */
export function useJurisdictionAppendixFiles(editionId: string, appendixIds: string[]) {
  return useQueries({
    queries: appendixIds.map((id) => ({
      queryKey: queryKeys.jurisdictionAppendix(editionId, id),
      queryFn: () => api.getJurisdictionAppendixFiles(editionId, id),
    })),
  });
}

export function useSaveChapterMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ref: string; revision: string; values: Record<string, unknown> }) =>
      api.saveChapter(editionId, vars.ref, vars.revision, vars.values),
    onSuccess: (data, vars) => {
      qc.setQueryData(queryKeys.chapter(editionId, vars.ref), data);
      qc.invalidateQueries({ queryKey: queryKeys.document(editionId) });
    },
  });
}

export function useSaveAnnexMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { annexId: string; revision: string; values: Record<string, unknown>; effectiveDate: string }) =>
      api.saveAnnex(editionId, vars.annexId, vars.revision, vars.values, vars.effectiveDate),
    onSuccess: (data, vars) => {
      qc.setQueryData(queryKeys.annex(editionId, vars.annexId), data);
    },
  });
}

export function useSubmitDocumentMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (revision: string) => api.submitDocument(editionId, revision),
    onSuccess: (data) => qc.setQueryData(queryKeys.document(editionId), data),
  });
}

export function useSaveJurisdictionAppendixFilesMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { appendixId: string; revision: string; files: { name: string; size: string }[] }) =>
      api.saveJurisdictionAppendixFiles(editionId, vars.appendixId, vars.revision, vars.files),
    onSuccess: (data, vars) => {
      qc.setQueryData(queryKeys.jurisdictionAppendix(editionId, vars.appendixId), data);
    },
  });
}

export function useFlagDueForReviewMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.flagDueForReview(editionId),
    onSuccess: (data) => qc.setQueryData(queryKeys.document(editionId), data),
  });
}

export function useReviewDocumentMutation(editionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { revision: string; decision: "approve" | "reject"; comments?: { chapterRef: string; text: string }[] }) =>
      api.reviewDocument(editionId, vars.revision, vars.decision, vars.comments),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.document(editionId), data);
      qc.invalidateQueries({ queryKey: queryKeys.comments(editionId) });
      qc.invalidateQueries({ queryKey: queryKeys.editions(editionId) });
      // Approval starts a new working draft with a fresh set of
      // chapter/annex revisions server-side (see src/mocks/handlers.ts) —
      // the client's cached copies are now stale regardless of content.
      qc.invalidateQueries({ queryKey: ["chapter", editionId] });
      qc.invalidateQueries({ queryKey: ["annex", editionId] });
    },
  });
}
