# UI-01 — Design tokens: palette, type, shape

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/tailwind.config.js`, `frontend/src/styles/index.css`, `frontend/index.html`, `frontend/src/lib/media.js` (fallback gradient only) |
| **Spec** | 11 §2 (colour), §3 (type), §4 (shape, space, elevation), §11 (migration order) |
| **Depends on** | UI-00 (theme-color value) |

## Current state

- **`tailwind.config.js`** puts `navy`, `gold` and `surface` under `theme.extend.colors`, so every Tailwind default (`emerald`, `sky`, `red`, `amber`…) is still available and in use. Fonts: Inter + **Playfair Display**. Shadows: `card` and `lift`.
- **`index.css`:**
  - `body` is `bg-surface text-navy-900`.
  - `h1, h2, h3 { @apply font-serif }` puts Playfair on every heading, including the console.
  - The focus ring is `ring-gold-500`.
  - `.card` is `rounded-2xl … shadow-card`.
  - `.eyebrow`, `.label` and `.th` are uppercase and letter-spaced.
  - `.input` is `rounded-xl bg-navy-50`.
- **`index.html`** loads Inter 400–700 and Playfair Display 500–700.
- **`lib/media.js`:** `FALLBACK_GRADIENT` is navy → gold.

## Goal

Tokens become exactly the spec 11 palette and scale. The Tailwind defaults are gone, so off-palette colours can't come back by accident.

## Implementation plan

### 1. `tailwind.config.js`

Replace `theme.colors` (not `extend`):

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',
      ink:    { 900: '#17201B', 600: '#4A554F', 300: '#A9B2AC', 100: '#E4E7E3' },
      paper:  { 50: '#FFFFFF', 100: '#F7F5EF', 200: '#EEEBE3' },
      tea:    { 900: '#173A2B', 700: '#24513D', 500: '#3D7A5C', 300: '#9CC2AD', 100: '#E3EEE7' },
      signal: { 700: '#B3261E', 100: '#FBE9E7' },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['"Source Serif 4"', 'Georgia', 'serif'],
    },
    borderRadius: {
      none: '0', sm: '4px', DEFAULT: '6px', md: '6px', lg: '10px', full: '9999px',
    },
    extend: {
      boxShadow: { overlay: '0 8px 24px rgba(23,32,27,.12)' },
      fontSize: { '2xs': ['12px', '16px'] },
    },
  },
  plugins: [],
};
```

Notes:

- **`tea-300`** is only for a third chart series (spec 11 §6). Pick a tint between `tea-500` and `tea-100` (e.g. `#9CC2AD`) and add it to spec 11 §2.1 in UI-11.
- Overriding `borderRadius` removes `rounded-xl`, `rounded-2xl` and `rounded-3xl`, so they stop working (intended). Keep `full` for avatars and the toggle only.
- Rename the serif family to `display` (`font-display`) so stray `font-serif` classes disappear with Playfair. Use `font-display` only on public-page headings.

### 2. `index.html` fonts

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap"
  rel="stylesheet"
/>
```

Remove Playfair Display and Inter 700 (spec 11 §3 uses 400/500/600).

### 3. `index.css`

```css
@layer base {
  html { scroll-behavior: smooth; }
  body { @apply bg-paper-100 font-sans text-[14px] leading-6 text-ink-900 antialiased; }
  /* No global serif on headings: the public pages opt in with font-display. */
  :focus-visible { @apply outline-none ring-2 ring-tea-500 ring-offset-2 ring-offset-paper-100; }
  .tabular { font-variant-numeric: tabular-nums; }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
}

@layer components {
  .card  { @apply rounded-lg border border-ink-100 bg-paper-50; }
  .label { @apply mb-1.5 block text-[13px] font-medium text-ink-900; }
  .input {
    @apply w-full rounded-md border border-ink-300 bg-paper-50 px-3 py-2 text-sm text-ink-900
      placeholder:text-ink-600/70 focus:border-tea-500 disabled:bg-paper-200 disabled:text-ink-300;
  }
  .th { @apply px-4 py-2.5 text-left text-[13px] font-medium text-ink-600; }
  .td { @apply px-4 py-2.5 text-sm; }
  .skeleton { @apply animate-pulse rounded-md bg-paper-200; }
  .hatch { background-image: repeating-linear-gradient(135deg, transparent 0 4px, rgba(74,85,79,.12) 4px 5px); }
}
```

- **Delete `.eyebrow`.** Remove every usage in the page tasks (UI-04 to UI-09). Until then, a missing class just renders unstyled text, which is acceptable.
- `.hatch` is for the Maintenance chip (spec 11 §5), used by `Badge` in UI-02.
- `.td` padding gives 40px rows (spec 11 §8).
- Keep the `@media print` block unchanged; it only uses neutral values.

### 4. `lib/media.js`

```js
export const FALLBACK_GRADIENT = 'linear-gradient(135deg,#EEEBE3 0%,#E3EEE7 100%)';
```

This is a flat paper-to-tea wash, used only when a photo fails to load. Rewriting the blurbs is UI-04.

### 5. Find what broke

After the change, list every class that no longer exists:

```bash
grep -rnoE "(navy|gold|emerald|sky|red|amber|slate|gray|surface)-?[0-9]*|rounded-(xl|2xl|3xl)|shadow-(card|lift|sm|md|lg)|font-serif|backdrop-blur|eyebrow" frontend/src | sort | uniq -c | sort -rn
```

Paste the counts per file into the README progress log. That count is the burn-down for UI-02 to UI-09 and should reach **0** by UI-11.

## Files touched

- `frontend/tailwind.config.js`
- `frontend/src/styles/index.css`
- `frontend/index.html`
- `frontend/src/lib/media.js` (`FALLBACK_GRADIENT` only)

## Out of scope

- Changing any page or component class names (UI-02 onward).

## Risks

- **Pages look partly unstyled** until UI-02/03 land, because `navy-*` and `gold-*` classes render as nothing. Do UI-01 to UI-03 on one branch and merge together.
- Hard-coded hex values in JS (`BranchOverview` chart fills `#0b1b2e`, `#d9ae45`, `#7a5c00`, `#e3e9f1`) are not caught by Tailwind; UI-09 handles them.

## Acceptance criteria

- [ ] `theme.colors` holds only the spec 11 tokens; `bg-emerald-50` (for example) produces no CSS.
- [ ] Playfair Display is no longer requested (Network tab); Source Serif 4 600 and Inter 400/500/600 load.
- [ ] Global body text is `ink-900` on `paper-100`; the focus ring is `tea-500` with an offset.
- [ ] `.eyebrow` is gone; `.label` and `.th` are sentence case, without uppercase or letter-spacing.
- [ ] Reduced motion: with the OS setting on, transitions and the skeleton pulse stop.
- [ ] `npm run build` passes; the per-file count of leftover classes is logged in the README.
