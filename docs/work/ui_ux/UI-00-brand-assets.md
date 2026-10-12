# UI-00 — Brand assets: emblem, logo component, favicons

| | |
|---|---|
| **Effort** | 🟢 Small |
| **Area** | `skynest_image_assets/` → `frontend/public/`, `frontend/src/assets/`, `frontend/src/components/ui/Logo.jsx`, `frontend/index.html` |
| **Spec** | 11 §1 (principles), §2 (palette), §8 (console header shows "SkyNest mark") |
| **Depends on** | — (decide D2 in the README first) |

## Current state

- The navbar logo is a placeholder: a generic `building` icon inside a `rounded-xl bg-navy-900` box with `text-gold-300` ([Navbar.jsx:80-89](../../../frontend/src/components/Navbar.jsx#L80-L89)).
- `frontend/public/` doesn't exist. Vite serves static files from there, so there is nowhere to put favicons.
- `index.html` has no favicon links, and `theme-color` is navy `#0b1b2e`.
- New assets sit unused in `skynest_image_assets/`:

| File | Notes |
|---|---|
| `Minimalist Green Wave Bird Emblem.png` | Round emblem (bird over three waves), deep green on cream. **Has a jagged white halo** around the circle from background removal; it looks dirty at small sizes and on `paper-100`. |
| `SkyNest Green Wave Logo (1).png` | Emblem + "SkyNest" wordmark in a heavy serif, on a white background with wide margins. |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Generated favicon set. |
| `site.webmanifest` | `name` and `short_name` are empty; `theme_color` and `background_color` are `#ffffff`. |

## Goal

One crisp, token-coloured SkyNest mark used in the navbar, footer, auth pages and browser tab. Every colour comes from the spec 11 palette.

## Implementation plan

### 1. Redraw the emblem as SVG

Trace the emblem as a hand-written, minimal SVG at `frontend/src/assets/skynest-mark.svg`. Use simple paths: one circle, one bird stroke, three wave shapes. Don't embed the PNG.

- Circle fill: `paper-200` `#EEEBE3` (the cream in the PNG).
- Bird and waves: `tea-900` `#173A2B` (recommended in D2). Use `tea-700` `#24513D` if the mark looks too dark at 24px.
- `viewBox="0 0 64 64"`, no fixed width/height, `role="img"`, `<title>SkyNest</title>`.
- Also export a **one-colour version** (`fill="currentColor"`, no circle) for the dark footer, where it renders in `paper-100`.

If tracing by hand isn't practical, trace the PNG once (e.g. Inkscape → Trace Bitmap, 2 colours), simplify the paths, and recolour them to the tokens. Check the result at 16, 24, 32 and 64px.

### 2. Wordmark

The PNG wordmark uses a heavy display serif that isn't part of the type system (spec 11 §3: Source Serif 4 + Inter only). Two options:

- **Recommended:** the lockup is the SVG mark + the text "SkyNest" set in **Source Serif 4, 600**, `ink-900`. It stays crisp and needs no extra font.
- Alternative: trace the wordmark to SVG paths too and keep it as artwork. Never load its font as a web font.

### 3. `Logo` component

Create `frontend/src/components/ui/Logo.jsx`:

```jsx
import mark from '@/assets/skynest-mark.svg';

// variant: 'mark' (emblem only) | 'full' (emblem + wordmark)
// tone: 'default' (ink on paper) | 'inverse' (paper on ink, footer)
export default function Logo({ variant = 'full', tone = 'default', className = '' }) { … }
```

- Sizes: the mark is 32px in the navbar, 28px in the footer, and 48px on Login/Register.
- With `variant="mark"`, give it `aria-label="SkyNest"`. With `full`, the visible text is the accessible name and the image gets `alt=""`.
- For `tone="inverse"`, import the one-colour SVG as a React component or inline it, so it can use `currentColor`.

### 4. `frontend/public/` and favicons

1. Create `frontend/public/`.
2. Copy into it: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`.
3. **Regenerate the favicons from the cleaned SVG**, because the current PNGs probably carry the halo. Check `favicon-32x32.png` zoomed in. If it's clean, keep it.
4. Fix `site.webmanifest`:

```json
{
  "name": "SkyNest Hotels",
  "short_name": "SkyNest",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#24513D",
  "background_color": "#F7F5EF",
  "display": "standalone"
}
```

### 5. `index.html`

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#24513D" />
```

Change the meta description to plain text: "SkyNest Hotels: three hotels in Colombo, Kandy and Galle." Font links change in UI-01.

### 6. Source assets

Leave the originals in `skynest_image_assets/` as the design source, or move them to `docs/brand/`. Add a short `README.md` there saying the SVG in `frontend/src/assets/` is canonical. Don't ship the 2172px PNG to the browser.

## Files touched

- `frontend/public/*` (new)
- `frontend/src/assets/skynest-mark.svg`, `skynest-mark-mono.svg` (new)
- `frontend/src/components/ui/Logo.jsx` (new)
- `frontend/index.html`

(The Navbar and footer start using `Logo` in UI-03.)

## Out of scope

- Using the logo in the navbar or footer (UI-03) and on auth pages (UI-05).

## Acceptance criteria

- [ ] The browser tab shows the SkyNest emblem in dev (`npm run dev`) and in the production build (`npm run preview`).
- [ ] The emblem has no white or jagged halo at 16px, 32px or 64px on a `paper-100` background.
- [ ] The SVG uses only palette hex values (`#EEEBE3`, `#173A2B` or `#24513D`).
- [ ] `site.webmanifest` has a name and short name, and the palette's theme/background colours.
- [ ] `npm run build` passes, and `dist/` contains the favicon files at the root.
