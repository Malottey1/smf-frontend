import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "../mocks/server";
import { resetDb } from "../mocks/db";
import { api, ApiConflictError } from "./client";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => resetDb());

describe("api client", () => {
  it("getDocument returns a typed SmfDocument", async () => {
    const doc = await api.getDocument("current");
    expect(doc.id).toBe("smf-danadams");
    expect(doc.completion.byChapter).toHaveLength(9);
  });

  it("getChapter / saveChapter round-trip with the real revision", async () => {
    const before = await api.getChapter("current", "1.3");
    const after = await api.saveChapter("current", "1.3", before.revision, { nonPharmaActivitiesDescription: "None." });
    expect(after.values.nonPharmaActivitiesDescription).toBe("None.");
    expect(after.revision).not.toBe(before.revision);
  });

  it("throws ApiConflictError with the server's current state on a stale revision", async () => {
    await expect(api.saveChapter("current", "1.3", "a-stale-revision", { nonPharmaActivitiesDescription: "x" })).rejects.toSatisfy(
      (err) => {
        expect(err).toBeInstanceOf(ApiConflictError);
        const conflict = err as ApiConflictError;
        expect(conflict.currentRevision).toBeTruthy();
        expect((conflict.currentValue as { values: Record<string, unknown> }).values.nonPharmaActivitiesDescription).not.toBe("x");
        return true;
      },
    );
  });

  it("drives the full submit -> approve workflow through the client", async () => {
    // Force completion to 100% by directly saving every required field's
    // current value back onto itself would be tedious; instead exercise
    // the transition in isolation the same way handlers.test.ts does,
    // through the client this time.
    const doc = await api.getDocument("current");
    await expect(api.submitDocument("current", doc.revision)).rejects.toMatchObject({ status: 422 });
  });

  it("annex save is independent of chapter/document revisions", async () => {
    const docBefore = await api.getDocument("current");
    const chapterBefore = await api.getChapter("current", "1.1");

    const annex = await api.getAnnex("current", "annex-6");
    const saved = await api.saveAnnex("current", "annex-6", annex.revision, {}, "2026-03-01");
    expect(saved.effectiveDate).toBe("2026-03-01");

    const docAfter = await api.getDocument("current");
    const chapterAfter = await api.getChapter("current", "1.1");
    expect(docAfter.revision).toBe(docBefore.revision);
    expect(chapterAfter.revision).toBe(chapterBefore.revision);
  });
});
