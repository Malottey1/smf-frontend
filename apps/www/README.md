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
(content collection, two placeholder posts), Contact. Nothing 404s.
Remaining work is entirely the `[PLACEHOLDER]` items below — content
Numeric needs to supply, not pages left to build.

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
| Footer, every page | Registered company name/number, address |
| Home `/`, Contact `/contact` | Address, phone, email |
| `/about` | History, team members/bios/headshots, certifications & partnerships |
| `/platform` | What more can be said publicly about GxP Console, and when; register-interest form isn't connected |
| `/insights` | Both posts are placeholders — real regulatory-intelligence writing, not filled-in text |
| `/contact` | Enquiry form fields are built but disabled — not connected, and delivery target isn't decided |
| `<head>` OG image | Using a generated on-brand placeholder (`public/og-default.png`, built from the real logo) until there's real photography worth using instead |
| `astro.config.mjs` `site` | Placeholder domain — set the real one before launch |

## Photography shot list

No stock photo cleared the brief's bar yet — see `CREDITS.md` for what
was searched and why nothing was used. Placeholder blocks, at the
correct aspect ratio so layout won't shift when a real photo lands:

1. **Home hero, 21:9** — a pharmaceutical manufacturing floor or QC
   laboratory in Ghana. A technician at an instrument, natural light,
   documentary style. The single most important image on the site —
   worth waiting for commissioned photography over forcing a stock
   substitute.
2. **Home "The moment for Ghana" section, 4:5** — Ghanaian
   pharmaceutical distribution or a community pharmacy counter, Accra
   or Kumasi. Real work, real people.
3. **About "Team," 16:9** — team photography, once there's a team to
   photograph.

Services and Platform deliberately carry no image placeholders —
they're dense, informational pages where forcing an empty placeholder
block wouldn't earn its space. Revisit once there's a photo library to
draw from.
