import { test, expect } from "@playwright/test";

/**
 * FR-SMF-02: Each chapter/sub-clause saved as draft independently, with
 * an overall completion percentage shown at document level. Acceptance:
 * completion % recalculates live; partial save on one chapter does not
 * affect others.
 */
test.describe("FR-SMF-02", () => {
  test("answering a conditional gate reveals its dependent field live, without a page reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^2\s*Quality Management/ }).click();

    const gate = page.getByRole("group", { name: "Does this site hold any accreditation or certification (other than the GMP certificate above)?", exact: true });
    const dependent = page.getByRole("group", { name: "Accreditation/certification activities: scope, dates, accrediting body", exact: true });

    await expect(dependent).not.toBeVisible();
    await gate.locator("select").selectOption("Yes");
    await expect(dependent).toBeVisible();

    // Flip back — the field must disappear again, proving this is live
    // condition evaluation, not a one-way reveal.
    await gate.locator("select").selectOption("No");
    await expect(dependent).not.toBeVisible();
  });

  test("a hidden conditional field does not count toward the denominator", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^2\s*Quality Management/ }).click();
    const pct = page.getByRole("button", { name: /^2\s*Quality Management/ }).locator(".pct");
    const before = await pct.textContent();

    const gate = page.getByRole("group", { name: "Does this site have more than one Authorized/Qualified Person?", exact: true });
    await gate.locator("select").selectOption("Yes");
    // Revealing "Arrangements between multiple Authorized Persons" adds
    // one unfilled field to both denominator and (unchanged) numerator —
    // completion must move, proving it isn't a static/cached number.
    await expect
      .poll(async () => pct.textContent())
      .not.toBe(before);
  });

  test("saving one chapter does not change another chapter's completion", async ({ page }) => {
    await page.goto("/");
    const chapter5Pct = page.getByRole("button", { name: /^5\s*Documentation/ }).locator(".pct");
    const before = await chapter5Pct.textContent();

    await page.getByRole("button", { name: /^2\s*Quality Management/ }).click();
    await page.getByRole("group", { name: "QMS description and standards referenced (e.g. WHO GMP, ISO)", exact: true }).locator("textarea").fill("ISO 9001 and WHO GMP.");
    // Wait past the debounce window so the save actually fires.
    await page.waitForTimeout(900);

    await expect(chapter5Pct).toHaveText(before ?? "");
  });
});
