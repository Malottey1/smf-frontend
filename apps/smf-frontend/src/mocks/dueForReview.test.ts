import { describe, expect, it } from "vitest";
import { computeDueForReview } from "./dueForReview";

describe("computeDueForReview", () => {
  it("is not due well before the review date", () => {
    const result = computeDueForReview("2027-01-15", false, new Date("2026-09-05"));
    expect(result).toEqual({ isDue: false, reason: null });
  });

  it("is due once inside the 60-day approaching window", () => {
    const result = computeDueForReview("2027-01-15", false, new Date("2026-11-20"));
    expect(result).toEqual({ isDue: true, reason: "date" });
  });

  it("is due exactly at the review date", () => {
    const result = computeDueForReview("2027-01-15", false, new Date("2027-01-15"));
    expect(result).toEqual({ isDue: true, reason: "date" });
  });

  it("is due when overdue", () => {
    const result = computeDueForReview("2027-01-15", false, new Date("2027-03-01"));
    expect(result).toEqual({ isDue: true, reason: "date" });
  });

  it("is not due when there is no next review date yet (no edition ever approved)", () => {
    const result = computeDueForReview(null, false, new Date("2027-01-15"));
    expect(result).toEqual({ isDue: false, reason: null });
  });

  it("the manual (major-change) flag is due regardless of date, and takes priority as the reason", () => {
    const result = computeDueForReview("2030-01-01", true, new Date("2026-09-05"));
    expect(result).toEqual({ isDue: true, reason: "major_change" });
  });
});
