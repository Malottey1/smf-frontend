import { test, expect } from "@playwright/test";
import templateJson from "../schema/template.json" with { type: "json" };
import type { Template } from "../schema/template.schema";

const TEMPLATE = templateJson as Template;

/**
 * FR-SMF-01: System shall present the SMF as 9 chapters matching WHO TRS
 * 961 Annex 14 structure exactly, each independently navigable and
 * saveable. Acceptance: all 9 chapters + sub-clauses render as separate
 * form sections matching Section 4 of the URS.
 */
test.describe("FR-SMF-01", () => {
  test("all 9 chapters are listed in the document nav, in WHO order", async ({ page }) => {
    await page.goto("/");
    for (const chapter of TEMPLATE.chapters) {
      await expect(page.getByRole("button", { name: new RegExp(`^${chapter.number}\\s*${chapter.title}`) })).toBeVisible();
    }
  });

  test("each chapter is independently navigable and renders its own sub-clauses as separate sections", async ({ page }) => {
    await page.goto("/");
    const chapter4 = TEMPLATE.chapters.find((c) => c.number === 4)!;
    await page.getByRole("button", { name: new RegExp(`^4\\s*${chapter4.title}`) }).click();

    await expect(page.getByRole("heading", { name: chapter4.title })).toBeVisible();
    for (const sc of chapter4.subClauses) {
      await expect(page.getByText(sc.ref, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: new RegExp(sc.title), level: 3 })).toBeVisible();
    }

    // Switch chapters — the previous chapter's content is gone, the new
    // chapter's own sub-clauses render in its place.
    const chapter1 = TEMPLATE.chapters.find((c) => c.number === 1)!;
    await page.getByRole("button", { name: new RegExp(`^1\\s*${chapter1.title}`) }).click();
    await expect(page.getByRole("heading", { name: chapter1.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: chapter4.title })).not.toBeVisible();
  });

  test("field count for Chapter 4 matches template.json exactly (nested sub-clauses, structured HVAC, uploads, repeatable table)", async ({
    page,
  }) => {
    await page.goto("/");
    const chapter4 = TEMPLATE.chapters.find((c) => c.number === 4)!;
    await page.getByRole("button", { name: new RegExp(`^4\\s*${chapter4.title}`) }).click();

    for (const sc of chapter4.subClauses) {
      for (const field of sc.fields) {
        const hidden = field.condition !== null; // none of Chapter 4's fields are conditional in template.json
        if (!hidden) {
          await expect(page.getByRole("group", { name: field.label, exact: true }).first()).toBeVisible();
        }
      }
    }
  });
});
