import { test, expect } from "@playwright/test";

/**
 * FR-SMF-14: All uploaded Annexes (1-8) and, where enabled for Ghana, the
 * Ghana FDA supplementary appendices, appended as a final section of the
 * exported PDF in a fixed, labelled order. Acceptance: exported PDF
 * appendix section lists each annex under its label (Annex 1, Annex 2,
 * ...) in fixed order.
 */
test.describe("FR-SMF-14", () => {
  test("Annexes 1-8 appear under their own labels, in order, followed by the Ghana appendices as a final labelled section", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const annexLabels = await page.locator(".annex-num").allTextContents();
    expect(annexLabels.map((l) => l.trim())).toEqual(["Annex 1", "Annex 2", "Annex 3", "Annex 4", "Annex 5", "Annex 6", "Annex 7", "Annex 8"]);

    const appendicesHeading = page.locator("h2", { hasText: "Supplementary Appendices" });
    await expect(appendicesHeading).toBeVisible();

    // The appendices section is the very last thing in the export — after
    // every annex, not interleaved with them.
    const allHeadingTexts = await page.locator(".export-page-area h2").allTextContents();
    const appendicesIndex = allHeadingTexts.findIndex((h) => h.includes("Supplementary Appendices"));
    const lastAnnexIndex = allHeadingTexts.findIndex((h) => h.trim().startsWith("Annex 8"));
    expect(appendicesIndex).toBe(allHeadingTexts.length - 1);
    expect(appendicesIndex).toBeGreaterThan(lastAnnexIndex);
  });
});
