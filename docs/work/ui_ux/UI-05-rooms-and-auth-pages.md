# UI-05 — RoomsBrowse, RoomCard, StaySearch, Login, Register, NotFound

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/src/pages/{RoomsBrowse,Login,Register,NotFound}.jsx`, `frontend/src/components/{RoomCard,StaySearch,Photo}.jsx` |
| **Spec** | 11 §3 (display font on public `h1/h2`), §4, §6, §7, §9; 09 §2–3 |
| **Depends on** | UI-01, UI-02, UI-03 |

## Current state

**RoomsBrowse** ([RoomsBrowse.jsx](../../../frontend/src/pages/RoomsBrowse.jsx))
- Eyebrow "Boutique living across Sri Lanka"; `h1` "Explore our suites & rooms"; marketing paragraph ("Handcrafted stays across Colombo's ocean horizon…").
- In booking mode the eyebrow shows the staff member's email, which isn't useful.
- `rounded-full` filter chips; a segmented branch control with `bg-navy-50` and a `shadow-sm` active segment.

**RoomCard** ([RoomCard.jsx](../../../frontend/src/components/RoomCard.jsx))
- `hover:-translate-y-0.5 hover:shadow-lift`; a photo gradient overlay with an uppercase pill tag.
- Disabled "Book" uses `pointer-events-none opacity-50` on a `<Link>`, so keyboard users get no explanation.

**StaySearch** ([StaySearch.jsx](../../../frontend/src/components/StaySearch.jsx))
- Default `submitLabel="Search"`; `variant="dark"`; error text `red-600`. Labels carry decorative icons.

**Login** ([Login.jsx](../../../frontend/src/pages/Login.jsx))
- Left half: `HERO_IMAGE` + navy gradient + quote "“Your sky-high stay, effortlessly managed.”". Right: an icon in a `rounded-2xl` box, "Welcome back".
- Demo-account chips are `rounded-full` with `hover:bg-gold-100` (dev only).

**Register** ([Register.jsx](../../../frontend/src/pages/Register.jsx)): eyebrow "Guest account"; the success toast says "Welcome to SkyNest! Your account is ready." (UI-10).

**NotFound** ([NotFound.jsx](../../../frontend/src/pages/NotFound.jsx)): eyebrow "Error 404".

## Goal

- **RoomsBrowse:** a guest (or receptionist in booking mode) narrows the list to rooms free for their dates and picks one.
- **Login and Register:** sign in or create a guest account with the fewest fields and clear errors.

## Implementation plan

### 1. RoomsBrowse

- **Header (public):** `h1` "Rooms" in `font-display` (32px) plus one line of live context in `ink-600`: "12 rooms free in Kandy, 14/11–16/11", or "All rooms" when no dates are set. Build it from the current filters and the result count. Remove the eyebrow and the marketing paragraph.
- **Header (booking mode, staff):** `h1` "New booking: choose a room" in **Inter** 20px/600 (console style). Remove the email.
- **Filters:** keep `StaySearch` in a `.card p-4`. The active-filter chips become `rounded-sm border border-ink-100 bg-paper-50` with an × button labelled "Remove filter: Kandy".
- **Branch segmented control** → replace with the `Tabs` underline style (All · Colombo · Kandy · Galle), or drop it, since the branch is already in `StaySearch`. **Recommended: drop it** (one control per filter).
- **Result grid:** `sm:grid-cols-2 lg:grid-cols-3 gap-6`.
- **States:**
  - Loading: 6 card-shaped skeletons.
  - Empty (no matches): "No rooms free for 14/11–16/11 in Kandy. Try other dates or another branch." with "Clear filters" (secondary).
  - Error: `ErrorState` with Retry.
  - Invalid dates (check-out ≤ check-in): inline error under the date fields (`StaySearch` `error` prop), with no request sent.

### 2. RoomCard

```
┌ photo (3:2, no overlay) ───────┐
│                                │
└────────────────────────────────┘
Deluxe · Room 204           [Available]
SkyNest Kandy · Sleeps 2
Air conditioning, Wi-Fi, Balcony, Mini bar
LKR 18,000.00 / night       [Book this room]
```

- Remove the hover lift, the gradient and the photo tag.
- The title is the type and room number in Inter 16px/600 (cards are dense; `font-display` is for page headings only).
- Status via `<Badge status=…>`, shown only when it adds information (e.g. Maintenance when not searching by dates).
- Amenities as text, not icon-only (screen readers, and spec 11 §7.1). Keep icons only if they come with visible text.
- Rate: `tabular-nums font-semibold`, `/ night` in `ink-600`.
- **Button "Book this room"** (spec 11 §9). When not bookable, render a real disabled `<button>` with the reason as visible text below it ("Under maintenance" or "Pick dates first"), not a styled-disabled `<Link>`.

### 3. StaySearch

- Default `submitLabel="Check availability"`; `variant="primary"`.
- Remove the decorative icons inside labels (labels are plain text, spec 11 §6 `Field`).
- Use `Field` or `.label`/`.input` from UI-01/02. The date inputs stay native `type="date"` with `min` set to today.
- Error: `text-signal-700`, `role="alert"`, under the date fields.
- Layout: four columns at `lg`, two at `sm`, one at 375px; the button spans the full width on mobile.

### 4. Login

```
          [mark 48px]
     Sign in to SkyNest        (font-display 32px)

  Email
  [                         ]
  Password                [Show]
  [                         ]
  Email or password is incorrect.     ← signal-700, role=alert

  [ Sign in ]   (primary, full width)

  New guest? Create an account
```

- **Drop the split-screen photo and quote.** A single centred column, `max-w-sm`, on `paper-100`, with the form in a `.card p-6`.
- `<Logo variant="mark" />` above the `h1`. `h1` "Sign in to SkyNest" in `font-display`. Remove the "Welcome back" icon box.
- Error copy per spec 11 §9.1: 401 gives "Email or password is incorrect."; 429 gives "Too many sign-in attempts. Wait a minute and try again." (via `errorMessage()`, UI-10).
- Keep the show/hide password toggle as a text button ("Show"/"Hide"), with `aria-pressed`.
- **Demo accounts (dev only):** keep them behind the existing dev check; restyle as small `secondary` buttons in a `<details>` labelled "Demo accounts".
- Keep the role-based redirect logic unchanged.

### 5. Register

- Same single-column shell as Login. `h1` "Create a guest account" (`font-display`); remove the eyebrow.
- One line under the heading: "You'll use this to book rooms and see your bills."
- Fields stay as they are (they match `POST /auth/signup`); group them with spacing, not cards. The password hint "8 to 72 characters" stays (it matches `passwordError`).
- The button says "Create account". 409 duplicate email → "An account with this email already exists. Sign in instead." with a link (spec 11 §9.1 pattern).
- The toast copy changes in UI-10.

### 6. NotFound

- Remove the eyebrow. `h1` "Page not found" (`font-display`); "This address doesn't match any page. Check the link, or go to the home page."; `secondary` button "Go to home page" (and "Go to Today" for staff, via `homeForRole`).

### 7. Photo.jsx

- Accept `alt`, `aspect` and `rounded` props. Fallback is the `FALLBACK_GRADIENT` from UI-01; keep the `onError` behaviour.
- Add `loading="lazy"` and `decoding="async"` on everything except the Home opening photo.

## Files touched

- `frontend/src/pages/RoomsBrowse.jsx`, `Login.jsx`, `Register.jsx`, `NotFound.jsx`
- `frontend/src/components/RoomCard.jsx`, `StaySearch.jsx`, `Photo.jsx`

## Out of scope

- Changes to filter logic, query params or the API.
- Changes to redirect rules.

## Acceptance criteria

- [ ] No eyebrows, gradients, hover lifts, `rounded-full` chips or marketing copy on these pages.
- [ ] Public `h1`s use Source Serif 4; booking-mode (staff) headings use Inter.
- [ ] RoomsBrowse shows a live summary line and handles loading, empty (with next step), error (Retry) and invalid dates.
- [ ] Not-bookable cards show the reason as text; the disabled button isn't focusable as a link.
- [ ] Login shows the spec 11 §9.1 messages for 401 and 429 (test with a wrong password, then six quick attempts).
- [ ] Register 409 shows the duplicate-email message with a sign-in link.
- [ ] 375px: filters stack, cards are one column, the Login card fits without horizontal scroll.
- [ ] `npm run build` passes; checked signed out, as a guest, and as a receptionist in `?mode=booking`.
