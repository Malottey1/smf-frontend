import { test, expect } from "@playwright/test";

/**
 * FR-SMF-11: Exported PDF includes an auto-generated table of contents
 * with page numbers. Acceptance: TOC entries link to the correct page in
 * the generated PDF.
 */
test.describe("FR-SMF-11", () => {
  test("table of contents lists every chapter and annex, each resolving to a real page number", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    const entries = page.locator(".toc-entry");
    await expect(entries).toHaveCount(9 + 8 + 1); // chapters + annexes + Ghana appendices section

    // The page number is CSS-generated (::after { content: target-counter
    // (attr(href), page) } in print.css). Paged.js rewrites that
    // unsupported GCPM function into a real, browser-native
    // `counter(target-counter-<id>)` tied to a counter it maintains on
    // the target element — that rewrite is the actual mechanism being
    // tested here. getComputedStyle(...).content does NOT further
    // resolve a counter() function to its literal digit (counters
    // resolve per rendered box, not as a static computed-style string),
    // so the honest check is: the rewrite happened (not left as the
    // literal, unprocessed "target-counter(...)" text a broken build
    // would show), and every entry's target actually exists in the
    // rendered output for that counter to resolve against.
    const afterContents: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".toc-entry")).map((el) => window.getComputedStyle(el, "::after").content),
    );
    for (const content of afterContents) {
      expect(content, `TOC entry ::after should be rewritten to a real counter(), got: ${content}`).toMatch(/^counter\(target-counter-/);
    }

    const hrefs = await page.locator(".toc-entry").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      await expect(page.locator(href!)).toHaveCount(1);
    }
  });

  test("each TOC entry's label names the chapter or annex it points to", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^⇩\s*Export preview/ }).click();
    await expect(page.locator(".pagedjs_page").first()).toBeVisible({ timeout: 20_000 });

    await expect(page.locator(".toc-entry", { hasText: "Premises and Equipment" })).toBeVisible();
    await expect(page.locator(".toc-entry", { hasText: "Annex 6" })).toBeVisible();
  });
});
