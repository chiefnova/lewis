/**
 * Design tokens — TypeScript mirror of the CSS custom properties defined in
 * src/styles/tokens.css. These are the same values, exposed as `as const`
 * objects so JS code (charts, animations, conditional logic, Tailwind config)
 * can reference them without parsing CSS.
 *
 * If you change a value here, change it in tokens.css too. Or import this file
 * from a CSS-in-JS layer that emits the variables. We picked the dual-source
 * approach for v0.1 — small surface, low drift risk, and editable by anyone
 * touching CSS without going through a build step.
 */

export const colors = {
  paper: "#e6e5dd",
  paperDeep: "#dcdbd0",
  paperCard: "#eeede6",
  paperBright: "#fffefb",

  ink: "#1b1814",
  inkSoft: "#5a5448",
  inkFaint: "#8a8576",

  accent: "#2c4a6b",
  accentSoft: "#3a5a7c",

  rule: "#c2bfae",
  ruleSoft: "#e4dcc8",
} as const;

export const radii = {
  xs: "4px",
  sm: "8px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "22px",
  pill: "9999px",
  // Semantic aliases
  button: "10px",
  buttonSm: "8px",
  input: "14px",
  card: "18px",
} as const;

export const fonts = {
  serif: '"Fraunces", "Tiempos Headline", Georgia, serif',
  sans: '"Inter Tight", "Söhne", -apple-system, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
} as const;

export const motion = {
  easeOut: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  durationFast: "120ms",
  durationBase: "160ms",
  durationSlow: "220ms",
} as const;

export const shadows = {
  soft: [
    "0 1px 2px rgba(40, 30, 20, 0.04)",
    "0 6px 16px rgba(40, 30, 20, 0.08)",
    "0 24px 48px rgba(40, 30, 20, 0.06)",
  ].join(", "),
  softHover: [
    "0 1px 2px rgba(40, 30, 20, 0.05)",
    "0 8px 20px rgba(40, 30, 20, 0.10)",
    "0 32px 64px rgba(40, 30, 20, 0.08)",
  ].join(", "),
} as const;

export type Colors = typeof colors;
export type Radii = typeof radii;
export type Fonts = typeof fonts;
export type Motion = typeof motion;
export type Shadows = typeof shadows;
