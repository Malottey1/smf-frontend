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

## Photography

Two real stock photos are in use (on instruction to prefer that over a
placeholder) — see `CREDITS.md` for source, photographer, licence and
why each was picked:

1. **Home hero** — a scientist working in a laboratory in Kinshasa, DR
   Congo. Real, candid, non-staged. Not Ghana — the alt text and copy
   don't claim it is.
2. **Home "The moment for Ghana" section** — a pharmacist and customer
   at a pharmacy counter in Lagos, Nigeria. Real, but the most
   styled/staged of the two — the honest trade-off is logged in
   `CREDITS.md`.

Remaining placeholder:

3. **About "Team," 16:9** — deliberately still a placeholder even
   though the two above are now real photos. A stock photo of
   unrelated people captioned as "the team" would misrepresent who
   they are, which isn't the same category of problem as generic
   workplace photography. Needs actual photos of the actual team.

Services and Platform carry no image placeholders — they're dense,
informational pages where forcing an empty block wouldn't earn its
space.
