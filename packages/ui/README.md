# @lewis/ui

Shared design system for Lewis — tokens, components, base styles, and Tailwind v4 theme. Imported by [apps/directory](../../apps/directory), [apps/app](../../apps/app), and [apps/patient](../../apps/patient).

If you're touching anything visual that should be consistent across the staff console, patient portal, and public directory, the change goes here.

## Quick start

```ts
// In each app's main.tsx — already wired
import "@lewis/ui/styles.css";
```

```tsx
// In components
import { Button, ButtonLink, buttonClasses, colors, radii } from "@lewis/ui";

<Button>Sign in</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Link to="/me" className={buttonClasses({ variant: "primary" })}>Continue</Link>
```

```tsx
// Tailwind utilities (auto-generated from tokens)
<div className="bg-paper text-ink rounded-button shadow-soft">...</div>
<h2 className="font-serif text-ink-soft">...</h2>
```

## What's in here

```
src/
  index.ts              ← public surface: Button, ButtonLink, buttonClasses, cn, tokens
  tokens.ts             ← TypeScript mirror of CSS tokens (colors, radii, fonts, motion, shadows)
  components/
    Button.tsx          ← typed <Button> + <ButtonLink>, composes .pill classes
  styles/
    index.css           ← single import — pulls Tailwind, tokens, base, components
    tokens.css          ← @theme block + Lewis-named CSS variable aliases
    base.css            ← Lewis defaults that complement Tailwind Preflight
    buttons.css         ← .pill / .pill-primary / .pill-outline / .pill-soft / .pill-accent
    inputs.css          ← .search-pill (single-input pill, focus-within ring)
```

Each app's local `src/styles.css` keeps **only** layout/components specific to that app. Never re-declare tokens or buttons there — change them once here.

## Tokens

Defined as CSS custom properties inside Tailwind v4's `@theme` block in [tokens.css](./src/styles/tokens.css). They have two consumers:

- **CSS** — `var(--color-paper)` (Tailwind name) or `var(--paper)` (Lewis alias).
- **Tailwind utilities** — `bg-paper`, `text-ink`, `rounded-button`, `font-serif`, `shadow-soft`. These are generated automatically from the @theme tokens.
- **TypeScript** — `import { colors, radii, fonts, motion, shadows } from "@lewis/ui"` for use in JS-driven inline styles, charts, animations.

### Color palette ("Big Sky · Mineral paper")

| Token            | Hex       | Tailwind utility            |
| ---------------- | --------- | --------------------------- |
| `--paper`        | `#e6e5dd` | `bg-paper`                  |
| `--paper-deep`   | `#dcdbd0` | `bg-paper-deep`             |
| `--paper-card`   | `#eeede6` | `bg-paper-card`             |
| `--paper-bright` | `#fffefb` | `bg-paper-bright`           |
| `--ink`          | `#1b1814` | `bg-ink` / `text-ink`       |
| `--ink-soft`     | `#5a5448` | `text-ink-soft`             |
| `--ink-faint`    | `#8a8576` | `text-ink-faint`            |
| `--accent`       | `#2c4a6b` | `bg-accent` / `text-accent` |
| `--accent-soft`  | `#3a5a7c` | `bg-accent-soft`            |
| `--rule`         | `#c2bfae` | `border-rule`               |
| `--rule-soft`    | `#e4dcc8` | `border-rule-soft`          |

### Radius scale

| Token             | Value    | Tailwind utility | Use case               |
| ----------------- | -------- | ---------------- | ---------------------- |
| `--radius-xs`     | `4px`    | `rounded-xs`     | tags, focus rings      |
| `--radius-sm`     | `8px`    | `rounded-sm`     | small chips            |
| `--radius-md`     | `10px`   | `rounded-md`     | **buttons (default)**  |
| `--radius-lg`     | `14px`   | `rounded-lg`     | **search bar, inputs** |
| `--radius-xl`     | `18px`   | `rounded-xl`     | cards                  |
| `--radius-2xl`    | `22px`   | `rounded-2xl`    | hero cards, modals     |
| `--radius-pill`   | `9999px` | `rounded-pill`   | full-pill (opt-in)     |
| `--radius-button` | `10px`   | `rounded-button` | semantic alias         |
| `--radius-input`  | `14px`   | `rounded-input`  | semantic alias         |

### Type

| Token          | Value                               | Tailwind utility |
| -------------- | ----------------------------------- | ---------------- |
| `--font-sans`  | Inter Tight, Söhne, system          | `font-sans`      |
| `--font-serif` | Fraunces, Tiempos Headline, Georgia | `font-serif`     |
| `--font-mono`  | system mono                         | `font-mono`      |

Protected staff and patient apps must not load fonts from third-party CDNs. Use the system fallbacks above until the brand fonts are self-hosted as app assets. The public directory may keep its existing font link because it is an anonymous marketing/discovery surface.

### Shadows

| Token                 | Value                      | Tailwind utility    |
| --------------------- | -------------------------- | ------------------- |
| `--shadow-soft`       | three-layer soft elevation | `shadow-soft`       |
| `--shadow-soft-hover` | three-layer hover lift     | `shadow-soft-hover` |

### Motion

| Token             | Value                            |
| ----------------- | -------------------------------- |
| `--ease-out`      | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--duration-fast` | `120ms`                          |
| `--duration-base` | `160ms`                          |
| `--duration-slow` | `220ms`                          |

## Components

### `<Button>`

```tsx
import { Button } from "@lewis/ui";

<Button>Sign in</Button>                          // primary, md
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="soft">Skip</Button>
<Button variant="accent">Connect</Button>
<Button rounded>Full pill</Button>                // opt-in to pill shape
<Button disabled>Saving…</Button>
```

Forwards `ref`, spreads all standard `<button>` props. The `type` attribute defaults to `"button"` (not `"submit"`) — opposite of native, deliberate to prevent accidental form submits.

### `<ButtonLink>`

Same API for `<a>` elements. For react-router-dom `<Link>`, prefer composition with `buttonClasses()`:

```tsx
import { Link } from "react-router-dom";
import { buttonClasses } from "@lewis/ui";

<Link to="/me" className={buttonClasses({ variant: "primary" })}>
  Go to my treatment
</Link>;
```

### `.search-pill`

Single-input hero search bar, currently used in [apps/directory HomePage](../../apps/directory/src/pages/HomePage.tsx). Cream paper-bright fill, hairline border, three-layer shadow, accent focus-within ring. See [inputs.css](./src/styles/inputs.css).

## Cascade order

Cascade is governed by Tailwind v4's `@layer` system declared by `@import "tailwindcss"`:

```
theme  →  base  →  components  →  utilities
```

- **theme** — token definitions (auto from `@theme` block).
- **base** — Tailwind Preflight + Lewis [base.css](./src/styles/base.css) (focus styles, type helpers).
- **components** — [buttons.css](./src/styles/buttons.css) and [inputs.css](./src/styles/inputs.css). Component classes go here.
- **utilities** — Tailwind utility classes. Win over components by default — so a dev can write `<Button className="rounded-pill">` to override the default radius.

When adding new component CSS, wrap with `@layer components { … }` or use `@import … layer(components)`.

## How to make changes

### Change all button radius globally

Edit [tokens.css](./src/styles/tokens.css):

```css
--radius-button: 14px; /* was 10px */
```

Every button across all three apps updates. Tailwind's `rounded-button` utility updates too.

### Add a new button variant

1. Add the CSS class to [buttons.css](./src/styles/buttons.css).
2. Add the variant string to the `ButtonVariant` union in [Button.tsx](./src/components/Button.tsx).
3. Add the case to `variantClass()`.
4. Document the variant here.

### Add a new color token

1. Add `--color-foo: #abc;` inside `@theme { … }` in [tokens.css](./src/styles/tokens.css).
2. (Optional) Add a Lewis alias `--foo: var(--color-foo)` below `@theme`.
3. (Optional) Mirror in [tokens.ts](./src/tokens.ts) for TS imports.
4. Tailwind auto-generates `bg-foo`, `text-foo`, `border-foo`.

### Test before shipping

```bash
mise run typecheck      # tsc across the workspace
mise run test           # vitest unit + integration
mise run test:a11y      # axe-core (required for patient/directory changes)
mise run build          # production builds for each app
```

## Deliberate non-goals

- **No theme switcher.** Lewis is single-theme by design — the warm cream brand is non-negotiable per [DESIGN review](../../docs/prd.md).
- **No CSS-in-JS.** Plain CSS + Tailwind utilities. Easier to grep, easier to debug, no runtime cost.
- **No Storybook (yet).** Wait until @lewis/ui has 5–10 components before bringing it in.
- **No Radix.** If we add complex primitives (Dialog, Popover, Combobox), reconsider.
