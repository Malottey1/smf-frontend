import { test, expect } from "@playwright/test";
import { fillRemainingRequiredFields } from "./fillDocument";

/**
 * FR-SMF-07: flag the SMF "Due for Review" at a configurable interval
 * (default 2 years) from the last effective date, or on demand when a
 * major facility change is logged elsewhere in the platform. Acceptance:
 * notification sent to the Facility QA Reviewer when the due date
 * approaches or a major change is logged.
 *
 * The date-based trigger's actual math is covered deterministically in
 * src/mocks/dueForReview.test.ts (Vitest, controlled dates) rather than
 * here — the seed's real next-review date is roughly a year and a half
 * out from whatever day this suite happens to run, so a browser test
 * relying on the real system clock would only ever exercise "not due
 * yet." What IS meaningfully covered live, end-to-end through the real
 * mock, is the on-demand trigger and its effects.
 */
test.describe("FR-SMF-07", () => {
  test("logging a major facility change flags the document due for review and notifies the QA Reviewer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".rejected-flag")).toHaveCount(0);

    await page.getByRole("button", { name: /^⧗\s*Edition history/ }).click();
    await page.getByRole("button", { name: "Simulate: log a major facility change" }).click();

    await expect(page.locator(".rejected-flag")).toContainText("Due for review");
    await expect(page.locator(".rejected-flag")).toContainText("major facility change logged");
    await expect(page.locator(".rejected-flag")).toContainText("Facility QA Reviewer notified");

    // The trigger button reflects the new state rather than allowing a
    // second, redundant flag.
    await expect(page.getByRole("button", { name: "Already flagged for review" })).toBeDisabled();

    // The flag is visible regardless of which chapter is open — it's a
    // document-level notice, not scoped to one screen.
    await page.getByRole("button", { name: /^4\s*Premises and Equipment/ }).click();
    await expect(page.locator(".rejected-flag")).toContainText("Due for review");
  });

  test("approving a new edition clears the due-for-review flag — the approval IS the review", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");

    await page.getByRole("button", { name: /^⧗\s*Edition history/ }).click();
    await page.getByRole("button", { name: "Simulate: log a major facility change" }).click();
    await expect(page.locator(".rejected-flag")).toContainText("Due for review");

    await fillRemainingRequiredFields(page);
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();

    await expect(page.locator(".doc-status")).toContainText("Draft");
    await expect(page.locator(".rejected-flag")).toHaveCount(0);
  });

  test("an inspector viewing the approved edition does not see the current draft's due-for-review flag", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⧗\s*Edition history/ }).click();
    await page.getByRole("button", { name: "Simulate: log a major facility change" }).click();

    await page.getByRole("combobox", { name: "Viewing as" }).selectOption("inspector");
    // Forced onto the approved edition (FR-SMF-08) — a flag on the live
    // working draft isn't a property of that frozen, already-approved snapshot.
    await expect(page.locator(".doc-status")).toContainText("Approved");
    await expect(page.locator(".rejected-flag")).toHaveCount(0);
  });
});
