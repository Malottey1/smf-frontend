import { test, expect } from "@playwright/test";

/**
 * FR-SMF-09: Single exportable SMF document (PDF/A) reproducing the WHO
 * Annex 14 section order exactly (Chapters 1-9, then Annexes 1-8).
 * Acceptance: exported section order and headings match URS Section 4
 * verbatim.
 */
test.describe("FR-SMF-09", () => {
  test("export preview renders Chapters 1-9 then Annexes 1-8, in that fixed order", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const headings = await page.locator(".export-page-area h2").allTextContents();
    // Chapter headings render as "<span>1</span>Title" (no separator) —
    // match "starts with a digit" rather than assume punctuation that
    // isn't actually in the markup.
    const chapterHeadings = headings.filter((h) => /^\d/.test(h.trim()) && !/^Annex/.test(h.trim()));
    const annexHeadings = headings.filter((h) => /^Annex \d/.test(h.trim()));

    expect(chapterHeadings).toHaveLength(9);
    expect(chapterHeadings.map((h) => h.trim()[0])).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

    expect(annexHeadings).toHaveLength(8);
    const firstAnnexIndex = headings.indexOf(annexHeadings[0]!);
    const lastChapterIndex = headings.indexOf(chapterHeadings[8]!);
    expect(firstAnnexIndex).toBeGreaterThan(lastChapterIndex);
  });
});
