import { test, expect } from "@playwright/test";

/**
 * FR-SMF-12: Favor rendering of uploaded diagrams/layouts/schematics over
 * narrative text wherever a WHO chapter calls for a plan, layout, or
 * schematic. Acceptance: Chapters 4.1/4.1.2 and Annexes 5-7 render
 * uploaded images/PDFs inline in the export, not as text descriptions.
 */
test.describe("FR-SMF-12", () => {
  test("4.1's production area layouts render as an inline image frame, not a text file reference", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const chapter4Section = page.locator("#chapter-4");
    // Clause 4.1 has more than one plan/layout field (manufacturing area
    // plan, production area layouts, warehouse layouts) — the URS calls
    // out the whole clause for inline rendering, not one specific field,
    // so more than one frame here is correct. Check the specific file.
    await expect(chapter4Section.locator(".doc-image-frame")).not.toHaveCount(0);
    await expect(chapter4Section.locator(".doc-image-frame").filter({ hasText: "production-layout-r3.pdf" })).toBeVisible();
  });

  test("Annex 6 (production area layouts) renders as an inline image frame", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    await expect(page.locator("#annex-6 .doc-image-frame")).not.toHaveCount(0);
  });

  test("a file upload the URS does NOT call out for inline rendering (the GMP certificate) stays a plain text reference", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const chapter1Section = page.locator("#chapter-1");
    // Chapter 1 has two file uploads (manufacturing authorization, GMP
    // certificate) — neither is under 4.1/4.1.2/Annexes 5-7, so both
    // should be plain references, not frames.
    await expect(chapter1Section.locator(".doc-file-ref").filter({ hasText: "gmp-certificate-2024.pdf" })).toBeVisible();
    await expect(chapter1Section.locator(".doc-file-ref").filter({ hasText: "manufacturing-authorization-2024.pdf" })).toBeVisible();
    // Confirms the distinction is deliberate, not "every upload gets a frame."
    await expect(chapter1Section.locator(".doc-image-frame")).toHaveCount(0);
  });
});
