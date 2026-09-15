import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AnnexContent } from "../api/types";
import { ApiConflictError } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useAnnexes, useSaveAnnexMutation } from "../api/hooks";
import type { ConflictInfo } from "./ConflictBanner";

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export interface AnnexConflict {
  annexId: string;
  info: ConflictInfo;
}

/**
 * Owns autosave for all 8 annexes at once (one useQueries call, not 8
 * separate hook instances — annexIds is a fixed-length list from
 * template.json, but looping useAnnexAutosave() per annex would still
 * violate the rules of hooks). Each annex still gets its own revision,
 * its own debounce, and its own 409 handling — saving Annex 6 never
 * touches Annex 7's in-flight state (FR-SMF-03).
 */
export function useAnnexesAutosave(editionId: string, annexIds: string[], editable: boolean) {
  const queries = useAnnexes(editionId, annexIds);
  const qc = useQueryClient();
  const saveMutation = useSaveAnnexMutation(editionId);

  const pendingByAnnex = useRef<Record<string, string>>({}); // annexId -> pending effectiveDate
  const baselineByAnnex = useRef<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingByAnnex, setSavingByAnnex] = useState<Record<string, { state: "saving" | "saved"; time?: string }>>({});
  const [conflict, setConflict] = useState<AnnexConflict | null>(null);

  const annexById: Record<string, AnnexContent | undefined> = {};
  annexIds.forEach((id, i) => {
    annexById[id] = queries[i]?.data;
  });
  const isLoading = queries.some((q) => q.isLoading);

  function flush(annexId: string) {
    const pendingDate = pendingByAnnex.current[annexId];
    if (pendingDate === undefined) return;
    const current = qc.getQueryData<AnnexContent>(queryKeys.annex(editionId, annexId));
    if (!current) return;

    saveMutation.mutate(
      { annexId, revision: current.revision, values: {}, effectiveDate: pendingDate },
      {
        onSuccess: () => {
          delete pendingByAnnex.current[annexId];
          setSavingByAnnex((s) => ({ ...s, [annexId]: { state: "saved", time: timeNow() } }));
        },
        onError: (err) => {
          if (err instanceof ApiConflictError) {
            const currentValue = err.currentValue as AnnexContent;
            qc.setQueryData(queryKeys.annex(editionId, annexId), currentValue);
            setConflict({
              annexId,
              info: {
                baselineValues: { effectiveDate: baselineByAnnex.current[annexId] ?? "" },
                pendingValues: { effectiveDate: pendingDate },
                currentValues: { effectiveDate: currentValue.effectiveDate },
              },
            });
          }
        },
      },
    );
  }

  function onDateChange(annexId: string, date: string) {
    if (!editable || conflict?.annexId === annexId) return;
    if (pendingByAnnex.current[annexId] === undefined) {
      const current = qc.getQueryData<AnnexContent>(queryKeys.annex(editionId, annexId));
      baselineByAnnex.current[annexId] = current?.effectiveDate ?? "";
    }
    pendingByAnnex.current[annexId] = date;
    qc.setQueryData<AnnexContent>(queryKeys.annex(editionId, annexId), (old) => (old ? { ...old, effectiveDate: date } : old));
    setSavingByAnnex((s) => ({ ...s, [annexId]: { state: "saving" } }));
    clearTimeout(timers.current[annexId]);
    timers.current[annexId] = setTimeout(() => flush(annexId), 650);
  }

  function resolveKeepMine() {
    if (!conflict) return;
    const { annexId, info } = conflict;
    const fresh = qc.getQueryData<AnnexContent>(queryKeys.annex(editionId, annexId));
    if (!fresh) return;
    const date = info.pendingValues.effectiveDate as string;
    saveMutation.mutate(
      { annexId, revision: fresh.revision, values: {}, effectiveDate: date },
      {
        onSuccess: () => {
          delete pendingByAnnex.current[annexId];
          setConflict(null);
          setSavingByAnnex((s) => ({ ...s, [annexId]: { state: "saved", time: timeNow() } }));
        },
        onError: (err) => {
          if (err instanceof ApiConflictError) {
            const currentValue = err.currentValue as AnnexContent;
            qc.setQueryData(queryKeys.annex(editionId, annexId), currentValue);
            setConflict({
              annexId,
              info: { baselineValues: { effectiveDate: fresh.effectiveDate }, pendingValues: info.pendingValues, currentValues: { effectiveDate: currentValue.effectiveDate } },
            });
          }
        },
      },
    );
  }

  function resolveDiscardMine() {
    if (!conflict) return;
    delete pendingByAnnex.current[conflict.annexId];
    setConflict(null);
  }

  return { annexById, isLoading, savingByAnnex, conflict, onDateChange, resolveKeepMine, resolveDiscardMine };
}
