/**
 * FR-SMF-07: flag "Due for Review" at a configurable interval from the
 * last effective date, or on demand when a major change is logged.
 *
 * Pure and deterministic (takes `now` as a parameter) specifically so it
 * can be unit-tested without depending on the real wall clock — the
 * demo's seeded dates put the automatic date-based trigger months in the
 * future from whenever this is actually run, so a test that relied on
 * `Date.now()` would only ever exercise the "not due yet" branch. See
 * src/mocks/dueForReview.test.ts for the date-math cases; the on-demand
 * trigger (manualFlag) is exercised live in e2e/FR-SMF-07.spec.ts instead,
 * since nothing about it depends on which day the suite happens to run.
 */

const APPROACHING_WINDOW_DAYS = 60;

export type DueForReviewReason = "date" | "major_change" | null;

export interface DueForReview {
  isDue: boolean;
  reason: DueForReviewReason;
}

export function computeDueForReview(nextReviewDate: string | null, manualFlag: boolean, now: Date): DueForReview {
  if (manualFlag) return { isDue: true, reason: "major_change" };
  if (!nextReviewDate) return { isDue: false, reason: null };

  const due = new Date(nextReviewDate);
  const windowStart = new Date(due);
  windowStart.setDate(windowStart.getDate() - APPROACHING_WINDOW_DAYS);

  if (now >= windowStart) return { isDue: true, reason: "date" };
  return { isDue: false, reason: null };
}
