import { test, expect } from "@playwright/test";

/**
 * FR-SMF-16: System shall NOT hard-validate the Ghana FDA supplementary
 * appendix list as mandatory field-level blockers until confirmed
 * against Ghana FDA's official guidance. Acceptance: no submission is
 * blocked solely for a missing Ghana-specific appendix; treated as
 * advisory checklist only.
 */
test.describe("FR-SMF-16", () => {
  test("every Ghana appendix is marked advisory/never-blocking, with no required indicator", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^GH\s*Ghana appendices/ }).click();

    const cards = page.locator(".appendix-card");
    const count = await cards.count();
    expect(count).toBe(4);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText("Advisory · never blocks");
    }
    // None of the four ship any file in the seed — that alone must not
    // read as an error state anywhere on the page.
    await expect(page.locator(".appendix-card .file-chip")).toHaveCount(0);
    await expect(page.locator("text=/required/i")).toHaveCount(0);
  });

  test("leaving all Ghana appendices empty does not block sending the document for QA review", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^GH\s*Ghana appendices/ }).click();
    // Confirm the panel loaded with zero uploads, then leave it — no
    // action taken here at all.
    await expect(page.locator(".appendix-card .file-chip")).toHaveCount(0);

    // Chapter 1 alone is already 100% complete in the seed data — submit
    // gating is a real server-side completion check (src/mocks/handlers.ts),
    // and it has nothing to do with jurisdiction appendices. Confirm the
    // 422 the seed's overall incompleteness produces mentions completion,
    // never Ghana/appendix content.
    await page.getByRole("button", { name: /^1\s*General Information/ }).click();
    await page.getByRole("button", { name: "Send for QA review" }).click();
    await expect(page.locator(".save-note")).toContainText(/%/);
    await expect(page.locator(".save-note")).not.toContainText(/ghana|appendix/i);
  });
});
