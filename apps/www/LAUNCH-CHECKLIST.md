# Launch checklist

Everything below is needed before this site can go live. Each item is
marked against the page and section it unblocks. Nothing on this list
has been filled with invented content — see `CONTENT-SOURCE.md` for
what we do have. This file is the complete record of what's missing;
the live site itself shows no `[PLACEHOLDER]` text anywhere (see
`README.md` → "What's missing" for how each gap reads to a visitor
instead).

## Company details

- [ ] **Registered company name & registration number** — Footer (all pages, currently just "© {year} Numeric Technologies"), Contact, Organization JSON-LD (`src/layouts/Layout.astro`)
- [ ] **Physical address** — Contact (currently just the enquiry form, no address line), Organization JSON-LD
- [ ] **Phone number** — Contact
- [ ] **General enquiries email** — Contact
- [ ] **Year founded / years operating** — About, possibly Home positioning copy
- [ ] **Team size** — About

## Credibility

- [ ] **Team members: names, roles, short bios, headshots** — About (`/about` → "Team" section). Currently shows a stock photo (Lagos, real location, but not Numeric's actual people) under the heading, with no names or roles attached anywhere near it — see `CREDITS.md` for the reasoning and re-check it before extending the pattern.
- [ ] **Client names + permission to use them** — About and/or Home, if you want named clients anywhere
- [ ] **Case studies, with client sign-off** — About or a future Insights/Case Studies section
- [ ] **Certifications & accreditations, with issuing body and dates** — no section on the live page currently (was removed rather than shown empty — see `about.astro`'s frontmatter comment); add one once there's something real to put in it
- [ ] **Partnerships or affiliations** — same as above; no live section yet
- [ ] **Published regulatory work or speaking engagements** — About, Insights

## Content

- [ ] **Two or three Insights articles** — Insights: content collection is live at `/insights`, both current posts (`src/content/insights/*.md`) are explicitly marked `placeholder: true` and need replacing with real, fact-checked writing
- [ ] **Expanded detail for each of the four service pillars** — Services (`/services`) currently explains each capability by defining the industry term (what a CAPA, PSUR, TMF etc. *is*) rather than claiming what Numeric has specifically delivered — replace/extend with real track record once there's one to publish
- [ ] **Platform page: what can be said publicly about GxP Console, and when** — Platform (`/platform`); the panel currently states only the one confirmed fact from `CONTENT-SOURCE.md` and nothing else

## Assets

- [ ] **Commissioned photography to replace stock** — every page now has real stock photography (Pexels), none of it actually Ghanaian (Kinshasa, Lagos, and Nairobi — full breakdown in `CREDITS.md`); worth replacing with real Ghanaian photography when available. About's "Team" photo especially — it isn't Numeric's team.
- [ ] **Any existing brand materials** (old logo, letterhead, signage) — to check against/retire once the new identity ships; not blocking, but worth a look before launch

## Legal & operational

- [ ] **Privacy policy and terms** — not yet linked anywhere; needs pages + footer links once drafted
- [ ] **Cookie position, if analytics are added later** — site currently ships with zero third-party requests and no analytics by design; revisit only if that changes
- [ ] **Where the enquiry form should deliver** — Contact (`/contact`, form is built with the real field set but disabled — no submit handler until this is decided)
- [ ] **Domain and hosting** — `astro.config.mjs` `site` is a placeholder (`https://www.numerictechnologies.example`); update before the sitemap/canonical/OG URLs are real
- [ ] **Social profiles to link** — Footer (none linked currently)
