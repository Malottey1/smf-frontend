/**
 * TypeScript mirror of tokens.css, for contexts that need token values in
 * JS rather than CSS (chart colors, canvas/SVG drawing, computed inline
 * styles for third-party components that don't accept CSS variables).
 *
 * Component code should prefer the CSS custom properties directly
 * (var(--teal), etc.) — reach for this module only when a value must be a
 * plain string/number at runtime. Keep this file's values in lockstep with
 * tokens.css; nothing here should drift from the source of truth there.
 */

export const palette = {
  ink: "#132A3D",
  inkSoft: "#4C5E6C",
  inkFaint: "#8B99A3",
  paper: "#FFFFFF",
  wash: "#F4F6F8",
  line: "#DCE2E7",
  teal: "#0E6B5C",
  tealWash: "#E4F1EE",
  amber: "#9A6400",
  amberWash: "#FBF0DA",
  red: "#A32626",
  redWash: "#F9E8E7",
  navyDeep: "#0C2036",
  railFg: "#C9D6E0",
  railFgMuted: "#8FA3B3",
  railHeading: "#E7EEF2",
  railNavFg: "#B6C4CE",
  railNavActiveBg: "#16324B",
  railNavHoverBg: "#122A40",
  railBorder: "#1D3A52",
  avatarBg: "#DCE7E4",
} as const;

export const radii = {
  control: "6px",
  panel: "8px",
  badge: "5px",
  pill: "20px",
} as const;

export const spacing = {
  railWidth: "220px",
  sidebarWidth: "280px",
  contentGap: "22px",
  panelPadding: "22px",
  railPadding: "22px 16px",
  railGap: "26px",
} as const;

export const focusRing = {
  width: "2px",
  offset: "1px",
  color: palette.teal,
} as const;

export const fonts = {
  sans: '"IBM Plex Sans", -apple-system, sans-serif',
  mono: '"IBM Plex Mono", monospace',
} as const;

/** Semantic color-by-severity mapping, matching the mockup's pill classes exactly. */
export const severity = {
  critical: { fg: palette.red, bg: palette.redWash },
  major: { fg: palette.amber, bg: palette.amberWash },
  minor: { fg: palette.inkSoft, bg: palette.wash },
} as const;

export type Palette = typeof palette;
