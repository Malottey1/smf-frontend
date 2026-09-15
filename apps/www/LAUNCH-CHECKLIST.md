# Launch checklist

Everything below is needed before this site can go live. Each item is
marked against the page and section it unblocks. Nothing on this list
has been filled with invented content — see `CONTENT-SOURCE.md` for
what we do have and `README.md` for the current `[PLACEHOLDER]`
inventory.

## Company details

- [ ] **Registered company name & registration number** — Footer (all pages), Contact, Organization JSON-LD (`src/layouts/Layout.astro`)
- [ ] **Physical address** — Home "Get in touch", Contact, Footer, Organization JSON-LD
- [ ] **Phone number** — Home "Get in touch", Contact, Footer
- [ ] **General enquiries email** — Home "Get in touch", Contact, Footer
- [ ] **Year founded / years operating** — About, possibly Home positioning copy
- [ ] **Team size** — About

## Credibility

- [ ] **Team members: names, roles, short bios, headshots** — About (`/about` → "Team" section, currently a single labelled placeholder block rather than fake per-person cards, deliberately — see that page's comments)
- [ ] **Client names + permission to use them** — About and/or Home, if you want named clients anywhere
- [ ] **Case studies, with client sign-off** — About or a future Insights/Case Studies section
- [ ] **Certifications & accreditations, with issuing body and dates** — About, possibly Services (Quality Systems pillar)
- [ ] **Partnerships or affiliations** — About, possibly Home positioning section
- [ ] **Published regulatory work or speaking engagements** — About, Insights

## Content

- [ ] **Two or three Insights articles** — Insights: content collection is live at `/insights`, both current posts (`src/content/insights/*.md`) are explicitly marked `placeholder: true` and need replacing with real, fact-checked writing
- [ ] **Expanded detail for each of the four service pillars** — Services (`/services`) currently explains each capability by defining the industry term (what a CAPA, PSUR, TMF etc. *is*) rather than claiming what Numeric has specifically delivered — replace/extend with real track record once there's one to publish
- [ ] **Platform page: what can be said publicly about GxP Console, and when** — Platform (`/platform`), the product panel's `[PLACEHOLDER]` note

## Assets

- [ ] **Commissioned photography to replace stock** — see `README.md` → Photography shot list; currently 2 placeholder slots on Home (hero + positioning section), more will follow as Services/About/Platform are built
- [ ] **Any existing brand materials** (old logo, letterhead, signage) — to check against/retire once the new identity ships; not blocking, but worth a look before launch

## Legal & operational

- [ ] **Privacy policy and terms** — not yet linked anywhere; needs pages + footer links once drafted
- [ ] **Cookie position, if analytics are added later** — site currently ships with zero third-party requests and no analytics by design; revisit only if that changes
- [ ] **Where the enquiry form should deliver** — Contact (`/contact`, form is built with the real field set but disabled — no submit handler until this is decided)
- [ ] **Domain and hosting** — `astro.config.mjs` `site` is a placeholder (`https://www.numerictechnologies.example`); update before the sitemap/canonical/OG URLs are real
- [ ] **Social profiles to link** — Footer (none linked currently)
