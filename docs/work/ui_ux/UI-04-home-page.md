# UI-04 — Home page (spec 11 §7.1) and plain-fact media copy

| | |
|---|---|
| **Effort** | 🔴 Large |
| **Area** | `frontend/src/pages/Home.jsx`, `frontend/src/lib/media.js`, `frontend/src/components/Photo.jsx`, new `frontend/src/components/BranchDrawing.jsx` |
| **Spec** | 11 §7 (public site), §9 (copy), §10 (anti-slop); 09 §1 (API calls) |
| **Depends on** | UI-01, UI-02, UI-03; decision D1 (spec 11 wins over spec 09 for structure) |

## Current state

[Home.jsx](../../../frontend/src/pages/Home.jsx) matches almost every item in the spec 11 §10 "fail the review" list:

| Current | Spec 11 rule broken |
|---|---|
| Full-bleed `HERO_IMAGE` with a `from-navy-900/70` gradient, centred white headline, two buttons | §10 item 1 |
| Glass pill "★ Sri Lanka's boutique collection" with `backdrop-blur`, `rounded-full` | §4, §10 |
| "Stay above the ordinary", "Handcrafted boutique sanctuaries…" | §9 (banned phrase, superlatives) |
| Search card floated over the hero with `-mt-32 shadow-lift` | §10 item 1 ("glass search bar floating over it") |
| `.eyebrow` above every `h2`; "Three landscapes, one standard of calm" | §3 |
| Branch cards with `hover:-translate-y-0.5 hover:shadow-lift`, uppercase photo tags ("UNESCO colonial gem") | §4, §7.2 |
| Room type cards: a row of four identical photo cards with icon-only amenities | §7.1 item 3 (compact list, amenities as text) |
| Navy "Ready for your stay?" CTA band, `rounded-3xl`, "in under two minutes" (an invented claim) | §9, §4 |

Good parts to keep: `getBranches()` + `getRooms()` via `useFetch`, the `minByBranch` / `typeHighlights` memo, the `StaySearch` → `/rooms?…` submit, and the loading and error states for branches.

[lib/media.js](../../../frontend/src/lib/media.js) blurbs and tags are marketing copy ("curated art", "emerald tea slopes and sacred river valleys", "UNESCO colonial gem", "Spacious signature suite with premium amenities"). Spec 11 §7.2 asks for them to be rewritten as plain description.

## Goal

**Job of the screen:** a visitor sees that SkyNest is three real hotels in Colombo, Kandy and Galle, and checks availability in one step.

Covering the logo, the page should still be clearly *this* group of hotels: real addresses, real rates and photos of the three places.

## Implementation plan

### 1. Page structure

```
┌───────────────────────────────────────────────────────────────┐
│  SkyNest (Source Serif 4, 48px)          ┌──────────────────┐ │
│  Three hotels in Colombo, Kandy and      │                  │ │
│  Galle. Book a room online.              │   photo (lg:     │ │
│                                          │   right column)  │ │
│  ┌ StaySearch ─────────────────────┐     │                  │ │
│  │ Branch ▾  Check-in  Check-out   │     └──────────────────┘ │
│  │ Guests ▾  [Check availability]  │                          │
│  └─────────────────────────────────┘                          │
├───────────────────────────────────────────────────────────────┤
│  Our hotels (h2, 32px)                                        │
│  ┌ photo ──┐ ┌ photo ──┐ ┌ photo ──┐   same layout × 3        │
│  │ Colombo │ │ Kandy   │ │ Galle   │                          │
│  │ address │ │ address │ │ address │                          │
│  │ phone   │ │ phone   │ │ phone   │                          │
│  │ 1 line  │ │ 1 line  │ │ 1 line  │                          │
│  │ Rooms from LKR … │ …                                       │
│  │ See rooms in Colombo → │                                   │
├───────────────────────────────────────────────────────────────┤
│  Room types (h2)                                              │
│  Single   1 guest   from LKR 8,000.00   Air conditioning, Wi-Fi│
│  Double   2 guests  from LKR …          …                     │
│  Deluxe   …                                                   │
│  Suite    …                                                   │
├───────────────────────────────────────────────────────────────┤
│  footer (UI-03)                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2. Opening section

- Two columns at `lg` (text + search left, photo right); stacked at < lg, with the photo **below** the search so the search stays above the fold on a phone.
- `h1` "SkyNest", `font-display text-[48px] leading-tight` (36px on mobile).
- One plain sentence, `ink-600`, 18px: *"Three hotels in Colombo, Kandy and Galle. Check a date and book a room online."* No superlatives.
- `StaySearch` sits in a `.card p-4` (border, no shadow), with `submitLabel="Check availability"`. **This is the page's one `primary` button.**
- Photo: `Photo` with `rounded-lg`, aspect 4:3, **no overlay, no text on top**. Use the Colombo/seafront image (or one per branch, picked at random but stable per session; keep it simple: Colombo).
- Remove the second CTA ("Explore our branches") and the pill.

### 3. Our hotels (three branches)

- Grid `md:grid-cols-3 gap-6`, each an `<article>` with a hairline border, `rounded-lg`, and **no hover lift**.
- Photo (`rounded-t-lg`, aspect 3:2, `alt` describes the place, e.g. "Galle Face Green seafront, Colombo").
- Heading: city (`font-display text-2xl`), then the branch name in `ink-600` (from the API, e.g. "SkyNest Colombo").
- Address and phone as text from the API, with the phone as a `tel:` link. Optional small icons in `ink-600`.
- One plain sentence from `media.js` (rewritten, step 6).
- "Rooms from **LKR 12,000.00**" from `minByBranch`. Hide the line if there's no rate; don't print a blank.
- Link "See rooms in Kandy →" → `/rooms?city=Kandy`, in `ghost` style (`tea-700`, underline on hover).
- Optional `BranchDrawing` (step 5) beside the heading.
- **States:** loading shows three skeleton cards with the same shape; error shows `ErrorState` with Retry; empty (no branches) hides the section.

### 4. Room types (compact list)

A `<table>` at ≥ sm and a stacked `<dl>` list on mobile:

| Room type | Sleeps | From | Amenities |
|---|---|---|---|
| Single | 1 | LKR … | Air conditioning, Wi-Fi, … |

- Data comes from the existing `typeHighlights` memo. Amenities are **text**, comma-separated, first 4 + "and 2 more".
- The row (or the room-type name) links to `/rooms?type=Single`.
- Numbers right-aligned `tabular-nums`.
- No photos, ribbons or star ratings.
- If `rooms` errors, hide the section (the branches section already shows the error); while loading, show 4 skeleton rows.

### 5. `BranchDrawing.jsx` (optional, small)

Inline SVG line drawings, `stroke="currentColor"` with `text-ink-300`, 1.5px stroke, ~120×48:

- **Colombo:** promenade line + sea line.
- **Kandy:** lake outline + two hill contour lines.
- **Galle:** bastion outline + lighthouse.

`aria-hidden="true"`. If the drawings look clip-art-like in review, drop them. They're optional in spec 11 §7.2.

### 6. Rewrite `lib/media.js` copy

Keep only facts that are in the seed or spec 11 §7.2 (branch, street, what the photo shows). Proposed:

```js
Colombo: {
  image: …, // seafront / Galle Face Green
  alt: 'Galle Face Green and the seafront, Colombo',
  blurb: 'On Galle Face Terrace, across the road from Galle Face Green and the sea.',
},
Kandy: {
  image: …, // Kandy Lake and hills
  alt: 'Kandy Lake with the hills behind',
  blurb: 'On Temple Road, a short walk from Kandy Lake.',
},
Galle: {
  image: …, // ramparts / lighthouse
  alt: 'Galle Fort ramparts and lighthouse',
  blurb: 'On Lighthouse Street, inside the walls of Galle Fort.',
},
```

> ⚠ "Across the road" and "a short walk" are distance claims. Check them against the seed addresses before merging. If they can't be confirmed, use only "On Galle Face Terrace, Colombo." (spec 11 §9: leave out rather than invent).

- Delete `tag` (the uppercase photo labels).
- `ROOM_TYPE_BLURB` becomes factual or is deleted: "Single: one bed, for one guest." Capacity already comes from the API, so the blurb may simply be removed.
- **Photos:** check that each Unsplash ID actually shows the right place. The Colombo and `HERO_IMAGE` IDs are the same generic resort pool, which fails the "could be any hotel" test. Replace them with photos of Galle Face, Kandy Lake and Galle Fort (Unsplash licence), and record each photo's source in a comment.

### 7. Remove

- The "Ready for your stay?" band.
- Any `Icon name="star"` usage.
- `HERO_IMAGE`, if nothing else uses it after Login is updated (UI-05).

## Files touched

- `frontend/src/pages/Home.jsx` (rewrite of the JSX; data hooks kept)
- `frontend/src/lib/media.js`
- `frontend/src/components/BranchDrawing.jsx` (new, optional)
- `frontend/src/components/Photo.jsx` (if `alt` or aspect props are needed)

## Out of scope

- "During your stay" services section (decision D4: omitted).
- Changes to `StaySearch` internals beyond the label (UI-05).

## Acceptance criteria

- [ ] No full-bleed photo, gradient overlay, blur, pill, eyebrow, hover lift or shadow on the page.
- [ ] Exactly one `primary` button above the fold: "Check availability". Submitting goes to `/rooms?city=…&check_in=…&check_out=…`.
- [ ] Each branch block shows the address, phone and "Rooms from LKR …" from the API; nothing is hard-coded except the photo, alt and one sentence from `media.js`.
- [ ] Room types appear as a compact list with amenities as text; each links to a filtered `/rooms`.
- [ ] No banned words (§9): luxury, curated, nestled, paradise, experience, discover, handcrafted, sanctuary, "above the ordinary".
- [ ] The four states are handled: loading (skeletons), error (Retry), empty (section hidden), populated.
- [ ] 375px: the search is visible without scrolling past a photo; no horizontal scroll.
- [ ] Cover-the-logo test: the page names Colombo, Kandy and Galle streets and shows those places.
- [ ] `npm run build` passes.
