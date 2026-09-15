import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import templateJson from "../schema/template.json" with { type: "json" };
import type { Template, Field } from "../schema/template.schema";
import { INITIAL_VALUES } from "../src/smf/seedData";

const TEMPLATE = templateJson as Template;
const DUMMY_FILE = resolve(import.meta.dirname, "fixtures/dummy.pdf");

/**
 * Fills every field that FR-SMF-04/05/06 tests need answered to reach
 * 100% completion (submitting for review is gated on that server-side —
 * see src/mocks/handlers.ts), driven entirely from template.json rather
 * than hardcoded per field. Every gating field (derivedGatingField) is
 * answered "No" specifically so its dependent conditional fields stay
 * excluded from the denominator — fewer fields to fill, and it's a
 * legitimate exercise of FR-SMF-02's "conditional fields don't count
 * when their condition is false" in its own right.
 *
 * Already-seeded fields (INITIAL_VALUES) are skipped. Not exhaustive
 * against every possible schema shape — covers the 10 input types as
 * they're actually used in template.json today.
 */
export async function fillRemainingRequiredFields(page: Page): Promise<void> {
  for (const chapter of TEMPLATE.chapters) {
    const fieldsToFill = chapter.subClauses
      .flatMap((sc) => sc.fields)
      .filter((f) => f.required && !Object.prototype.hasOwnProperty.call(INITIAL_VALUES, f.id));
    if (fieldsToFill.length === 0) continue;

    await page.getByRole("button", { name: new RegExp(`^${chapter.number}\\s*${escapeRegExp(chapter.title)}\\s*\\d+%$`) }).click();

    for (const field of fieldsToFill) {
      await fillField(page, field);
    }

    // Saves are debounced 650ms per sub-clause (see useChapterAutosave) —
    // navigating to the next chapter immediately, before that timer
    // fires, meant the last edits in a chapter never actually persisted
    // (found by this helper's own first run: chapters filled last showed
    // 0% even though every field-fill call had succeeded). Wait for the
    // chapter's own save indicator to confirm before moving on.
    await expect(page.locator(".save-note")).toContainText("Auto-saved", { timeout: 15_000 });
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fillField(page: Page, field: Field): Promise<void> {
  const group = page.getByRole("group", { name: field.label, exact: true }).first();
  await group.scrollIntoViewIfNeeded();

  if (field.derivedGatingField) {
    await group.locator("select").selectOption("No");
    return;
  }

  switch (field.inputType) {
    case "text":
    case "phone":
      await group.locator("input").fill("Automated test value");
      return;
    case "richText":
      await group.locator("textarea").fill("Entered by the FR-SMF-04/05/06 Playwright fixture for coverage purposes.");
      return;
    case "dropdown":
      await group.locator("select").selectOption({ index: 1 });
      return;
    case "multiSelect":
      await group.locator("button.pill").first().click();
      return;
    case "structuredNumeric":
      if (field.range) {
        const inputs = group.locator(".numeric-row input");
        await inputs.nth(0).fill("10");
        await inputs.nth(1).fill("20");
      } else {
        await group.locator("input").fill("10");
      }
      return;
    case "repeatableTable": {
      await group.getByRole("button", { name: "+ Add row" }).click();
      const lastRow = group.locator("tbody tr").last();
      const selects = lastRow.locator("select");
      const selectCount = await selects.count();
      for (let i = 0; i < selectCount; i++) {
        await selects.nth(i).selectOption({ index: 1 });
      }
      const inputs = lastRow.locator("input");
      const inputCount = await inputs.count();
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).fill("Test");
      }
      return;
    }
    case "fileUpload":
      await group.locator('input[type="file"]').setInputFiles(DUMMY_FILE);
      return;
    case "mapPicker": {
      const inputs = group.locator(".map-inputs input");
      await inputs.nth(0).fill("5.6000");
      await inputs.nth(1).fill("-0.2000");
      return;
    }
    case "toggleWithText":
      // Never required in template.json today — nothing to do.
      return;
    default:
      throw new Error(`fillField: unhandled inputType ${field.inputType} for ${field.id}`);
  }
}
