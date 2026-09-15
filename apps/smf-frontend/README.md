# SMF Digitization Module — Phase 1 (Frontend)

Frontend implementation of the Site Master File (SMF) digitization module
described in `SMF_Frontend_URS_Phase1.docx`, built to match the visual
language of `gxp-console-mockup.html` (the platform's Deviation Report /
Batch Manufacturing Record reference). There is no backend yet — this
repo defines the API contract the backend team will implement against
and mocks it with MSW so the app is fully runnable today.

**All 16 FR-SMF requirements are built.** See `FUNCTIONAL_SPECIFICATION.md`
for the full traceability matrix (requirement → implementation → test),
and `DECISIONS.md` for the dated history of every judgment call and why.

## Status

- [x] `schema/template.json` + `schema/template.schema.ts` — WHO TRS 961
      Annex 14 structure transcribed from URS Section 4, Zod-validated
- [x] `openapi/smf-api.yaml` — API contract, lints clean
- [x] `src/design-system/tokens.css` + `tokens.ts` — extracted from the
      mockup's source, not eyeballed
- [x] `src/shell/` — rail, top bar, panel, stepper, sidebar cards, ported
      from the mockup
- [x] `src/smf/` — the schema-driven chapter renderer (all 9 chapters),
      document nav + status/edition block, read-only/historical modes,
      workflow with clause-anchored rejection comments, edition history,
      independently-dated annex cards, Ghana's advisory appendices
- [x] `src/smf/export/` — WHO-format export preview, real Paged.js
      pagination (not an estimate)
- [x] `src/mocks/` — MSW handlers implementing the full OpenAPI spec
- [x] `src/api/` — TanStack Query wired end-to-end: every read is a query,
      every write is a mutation with real optimistic-concurrency handling
      and a working 409 conflict-resolution UI (`ConflictBanner`)
- [x] `e2e/` — Playwright suite named by FR ID — **32 tests, all passing,
      0 skipped.** Drives the real rendered UI in a real browser, which
      found and fixed 4 real bugs (see DECISIONS.md §20) that nothing at
      the type/bundler/mock-client layer could have caught
- [x] Inspector view (FR-SMF-08) — a role switcher (demo-only, no real
      auth) that locks the Inspector persona out of ever seeing a draft,
      plus real edition-to-edition field diffing (`EditionHistoryPanel.tsx`)
      against the OpenAPI spec's diff endpoint — see DECISIONS.md §21
- [x] FR-SMF-07 (due for review) — on-demand flagging is live and
      end-to-end tested; the date-based trigger's math is deterministic
      and Vitest-tested separately, since the seed's real review date is
      too far out for a live browser test to exercise it — see
      DECISIONS.md §23
- [x] Ghana appendix uploads wired to a real resource
      (`GET`/`PUT /jurisdiction-appendices/{appendixId}`) — see
      DECISIONS.md §23
- [x] `FUNCTIONAL_SPECIFICATION.md` — one entry per FR-SMF ID with
      requirement text, acceptance criteria, implementation, and
      verifying test, per URS Section 12

**Not a gap in what was asked for** — two things adjacent to "requirements"
that are genuinely still open:
- Chapter ownership/assignment: proposed by me as a scope addition early
  on, deferred to my judgment, modeled in the API contract (`ownerId`),
  no assignment UI built. Still undecided if you want it.
- URS Section 12's *"sample WHO-format export (PDF) reviewed and signed
  off by QA"* — not producible by this deliverable: real PDF/A generation
  is the backend's job (explicitly out of scope here), and sign-off
  requires a human QA reviewer. See `FUNCTIONAL_SPECIFICATION.md`'s
  closing note.

## Setup

```bash
npm install
npm run dev                 # Vite dev server; starts the MSW browser worker automatically
npm test                    # Vitest — MSW handlers + due-for-review date logic + API client (26 tests)
npm run test:e2e             # Playwright — one spec per FR ID, 32 tests (starts the dev server itself)
npm run validate:template   # Zod + cross-reference validation of template.json
npm run build                # production build (ExportPreview code-split; MSW excluded)
```

Fonts: `tokens.css` expects self-hosted IBM Plex `.woff2` files under
`public/fonts/` that aren't checked into this repo — see
`public/fonts/README.md` for what to add. The app runs fine without them
(falls back to system sans-serif); it just isn't pixel-faithful to the
mockup's type until they land.

## What the backend team needs to build

`openapi/smf-api.yaml` is the contract; `src/mocks/handlers.ts` is a
faithful reference implementation of it (same shapes, same status codes,
same concurrency semantics) — read the handlers if a corner of the spec
is ambiguous in prose. Key points that aren't obvious from reading
endpoint-by-endpoint:

- **Optimistic concurrency is mandatory, not optional.** Every mutable
  resource carries a `revision` token; writes send it via `If-Match` and
  get a `409` with the current server state on conflict. A
  silently-overwritten field in a GMP document is an audit finding.
- **Chapters are keyed by WHO sub-clause ref** (e.g. `"4.1.2"`, not
  `"4"`), matching FR-SMF-02's "each chapter/sub-clause saved
  independently." The frontend shows one save indicator per whole chapter
  panel (matching the mockup's per-record pattern) but actually issues one
  `PUT` per touched sub-clause underneath — see DECISIONS.md §19 for how
  `useChapterAutosave` reconciles the two.
- **Chapters and annexes version independently.** Saving Annex 6 must not
  touch the parent document's `revision`, `editionNumber`, or any other
  chapter's `revision` — `handlers.test.ts` asserts this directly. The
  same independence now holds for jurisdiction appendix files.
- **`DocumentStatus` has three values, not four** (`draft`, `qa_review`,
  `approved`) — an earlier draft of the spec had a `submitted` state no
  endpoint could ever produce; see DECISIONS.md §18.
- **`SmfDocument.dueForReview`** combines a date-based trigger (computed
  from `nextReviewDate`, no action needed) and an on-demand one
  (`POST /flag-due-for-review`, meant to be called by whichever future
  module logs a major facility change) — see `dueForReview.ts` and
  DECISIONS.md §23 for exactly how they combine and clear.
- **File uploads must speak tus** (resumable, chunked) in production — the
  Ghana Floor Plans appendix includes A2/A3 P&ID/CAD exports. MSW mocks a
  simplified single-shot upload for developer convenience only; that
  shortcut is explicitly not part of the contract.
- **The export preview endpoint's section order is normative.** Chapters
  1–9, then Annexes 1–8, then jurisdiction-specific appendices, always in
  that fixed order — `src/smf/export/` renders this with Paged.js as the
  reference layout; the real PDF/A renderer must match section order and
  content (not necessarily identical pagination), and must render
  uploaded images/PDFs inline for real, not as the placeholder frame this
  preview uses (no real file bytes exist in this mock).
- **Ghana appendices are advisory, never validation blockers**, per
  FR-SMF-16 — don't add server-side "required" enforcement for them.

## Reference standard

WHO Technical Report Series No. 961 (2011), Annex 14 — every field in
`template.json` carries a `whoCitation` back to this standard so QA can
diff the schema against the standard directly.

## Decisions and open questions

See `DECISIONS.md` — the full history of what was extracted from the
mockup vs. extended for SMF, every judgment call and why, and the
still-open items (annex/chapter document-duplication model, chapter
ownership scope). See `FUNCTIONAL_SPECIFICATION.md` for the
requirement-by-requirement traceability matrix.
