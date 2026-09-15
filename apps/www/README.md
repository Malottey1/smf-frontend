# apps/www — Numeric Technologies corporate site

Astro-based marketing site for Numeric Technologies. This is **not**
part of the SMF / GxP Console application (`apps/smf-frontend`) and is
deliberately outside that app's GxP validation scope — do not import
application code, tokens, or components from `apps/smf-frontend` here,
and do not import anything from this app into it.

Brand assets (logo, fonts, tokens) come from `packages/brand-corporate`
via the `@numeric/brand-corporate` workspace package — see that
package's `BRAND-SHEET.html` for usage rules. Content is sourced only
from `CONTENT-SOURCE.md` (verbatim copy from the three supplied
documents) — nothing on the site states a fact that isn't there.

## Status

Home page (`/`) is built and complete. `/about`, `/services`,
`/platform`, `/insights`, `/contact` are stub pages ("being built
next") so navigation doesn't 404 — their real content is the next
phase of work.

## Commands (from repo root)

```
pnpm --filter www dev       # http://localhost:4321
pnpm --filter www build     # → apps/www/dist
pnpm --filter www preview
```

## [PLACEHOLDER] inventory

Everything below is a gap the source documents don't fill. Nothing has
been invented to paper over it — see `LAUNCH-CHECKLIST.md` for the full
list mapped to what it unblocks.

| Where | What's missing |
|---|---|
| Footer, every page | Registered company name/number, address (currently `[PLACEHOLDER — see LAUNCH-CHECKLIST.md]`) |
| Home `/`, "Get in touch" | Address, phone, email |
| `/about` | Team members, bios, headshots, company history |
| `/services` | Expanded detail per pillar beyond the PDF's bullets |
| `/platform` | What can be said publicly about GxP Console, and when |
| `/insights` | Two or three real articles (content collection not yet set up) |
| `/contact` | Enquiry form + where it should deliver |
| `<head>` OG image | Using a generated on-brand placeholder (`public/og-default.png`, built from the real logo) until there's real photography worth using instead |
| `astro.config.mjs` `site` | Placeholder domain — set the real one before launch |

## Photography shot list

No stock photo cleared the brief's bar yet — see `CREDITS.md` for what
was searched and why nothing was used. Both home-page image slots are
placeholder blocks at the correct aspect ratio:

1. **Hero, 21:9** — a pharmaceutical manufacturing floor or QC
   laboratory in Ghana. A technician at an instrument, natural light,
   documentary style. This is the single most important image on the
   site — worth waiting for commissioned photography over forcing a
   stock substitute.
2. **"The moment for Ghana" section, 4:5** — Ghanaian pharmaceutical
   distribution or a community pharmacy counter, Accra or Kumasi. Real
   work, real people.

Once `/services`, `/about` and `/platform` are built out, add their
image needs here too (warehouse aisle, SOP/document-control desk,
FDA submission work, team photography for About).
