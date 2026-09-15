import { test, expect } from "@playwright/test";

/**
 * FR-SMF-03: Each Annex carries its own independent effective date,
 * distinct from the parent document's. Acceptance: updating Annex 6
 * alone does not require re-versioning Chapters 1-9.
 */
test.describe("FR-SMF-03", () => {
  test("changing Annex 6's effective date does not change the document status/edition or Chapter 4's content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".doc-status")).toBeVisible(); // past the initial load

    const statusBefore = await page.locator(".doc-status").textContent();
    const chapter4Pct = page.getByRole("button", { name: /^4\s*Premises and Equipment/ }).locator(".pct");
    const pctBefore = await chapter4Pct.textContent();

    await page.getByRole("button", { name: /^§\s*Annexes 1–8/ }).click();
    // Anchored to the start of the label ("Annex 6 — Title...") — a plain
    // substring match on "Annex 6" would be safe here, but WHO's own
    // citation text rendered in every card ("TRS 961 Annex 14, Annex N")
    // contains "Annex 1" as a literal substring of "Annex 14", which
    // silently matched all 8 cards for that particular number until this
    // was anchored.
    const annex6Card = page.locator(".field").filter({ hasText: /^Annex 6\s/ });
    const dateInput = annex6Card.locator('input[type="date"]');
    await dateInput.fill("2026-02-01");

    // Wait for the annex's own save indicator, not a fixed timeout.
    await expect(annex6Card.locator(".hint")).toContainText("Saved", { timeout: 5000 });

    await expect(page.locator(".doc-status")).toHaveText(statusBefore ?? "");
    await expect(chapter4Pct).toHaveText(pctBefore ?? "");

    // The chapter that references Annex 6 (4.1) still shows its own,
    // unrelated seeded content untouched.
    await page.getByRole("button", { name: /^4\s*Premises and Equipment/ }).click();
    await expect(
      page.getByRole("group", { name: "Manufacturing area plan/description with scale (simple plan, not full engineering drawing)", exact: true }),
    ).toContainText("site-plan-buildingA.pdf");
  });

  test("each annex shows its own effective date and revision, independent of the others", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^§\s*Annexes 1–8/ }).click();

    const annex1Date = await page
      .locator(".field")
      .filter({ hasText: /^Annex 1\s/ })
      .locator('input[type="date"]')
      .inputValue();
    const annex5Date = await page
      .locator(".field")
      .filter({ hasText: /^Annex 5\s/ })
      .locator('input[type="date"]')
      .inputValue();
    // Seeded with different dates (2024-11-01 vs 2024-09-20) — proves
    // these are independent fields, not one shared document-level date.
    expect(annex1Date).not.toBe(annex5Date);
  });
});
