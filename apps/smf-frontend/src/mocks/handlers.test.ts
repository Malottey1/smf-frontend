import { beforeEach, afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "./server";
import { db, resetDb } from "./db";

const BASE = "http://localhost/api/smf/v1";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => resetDb());

describe("jurisdiction-profiles", () => {
  it("lists profiles including Ghana", async () => {
    const res = await fetch(`${BASE}/jurisdiction-profiles`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((p: { id: string }) => p.id === "gh")).toBe(true);
  });
});

describe("documents", () => {
  it("lists the seeded document with computed completion", async () => {
    const res = await fetch(`${BASE}/documents`);
    const [doc] = await res.json();
    expect(doc.id).toBe("smf-danadams");
    expect(doc.completion.overallPercent).toBeGreaterThan(0);
    expect(doc.completion.overallPercent).toBeLessThan(100); // seed data is deliberately partial
    expect(doc.completion.byChapter).toHaveLength(9);
  });

  it("404s for an edition that doesn't exist", async () => {
    const res = await fetch(`${BASE}/documents/999`);
    expect(res.status).toBe(404);
  });
});

describe("chapters", () => {
  it("returns seeded values for a sub-clause ref", async () => {
    const res = await fetch(`${BASE}/documents/current/chapters/1.1`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ref).toBe("1.1");
    expect(body.values.mfgLegalNameAddress).toContain("Danadams");
  });

  it("saves with a matching revision and returns a new one", async () => {
    const get = await fetch(`${BASE}/documents/current/chapters/1.3`);
    const before = await get.json();

    const put = await fetch(`${BASE}/documents/current/chapters/1.3`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": before.revision },
      body: JSON.stringify({ values: { nonPharmaActivitiesDescription: "None." } }),
    });
    expect(put.status).toBe(200);
    const after = await put.json();
    expect(after.values.nonPharmaActivitiesDescription).toBe("None.");
    expect(after.revision).not.toBe(before.revision);
  });

  it("returns 409 with the current server state on a stale revision", async () => {
    const put = await fetch(`${BASE}/documents/current/chapters/1.3`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": "stale-token-from-a-while-ago" },
      body: JSON.stringify({ values: { nonPharmaActivitiesDescription: "Should not apply" } }),
    });
    expect(put.status).toBe(409);
    const body = await put.json();
    expect(body.error).toBe("revision_conflict");
    expect(body.currentRevision).toBeTruthy();
    expect(body.currentValue.values.nonPharmaActivitiesDescription).not.toBe("Should not apply");
  });

  it("refuses to edit an approved historical edition", async () => {
    const put = await fetch(`${BASE}/documents/1/chapters/1.3`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": "irrelevant" },
      body: JSON.stringify({ values: {} }),
    });
    expect(put.status).toBe(422);
  });
});

describe("annexes — independent dating (FR-SMF-03)", () => {
  it("saving an annex does not touch the document revision or an unrelated chapter revision", async () => {
    const docBefore = db.document.revision;
    const chapterBefore = db.chapters["1.1"]!.revision;

    const get = await fetch(`${BASE}/documents/current/annexes/annex-6`);
    const before = await get.json();
    const put = await fetch(`${BASE}/documents/current/annexes/annex-6`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": before.revision },
      body: JSON.stringify({ values: {}, effectiveDate: "2026-02-01" }),
    });
    expect(put.status).toBe(200);
    const after = await put.json();
    expect(after.effectiveDate).toBe("2026-02-01");
    expect(after.revision).not.toBe(before.revision);

    expect(db.document.revision).toBe(docBefore);
    expect(db.chapters["1.1"]!.revision).toBe(chapterBefore);
  });
});

describe("workflow", () => {
  it("refuses to submit an incomplete document", async () => {
    const res = await fetch(`${BASE}/documents/current/submit`, {
      method: "POST",
      headers: { "If-Match": db.document.revision },
    });
    expect(res.status).toBe(422);
  });

  it("approves a submitted document: increments edition, snapshots state, returns to draft", async () => {
    db.document.status = "qa_review"; // arrange: bypass the completion gate to isolate the approval transition
    const editionBefore = db.document.editionNumber;

    const res = await fetch(`${BASE}/documents/current/qa-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "If-Match": db.document.revision },
      body: JSON.stringify({ decision: "approve" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("draft");
    expect(body.editionNumber).toBe(editionBefore + 1);
    expect(db.editionSnapshots[editionBefore + 1]).toBeTruthy();

    const editions = await (await fetch(`${BASE}/documents/current/editions`)).json();
    expect(editions).toHaveLength(2);
  });

  it("rejects with comments anchored to specific chapters, returning status to draft", async () => {
    db.document.status = "qa_review";
    const res = await fetch(`${BASE}/documents/current/qa-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "If-Match": db.document.revision },
      body: JSON.stringify({ decision: "reject", comments: [{ chapterRef: "4", text: "HVAC humidity range looks wrong." }] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("draft");

    const comments = await (await fetch(`${BASE}/documents/current/comments`)).json();
    expect(comments).toHaveLength(1);
    expect(comments[0].chapterRef).toBe("4");
    expect(comments[0].text).toContain("HVAC");
  });

  it("refuses to reject without comments", async () => {
    db.document.status = "qa_review";
    const res = await fetch(`${BASE}/documents/current/qa-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "If-Match": db.document.revision },
      body: JSON.stringify({ decision: "reject", comments: [] }),
    });
    expect(res.status).toBe(422);
  });
});

describe("uploads (tus-lite mock)", () => {
  it("creates an upload and accepts a chunk", async () => {
    const create = await fetch(`${BASE}/uploads`, {
      method: "POST",
      headers: { "Upload-Length": "1024", "Upload-Metadata": "ZmlsZW5hbWUgdGVzdC5wZGY=" },
    });
    expect(create.status).toBe(201);
    const location = create.headers.get("Location");
    expect(location).toMatch(/\/uploads\//);

    const patch = await fetch(`http://localhost${location}`, {
      method: "PATCH",
      headers: { "Upload-Offset": "0" },
      body: new Uint8Array(10),
    });
    expect(patch.status).toBe(204);
  });
});

describe("export preview", () => {
  it("orders sections Chapters 1-9, then Annexes 1-8, then jurisdiction appendices", async () => {
    const res = await fetch(`${BASE}/documents/current/export/preview`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const kinds = body.sections.map((s: { kind: string }) => s.kind);
    const firstAnnexIndex = kinds.indexOf("annex");
    const firstAppendixIndex = kinds.indexOf("appendices");
    expect(kinds.slice(0, 9)).toEqual(Array(9).fill("chapter"));
    expect(firstAnnexIndex).toBe(9);
    expect(firstAppendixIndex).toBeGreaterThan(firstAnnexIndex);
    expect(body.coverPage.manufacturerName).toBe("Danadams Pharmaceutical Ind. Ltd");
  });

  it("PDF export responds 501 — not implemented by the mock, by design", async () => {
    const res = await fetch(`${BASE}/documents/current/export/pdf`, { method: "POST" });
    expect(res.status).toBe(501);
  });
});

describe("FR-SMF-07: due for review", () => {
  it("is not due by default — the seeded next review date is years out", async () => {
    const res = await fetch(`${BASE}/documents/current`);
    const body = await res.json();
    expect(body.dueForReview).toEqual({ isDue: false, reason: null });
  });

  it("flag-due-for-review sets the on-demand flag, reason major_change", async () => {
    const flagRes = await fetch(`${BASE}/documents/current/flag-due-for-review`, { method: "POST" });
    expect(flagRes.status).toBe(200);
    const flagged = await flagRes.json();
    expect(flagged.dueForReview).toEqual({ isDue: true, reason: "major_change" });

    const res = await fetch(`${BASE}/documents/current`);
    const body = await res.json();
    expect(body.dueForReview).toEqual({ isDue: true, reason: "major_change" });
  });

  it("refuses to flag a historical/approved edition, only the current working document", async () => {
    const res = await fetch(`${BASE}/documents/1/flag-due-for-review`, { method: "POST" });
    expect(res.status).toBe(422);
  });

  it("clears the manual flag automatically when the document is next approved", async () => {
    await fetch(`${BASE}/documents/current/flag-due-for-review`, { method: "POST" });
    db.document.status = "qa_review"; // arrange: bypass the completion gate, same pattern as the workflow tests above
    const approveRes = await fetch(`${BASE}/documents/current/qa-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "If-Match": db.document.revision },
      body: JSON.stringify({ decision: "approve" }),
    });
    const approved = await approveRes.json();
    expect(approved.dueForReview).toEqual({ isDue: false, reason: null });
  });
});

describe("jurisdiction appendix files (FR-SMF-15/16)", () => {
  it("starts with no files attached to any Ghana appendix", async () => {
    const res = await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-location-plan`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toEqual([]);
  });

  it("saves a file list with a matching revision, and rejects a stale one", async () => {
    const get = await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-location-plan`);
    const before = await get.json();

    const put = await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-location-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": before.revision },
      body: JSON.stringify({ files: [{ name: "site-map.pdf", size: "210 KB" }] }),
    });
    expect(put.status).toBe(200);
    const after = await put.json();
    expect(after.files).toEqual([{ name: "site-map.pdf", size: "210 KB" }]);

    const stale = await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-location-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": before.revision },
      body: JSON.stringify({ files: [] }),
    });
    expect(stale.status).toBe(409);
  });

  it("saving one appendix's files never touches the document or a chapter's revision", async () => {
    const docBefore = db.document.revision;
    const chapterBefore = db.chapters["1.1"]!.revision;

    const get = await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-environmental-permit`);
    const before = await get.json();
    await fetch(`${BASE}/documents/current/jurisdiction-appendices/gh-environmental-permit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": before.revision },
      body: JSON.stringify({ files: [{ name: "epa-clearance.pdf", size: "90 KB" }] }),
    });

    expect(db.document.revision).toBe(docBefore);
    expect(db.chapters["1.1"]!.revision).toBe(chapterBefore);
  });
});
