import { test, expect } from "@playwright/test";

/**
 * FR-SMF-15: Optional "Ghana FDA Supplementary Appendices" section
 * allowing upload of Location Plan, Floor Plans/P&ID prints,
 * Environmental Permit, and Assembly Permit, appended after the WHO
 * Annexes in the export. Acceptance: section only shown when facility
 * jurisdiction = Ghana; uploads appear in export appendix list.
 */
test.describe("FR-SMF-15", () => {
  test("the Ghana appendices section lists all four named appendices", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^GH\s*Ghana appendices/ }).click();

    await expect(page.getByRole("heading", { name: "Ghana — supplementary appendices" })).toBeVisible();
    for (const title of ["Location Plan", "Floor Plans", "Environmental Permit", "Assembly Permit"]) {
      await expect(page.getByRole("heading", { name: title, level: 4 })).toBeVisible();
    }
  });

  test("an uploaded appendix file appears both in the panel and in the export's appendices section", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^GH\s*Ghana appendices/ }).click();

    const locationPlanCard = page.locator(".appendix-card", { hasText: "Location Plan" });
    await locationPlanCard.locator('input[type="file"]').setInputFiles("e2e/fixtures/dummy.pdf");
    await expect(locationPlanCard.locator(".file-chip")).toContainText("dummy.pdf");

    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });
    // Only place this filename could appear — it's not part of any
    // seeded chapter/annex content.
    await expect(page.locator(".export-page-area")).toContainText("dummy.pdf");
  });
});
