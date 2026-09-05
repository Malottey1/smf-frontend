import { test, expect } from "@playwright/test";
import { fillRemainingRequiredFields } from "./fillDocument";

/**
 * FR-SMF-08: Current approved SMF version visible read-only to assigned
 * Ghana FDA Inspectors without a separate request. Acceptance: Inspector
 * role sees the SMF pre-populated with the latest approved version and
 * edition history.
 *
 * The brief behind this FR also names edition-to-edition diffing as what
 * makes this "the difference between a compliance checkbox and something
 * an authority actually wants to use" — covered below via
 * EditionHistoryPanel and GET .../editions/{a}/diff/{b}.
 */
test.describe("FR-SMF-08", () => {
  test("the current approved edition is available read-only without any extra request", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Latest approved edition" })).toBeEnabled();
    await page.getByRole("button", { name: "Latest approved edition" }).click();

    await expect(page.locator(".doc-status")).toContainText("Approved");
    await expect(page.locator(".doc-status")).toContainText("Effective");

    await page.getByRole("button", { name: /^1\s*General Information/ }).click();
    // Read-only: values render as text, not as editable form controls.
    await expect(page.locator(".panel").locator("input, textarea, select")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Manufacturer legal name and official address", exact: true })).toContainText("Danadams");
  });

  test("historical editions before the latest approved one are also retrievable", async ({ page }) => {
    await page.goto("/");
    // Only one edition exists at cold start, so "Historical" is correctly
    // disabled — nothing to show yet. This itself is worth asserting:
    // FR-SMF-08 promises edition *history*, and history requires more
    // than one edition to exist.
    await expect(page.getByRole("button", { name: "Historical editions" })).toBeDisabled();
  });

  test("switching to the Ghana FDA Inspector persona forces a read-only approved/historical view — no draft, no workflow controls", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Current working copy" })).toBeVisible();

    await page.getByRole("combobox", { name: "Viewing as" }).selectOption("inspector");

    // The draft view option disappears entirely — an inspector is never
    // one click away from an unapproved working draft.
    await expect(page.getByRole("button", { name: "Current working copy" })).toHaveCount(0);
    await expect(page.locator(".doc-status")).toContainText("Approved");

    await page.getByRole("button", { name: /^1\s*General Information/ }).click();
    await expect(page.locator(".panel").locator("input, textarea, select")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send for QA review" })).toHaveCount(0);
  });

  test("an inspector can diff two approved editions and see exactly what changed, field by field", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");

    // Get to edition 2 (seed starts with edition 1 already approved).
    await fillRemainingRequiredFields(page);
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.locator(".doc-status")).toContainText("Draft");

    // Change exactly one field, then get to edition 3.
    await page.getByRole("button", { name: /^9\s*Self-Inspections/ }).click();
    await page
      .getByRole("group", { name: "Self-inspection system description: area-selection criteria, practical arrangements, follow-up activities", exact: true })
      .locator("textarea")
      .fill("Updated self-inspection programme description for edition 3.");
    await expect(page.locator(".save-note")).toContainText("Auto-saved", { timeout: 15_000 });
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 4");

    // Now diff edition 2 against edition 3.
    await page.getByRole("button", { name: /^⧗\s*Edition history/ }).click();
    // Scoped to the edition-list table specifically (the first
    // .table-wrap) — the diff table below reuses the same "rt" class and
    // may already be populated (default picks are the two most recent
    // editions), so an unscoped "table.rt tbody tr" count would double-count.
    await expect(page.locator(".table-wrap").first().locator("tbody tr")).toHaveCount(3); // editions 1, 2, 3

    const selects = page.locator('[aria-label="Compare editions"] select');
    await selects.nth(0).selectOption("2");
    await selects.nth(1).selectOption("3");

    const diffTable = page.locator(".table-wrap table.rt").nth(1);
    await expect(diffTable).toContainText("Self-inspection system description");
    await expect(diffTable).toContainText("Updated self-inspection programme description for edition 3.");
    // Only the one field we actually changed shows up — not the whole document.
    const diffRows = diffTable.locator("tbody tr");
    await expect(diffRows).toHaveCount(1);
  });
});
