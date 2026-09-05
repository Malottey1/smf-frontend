# IBM Plex fonts — self-hosted, not vendored by this commit

`tokens.css` declares `@font-face` rules pointing at:

- `/fonts/ibm-plex-sans-latin.woff2` (weights 400–700)
- `/fonts/ibm-plex-mono-latin.woff2` (weights 500–600)

The binary `.woff2` files are not checked into this commit — this
environment has no network access to fetch them, and font binaries don't
belong hand-typed. Before this module is pixel-faithful to the mockup,
someone with normal internet access needs to:

1. Download IBM Plex Sans and IBM Plex Mono from the official IBM Plex
   release (SIL Open Font License — self-hosting is explicitly permitted).
2. Subset to `latin` (or your required charset) and convert to variable or
   static `.woff2` at the weights above.
3. Drop the files at the two paths listed, matching the filenames
   `@font-face` already expects.

Until then, `font-display: swap` means the page falls back to the system
sans-serif stack cleanly — nothing breaks, it just won't match the mockup's
type until the real files land. This is the reason the requirement (self-host,
don't depend on Google Fonts CDN at runtime) is implemented as
infrastructure now rather than deferred: the on-prem / network-restricted
deployment case this exists for should not depend on someone remembering to
revisit `tokens.css` later.
