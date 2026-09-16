# apps/www — Numeric Technologies corporate site

Astro-based marketing site for Numeric Technologies. This is **not**
part of the SMF / GxP Console application (`apps/smf-frontend`) and is
deliberately outside that app's GxP validation scope — do not import
application code, tokens, or components from `apps/smf-frontend` here,
and do not import anything from this app into it. The one exception is
the Platform page's product panel, which intentionally copies GxP
Console's own palette (navy/teal) and IBM Plex Sans as literal values —
see that page's frontmatter comment for why that's not a real
dependency between the two apps.

Brand assets (logo, fonts, tokens) come from `packages/brand-corporate`
via the `@numeric/brand-corporate` workspace package — see that
package's `BRAND-SHEET.html` for usage rules. Content is sourced only
from `CONTENT-SOURCE.md` (verbatim copy from the three supplied
documents) — nothing on the site states a fact that isn't there.

## Status

All six pages are built: Home, Services, Platform, About, Insights
(content collection, two posts), Contact. Every page carries at least
one photo, and every page has a horizontal image hero at the top except
Home (which has its own two-photo layout — see `src/pages/index.astro`).

**The live site shows no `[PLACEHOLDER]` text, tags, or notes.** Every
gap the source documents don't fill is instead either quietly omitted
(no "Address: [PLACEHOLDER]" line — the field just isn't shown) or
worded as ordinary, un-alarming product copy ("Registration isn't open
yet — check back soon."). The gaps themselves are fully tracked, just
only here and in `LAUNCH-CHECKLIST.md` — a developer/reviewer document,
not something a site visitor sees.

## Commands (from repo root)

```
pnpm --filter www dev       # http://localhost:4321
pnpm --filter www build     # → apps/www/dist
pnpm --filter www preview
```

## What's missing (dev-facing only — see LAUNCH-CHECKLIST.md)

| Where | What's missing | How the live page handles it |
|---|---|---|
| Footer, every page | Registered company name/number, address | Just shows "© {year} Numeric Technologies." — no unresolved line |
| Home, Contact | Address, phone, email | Home links to Contact; Contact shows only the enquiry form |
| `/about` | History, certifications & partnerships | Sections aren't on the page at all — see `about.astro`'s frontmatter comment |
| `/about` "Team" | Real team members, bios, headshots | Shows a stock photo under the heading, no names/roles attached — see `CREDITS.md`, this one's a judgment call worth re-reading |
| `/platform` | What more can be said about GxP Console; register-interest delivery | Panel just states the one confirmed fact; form says "not open yet" |
| `/insights` | Real regulatory-intelligence writing | Both posts are short but 100% real quotes from source material — `placeholder: true` in frontmatter tracks this invisibly |
| `/contact` | Enquiry form delivery target | Form is built to the real field set, disabled, with a plain "not open yet" note |
| `astro.config.mjs` `site` | Placeholder domain | — |

## Photography

Every page has real stock photography now — see `CREDITS.md` for
source, photographer, licence, and (importantly) what was rejected and
why. Two things worth knowing without opening that file:

1. **Nothing is actually Ghanaian.** The closest available real,
   non-generic candidates were Nigerian, Kenyan, and Congolese. Every
   alt text and caption says the real location; none imply Ghana.
2. **About's "Team" photo is not Numeric's team** — it's the one place
   on the site where a stock photo risks implying something specific
   and false (that these are named employees). Read the note in
   `CREDITS.md` before treating this as a template for other sections.
