# Architectural & Regulatory Decisions

Living record for the eventual validation package. Each entry: decision,
reasoning, and what would need to change if the assumption turns out wrong.

## Status of this document

Phase 1, checkpoint 1: `schema/template.json`, `schema/template.schema.ts`,
and `openapi/smf-api.yaml` are drafted and structurally validated, but not
yet reviewed by the user. Everything below is subject to that review.
Several items are explicitly flagged as **assumptions needing confirmation**
rather than settled decisions — see the "Open questions" section at the end.

## 1. Stack

Adopted the proposed stack as-is: React 18 + TypeScript strict + Vite,
TanStack Router/Query, React Hook Form + Zod, MSW, shadcn/ui + Radix +
Tailwind, TanStack Table, TipTap (locked schema), paged.js, react-i18next
(English only for now), Vitest + Playwright.

**Why:** No existing platform shell exists (confirmed with user), so there
was no competing stack to reconcile with. The reasoning in the brief for
each choice (SPA over SSR to keep GxP validation scope small; RHF
uncontrolled inputs for 60-field-form performance; shadcn's copy-into-repo
model for validation-package ownership of component source) all held up
under review — no changes made.

## 2. Ownership of the API contract

The frontend team (this repo) owns `openapi/smf-api.yaml` and
`schema/template.json`. No backend spec existed prior to this work.
Confirmed directly with the user.

**How to apply:** Treat both files as the specification, not scaffolding.
Backend implementers should be pointed at them, not at MSW handler code
(MSW mirrors the spec; the spec is the source of truth).

## 3. Visual identity

User supplied a candidate brand ("AuraQMS": Clinical Cobalt / Electric Mint
/ Deep Obsidian Blue / Clean Slate palette, Plus Jakarta Sans headings +
Inter body, glassmorphism marketing treatment), with the explicit condition
"if this does not contradict the requirements ... use it."

**Adopted:** the color palette and the typography matrix. Clinical Cobalt
(#1A56DB) as the primary action/trust color; Electric Mint (#10B981)
reserved *specifically* for "Approved / Compliant" status — this satisfies
the brief's own instruction to "spend boldness in one place, probably the
document status and edition indicator." Inter for body copy, form fields,
and dense data tables (tall x-height suits timestamps/audit data); Plus
Jakarta Sans for headings and structural (chapter/clause) hierarchy — two
typefaces, clearly distinct, per the brief's own constraint.

**Declined:** glassmorphism, gradient washes, macro-photography marketing
imagery, "fluid precision" positioning language. This is dense authoring
software for QA professionals migrating off Word, not a marketing site —
the brief itself explicitly instructs against "soft grey shadows, gradient
washes" and states "the design job is legibility and trust, not delight."
Applying the full AuraQMS marketing identity would have directly
contradicted the brief that proposed sourcing a brand from it, so the
palette/type were kept and the marketing surface treatment was not.

## 4. Collaborative authoring / chapter ownership

The brief proposed adding a `chapter_owner` / per-chapter-assignment
concept beyond the URS's single Factory User role, explicitly flagged as a
scope addition requiring approval. Asked the user directly; they had not
seen that section of the brief and delegated the call.

**Decision:** model it in the contract now, defer the UI. `ChapterContent`
in the OpenAPI spec carries an optional, nullable `ownerId`. This is cheap
to add now and expensive to retrofit (a new required field on every
chapter's storage shape), but building assignment UI is real scope the URS
never asked for. Phase 1 UI will not build an assignment workflow; that's
a candidate for a follow-up URS addendum if the user wants it built out.

## 5. Annex data model: chapters keep their literal file-upload fields; annexes wrap them with independent dating

URS Section 4 literally lists rows like "Current GMP certificate | File
upload | Links to Annex 3" — i.e., several WHO annexes correspond 1:1 to a
file-upload (or table) field that also appears inline in a chapter. But
FR-SMF-03 requires each annex to carry "its own independent effective
date, distinct from the parent SMF document's effective date," and
updating an annex must not force re-versioning of Chapters 1-9.

**Decision:** the chapter keeps the literal field from URS Section 4 as a
normal chapter field (so the chapter reads standalone, and completion % /
FR-SMF-02 accounting works per chapter without cross-referencing annex
state). The Annex entity (`schema/template.json` → `annexes[]`) is a
separate first-class object carrying its own `effectiveDate` and
`independentDating: true`, with `sourceFieldId` pointing back at the
chapter field that supplies its content, and `linkedFromRefs` pointing
forward from the chapter ref. The API models this the same way: `PUT
/annexes/{annexId}` is a distinct endpoint from `PUT
/chapters/{chapterRef}`, with its own revision token, so saving one never
touches the other's revision or the parent document's edition number.

Two annexes (Annex 2 — dosage form list, used as the `optionsSource` for
two chapter multiSelect fields) has no `sourceFieldId` at all — it's edited
directly as its own standalone table, since URS Section 4 doesn't list it
as a chapter-level input; chapters just consume it as a dropdown source.

**Flagged as an assumption** — see Open Questions below — because the URS
doesn't say explicitly whether the chapter-level upload and the annex are
the same document with dual metadata, or genuinely two separate uploads a
user must maintain in sync. This design assumes the former (single
document, dual-dated wrapper) since maintaining two copies of the same GMP
certificate in two places is an obvious audit-finding risk.

## 6. Implicit conditional fields given an explicit gating field

Several URS rows say "Conditional" or "Required if X" without X being
represented by any other field in the table (e.g. "Arrangements between
multiple Authorized Persons (if applicable)" — conditional on nothing
else in the table). FR-SMF-02's acceptance criteria requires completion %
to correctly exclude conditional fields from the denominator when their
condition is false, which requires an actual boolean/enum field to test.

**Decision:** added a small Yes/No dropdown gating field immediately
before each such conditional field (e.g. `hasMultipleAuthorizedPersons`,
`hasInspectionHistory`, `hasAccreditations`, `hasContractManufacturers`,
`usesOffsiteArchive`, `manufacturesIMPs`). Each is marked
`derivedGatingField: true` and carries a `note` explaining which URS row
it exists to gate, so it's auditable against the URS during QA review of
the schema itself. 6 such fields were added across 82 total fields.

**Why not model conditionals as free-text expressions instead:** a
gating field the user actually answers is auditable (an inspector can see
"the user said No, therefore this section was correctly skipped");
a hidden heuristic like "non-empty text implies applicable" is not.

## 7. Water system grade: dropdown + always-visible detail field, not dropdown+text-only-on-"Other"

URS lists 4.1.2 as "Dropdown + text" without further qualification.
Modeled as `waterSystemGrade` (required dropdown) plus
`waterSystemGradeDetails` (optional free text, help text notes it's
required if "Other" is selected). This keeps the detail field useful even
when a standard grade is selected (e.g. loop configuration detail) rather
than treating text as an error path only reachable via "Other."

## 8. Site identification "at least one required": single mapPicker field, not three parallel fields

URS: "GPS coordinates, D-U-N-S number, or other geolocation reference ...
at least one identifier required." Modeled as one `mapPicker` field whose
value shape holds all three identifier slots plus a schema-level
`validation.atLeastOneOf` constraint, rather than three separate fields
each individually optional (which can't express "at least one of these
three" as a per-field `required` flag). The map-picker UI is expected to
offer manual GPS/DUNS/other text entry as an alternative to clicking a
map, not just a map widget.

## 9. Ghana appendices: advisory-only, never blocking, per FR-SMF-16

`jurisdictionProfiles[].supplementaryAppendices[]` fields are hardcoded
`mandatory: false` and `blocksSubmission: false` (the Zod meta-schema
enforces `blocksSubmission` as a `z.literal(false)` — an author cannot
accidentally flip this to `true` without changing the schema itself).
Each appendix carries a `provenance` string citing the URS §6 caveat.

## 10. Jurisdiction review interval on the Ghana profile

`reviewIntervalMonths: 24` on the Ghana profile is the URS-wide default
(FR-SMF-07: "configurable interval, default 2 years"), not a
Ghana-FDA-specific figure — no Ghana-specific interval has been sourced.
Recorded via `reviewIntervalProvenance` on the profile itself so a
regulatory analyst adding a real Ghana-specific interval later can find
and override it without archaeology.

---

## Open questions (need explicit confirmation, not proceeding on guesses)

1. **Annex duplication model (§5 above).** Confirm: is a chapter's
   file-upload field (e.g. GMP certificate) meant to be the *same document*
   as its Annex, just with independent dating layered on — or are these
   genuinely two independent uploads a user maintains separately? The
   current design assumes the former.
2. **`hasInspectionHistory` etc. — are the invented gating fields
   acceptable**, or should "conditional with no stated trigger" instead be
   treated as "always optional, no denominator exclusion logic needed"?
   The gating-field approach was chosen because it's the only way to
   satisfy FR-SMF-02's acceptance criteria literally, but it does add 6
   fields to the URS's literal Section 4 table that aren't transcribed
   from any row.
3. **Chapter ownership (`ownerId`)** — confirm the "model now, build UI
   later" split (§4) is the right level of commitment, versus removing it
   entirely from the contract until a URS revision explicitly asks for it.

---

## Checkpoint 2: design system superseded by gxp-console-mockup.html

Everything in this section supersedes §3 ("Visual identity") above. A
reference mockup of two sibling platform modules (Deviation Report, Batch
Manufacturing Record) was provided as the design authority — an existing
project design system takes precedence over an improvised one, so the
AuraQMS-derived palette/type in §3 is retired. The SMF module now targets
pixel fidelity with this mockup, extended only where the URS forces it
(a document of nine chapters + eight annexes cannot be one scrolling
form, which the mockup's two record types never had to solve).

### 11. Tokens extracted from source, not from the user's paraphrase

The user's brief restated the mockup's palette and a few structural values
(radii, rail/sidebar widths) from memory. Both were cross-checked directly
against `gxp-console-mockup.html`'s `<style>` block rather than trusted
as given, per "take the values from the source." The 12 named `:root`
colors matched exactly. Two things did not match the paraphrase:

- **Radii are not uniformly "6px controls / 8px panels."** The source has
  `.badge-role` at `5px` and `.pill` at `20px` (fully rounded), distinct
  from the general control radius. `tokens.css` keeps four separate radius
  tokens (`--radius-control`, `--radius-panel`, `--radius-badge`,
  `--radius-pill`) rather than flattening to two, so nothing in component
  code silently rounds a badge or pill to the wrong corner.
- **The source itself has untokenized hex values** — colors used directly
  in component rules instead of via a `:root` custom property. Nine such
  values were found and promoted into named tokens (`--ink-faint`,
  `--rail-fg`, `--rail-fg-muted`, `--rail-heading`, `--rail-nav-fg`,
  `--rail-nav-active-bg`, `--rail-nav-hover-bg`, `--rail-border`,
  `--avatar-bg`) so the "no hardcoded hex in component code" rule can
  actually hold. The two closest-looking pair — `#8FA3B3` (rail muted
  text, on `--navy-deep`) and `#8B99A3` (hint/timestamp text, on
  `--paper`/`--wash`) — are visually near-identical but numerically
  distinct in source, and are kept as two separate tokens rather than
  merged. Merging them would be exactly the kind of silent fidelity loss
  extraction is supposed to prevent.

Font sizes and weights were deliberately **not** folded into a formal
type-scale token system — the mockup has no such scale, just per-component
px values, so inventing one would be adding structure the source doesn't
have. Each shell component's CSS carries its exact size from source
instead.

### 12. Font self-hosting is real infrastructure, not a checked-in binary

`tokens.css` declares `@font-face` against `/fonts/ibm-plex-sans-latin.woff2`
and `/fonts/ibm-plex-mono-latin.woff2` instead of the mockup's Google Fonts
`@import`. The actual `.woff2` files are not in this commit — this
environment has no network access to fetch the official IBM Plex release,
and a font binary isn't something to fabricate. `public/fonts/README.md`
documents exactly what to add and why. `font-display: swap` means the
missing files fail closed to the system sans-serif stack rather than
breaking anything, so this is safe to merge before the binaries land — but
the module is not pixel-faithful to the mockup's type until they do.

### 13. Facility identity switched to match the mockup's own tenant

Earlier demo work in this session (the schema-review and app-preview
artifacts) invented a fictional manufacturer, "Adom Pharmaceuticals," for
lack of a better reference. The mockup establishes a real demo tenant —
**Danadams Pharmaceutical Ind. Ltd, License GH-MFG-0142, Kumasi** — and
"the same team built it on the same day" means the SMF module should
target the same tenant, not a second fictional one. The rebuilt shell
(`src/App.tsx`) uses Danadams throughout; any SMF demo data built from
here forward should too.

### 14. Shell components are a faithful port, not a redesign

`src/shell/*.tsx` + `src/shell/shell.css` reproduce the mockup's rail,
top bar, tab bar, panel (header/body/actions), stepper, field/pill/upload
primitives, and right-sidebar cards as typed, reusable React components —
same class names, same CSS rules (now referencing tokens instead of hex),
same DOM structure. `src/demo/DeviationReportDemo.tsx` and
`BatchRecordDemo.tsx` rebuild the mockup's own two screens through these
components, specifically so fidelity can be checked by direct comparison
against the source file rather than taken on faith. The published preview
artifact is the actual compiled output of this code (`vite build`, CSS +
JS inlined into one file) — not a parallel hand-written reproduction —
so what's being reviewed is the real component tree.

One extension landed at the CSS level already, ahead of schedule, because
it was cheap and low-risk to add while the stepper component was being
built: a `.step.rejected` / `.step-line.rejected` state (red ring, dashed
line) for FR-SMF-05's reject-with-comments path, which none of the
mockup's forward-only steppers needed. The circle-and-line construction,
teal completion fill, and 22px padding are all unchanged — a rejected
step reads as an interrupted step, not a different component. This is
listed under "keep the shell as a faithful port" rather than under the
SMF divergences (build-order step 8) because it lives entirely inside the
generic `Stepper` component, not in SMF-specific code.

A second small addition: `.field textarea.measure-capped` (`max-width:
72ch`), for the "generous reading measure for rich text" requirement. The
mockup has no rich-text fields to have ever needed this, so it's a pure
addition, applied only where a chapter-level richText field renderer opts
in — the mockup's own two-column short-field grid is untouched.

### 15. Judgment calls made without stopping to ask (flagged here instead)

None of these rose to "the URS and mockup actually conflict" — the brief
had already resolved the load-bearing tensions (tabs vs. nav column,
stepper backward path, read-only redesign, where to spend visual
boldness, annex cards, export preview). These are smaller placement/scope
calls made to keep moving, listed so they're easy to overrule:

- **"Site Master File" added to the rail nav** between "Batch Records" and
  "CAPA" (`src/App.tsx`). The mockup's rail predates this module, so
  something had to be decided; this is ordering by domain adjacency, not
  a confirmed information-architecture decision.
- **Router deferred.** TanStack Router isn't wired up yet — `App.tsx`
  renders the demo shell directly. Real SMF routes
  (`/smf/:editionId/chapter/4.1.2`) don't exist until build-order step 5+,
  so introducing routing now would be scaffolding with nothing real to
  route to.
- **`StatusRowsCard` and `TextCard`** in `src/shell/Sidebar.tsx` generalize
  the mockup's "Data Integrity" and "Batch Genealogy" cards (which are
  each hardcoded to their specific content in the source) into reusable
  shapes — a titled card of label/verified-value rows, and a titled card
  of one help-text paragraph — since both patterns repeat verbatim in the
  mockup's two tabs with only the content changing.

### 16. The renderer is now wired into the real shell, not a parallel demo

`src/smf/` combines the shell components (Checkpoint 2) with real
`template.json` data and the condition/completion logic first proven in
the pre-mockup prototype — reimplemented against the new component
library rather than copy-pasted, since the styling vocabulary changed
completely. The rail's "Site Master File" link is live navigation now
(`src/App.tsx`): selecting it swaps in `SMFModule`, while "Deviations" /
"Batch Records" still show the shell-fidelity demo screens. Same shell,
three different content types, proving the port isn't SMF-specific.

New pieces built to close the gap between "shell that matches the
mockup" and "SMF module":

- **`DocumentNav`** (`src/smf/DocumentNav.tsx`) — the chapter/annex index
  between rail and panel, on `--wash`, with the document status block
  pinned at its top.
- **`DocumentStatus`** — required rethinking the mockup's color rule
  rather than reusing the earlier (pre-mockup) status palette. The
  mockup is explicit that amber/red are reserved for classification and
  problem states, never decoration — so Draft and Historical stay neutral
  ink (a draft isn't a problem), QA Review borrows the same teal-wash/teal
  treatment as `.badge-role` (informational, not an action), and Approved
  is the one state that gets solid teal fill, since the mockup's own
  palette comment literally defines `--teal` as covering "completion." A
  pending rejection shows as a separate small amber flag — that genuinely
  is a problem-state signal, so it's the one place amber appears here.
- **`Stepper` reused for the whole-document workflow** (Draft → Submitted
  → QA Review → Approved) instead of a record-specific sequence — see
  `src/smf/workflow.ts`. A rejection marks the QA Review step "rejected"
  and returns Draft to "current," so the interruption stays visible even
  after work resumes, not just the fact that it's back in Draft.
- **Field-type registry reimplemented for the new shell**
  (`FieldInput.tsx` editable / `FieldValue.tsx` read-only) — all 10
  canonical types, built from the mockup's own form-control vocabulary
  (`.pill` reused for multiSelect chips, `.upload-box` extended with file
  chips, native `input`/`select`/`textarea` for everything else) rather
  than introducing new chrome.
- **Annex cards** (`AnnexesPanel.tsx`) extend the mockup's single
  drop-zone into one card per annex with its own effective date and
  revision field, each independent of the others and of the parent
  document's edition.
- **Guidance card is dynamic** (`SMFSidebar.tsx`) — it quotes the TRS 961
  Annex 14 clause for whichever chapter is open (`seedData.ts` →
  `CHAPTER_GUIDANCE`, one authored sentence per chapter), the same role
  the mockup's Guidance card plays for a single deviation or batch record.

### 17. Export preview: real Paged.js pagination, not an estimate

`src/smf/export/` builds the WHO-format export (FR-SMF-09 through
FR-SMF-14) from the same `template.json` and live document state as the
forms, and lays it out with the real `pagedjs` engine (added as a proper
npm dependency, not a CDN script) rather than approximating a page count.

- **TOC page numbers use CSS `target-counter()`** (`print.css`), which
  Paged.js resolves from the actual rendered layout — they are not
  hand-computed, so they can't drift from where content really lands.
- **The FR-SMF-13 body-page-count advisory is read off the real DOM**,
  not estimated: an empty `#body-end-marker` sits between Chapter 9 and
  Annex 1 in the generated source HTML, and after Paged.js lays
  everything out, `ExportPreview.tsx` finds which rendered `.pagedjs_page`
  that marker landed on. That page's index *is* the main-body page count.
  With the current demo dataset this stays well under the ~25–30 page
  threshold, so the advisory banner won't visibly trigger — the logic is
  real, there just isn't enough seeded content to cross it. Confirmed the
  wiring by lowering the threshold locally during development; not left
  in the shipped code as a fake trigger.
- **Fixed order is enforced structurally, not by convention**: the
  generator function literally emits Cover → TOC → Chapters 1–9 (in
  `template.json`'s own array order) → Annexes 1–8 → Ghana appendices —
  there's no code path that could reorder these per FR-SMF-09/FR-SMF-14.
- **FR-SMF-12 (favor images over text)** is implemented as a distinct
  visual treatment (`.doc-image-frame`, a larger bordered placeholder)
  applied specifically to Chapters 4.1/4.1.2 and Annexes 5–7's file
  fields, versus a small inline text reference (`.doc-file-ref`) used for
  every other upload (GMP certificate, manufacturing authorization, etc.,
  which the URS never calls out for inline rendering). Actual image bytes
  aren't available in this preview — uploads here are metadata-only (see
  Checkpoint 2/3's file-upload notes) — so the frame shows a placeholder
  glyph and filename rather than a real thumbnail. This is the one honest
  gap between this preview and what production must do: the real
  server-side PDF/A renderer this preview is a reference for MUST render
  the actual uploaded image/PDF content inline, not a placeholder.
- **Bundle size**: `pagedjs` is ~500KB minified. `ExportPreview` is
  code-split via `React.lazy()` in the real app
  (`vite.config.ts`/`SMFModule.tsx`) so no other screen pays that cost.
  The Artifact preview link is built from a *separate* config
  (`vite.artifact.config.ts`, `inlineDynamicImports: true`) purely
  because a published Artifact is one static file with no server to fetch
  a second chunk from — this split-vs-single-bundle distinction exists
  only for that preview mechanism and is not how the app actually ships.
- **PDF/A download button is present but disabled**, with a tooltip
  pointing at `openapi/smf-api.yaml`'s `/export/pdf` — server-side PDF/A
  generation is explicitly out of scope for this frontend deliverable,
  and this preview *is* the reference the backend's renderer must match,
  per that spec's description.

### 18. MSW stood up against the OpenAPI spec — with two real fixes along the way

`src/mocks/` implements every path in `openapi/smf-api.yaml` (`handlers.ts`),
backed by an in-memory store seeded from the real `template.json` and
`seedData.ts` (`db.ts`), with separate entry points for the browser
(`browser.ts`, started from `main.tsx` only in dev, dynamically imported
so it's provably absent from the production bundle — confirmed by
inspecting `dist/assets/` after a prod build) and Vitest
(`server.ts`). `handlers.test.ts` exercises the handlers directly through
Node's `fetch` against `setupServer` — 15 tests, all passing — covering
optimistic concurrency (matching revision saves, stale revision → 409
with the real current state), immutable historical editions, the full
approve/reject workflow including edition snapshotting and clause-anchored
comments, independent annex dating (asserts a document/chapter revision
is untouched by an annex save), the tus-lite upload mock, and the export
preview's fixed section order.

Two things had to be fixed to make the mock behave, not just satisfy the
spec's shape:

- **A dead enum value in the spec itself.** `DocumentStatus` listed
  `submitted` as distinct from `qa_review`, but `/submit`'s own
  description says "Draft -> Submitted" while `/qa-review`'s 422 error
  text already assumed the precondition was `qa_review` — no endpoint in
  the spec could ever produce a document actually sitting in `submitted`.
  Implementing the mock faithfully surfaced this rather than let it slide;
  fixed by dropping `submitted` (three states: draft, qa_review, approved)
  and having `/submit` target `qa_review` directly, matching what
  `/qa-review` already assumed. `openapi/smf-api.yaml` re-lints clean.
- **MSW v2's relative-path handlers don't resolve against an origin in
  Node** the way they do against `window.location` in a browser — every
  handler silently failed to match in the Vitest run until `BASE` used
  the documented `*` origin wildcard (`*/api/smf/v1`) instead of a bare
  `/api/smf/v1`. Worth naming because the failure mode is silent in
  exactly the way this whole architecture is trying to avoid elsewhere:
  MSW just reported "no matching handler" for every request rather than
  a type error, and it would have looked identical to a working mock
  that never asserted anything, if I hadn't also required
  `onUnhandledRequest: "error"` in the test setup so an unmatched request
  fails loudly instead of silently falling through.

**A real gap this surfaced, not yet resolved:** the OpenAPI spec's
`chapterRef` path parameter is documented as a WHO sub-clause ref (e.g.
`"4.1.2"`) — matching FR-SMF-02's literal "each chapter/sub-clause saved
independently" — so `db.ts` stores chapter content keyed by sub-clause,
and `PUT /chapters/{chapterRef}` in the mock operates at that grain. The
actual UI (`SMFModule.tsx`) currently saves at a coarser grain: one
debounced "Saving…" indicator per whole chapter panel, matching the
mockup's one-save-button-per-record pattern. Wiring the real app to this
API (still not done — see below) will need to either batch one PUT per
touched sub-clause when a chapter's save fires, or the UI's save unit
needs reconsidering. Flagging now rather than silently picking a
resolution when that wiring work happens.

### 19. Wired to TanStack Query — the §18 granularity question is now resolved, not just flagged

`src/api/` (`types.ts`, `client.ts`, `queryKeys.ts`, `hooks.ts`) is the
only thing app code talks to now; nothing in `src/smf/` imports from
`src/mocks/` except two things that are legitimately about the schema
shape, not the mock (`ChapterPanel.tsx` reads `template.json` directly
for field-label lookups in the conflict banner, `SMFModule.tsx` reads it
for the chapter/annex list — both would read the same file if a real
backend existed). `SMFModule.tsx` no longer holds a single field of
document content in `useState`; the only local state left is client-only
navigation (which chapter/section is open, reject-form draft fields).

**The chapter/sub-clause granularity tension from §18 is resolved, not
worked around.** `useChapterAutosave` (`src/smf/useChapterAutosave.ts`)
fetches every sub-clause of the open chapter as its own query
(`useChapterRefs`, matching the API's real grain) and debounces edits
**per sub-clause**, batching only the fields within one sub-clause into
one `PUT`. `ChapterPanel` still shows one save indicator per chapter
(`"Saving…"` if any sub-clause has a write in flight, else the most
recent `"Auto-saved as draft · HH:MM:SS"`) — so the mockup's one-record-
one-save-bar visual pattern is intact, while FR-SMF-02's "each
chapter/sub-clause saved independently" is real: editing 1.1 and 4.1.2 in
the same debounce window fires two separate `PUT`s against two separate
revisions, not one merged write.

**Optimistic concurrency has a real UI now**, not just a passing test.
`ConflictBanner` (`src/smf/ConflictBanner.tsx`) is generic over any
key/value map, reused for both chapters and annexes. On a 409:
1. The query cache is synced to the server's actual current state
   immediately (`err.currentValue`), so a retry has a fresh revision —
   the user's pending edits are kept separately, not lost, not silently
   discarded, and not silently reapplied either.
2. The banner diffs three states — what the user started from, what they
   were trying to save, what the server now has — and labels each
   affected field "You both changed this" (real clash), "Updated by
   someone else" (informational only), or "Your unsaved change" (nothing
   to reconcile), rather than a flat list of differences.
3. "Keep my changes" retries the same fields against the fresh revision
   (an explicit, visible last-write-wins on exactly the fields the user
   touched — not a silent one). "Discard my changes" accepts the server
   state outright. Both are one click, both are named for what they do.

**Completion is now server-truth, not duplicated client logic.**
`DocumentNav`'s per-chapter percentages come from
`document.completion.byChapter` (the same `chapterCompletion`/
`overallCompletion` functions in `src/smf/completion.ts`, just run once
server-side in `src/mocks/handlers.ts` instead of a second time in the
browser) — one source of truth instead of two copies that could drift.

**A real, unresolved-by-design platform constraint, worked around
deliberately:** MSW's real browser mode (`msw/browser`) needs a Service
Worker file served from the same origin, which a published Artifact
(a single static HTML page) cannot provide — there's no origin to serve
`/mockServiceWorker.js` from. Real `npm run dev`/production builds use
the genuine Service-Worker-based `msw/browser` path unaffected. The
Artifact preview link specifically uses `msw/native`'s interceptor-based
`setupServer` instead (`src/mocks/nativeRuntime.ts`), which patches
global `fetch` directly — same handlers, same behavior, chosen only via
a `__ARTIFACT_BUILD__` compile-time flag (`vite.artifact.config.ts`) that
never reaches the real build (confirmed: `dist/assets/` after a normal
`vite build` contains no mock-related chunk at all). Getting `msw/native`
to bundle for a web target also required a `resolve.alias` in the
artifact config, because msw's own `package.json` explicitly sets
`exports["./native"].browser` to `null` — that subpath is deliberately
blocked under Vite's default browser resolution condition since it's
published for React Native, not a general web build; the alias points
straight at the file, bypassing only that one resolution decision.

**Known gaps, not silently smoothed over:**
- `client.ts`'s `resolve()` had a latent bug fixed while writing this:
  a bare relative path passed to `fetch` has no implicit origin outside
  a real browser document, so the client was previously untestable and
  would have broken in any non-browser context. Fixed by resolving
  explicitly against `location.href` (falling back to a fixed base when
  `location` doesn't exist), verified by `src/api/client.test.ts` running
  under Node.
- The export preview still issues one query per sub-clause across *all
  nine chapters* the moment that tab opens (`ALL_CHAPTER_REFS`, gated by
  `enabled: activeSection === "export"`) — correct and lazy, but on a
  real (not mock) backend with real network latency this is ~24 requests
  fired at once; batching them into one endpoint call is a reasonable
  future optimization, not something this phase needed to solve.
- Ghana appendix file uploads remain local `useState`, not wired to any
  endpoint — there's no resource in `openapi/smf-api.yaml` for them to
  round-trip through; the spec only defines the tus-lite `/uploads`
  primitive, not a place to attach an appendix's resulting file
  reference. Flagging as a spec gap rather than fixing silently: a real
  implementation needs an `AppendixUpload` shape and endpoint added to
  the contract.
- Submitting for review is genuinely gated on 100% completion
  server-side (`handlers.ts`), which the seed data deliberately doesn't
  reach — so demoing the full submit → approve flow from a cold load
  means either filling in the remaining required fields by hand or (for
  a quick look) accepting that `handlers.test.ts`/`client.test.ts`
  exercise that transition by setting `db.document.status` directly,
  bypassing the gate on purpose to isolate it, exactly as before.

### 20. Playwright suite by FR ID — and four real bugs it actually found

`e2e/` has one spec file per FR ID (`FR-SMF-01.spec.ts` through
`FR-SMF-16.spec.ts`), run with a real Chromium build against the real
Vite dev server (`playwright.config.ts`'s `webServer` starts `npm run dev`
automatically). `FR-SMF-07.spec.ts` is `test.skip()` with a comment
explaining the gap, not a missing file — the traceability matrix should
show "not built" as a real line, not silence. 27 tests pass, 1 skipped,
stable across repeated full runs.

This is the first verification layer in this project that drives the
actual rendered UI — clicking, typing, navigating — rather than checking
types, a bundler, or the mock/client layer directly. It found four real
bugs no earlier check could have caught, all fixed (not worked around):

1. **A genuine flash-of-wrong-content bug.** `SMFModule.tsx` computed
   `editions.length` from React Query's default `[]` while
   `editionsQuery` was still loading, so the document status briefly
   rendered "Ed. 1" before correcting itself to the real "Ed. 2" once
   data arrived — a user must never be uncertain which edition they're
   looking at, and a wrong number for even a moment is worse than a
   loading state. Found by `FR-SMF-03.spec.ts` reading `.doc-status`
   immediately after `page.goto()`. Fixed with an explicit loading gate
   in `SMFModule.tsx` (render nothing but a loading message until both
   `editionsQuery` and `documentQuery` have resolved) rather than a
   default value that happened to look plausible.
2. **A Paged.js double-render bug** — the real find of this pass.
   `ExportPreview.tsx`'s effect wrote directly into `containerRef` with
   only a `cancelled` boolean guarding state updates. Under React 18
   StrictMode (dev-only double effect invocation, there specifically to
   surface exactly this class of bug), two overlapping `previewer.
   preview()` calls both ended up appending into the same visible
   container — every export test failed with precisely double the
   expected count (2 cover pages, 36 TOC entries instead of 18). Fixed by
   rendering each effect run into its own scratch element and only
   swapping the *winning* run's output into the visible container; a
   superseded run's output is discarded with its scratch element instead
   of landing in the page. The scratch element has to stay attached to
   the document (positioned off-screen, `visibility: hidden`) rather than
   fully detached — Paged.js measures real layout to paginate, and layout
   geometry APIs return nothing usable for a node that was never attached,
   which is what the first attempt at this fix quietly broke (zero
   `.pagedjs_page` elements, no error) before being caught by re-running
   the suite rather than assuming the fix worked.
3. **Two accessibility gaps inherited from the mockup**, not introduced
   independently but not acceptable to leave given the brief's own WCAG
   2.2 AA target: the shared `Field` wrapper's `<label>` had no
   programmatic association with its control at all (a plain sibling
   element — fixed with `role="group"` + `aria-labelledby`, uniform
   across all 10 field types including compound ones like multiSelect and
   repeatableTable where `htmlFor` pointing at one input wouldn't make
   sense); and `SectionTitle` rendered sub-clause headings as a plain
   `<div>` (copied faithfully from the mockup's own `div.section-title`),
   which meant a screen reader's heading navigation skipped every
   sub-clause inside a chapter entirely. Fixed by rendering it as a real
   `<h3>` — same class, same look, zero visual change, since every
   relevant CSS property was already explicit on `.section-title`.
4. **`JurisdictionPanel` had drifted from the shared `Field` component**,
   hand-rolling its own unassociated `<label>` markup instead of reusing
   the accessible wrapper the rest of the app uses, with appendix titles
   that weren't headings at all. Rewritten to use a real `<h4>` per
   appendix in a dedicated `.appendix-card` (not the shared `Field`
   wrapper — an appendix is a titled card, not a label for one input, so
   it earns its own shape rather than being forced into one built for a
   different case).

Also fixed, smaller: `openapi/smf-api.yaml`'s `effectiveDate` field
description said "null while in draft," which turned out to be wrong
once actually tested — the mock (correctly) keeps the last *approved*
edition's real effective date visible even while a new draft is being
written, since a GMP document mid-revision is still bound by its last
approved content, not by nothing. The spec comment was the naive
assumption; the implementation was already right. Fixed the spec to
match and describe why.

**Two things worth naming about the process, not just the results:**
`e2e/fillDocument.ts` (a schema-driven helper that fills every field
FR-SMF-04/05/06 need to reach 100% completion, answering every
`derivedGatingField` "No" specifically so their dependent conditional
fields stay correctly excluded) had its own timing bug on first use —
navigating to the next chapter before a sub-clause's 650ms debounced save
had actually fired, so the last few chapters filled always came back at
0% even though every individual fill call had succeeded. Fixed by waiting
for the real save confirmation between chapters instead of assuming speed
was enough. And several `getByRole` locators needed `exact: true` after
Playwright's default substring matching turned out to make "Approve"
match "Latest **approve**d edition" and "Annex 1" match "TRS 961 **Annex
1**4" inside every other annex's own citation text — real lessons about
this specific UI's copy, surfaced by writing tests against it rather than
assumed in the abstract.

### 21. Inspector view: role persona + real edition-to-edition diffing

FR-SMF-08's read-only-approved-access half was already covered by the
"Latest approved edition" / "Historical editions" view switch (§16-19).
This closes the rest of it: a Ghana FDA Inspector persona that can never
reach an unapproved draft, and the diff capability the original brief
called out by name as "the difference between a compliance checkbox and
something an authority actually wants manufacturers to use."

- **Role switcher, not a real login.** There's no auth in this phase (see
  openapi/smf-api.yaml's security scheme note), so `TopBar`'s role badge
  becomes a real `<select>` (`roleOptions`/`roleValue`/`onRoleChange` —
  optional props; the Deviation/Batch demo screens don't pass them and
  keep the mockup's plain static badge) when `App.tsx` renders it for the
  SMF module specifically. This is a demo convenience for exercising the
  persona, not a design claim about how role assignment will really work.
- **An inspector cannot reach a draft, full stop — not just "the button
  is hidden."** `SMFModule.tsx` derives `viewMode` (`!allowDraftView &&
  rawViewMode === "current" ? "approved" : rawViewMode`) rather than
  correcting it only in a `useEffect`. The effect still exists to tidy
  the underlying state for next time, but the *rendered* value is already
  safe on the very first render after a role switch — no one-frame flash
  of editable content, which is exactly the class of bug §20 found and
  fixed elsewhere in this same session. Learned the lesson once, applied
  it proactively here instead of waiting for a test to find it again.
- **Diffing calls the real endpoint** (`GET .../editions/{a}/diff/{b}`,
  implemented in `handlers.ts` since Checkpoint 1's OpenAPI work, wired
  into `api/hooks.ts`'s `useEditionDiff` and `EditionHistoryPanel.tsx`
  only now) — nothing recomputes the comparison client-side. The panel
  labels its two result columns literally as "Edition {A}" / "Edition
  {B}" matching whichever two the user actually picked, not a
  `min`/`max`-reordered guess — an earlier draft of this panel used
  `Math.min`/`Math.max` for the headers while the underlying data stayed
  in pick-order, which would have mislabeled the columns whenever a user
  compared an older edition second. Caught and fixed before it shipped,
  this time by re-reading the handler's actual `from`/`to` semantics
  rather than assuming a natural order, not by a test.
- `FR-SMF-08.spec.ts` now covers both halves for real: switching to the
  Inspector persona and confirming the draft option disappears and
  workflow buttons vanish with it, and a full two-approval flow that
  changes exactly one field and confirms the diff table shows exactly
  that one field — not the whole document, not zero.

### 22. Out-of-scope rail tabs marked as a boundary, not a dead link

Dashboard, CAPA, Documents, Equipment, Training, Recalls, and
Self-Inspection were `href="#"` with no handler — clicking did nothing,
indistinguishable from a bug. These are other GMP domains the URS itself
scopes out of this phase (Section 11: "will be delivered under separate
URS documents in later phases"), so `Rail.tsx` now renders them as
visibly disabled (`aria-disabled`, muted color, a "Later phase" tag)
instead of silently inert. Confirmed with the user before changing
rather than assumed — the alternative (leave as-is, matching the mockup
exactly) was a legitimate option too.

### 23. The remaining requirements: FR-SMF-07, Ghana uploads, and the Functional Specification

Closes the last three items from the "what's left" audit: the one unbuilt
FR, the one contract gap, and one of the two unmet Section 12 deliverable
expectations (the other — QA sign-off on a sample PDF export — isn't
something this deliverable can produce; see `FUNCTIONAL_SPECIFICATION.md`).

**FR-SMF-07 (due for review) is built with an honest split between what's
live-testable and what isn't.** The date-based trigger ("when the review
date approaches") is real, deterministic logic
(`src/mocks/dueForReview.ts`), but the seed's real `nextReviewDate` sits
roughly a year and a half past whenever this is actually run — a
Playwright test driving a real browser's real clock would only ever see
"not due yet," so that branch is unit-tested with controlled dates
instead (`dueForReview.test.ts`, 6 cases) rather than faked live. The
on-demand trigger ("major facility change logged elsewhere") has no such
problem — it doesn't depend on the calendar at all — so it's the one
covered end-to-end in the browser (`e2e/FR-SMF-07.spec.ts`). The trigger
button itself is labelled explicitly as standing in for a call a future
Equipment module would make, not presented as the real mechanism — there
being no Equipment module in this phase is precisely why the button
exists at all. "Notification to the QA Reviewer" is represented as a
persistent status banner rather than a real email/push, since no
notification infrastructure exists yet; this is the same honest-proxy
pattern used everywhere else a backend concept has no real backend to
demonstrate against.

**Ghana appendix uploads are now wired to a real resource.**
`openapi/smf-api.yaml` gained
`GET`/`PUT /documents/{editionId}/jurisdiction-appendices/{appendixId}`,
implemented in `handlers.ts` and covered by 3 new handler tests
(empty-by-default, save + stale-revision 409, independence from
document/chapter revisions — the same pattern already proven for annexes).
`JurisdictionPanel.tsx` moved off local `useState` onto
`useJurisdictionAppendicesAutosave.ts`, which reuses the same
optimistic-write + conflict-banner pattern as chapters and annexes rather
than inventing a fourth one. A file-remove button was added to the
appendix chips along the way — a small consistency fix, since every other
file-upload field in the app already had one and this was the one
exception.

**Every FR now has a real, passing test — the suite went from 27
passing/1 skipped to 32 passing/0 skipped.** `FR-SMF-07.spec.ts` was
rewritten from a documented `test.skip()` into three real assertions
covering the on-demand flag, its clearing on approval, and its correct
absence from an Inspector's frozen approved-edition view.

**`FUNCTIONAL_SPECIFICATION.md`** is the standalone document URS Section
12 asks for — one entry per FR-SMF ID with requirement text, acceptance
criteria, what implements it, and which test verifies it, plus a
traceability matrix at the top. This repo's decisions live in
`DECISIONS.md`; what satisfies what lives in the new document — different
audiences, kept separate rather than merged into one long file.

### What's done vs. what's still ahead

As of §19, every build-order step through "export preview" is built and
wired into the real shell: tokens, shell components, `template.json` +
Zod schema, the chapter renderer (all 9 chapters, not just Chapter 4 —
the schema-driven approach meant the rest really was configuration once
Chapter 4's hard cases worked), chapter navigation with live completion,
read-only/historical modes, workflow with clause-level rejection
comments and edition history, independently-dated annex cards, Ghana's
advisory appendices, the WHO-format export preview, MSW handlers
implementing the full OpenAPI spec (§18), and — the thing that actually
retires risk rather than just adding a feature — the real app wired to
all of it through TanStack Query, including a working 409
conflict-resolution UI (§19). As of §20, all of it has now also been
driven end-to-end through a real browser by a Playwright suite named by
FR ID, which is what actually found and fixed four real bugs (a
status-display race condition, a Paged.js double-render bug, and two
accessibility gaps) that every earlier type-check/bundler-check/
mock-level test had missed by construction — none of them exercise the
rendered DOM at all. As of §21, the Inspector persona and real
edition-to-edition diffing (FR-SMF-08) are built and covered by their
own Playwright tests too. As of §23, FR-SMF-07 (due for review) and
Ghana appendix upload wiring are both built, and `FUNCTIONAL_SPECIFICATION.md`
gives every FR-SMF ID a traceability entry per URS Section 12. **All 16
FR-SMF requirements are now built.** 58 automated checks total (32
Playwright + 15 MSW handler + 6 due-for-review date-logic + 5 API
client), 0 skipped.

What's left is not a URS requirement — it's one thing I proposed and you
deferred to my judgment (§4: chapter ownership/assignment, modeled in the
contract, no UI built), and one thing that genuinely isn't mine to
produce (Section 12's QA-signed-off sample PDF export — see
`FUNCTIONAL_SPECIFICATION.md`'s closing note on why).
