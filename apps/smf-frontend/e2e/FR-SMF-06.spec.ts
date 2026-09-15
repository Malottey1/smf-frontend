import { test, expect } from "@playwright/test";
import { fillRemainingRequiredFields } from "./fillDocument";

/**
 * FR-SMF-06: System versions the SMF immutably — each QA-approved
 * submission creates a new read-only version; prior versions remain
 * retrievable. Acceptance: editing after approval creates a new draft
 * version; the approved version remains accessible unchanged.
 */
test.describe("FR-SMF-06", () => {
  test("the newly-approved edition is read-only and unchanged after further editing begins", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await fillRemainingRequiredFields(page);
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.locator(".doc-status .edition-num")).toHaveText("Ed. 3");

    // Immediately start editing the new working draft.
    await page.getByRole("button", { name: /^7\s*Quality Control/ }).click();
    await page
      .getByRole("group", { name: "Description of on-site QC activities: physical, chemical, microbiological, biological testing scope", exact: true })
      .locator("textarea")
      .fill("Edited after approval, in the new edition 3 draft.");
    await page.waitForTimeout(900);

    // The just-approved edition (2) is untouched by that edit and has no
    // editable inputs at all.
    await page.getByRole("button", { name: "Latest approved edition" }).click();
    await expect(page.locator(".doc-status")).toContainText("Approved");
    await page.getByRole("button", { name: /^7\s*Quality Control/ }).click();
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(page.locator(".field-value")).not.toContainText("Edited after approval");

    // Switching back to the current draft shows the edit again — the
    // read-only view didn't roll it back.
    await page.getByRole("button", { name: "Current working copy" }).click();
    await expect(page.locator("textarea").first()).toHaveValue(/Edited after approval/);
  });
});
