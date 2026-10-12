# SkyNest — UI/UX Upgrade Tasklist

Source: frontend review on **2026-10-12** against [`docs/specs/11_design_system.md`](../../specs/11_design_system.md) (spec 11). Each task links to a plan file in this folder with the current state, implementation steps, files touched and acceptance criteria.

## Summary of the review

Spec 11 already defines the target design (ink / paper / tea green + signal red, Source Serif 4 + Inter, word-first status chips, task-list console). **None of it is implemented yet.** The frontend still runs the old navy/gold theme:

- **413** off-palette colour classes (`navy-*`, `gold-*`, `emerald-*`, `sky-*`, `red-*`, `amber-*`) across **39** files.
- `tailwind.config.js` *extends* the default palette, so every Tailwind default colour is still usable by accident.
- Playfair Display on every `h1–h3`, including the staff console.
- Home is the hero pattern spec 11 §10 bans: full-bleed photo + dark gradient + centred headline + glass search bar ("Stay above the ordinary").
- Status chips in six hues as `rounded-full` pills; Maintenance and Cancelled show red, which reads as "error".
- KPI tile walls (`StatCard`), a donut occupancy ring, card shadows, hover lifts, uppercase eyebrow labels.
- Placeholder logo (generic building icon in a navy box); mojibake `Â·` in the navbar; no `frontend/public/` folder, so there is nowhere to serve favicons from.
- New brand assets in `skynest_image_assets/` (emblem, wordmark lockup, favicons) are not used anywhere.

## How to use this list

- Work **top to bottom**. The order follows spec 11 §11: tokens → primitives → layout → pages. Changing tokens first restyles most pages without touching their logic.
- **One task = one PR = one concern.** Restyle tasks don't change data fetching or business logic. If you find a bug, log it and fix it in a separate PR.
- Before editing a frontend file, check `git status`. If someone else has it modified, coordinate first.
- Tick a task only when every acceptance criterion in its plan file is met, `npm run build` passes, and the pages were checked in a browser (same rule as `AGENTS.md`: no speculative ticking).
- Never commit or push from an agent; suggest a conventional commit message.

## Effort legend

🟢 Small (< 2 h) · 🟡 Medium (half day) · 🔴 Large (1 day+)

---

## Phase A: Foundation (restyles ~70% of the UI, no logic changes)

- [x] **0. [UI-00](UI-00-brand-assets.md)** 🟢 Brand assets: clean SVG emblem, `Logo` component, `frontend/public/` with favicons + manifest
- [x] **1. [UI-01](UI-01-design-tokens.md)** 🟡 Design tokens: replace the palette, fonts, radii, shadows; rewrite `index.css` base and component classes
- [x] **2. [UI-02](UI-02-ui-primitives.md)** 🔴 UI primitives: `Badge`, `Button`, `Field`, `Tabs`, `Modal`, `Toast`, `States`, `Pagination`, `SummaryStrip` (replaces `StatCard`)
- [x] **3. [UI-03](UI-03-navbar-footer-layout.md)** 🟡 Navbar, footer and page layout

## Phase B: Public site

- [x] **4. [UI-04](UI-04-home-page.md)** 🔴 Home page rebuilt to spec 11 §7.1 + plain-fact rewrite of `lib/media.js`
- [x] **5. [UI-05](UI-05-rooms-and-auth-pages.md)** 🟡 RoomsBrowse, RoomCard, StaySearch, Login, Register, NotFound
- [ ] **6. [UI-06](UI-06-guest-booking-flow.md)** 🟡 BookingCheckout, BookingSummary, MyBookings

## Phase C: Staff console

- [ ] **7. [UI-07](UI-07-receptionist-today.md)** 🔴 Receptionist dashboard as the "Today" task list
- [ ] **8. [UI-08](UI-08-billing-and-services.md)** 🟡 Bill / folio (`BillTable`, `BillPaymentModal`), `ServiceRequest`, `GuestPicker`
- [ ] **9. [UI-09](UI-09-manager-admin-reports.md)** 🔴 Manager & admin: `BranchOverview`, charts, `ReportsPanel`, `ReportTable`, admin tabs, `RoomManager`, `CatalogueManager`

## Phase D: Cross-cutting and sign-off

- [ ] **10. [UI-10](UI-10-copy-errors-accessibility.md)** 🟡 Copy, error messages (`errorMessage()` per spec 11 §9.1), toasts, `ErrorBoundary`, accessibility
- [ ] **11. [UI-11](UI-11-verification-and-spec-sync.md)** 🟡 Full QA pass (every role, 375px + desktop), anti-slop checklist, spec sync

---

## Why this order

1. **UI-00 before UI-01:** the token values (`theme-color`, fallback gradient) and the logo colours have to match; settle the logo first.
2. **UI-01 breaks the build visually on purpose.** Once `theme.colors` replaces the defaults, every `navy-*`/`gold-*` class silently stops applying. Pages look unstyled in places until UI-02/03 and the page tasks land. Do UI-01 → UI-03 back to back, ideally on one branch, before merging to `main`.
3. **Primitives before pages:** most pages only need class swaps once `Button`, `Badge`, `Tabs` and `States` follow the spec.
4. **UI-10 is last before QA** because copy and error changes touch many files that the page tasks also edit; doing it after avoids merge conflicts.

## Open decisions (need the team's answer)

| # | Question | Recommendation |
|---|---|---|
| D1 | Spec 09 §1 (Home: "Hero banner with hotel imagery and tagline") contradicts spec 11 §7.1 (no hero overlay, availability search first). Which wins? | Spec 11; update spec 09 in UI-11. |
| D2 | The logo's green (~`#0F4A33`) is close to but not the same as `tea-900` `#173A2B` / `tea-700` `#24513D`. Recolour the logo or nudge the tokens? | Recolour the logo to the tokens (spec 11 is the source of truth). |
| D3 | Spec 11 §9.1 says `errorMessage()` lives in `src/api/client.js`; it actually lives in `src/utils/formatters.js`. | Keep it where it is; fix the spec in UI-11. |
| D4 | Home §7.1 item 4 ("During your stay" services list) needs the service catalogue. `GET /api/services` requires sign-in (any role, including guest), so anonymous visitors can't load it. | Omit the section for now, as spec 11 allows. Revisit if a public catalogue endpoint is added. |

## Progress log

_Add a dated line per finished task: what changed, what was verified, anything deferred._

- **2026-10-12 · UI-00:** Hand-drawn `src/assets/skynest-mark.svg` (circle `#EEEBE3`, bird and waves `#173A2B`; D2 settled by recolouring to the tokens) and `skynest-mark-mono.svg` (`currentColor`). Favicons, apple-touch icon and Android icons were re-rendered from the SVG (no halo) into `frontend/public/`; `favicon.ico` packs 16/32/48. The manifest now has a name and palette colours. `components/ui/Logo.jsx` takes `variant` mark/full, `tone` default/inverse and `size` sm/md/lg. `skynest_image_assets/README.md` marks the SVG as canonical. Verified: the mark at 16–256px on `paper-100`; `/favicon.ico` and the manifest are served in dev; `dist/` has the icons at the root.
- **2026-10-12 · UI-01:** `theme.colors`, `fontFamily` and `borderRadius` replace the Tailwind defaults. Added `shadow-overlay`, `text-2xs` and a `toast-in` keyframe. Also set **`borderColor.DEFAULT` = `ink-100`**: without it, any `border`/`divide` whose old `navy-*` colour disappeared rendered as black `currentColor` rules. `index.css` is rewritten with no global serif, a `tea-500` focus ring, a reduced-motion block, `.hatch` and `.tabular`; `.eyebrow` is deleted. Fonts are Inter 400/500/600 and Source Serif 4 600. `FALLBACK_GRADIENT` is a paper→tea wash. **Burn-down after Phase A: 351 leftover classes in 27 files** (largest: BookingCheckout 56, ServiceRequest 38, Home 28, BillTable 26, UsersTab 22, Login 20, GuestPicker 17, ReceptionistDashboard 15, RoomsBrowse 14, RoomCard 14, ErrorBoundary 14). `ui/`, Navbar, Layout and Footer are at 0.
- **2026-10-12 · UI-02:** Primitives rebuilt to spec 11 §5–6. `Badge` takes `status` / `balance` / `kind="problem"` (the `tone` prop is gone; "Balance due" always shows the amount). `Button` has `primary|secondary|ghost|danger`, with every `outline`/`dark`/`dangerOutline` call site migrated; `danger` is used only inside confirm dialogs (CatalogueManager, MyBookings, ReceptionistDashboard). `Tabs` are underline tabs with Arrow/Home/End keys and an optional `idBase` for `aria-controls`. `Field` links errors with `aria-describedby`. `Modal` focuses the first field, with no blur. `Toast` uses a left rule. `InlineAlert` has `error|info` only (warn/success callers mapped to info). New `SummaryStrip`. `StatCard` is restyled and marked deprecated until UI-07/UI-09. Verified: acceptance greps are clean, and only `Modal`/`Toast` use `shadow-overlay`. Deferred: callers still pass `icon` to `EmptyState` (ignored); `idBase` is not wired on pages yet (page tasks).
- **2026-10-12 · UI-03:** New Navbar: 56px, no blur, `Logo`, underline active link with `aria-current`, receptionist "Today", and the branch city and address for receptionist/manager from the public `GET /api/branches`. The user menu (Profile, Sign out → existing confirm) closes on Esc (focus returns), outside click and navigation. Signed-out visitors get a ghost "Sign in"; "Book a Stay" is removed. The mobile panel closes on Esc. New `Footer.jsx` (`ink-900`, three addresses and phones from the API, city links, Staff sign-in) is shown only to visitors and guests. Navbar BOM/mojibake removed. Verified in headless Edge: signed out (desktop and 375px), receptionist, manager, admin and guest; no horizontal scroll at 375px; sign-out returns to `/`. Known until UI-04: the Home hero text is invisible (its navy overlay no longer exists).
- **2026-10-12 · UI-04:** Home rebuilt to spec 11 §7.1:
  - The opening section has the name, one plain sentence and the search (the page's only `primary`). The photo sits beside it at `lg` and below the search on phones (the button bottom is at 645px on a 375×812 screen).
  - "Our hotels": three identical cards with the city, branch, address, `tel:` phone and "Rooms from" from the API, plus "See rooms in X".
  - "Room types": a compact table (a list on phones) with amenities as text, linking to `/rooms?type=`. The "Ready for your stay?" band, pill, eyebrows, hover lifts and star icon are gone.
  - `lib/media.js`: tags and the room-type blurb are deleted, `HERO_IMAGE` is replaced by `OPENING_IMAGE`, and every branch has `alt`. The photos were checked visually: Galle Face Green at night (Colombo), Kandy Lake with the hills (Kandy), Galle Fort ramparts and lighthouse (Galle), all under the Unsplash License, with each source page noted in a comment.
  - Blurbs use only address facts; "beside Galle Face Green" for Colombo is the one geographic inference, so the team should confirm it.
  - `BranchDrawing` is skipped (optional in §7.2; the photos already pass the cover-the-logo test).
- **2026-10-12 · UI-05:**
  - **RoomsBrowse:** `font-display` "Rooms" with a live summary ("4 rooms free in Kandy, 14/11–16/11 (2 nights)"). Booking mode shows "New booking: choose a room" in Inter. The branch segmented control is dropped (the branch is already in `StaySearch`). Amenity toggles are `rounded-sm` text chips. The empty state names the dates and branch and offers "Clear filters". Out-of-order URL dates show an inline error.
  - **RoomCard:** no overlay or hover lift. The title reads "Type · Room N", amenities are text, and the rate is tabular. "Book this room" becomes a real disabled `<button>` with the reason ("Under maintenance") when not bookable.
  - **StaySearch:** plain labels, "Check availability", `aria-describedby` on the date error, and a new `compact` prop (two columns, used on Home).
  - **Login, Register, NotFound:** single-column Login with the mark, a Show/Hide text toggle with `aria-pressed`, the §9.1 401 and 429 messages, and dev demo accounts inside `<details>`. Register shows the server 409 detail plus a "Sign in instead" link (409 can mean a duplicate email or NIC). NotFound has a role-aware button.
  - **Photo:** new `aspect` and `eager` props, `decoding="async"`.
  - **Verified in headless Edge:** wrong password gives "Email or password is incorrect."; 10 failures then gives "Too many sign-in attempts…"; signing up with kamal@mail.com shows the 409 message; no horizontal scroll at 375px; checked signed out, as a guest and as a receptionist in booking mode.
- **2026-10-12 · UI-06 (built, not ticked):**
  - **BookingCheckout:** hairline sections with Inter `h2`s, native radio payment list (values unchanged), and plain "N nights" text. The summary shows only rate × nights labelled **Estimate** ("Before tax and services…"); the browser-side 15% tax is removed and the now-unused `TAX_RATE` export deleted. Date errors are inline and mirror `create_booking`. A 409 shows the server detail plus "Choose other dates or another room." with alternatives. The confirmation reads "Booked: Single · Room 103, SkyNest Colombo" with the reference; the toast reads "Booked: Single 103, 01/12–03/12".
  - **MyBookings:** `font-display` heading, underline tabs wired with `idBase`/`tabpanel`, per-tab empty states, a bill modal titled "Bill · Suite Room 101, 27/09–01/10", and a cancel confirm stating "Room 103 at SkyNest Colombo becomes available for 01/12–03/12".
  - **BookingSummary:** shows the booked rate instead of a browser-computed total.
  - New `formatNumericDate` / `formatStayRange` helpers.
  - **Verified:** book as a guest (success plus toast), double-book gives 409, past check-in shows the inline error with the button disabled, the bill modal, and 375px layout.
  - **Blocked:** cancel returns **500** because the running database has no `cancel_booking` procedure (it predates ISSUE-08; the repo's `db/procedures/booking.sql` has it). Tick UI-06 after re-applying the procedures and re-testing cancel.
  - **Also open:** a receptionist checkout was rendered but not submitted (needs GuestPicker, UI-08). The server's 409 detail contains a raw room UUID ("Room e0000000-… is already booked"); fix the copy in the backend or in UI-10.
  - A test booking remains in the dev DB: Kamal Perera, Single Room 103, 01/12–03/12/2026.
  - **Burn-down after Phase B: 197** (ServiceRequest 38, BillTable 26, UsersTab 22, GuestPicker 17, ReceptionistDashboard 15, ErrorBoundary 14, ReportTable 11, BranchOverview 11, BillPaymentModal 11, others ≤ 7). Every Phase B file is at 0.
