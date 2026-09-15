import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { JurisdictionAppendixFiles } from "../api/types";
import { ApiConflictError } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useJurisdictionAppendixFiles, useSaveJurisdictionAppendixFilesMutation } from "../api/hooks";
import type { ConflictInfo } from "./ConflictBanner";

export interface AppendixConflict {
  appendixId: string;
  info: ConflictInfo;
}

/**
 * FR-SMF-15/16: Ghana appendix uploads, wired to a real resource
 * (openapi/smf-api.yaml's /jurisdiction-appendices/{appendixId}) instead
 * of local useState. No debounce — a file add/remove is already one
 * discrete action, unlike a keystroke — but the same optimistic-update +
 * 409 pattern as annexes/chapters, since these are still independently
 * revisioned, editable resources.
 */
export function useJurisdictionAppendicesAutosave(editionId: string, appendixIds: string[], editable: boolean) {
  const queries = useJurisdictionAppendixFiles(editionId, appendixIds);
  const qc = useQueryClient();
  const saveMutation = useSaveJurisdictionAppendixFilesMutation(editionId);
  const [conflict, setConflict] = useState<AppendixConflict | null>(null);

  const filesByAppendix: Record<string, { name: string; size: string }[]> = {};
  appendixIds.forEach((id, i) => {
    filesByAppendix[id] = queries[i]?.data?.files ?? [];
  });
  const isLoading = queries.some((q) => q.isLoading);

  function setFiles(appendixId: string, newFiles: { name: string; size: string }[]) {
    if (!editable || conflict?.appendixId === appendixId) return;
    const current = qc.getQueryData<JurisdictionAppendixFiles>(queryKeys.jurisdictionAppendix(editionId, appendixId));
    if (!current) return;
    const baseline = current.files;

    qc.setQueryData<JurisdictionAppendixFiles>(queryKeys.jurisdictionAppendix(editionId, appendixId), { ...current, files: newFiles });
    saveMutation.mutate(
      { appendixId, revision: current.revision, files: newFiles },
      {
        onError: (err) => {
          if (err instanceof ApiConflictError) {
            const currentValue = err.currentValue as JurisdictionAppendixFiles;
            qc.setQueryData(queryKeys.jurisdictionAppendix(editionId, appendixId), currentValue);
            setConflict({
              appendixId,
              info: {
                baselineValues: { files: baseline },
                pendingValues: { files: newFiles },
                currentValues: { files: currentValue.files },
              },
            });
          }
        },
      },
    );
  }

  function resolveKeepMine() {
    if (!conflict) return;
    const { appendixId, info } = conflict;
    const fresh = qc.getQueryData<JurisdictionAppendixFiles>(queryKeys.jurisdictionAppendix(editionId, appendixId));
    if (!fresh) return;
    saveMutation.mutate(
      { appendixId, revision: fresh.revision, files: info.pendingValues.files as { name: string; size: string }[] },
      { onSuccess: () => setConflict(null) },
    );
  }

  function resolveDiscardMine() {
    setConflict(null);
  }

  return { filesByAppendix, isLoading, setFiles, conflict, resolveKeepMine, resolveDiscardMine };
}
