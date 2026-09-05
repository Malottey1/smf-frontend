# Functional Specification — SMF Digitization Module, Phase 1

Referencing every FR-SMF ID from `SMF_Frontend_URS_Phase1.docx` Sections
7–9, per Section 12's deliverable expectations. This document is the
traceability matrix in narrative form: for each requirement, what it
says, what implements it, and what test proves it. `DECISIONS.md` records
*why* things were built the way they were; this document records *what
satisfies what*, for an auditor or a validation package to check off.

Priorities (Must/Should/Could) are copied verbatim from the URS.

## Traceability matrix

| FR ID | Priority | Status | Verified by |
|---|---|---|---|
| FR-SMF-01 | Must | Built | `e2e/FR-SMF-01.spec.ts` |
| FR-SMF-02 | Must | Built | `e2e/FR-SMF-02.spec.ts` |
| FR-SMF-03 | Must | Built | `e2e/FR-SMF-03.spec.ts` |
| FR-SMF-04 | Must | Built | `e2e/FR-SMF-04.spec.ts` |
| FR-SMF-05 | Must | Built | `e2e/FR-SMF-05.spec.ts` |
| FR-SMF-06 | Must | Built | `e2e/FR-SMF-06.spec.ts` |
| FR-SMF-07 | Should | Built | `e2e/FR-SMF-07.spec.ts` (on-demand trigger, live) + `src/mocks/dueForReview.test.ts` (date-based math, deterministic) |
| FR-SMF-08 | Must | Built | `e2e/FR-SMF-08.spec.ts` |
| FR-SMF-09 | Must | Built | `e2e/FR-SMF-09.spec.ts` |
| FR-SMF-10 | Must | Built | `e2e/FR-SMF-10.spec.ts` |
| FR-SMF-11 | Must | Built | `e2e/FR-SMF-11.spec.ts` |
| FR-SMF-12 | Should | Built | `e2e/FR-SMF-12.spec.ts` |
| FR-SMF-13 | Could | Built | `e2e/FR-SMF-13.spec.ts` |
| FR-SMF-14 | Must | Built | `e2e/FR-SMF-14.spec.ts` |
| FR-SMF-15 | Should | Built | `e2e/FR-SMF-15.spec.ts` |
| FR-SMF-16 | Must | Built | `e2e/FR-SMF-16.spec.ts` |

All 16 requirements are built. 32 Playwright tests + 6 Vitest date-logic
tests + 15 MSW handler tests + 5 API client tests = 58 automated checks
across the suite, 0 skipped.

---

## FR-SMF-01 — Chapter structure

> System shall present the SMF as 9 chapters matching WHO TRS 961 Annex
> 14 structure exactly, each independently navigable and saveable.

**Acceptance:** All 9 chapters + sub-clauses render as separate form
sections matching Section 4 of the URS.

**Implementation:** `schema/template.json` transcribes URS Section 4
field-by-field (82 fields, 24 sub-clauses, 9 chapters), validated against
`schema/template.schema.ts` (Zod) by `scripts/validate-template.ts`.
`src/smf/DocumentNav.tsx` lists all 9 chapters; `src/smf/ChapterPanel.tsx`
renders one chapter's sub-clauses and fields at a time, generically from
the schema — nine chapters is configuration, not nine components.

## FR-SMF-02 — Independent saving, live completion

> System shall allow each chapter/sub-clause to be saved as draft
> independently, with an overall completion percentage shown at document
> level.

**Acceptance:** Completion % recalculates live; partial save on one
chapter does not affect others.

**Implementation:** `src/smf/completion.ts` computes completion
excluding conditional fields whose condition is currently false —
computed once, server-side, in `src/mocks/handlers.ts`'s
`completionFor()`, and read by the client rather than duplicated
(`DECISIONS.md` §19). `src/smf/useChapterAutosave.ts` saves at the real
sub-clause grain the API models (`PUT /chapters/{ref}` keyed by WHO
sub-clause, e.g. `"4.1.2"`), batched only within the sub-clause being
edited — editing 1.1 and 4.1.2 fires two independent writes, not one.

## FR-SMF-03 — Independent annex dating

> System shall allow each Annex (1-8) to carry its own independent
> effective date, distinct from the parent SMF document's effective
> date.

**Acceptance:** Updating Annex 6 alone does not require re-versioning
Chapters 1-9.

**Implementation:** `openapi/smf-api.yaml`'s `Annex` schema and
`PUT /annexes/{annexId}` endpoint; `src/mocks/handlers.ts` never touches
`db.document.revision` or any chapter's revision on an annex write.
`src/smf/useAnnexesAutosave.ts` / `AnnexesPanel.tsx` on the client.

## FR-SMF-04 — Edition number, effective date, next review date

> System shall assign the SMF document an edition number, effective
> date, and next-review date at document level, auto-incrementing
> edition on each approved revision.

**Acceptance:** Edition number increments only on QA-approved
submission, never on draft save.

**Implementation:** `db.document.editionNumber` only changes inside the
`approve` branch of `POST /qa-review` in `src/mocks/handlers.ts`; every
chapter/annex `PUT` handler is provably silent on it. `nextReviewDate` is
computed from `effectiveDate + jurisdictionProfile.reviewIntervalMonths`
(`addMonths()`), sourced from `template.json`'s Ghana profile, with its
own `reviewIntervalProvenance` field (`DECISIONS.md` §10) since the
interval itself is the URS-wide default, not Ghana-specific.

## FR-SMF-05 — QA routing, reject with comments

> System shall route a submitted SMF to the Facility QA Reviewer for
> approval, with reject-with-comments capability returning it to draft.

**Acceptance:** Rejected submission shows reviewer comments to the
Factory User; status reverts to Draft.

**Implementation:** `POST /qa-review` with `decision: "reject"` requires
at least one `{chapterRef, text}` comment (422 otherwise), stores them in
`db.comments`, sets status back to `draft`. `src/smf/ChapterPanel.tsx`
renders a comment banner scoped to the specific chapter it's anchored
to — not a document-level message a Factory User has to hunt through
every chapter to find, which is the exact failure mode the original
brief named as the point of getting this right.

## FR-SMF-06 — Immutable versioning

> System shall version the SMF immutably: each QA-approved submission
> creates a new read-only version; prior versions remain retrievable.

**Acceptance:** Editing after approval creates a new draft version;
approved version remains accessible unchanged.

**Implementation:** `db.editionSnapshots[N]` is a deep clone
(`structuredClone`) of every chapter and annex, captured at the moment of
approval, keyed by the new edition number — the live `db.chapters`/
`db.annexes` continue mutating as the next working draft, but the
snapshot never does. `src/smf/DocumentNav.tsx`'s view switch
("Latest approved edition" / "Historical editions") reads from these
frozen snapshots; read-only rendering is a `mode` distinction in
`FieldValue.tsx` versus `FieldInput.tsx`, not a disabled-input hack.

## FR-SMF-07 — Due for review

> System shall flag the SMF "Due for Review" at a configurable interval
> (default 2 years) from the last effective date, or on demand when a
> major facility change is logged elsewhere in the platform.

**Acceptance:** Notification sent to the Facility QA Reviewer when the
due date approaches or a major change is logged.

**Implementation:** `src/mocks/dueForReview.ts`'s `computeDueForReview()`
is a pure function of `(nextReviewDate, manualFlag, now)` — deterministic
and unit-testable independent of the real wall clock, which matters
because the seed's real next-review date is roughly a year and a half out
from any day this is actually run. The on-demand trigger
(`POST /flag-due-for-review`) stands in for a call a future Equipment
module would make (out of scope this phase); it's presented in
`src/smf/EditionHistoryPanel.tsx` labelled explicitly as a simulation of
that external trigger, not as the real mechanism. The flag clears
automatically on the next approval — approving a new edition *is* the
review the flag was requesting. "Notification to the QA Reviewer" is
represented as a persistent, unmissable banner
(`DocumentStatus.tsx`'s `DueForReviewFlag`) rather than a real
email/push, since no notification infrastructure exists in this phase —
see `DECISIONS.md` for the honest limits of that representation.

## FR-SMF-08 — Inspector access, edition history

> System shall make the current approved SMF version visible read-only
> to assigned Ghana FDA Inspectors without a separate request.

**Acceptance:** Inspector role sees the SMF tab pre-populated with the
latest approved version and edition history.

**Implementation:** `src/App.tsx`'s role switcher (demo-only — no real
auth exists in this phase) drives `SMFModule.tsx`'s `allowDraftView`,
which forces `viewMode` away from `"current"` the moment the Inspector
persona is selected, derived rather than effect-corrected so there's no
one-frame flash of editable draft content. `src/smf/EditionHistoryPanel.tsx`
lists every approved edition and lets any two be diffed via
`GET /editions/{a}/diff/{b}`, read through `useEditionDiff` — the
comparison is computed server-side, not recomputed in the browser.

## FR-SMF-09 — WHO section order

> System shall generate a single exportable SMF document (PDF/A) that
> reproduces the WHO Annex 14 appendix structure and section order
> exactly (Chapters 1-9, then Annexes 1-8).

**Acceptance:** Exported PDF section order and headings match URS
Section 4 verbatim.

**Implementation:** `src/smf/export/buildExportHTML.ts` emits sections in
`template.json`'s own array order — Chapters 1-9, then Annexes 1-8, then
jurisdiction appendices — with no code path that could reorder them.
Real server-side PDF/A generation is explicitly out of scope for this
frontend deliverable (`openapi/smf-api.yaml`'s `/export/pdf` returns 501
by design); this client-side preview, laid out with the real Paged.js
engine, is the reference the eventual server-side renderer must match.

## FR-SMF-10 — Cover page

> Exported PDF shall include a cover page showing manufacturer name, site
> address, edition number, effective date, and next review date.

**Acceptance:** Cover page fields populate from document-level metadata
(FR-SMF-04).

**Implementation:** `buildExportHTML.ts`'s cover section reads directly
from the `SmfDocument` API response's `manufacturerName`, `siteAddress`,
`editionNumber`, `effectiveDate`, `nextReviewDate` — the same fields
FR-SMF-04 populates, not a separately-maintained copy.

## FR-SMF-11 — Table of contents

> Exported PDF shall include an auto-generated table of contents with
> page numbers.

**Acceptance:** TOC entries link to the correct page in the generated
PDF.

**Implementation:** `src/smf/export/print.css`'s
`.toc-entry::after { content: target-counter(attr(href), page); }` — a
real CSS Generated Content for Paged Media rule, not a hand-computed page
number. Paged.js rewrites it at layout time into a browser-native
`counter()` tied to the actual rendered page. Every `href` resolves to a
real anchor in the rendered output.

## FR-SMF-12 — Inline diagrams over narrative text

> System shall favor rendering of uploaded diagrams/layouts/schematics
> over narrative text wherever a WHO chapter calls for a plan, layout, or
> schematic.

**Acceptance:** Chapters 4.1, 4.1.2, Annexes 5-7 render uploaded
images/PDFs inline in the export, not as text descriptions.

**Implementation:** `src/smf/export/formatForExport.ts`'s
`isInlineImageField()` flags exactly the fields under those refs/annexes,
rendered via `.doc-image-frame` (a large placeholder frame) versus every
other upload's `.doc-file-ref` (a small text reference). Real image bytes
aren't available in this preview — uploads here are metadata-only
(filename/size) — so the frame shows a placeholder glyph and caption
rather than a thumbnail; this is the one place the reference preview
cannot fully stand in for the real server-side renderer, which must
render actual uploaded content.

## FR-SMF-13 — Page-count advisory

> System shall display a non-blocking page-count advisory when the
> generated export (main body, excluding appendices) exceeds
> approximately 25-30 A4 pages.

**Acceptance:** Advisory banner appears in export preview; does not
block export or submission.

**Implementation:** `src/smf/export/ExportPreview.tsx` places an empty
`#body-end-marker` between Chapter 9 and Annex 1 in the generated source,
then finds which real `.pagedjs_page` it lands on after layout — an
honest count, not an estimate. The current seed data stays under the
threshold, so the banner doesn't visibly fire in the demo; the logic was
verified by temporarily lowering the threshold during development, not
left in the shipped code as a fake trigger. The "Download PDF/A" control
is present regardless of page count, proving the advisory never gates it.

## FR-SMF-14 — Fixed appendix order

> System shall append all uploaded Annexes (1-8) and, where enabled for
> Ghana, the Ghana FDA supplementary appendices, as a final section of
> the exported PDF in a fixed, labelled order.

**Acceptance:** Exported PDF appendix section lists each annex under its
label (Annex 1, Annex 2, ...) in fixed order.

**Implementation:** Same generator as FR-SMF-09 — annexes render under
`Annex {number}` labels in `template.json`'s array order, followed by a
single Ghana appendices section that is always the last thing emitted.

## FR-SMF-15 — Ghana appendices section

> System shall provide an optional "Ghana FDA Supplementary Appendices"
> section allowing upload of Location Plan, Floor Plans/P&ID prints,
> Environmental Permit, and Assembly Permit, appended after the WHO
> Annexes in the export.

**Acceptance:** Section only shown when facility jurisdiction = Ghana;
uploads appear in the export appendix list.

**Implementation:** `src/smf/JurisdictionPanel.tsx` renders
`template.json`'s active `jurisdictionProfile.supplementaryAppendices`
(4 for Ghana) — a different jurisdiction profile with different
appendices would render different cards with no code change. Files are
wired to a real resource
(`GET`/`PUT /jurisdiction-appendices/{appendixId}`, added specifically to
close this gap — see `DECISIONS.md` §19/§23) via
`useJurisdictionAppendicesAutosave.ts`, with the same optimistic-write +
409-conflict pattern as annexes and chapters, not local component state.

## FR-SMF-16 — Advisory only, never blocking

> System shall NOT hard-validate the Ghana FDA supplementary appendix
> list as mandatory field-level blockers until confirmed against Ghana
> FDA's official published guidance.

**Acceptance:** No submission is blocked solely for a missing
Ghana-specific appendix in Phase 1; treated as an advisory checklist
only.

**Implementation:** Each appendix in `template.json` carries
`mandatory: false`, `blocksSubmission: false` — the Zod meta-schema
(`schema/template.schema.ts`) enforces `blocksSubmission` as a
`z.literal(false)`, so a future schema author cannot accidentally flip it
to `true` without changing the schema's type itself. `POST /submit`'s
100%-completion gate in `src/mocks/handlers.ts` is computed purely from
chapter field completion — jurisdiction appendices are never part of
that calculation.

---

## Non-functional requirements (URS Section 10)

Audit trail, e-signature, access control, data retention, and backup are
explicitly inherited from the platform-wide specification with "no
SMF-specific exceptions" per the URS itself — there is nothing
SMF-specific for this deliverable to build. `openapi/smf-api.yaml`'s
`bearerAuth` security scheme is a documented placeholder for the real
platform auth this module will plug into later.

## Out of scope (URS Section 11)

VMP module, automated cross-module validation, multi-language content,
and hard-blocking Ghana appendix validation are all correctly absent.

## Remaining deliverable expectations (URS Section 12)

- ✅ Test cases mapped to acceptance criteria, feeding the traceability
  matrix — this document plus the FR-named Playwright suite.
- ✅ This Functional Specification, referencing every FR-SMF ID.
- ❌ *"A sample WHO-format export (PDF) reviewed and signed off by QA."*
  Not produced. A real PDF/A requires the backend's server-side renderer
  (explicitly out of scope for this frontend), and sign-off requires a
  human QA reviewer — neither is something this deliverable can produce
  on its own. `src/smf/export/` is the reference implementation that
  renderer must match once it exists.
