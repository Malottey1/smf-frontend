import { test, expect } from "@playwright/test";

/**
 * FR-SMF-10: Exported PDF includes a cover page showing manufacturer
 * name, site address, edition number, effective date, and next review
 * date. Acceptance: cover page fields populate from document-level
 * metadata (FR-SMF-04).
 */
test.describe("FR-SMF-10", () => {
  test("cover page shows manufacturer/site, edition, effective date, and next review date", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const cover = page.locator(".cover-page");
    await expect(cover).toContainText("Danadams Pharmaceutical Ind. Ltd");
    await expect(cover).toContainText("Kumasi");
    await expect(cover.locator(".cover-meta")).toContainText("Edition");
    await expect(cover.locator(".cover-meta")).toContainText("Effective date");
    await expect(cover.locator(".cover-meta")).toContainText("Next review date");
    // Seed state is edition 1 approved, edition 2 being drafted. The
    // cover page must still show edition 1's real effective date — a GMP
    // document mid-revision is still bound by its last approved content,
    // not by "not yet effective" (see openapi/smf-api.yaml's note on
    // this field, corrected while writing this test).
    await expect(cover.locator(".cover-meta")).toContainText("2025-01-15");
    await expect(cover.locator(".cover-meta")).not.toContainText("Not yet effective");
  });
});
