import { test, expect } from "@playwright/test";
import { fillRemainingRequiredFields } from "./fillDocument";

/**
 * FR-SMF-04: Document gets an edition number, effective date, and
 * next-review date at document level, auto-incrementing edition on each
 * approved revision. Acceptance: edition number increments only on
 * QA-approved submission, never on draft save.
 */
test.describe("FR-SMF-04", () => {
  test("edition number does not change on a draft save; only increments on approval", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");

    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 2"); // seed: 1 approved edition exists, working on edition 2

    await page.getByRole("button", { name: /^1\s*General Information/ }).click();
    await page
      .getByRole("group", { name: "Description of non-pharmaceutical activities on site, if any", exact: true })
      .locator("textarea")
      .fill("None — draft save should not touch the edition number.");
    await page.waitForTimeout(900);
    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 2");

    await fillRemainingRequiredFields(page);

    await page.getByRole("button", { name: "Send for QA review" }).click();
    await expect(page.locator(".doc-status")).toContainText("Awaiting QA review");
    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 2"); // still 2 — submitting isn't approving

    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 3");
    await expect(page.locator(".doc-status")).toContainText("Draft"); // back to a fresh working draft
  });
});
