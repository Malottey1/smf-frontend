import { test, expect } from "@playwright/test";
import { fillRemainingRequiredFields } from "./fillDocument";

/**
 * FR-SMF-05: Submitted SMF routes to the Facility QA Reviewer, who can
 * reject with comments, returning it to Draft. Acceptance: rejected
 * submission shows reviewer comments to the Factory User, anchored to
 * the specific chapter they refer to — not just a document-level message.
 */
test.describe("FR-SMF-05", () => {
  test("rejecting with a comment on Chapter 4 returns the document to Draft and shows the comment only on Chapter 4", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await fillRemainingRequiredFields(page);
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await expect(page.locator(".doc-status")).toContainText("Awaiting QA review");

    await page.getByRole("button", { name: "Reject with comment" }).click();
    await page.locator(".reject-bar select").selectOption("4"); // "Chapter 4 — Premises and Equipment"
    await page.locator(".reject-bar textarea").fill("HVAC humidity range for Room 2 looks out of spec — please re-check.");
    await page.getByRole("button", { name: "Send rejection" }).click();

    await expect(page.locator(".doc-status")).toContainText("Draft");
    await expect(page.locator(".doc-status")).toContainText("Returned by QA");

    // The comment is anchored to Chapter 4 specifically.
    await page.getByRole("button", { name: /^4\s*Premises and Equipment/ }).click();
    await expect(page.locator(".comment-banner")).toContainText("HVAC humidity range");

    // A different chapter shows no comment at all — this is not a
    // document-level message the author has to hunt through every
    // chapter to find.
    await page.getByRole("button", { name: /^1\s*General Information/ }).click();
    await expect(page.locator(".comment-banner")).toHaveCount(0);
  });
});
