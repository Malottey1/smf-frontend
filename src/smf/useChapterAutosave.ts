import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Chapter, Field } from "../../schema/template.schema";
import type { ChapterContent } from "../api/types";
import { ApiConflictError } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { useChapterRefs, useSaveChapterMutation } from "../api/hooks";
import type { FieldValueMap } from "./completion";
import type { ConflictInfo } from "./ConflictBanner";

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export interface ChapterConflict {
  ref: string;
  info: ConflictInfo;
}

/**
 * Owns autosave for one open chapter: fetches every sub-clause the API
 * actually stores independently (queryKeys.chapter per ref — see
 * DECISIONS.md §18/§19 on why chapters aren't fetched as one resource),
 * debounces edits per sub-clause, and resolves 409s field-by-field via
 * ConflictBanner rather than failing the whole chapter save.
 *
 * The chapter's single on-screen save indicator is an aggregate over
 * however many sub-clause writes are actually in flight underneath —
 * the UI still reads as "one save per chapter" (matching the mockup's
 * per-record save-bar pattern) while FR-SMF-02's per-sub-clause
 * independence is real, not simulated.
 */
export function useChapterAutosave(editionId: string, chapter: Chapter, editable: boolean) {
  const refs = chapter.subClauses.map((sc) => sc.ref);
  const queries = useChapterRefs(editionId, refs);
  const qc = useQueryClient();
  const saveMutation = useSaveChapterMutation(editionId);

  const pendingByRef = useRef<Record<string, Record<string, unknown>>>({});
  const baselineByRef = useRef<Record<string, Record<string, unknown>>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingByRef, setSavingByRef] = useState<Record<string, { state: "saving" | "saved"; time?: string }>>({});
  const [conflict, setConflict] = useState<ChapterConflict | null>(null);

  const values: FieldValueMap = Object.assign({}, ...queries.map((q) => q.data?.values ?? {}));
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  function flush(ref: string) {
    const pending = pendingByRef.current[ref];
    if (!pending || Object.keys(pending).length === 0) return;
    const current = qc.getQueryData<ChapterContent>(queryKeys.chapter(editionId, ref));
    if (!current) return;

    saveMutation.mutate(
      { ref, revision: current.revision, values: pending },
      {
        onSuccess: () => {
          pendingByRef.current[ref] = {};
          setSavingByRef((s) => ({ ...s, [ref]: { state: "saved", time: timeNow() } }));
        },
        onError: (err) => {
          if (err instanceof ApiConflictError) {
            const currentValue = err.currentValue as ChapterContent;
            // Sync the cache to server truth so a retry has a fresh
            // revision to send — the pending edits are NOT lost, they
            // stay in pendingByRef until the user resolves the conflict.
            qc.setQueryData(queryKeys.chapter(editionId, ref), currentValue);
            setConflict({
              ref,
              info: { baselineValues: baselineByRef.current[ref] ?? {}, pendingValues: pending, currentValues: currentValue.values },
            });
          }
        },
      },
    );
  }

  function onFieldChange(field: Field, value: unknown) {
    if (!editable) return;
    const ref = field.ref;
    if (conflict?.ref === ref) return; // resolve the existing conflict before piling on more edits

    if (!pendingByRef.current[ref] || Object.keys(pendingByRef.current[ref]).length === 0) {
      const current = qc.getQueryData<ChapterContent>(queryKeys.chapter(editionId, ref));
      baselineByRef.current[ref] = current ? { ...current.values } : {};
      pendingByRef.current[ref] = {};
    }
    pendingByRef.current[ref][field.id] = value;

    qc.setQueryData<ChapterContent>(queryKeys.chapter(editionId, ref), (old) =>
      old ? { ...old, values: { ...old.values, [field.id]: value } } : old,
    );
    setSavingByRef((s) => ({ ...s, [ref]: { state: "saving" } }));
    clearTimeout(timers.current[ref]);
    timers.current[ref] = setTimeout(() => flush(ref), 650);
  }

  function resolveKeepMine() {
    if (!conflict) return;
    const { ref, info } = conflict;
    const fresh = qc.getQueryData<ChapterContent>(queryKeys.chapter(editionId, ref));
    if (!fresh) return;
    saveMutation.mutate(
      { ref, revision: fresh.revision, values: info.pendingValues },
      {
        onSuccess: () => {
          pendingByRef.current[ref] = {};
          setConflict(null);
          setSavingByRef((s) => ({ ...s, [ref]: { state: "saved", time: timeNow() } }));
        },
        onError: (err) => {
          if (err instanceof ApiConflictError) {
            const currentValue = err.currentValue as ChapterContent;
            qc.setQueryData(queryKeys.chapter(editionId, ref), currentValue);
            setConflict({ ref, info: { baselineValues: fresh.values, pendingValues: info.pendingValues, currentValues: currentValue.values } });
          }
        },
      },
    );
  }

  function resolveDiscardMine() {
    if (!conflict) return;
    pendingByRef.current[conflict.ref] = {};
    setConflict(null);
  }

  const savingStates = Object.values(savingByRef);
  const savingLabel = savingStates.some((s) => s.state === "saving")
    ? "Saving…"
    : savingStates.some((s) => s.state === "saved")
      ? `Auto-saved as draft · ${savingStates.filter((s) => s.time).map((s) => s.time!).sort().at(-1)}`
      : "No changes yet";

  return { values, isLoading, isError, savingLabel, conflict, onFieldChange, resolveKeepMine, resolveDiscardMine };
}
