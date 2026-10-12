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
- [x] **6. [UI-06](UI-06-guest-booking-flow.md)** 🟡 BookingCheckout, BookingSummary, MyBookings

## Phase C: Staff console

- [x] **7. [UI-07](UI-07-receptionist-today.md)** 🔴 Receptionist dashboard as the "Today" task list
- [x] **8. [UI-08](UI-08-billing-and-services.md)** 🟡 Bill / folio (`BillTable`, `BillPaymentModal`), `ServiceRequest`, `GuestPicker`
- [x] **9. [UI-09](UI-09-manager-admin-reports.md)** 🔴 Manager & admin: `BranchOverview`, charts, `ReportsPanel`, `ReportTable`, admin tabs, `RoomManager`, `CatalogueManager`

## Phase D: Cross-cutting and sign-off

- [x] **10. [UI-10](UI-10-copy-errors-accessibility.md)** 🟡 Copy, error messages (`errorMessage()` per spec 11 §9.1), toasts, `ErrorBoundary`, accessibility
- [x] **11. [UI-11](UI-11-verification-and-spec-sync.md)** 🟡 Full QA pass (every role, 375px + desktop), anti-slop checklist, spec sync

---

## Why this order

1. **UI-00 before UI-01:** the token values (`theme-color`, fallback gradient) and the logo colours have to match; settle the logo first.
2. **UI-01 breaks the build visually on purpose.** Once `theme.colors` replaces the defaults, every `navy-*`/`gold-*` class silently stops applying. Pages look unstyled in places until UI-02/03 and the page tasks land. Do UI-01 → UI-03 back to back, ideally on one branch, before merging to `main`.
3. **Primitives before pages:** most pages only need class swaps once `Button`, `Badge`, `Tabs` and `States` follow the spec.
4. **UI-10 is last before QA** because copy and error changes touch many files that the page tasks also edit; doing it after avoids merge conflicts.

## Decisions (all resolved 2026-10-12)

| # | Question | Recommendation |
|---|---|---|
| D1 | Spec 09 §1 (Home: "Hero banner with hotel imagery and tagline") contradicts spec 11 §7.1 (no hero overlay, availability search first). Which wins? | Spec 11; update spec 09 in UI-11. **Resolved:** spec 11 won; spec 09 §1 now describes the §7.1 structure (UI-11). |
| D2 | The logo's green (~`#0F4A33`) is close to but not the same as `tea-900` `#173A2B` / `tea-700` `#24513D`. Recolour the logo or nudge the tokens? | Recolour the logo to the tokens (spec 11 is the source of truth). **Resolved:** the logo was recoloured to the tokens (UI-00); spec 11 §6.1 records it. |
| D3 | Spec 11 §9.1 says `errorMessage()` lives in `src/api/client.js`; it actually lives in `src/utils/formatters.js`. | Keep it where it is; fix the spec in UI-11. **Resolved:** kept in `utils/formatters.js` with `fieldErrors()`; spec 11 §9.1 corrected (UI-11). |
| D4 | Home §7.1 item 4 ("During your stay" services list) needs the service catalogue. `GET /api/services` requires sign-in (any role, including guest), so anonymous visitors can't load it. | Omit the section for now, as spec 11 allows. Revisit if a public catalogue endpoint is added. **Resolved:** the section is omitted; spec 09 §1 notes why (UI-11). |

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
  - **Blocked:** cancel returns **500** because the running database has no `cancel_booking` procedure (it predates ISSUE-08; the repo's `db/procedures/booking.sql` has it). Tracked as [ISSUE-15](../issues/ISSUE-15-stale-dev-database-cancel-500.md); tick UI-06 after it lands and cancel is re-tested.
  - **Also open:** a receptionist checkout was rendered but not submitted (needs GuestPicker, UI-08). The server's 409 detail contains a raw room UUID ("Room e0000000-… is already booked"); fix the copy in the backend or in UI-10.
  - A test booking remains in the dev DB: Kamal Perera, Single Room 103, 01/12–03/12/2026.
  - **Burn-down after Phase B: 197** (ServiceRequest 38, BillTable 26, UsersTab 22, GuestPicker 17, ReceptionistDashboard 15, ErrorBoundary 14, ReportTable 11, BranchOverview 11, BillPaymentModal 11, others ≤ 7). Every Phase B file is at 0.
- **2026-10-12 · UI-06 (ticked):** ISSUE-15 rebuilt the dev DB. Cancel re-tested in headless Edge. From My Bookings as Kamal, the confirm names Room 103 and 01/12–03/12, the toast reads "Cancelled: Single Room 103, 01/12–03/12", and the booking moves to the Cancelled tab. From the Receptionist dashboard (Colombo, Upcoming) the row leaves the list; its toast copy is UI-07's job. A receptionist booking for a guest was submitted with GuestPicker at 1280px (Nimali, "Booked: Single · Room 103, SkyNest Colombo" + toast) and 375px (Kamal; the summary and button sit below the form). Every UI-06 criterion is met. The dev-DB test bookings from before the rebuild are gone; current test data is Room 103 booked for Nimali 10/12–12/12 and Kamal 14/12–15/12, plus two cancelled bookings (Kamal Room 103 01/12–03/12, Nimali Room 102 05/12–08/12).
- **2026-10-12 · UI-07:**
  - **ReceptionistDashboard** is now "Today": `h1` + date, then a `SummaryStrip` with the same four values (no `StatCard`, greeting or eyebrow).
  - **Sections:** three stacked sections (stacked was chosen over tabs): **Departures due**, **Arrivals today**, **Staying on** (in-house guests not due out, so nobody is listed twice; the strip's "In-house" still counts everyone). Upcoming arrivals sit in a collapsed `<details>`. Fixed column widths keep the sections aligned.
  - **Actions:** one visible action per row: Check in (`primary`), Check out (`primary`), Add service (`secondary`). The rest are in the new **`ui/RowMenu.jsx`** (⋯), which is portalled so the table's scroll box can't clip it. Enter/Space opens it, arrows move, Esc closes and returns focus, and focus returns to ⋯ after a dialog it opened closes.
  - **Blocked check-in** reasons are shown as text in the row ("Arrives on 10/12/2026").
  - **402 on check-out** opens the bill with "Balance due: LKR 79,350.00. Take payment before checking out." (amount parsed from the server detail).
  - **Confirms:** "Check out Kamal Perera? Room 101 becomes available…" and "Cancel this booking? … Room 103 becomes available for 14/12–15/12".
  - **Toasts:** "Checked in: …", "Checked out: …", "Cancelled: …".
  - **Search** filters all sections at once; Refresh is a ghost icon button with "Updated HH:MM". Phones get stacked row cards.
  - The branch fetch (only used for the old eyebrow) is gone.
  - **Not done:** "Take payment" as the row action for departures needs the balance, which `GET /bookings` doesn't return. Adding a fetch is out of scope for a restyle, so Departures always shows Check out, and the 402 path covers the balance.
  - **Verified in headless Edge** (rec.colombo, 1280 and 375): check in, add service, check out → 402 → discount → part payment → full payment → "Check out now", cancel from the Upcoming row menu, search, and the keyboard row menu.
- **2026-10-12 · UI-08:**
  - **BillTable** is a receipt: a `<dl>` with tabular right-aligned figures, an `ink-900` rule above Total, Paid to date, then a `signal` "Balance due" block (with an optional secondary "Take payment" that jumps to the form) or the "Paid" chip. It has a "Bill calculated" time, a Payments table, and takes an optional `booking` prop for the "Room · Suite 101 · 4 nights" label. Every figure is from `BillOut`; `outstanding_balance` comes from the API.
  - **BillPaymentModal:**
    - Title "Bill · Kamal Perera, Suite 101" with the reference and dates.
    - A `notice` prop shows the 402 banner and focuses the amount.
    - "Apply discount" reveals the field; server errors (e.g. "Discount must be between 0 and the bill subtotal") show under it instead of replacing the whole modal.
    - Take payment: radio methods, a "Use full balance" link, and errors under the field.
    - Toasts: "Payment taken: LKR 2,500.00 by Credit Card, Priya Rajapakse" and "Bill recalculated for …: discount LKR 500.00".
    - Footer: Close / Print bill / Check out now.
  - **`Modal size="lg"`** is full height on phones.
  - **`formatDateTime`** is now `DD/MM/YYYY HH:MM` (only BillTable used it).
  - **ServiceRequest:** "Add services · guest, Room N" header with stay, status and reference. Catalogue category pills become underline `Tabs`. Each row has a quantity field (1–99, inline error) and a `secondary` "Add" (hidden with an explanation unless checked in). "This stay" table, "Services total" from the API, "Open bill". The back link reads "Today", or "Overview" for managers. A `min-w-0` fix stops the tabs widening the page at 375px.
  - **GuestPicker:** "Find guest" label with "Name, NIC/passport or email" help (what the API actually searches), result list, selected guest on `tea-100`, and a ghost "Register new guest". Field-labelled validation copy; toast "Registered: …". A 409 shows the server detail + "Open the existing guest instead." + a "Find {NIC}" button that searches for them (the API doesn't return the existing id).
  - **Verified in headless Edge** as receptionist and manager: add service (and qty 0 error), discount (and over-subtotal error), part and full payment, print (print-media render shows only the folio), the 402 banner, the non-checked-in explanation, the GuestPicker no-match, validation and 409 → find → pick, modal full height at 375px.
  - **Test harness note:** the 375px horizontal-scroll check now compares against the requested width; the old check missed overflow because mobile emulation widens `innerWidth`. Checkout and MyBookings re-checked clean.
  - **Burn-down (class-precise grep, the UI-01 §5 colour names counted only after a Tailwind prefix, which reproduces 197 at the Phase B commit): 90.** Every UI-07/08 file is at 0.
- **2026-10-12 · UI-09:**
  - **Dashboards:** Manager and Admin headers are the tab name (Inter 20px) with no eyebrows. Underline `Tabs` are wired with `idBase` to a `tabpanel`. Filters have visible labels. The manager's branch fetch (eyebrow only) is gone. The admin "Users" tab is renamed **"Accounts"**, because it lists guest logins too, so "Staff accounts" would be wrong. The navbar labels now match the tabs ("Overview", "Accounts").
  - **BranchOverview:**
    - **Summary strip:** "Rooms occupied today 2 of 11 (18%)", revenue and collected for the month, and "Balance due LKR 54,750.00 / 2 bills with a balance" (`signal` only when > 0). Money is in full `LKR` format. `OccupancyRing` and `StatCard` are gone, and **`StatCard.jsx` is deleted**.
    - **Revenue chart:** stacked `tea-700`/`ink-300` from the new **`src/lib/chartTheme.js`** (the only hex values in the frontend's JSX/JS apart from UI-01's `FALLBACK_GRADIENT`). Rounded 0-based ticks with an "LKR" label, total labels above the bars, 2px surface gaps, a text legend, a token tooltip, `role="img"` with a summary, and a "Show as table" `<details>`.
    - **Validator:** the dataviz validator gives the pair ΔE 34–36 (CVD-safe). The lightness/chroma "fails" come from spec 11's muted palette, and `ink-300` is under 3:1 on white, so the labels and table view are required, and both are present.
    - **Top services** now reads "Top services by quantity · All time", matching `v_top_services` (RANK by quantity, no date filter), with revenue shown as secondary text.
  - **ReportsPanel / ReportTable:** Inter 16px titles, `paper-200` header, sentence-case sortable headers, numeric dates, and labelled filters ("Balance due only" instead of "Unpaid only"). Red appears only for amounts > 0. The 🎉 is removed. The occupancy empty state names the dates ("No rows for 12/10/2026. Choose a wider date range.").
  - **Admin tabs:**
    - **Branches:** City/Branch/Phone/Manager table, "Edit branch · SkyNest Kandy", field-labelled validation, toasts "Saved: …" / "Added: …".
    - **Accounts:** role as plain text and no avatars. Guest rows say "Managed by the guest" instead of a disabled button. The create flow shows a `paper-200` "This password is shown once…" note, a monospace `<dl>` and "Copy email and password". The self-demotion 409 shows inline.
    - **Bookings:** labelled filters and numeric dates.
  - **RoomManager:** a Branch column when showing all branches. "Mark as maintenance" / "Return to service" buttons; Occupied rooms show "Guest checked in" as text.
  - **CatalogueManager:** sentence-case category headings, `secondary` "Save price", and `ghost` Deactivate behind "Deactivate Laundry? It won't be offered for new orders. Past charges stay on bills." "Add service" opens a `Drawer`. Toasts name the service and price.
  - **Bug fixed along the way:** an `sr-only` "Actions" header in a table inside an unpositioned `overflow-x-auto` escaped the scroll box and widened the page at 375px (Accounts was 519px wide). The scroll wrappers in UsersTab, BranchesTab, RoomManager and ReceptionistDashboard are now `relative`.
  - **Verified in headless Edge:**
    - **Kandy manager:** overview at 1280 and 375, all five reports, maintenance toggle both ways, price edit (restored), deactivate confirm → Keep.
    - **Admin:** overview chart and table view, branch edit + revert, add-branch validation, create receptionist (validation + generated password), self-demotion → "You cannot remove your own admin role.", billing → View bill, bookings status filter, room toggle, price edit (restored), add service → deactivate.
    - **375px sweep:** all 7 admin tabs, 4 manager tabs and 4 reports: no page-level horizontal scroll.
  - **Open (not a restyle; logged for a separate fix):** Billing summary → "View bill" on a booking that has no bill and isn't Checked-In or Checked-Out (e.g. the cancelled Galle seed booking) opens the modal, which calls `generate_bill` and shows "Booking must be Checked-In or Checked-Out to generate a bill" with a Retry that can't succeed. The old modal did the same. Fix: hide "View bill" for rows without a bill unless the booking is in-house, or have the modal fall back to `GET` for non-billable bookings.
  - **Burn-down: 20** (ErrorBoundary 14, Profile 6, both UI-10). Every Phase C file is at 0.
- **2026-10-12 · UI-10:**
  - **`errorMessage(err, fallback | { fallback })`** now follows spec 11 §9.1. A server `detail` is shown only when readable (under 200 characters, with no SQL, asyncpg, constraint or UUID text).
    - 401 → "Email or password is incorrect." (also matches the API's "Invalid credentials") or "Your session has ended. Sign in again."
    - 403 → "You don't have access to this record." (keeps the actionable "no guest profile… front desk" detail).
    - 404 "X not found" → "This x no longer exists. Refresh the list."
    - 422: a custom sentence is shown as is; a schema list gives "Some fields need attention…".
    - 429 → the sign-in message.
    - 503 → the server detail (the ISSUE-15 "database is out of date" message); other 5xx → the server-failure sentence.
    - No response → "Can't reach the server…".
  - **`fieldErrors(err)`** maps a FastAPI 422 list to `{ field: message }` with plainer wording ("Use at most 100 characters.", "This field is required."). Wired into Register, GuestPicker, UsersTab, BranchesTab, Profile (both forms), CatalogueManager (one alert naming each field) and BillPaymentModal (amount).
  - **`useFetch(..., { failMessage })`** puts what failed first ("Couldn't load rooms. The server couldn't complete this…"). It's used by every page that shows a load error; the hand-built prefixes from UI-07/08/09 now use it.
  - **ErrorBoundary:** "This page couldn't be shown." / "Reload the page. If it keeps happening, tell the system admin." / "Reload page" + "Go to home page". Logs to the console in dev only.
  - **Toasts** match the UI-10 table: "Booked: Single Room 103, …", "Cancelled: booking SN-…. Room 103 is free for …" (guest and receptionist), "Bill recalculated for … with a LKR 500.00 discount", "Added: 2 × Minibar Restock to Room 102, …", "Account created. You're signed in as …", "Created: staff account for …", "Saved: Laundry now LKR … for new orders", "Saved: personal details for …".
  - **Profile.jsx** restyled (Inter 20px header, no eyebrow, sentence-case read-only fields). "Current password is incorrect." now shows under its field.
  - **409 room UUID fixed at the source:** `trg_check_double_booking` reads the room number while taking its row lock, so the 409 reads "Room 103 is already booked for the selected dates." `test_double_booking.py` asserts the exact detail. Spec 04 is updated. Fresh `run_all.sql` build: 253 passed. The trigger was applied to the dev DB in one transaction (drop the trigger, re-run the trigger file).
  - **Removed unused helpers:** `formatDate`, `formatShortDate` and `initials`, so no page can mix date formats again.
  - **Copy sweep:** the plan's grep only matches code identifiers (`submit`, `type="submit"`). With those excluded, there are 0 hits, and no visible "Submit".
  - **Accessibility:**
    - Every table has an accessible name (`aria-label` or `aria-labelledby`), and every icon-only button has an `aria-label`.
    - Every input has a label. The exception is the search boxes, which use `aria-label` + a descriptive placeholder.
    - No action uses `title` alone for a reason, and no text uses `tea-500` or `ink-300` on a light surface (footer `ink-300` text on `ink-900` is about 8:1).
    - Error toasts are `role="alert"` in a polite region. The `/services` page title is now "Add services".
  - **Verified in headless Edge, forcing each status:**
    - 401 (wrong password), 403 (Galle receptionist opening a Colombo booking), 404 (unknown booking id), 409 (double booking → server detail + "Choose other dates or another room.").
    - 422 (300-character branch name → "Use at most 100 characters." under the field), 429 (11 failed sign-ins).
    - Network (API blocked), 5xx (backend container stopped, then restarted), ErrorBoundary (forced through the React fiber).
    - Profile save, and the wrong current password, at 1280 and 375.
  - **Burn-down: 0.**
- **2026-10-12 · UI-11:**
  - **Automated greps (§1):** all six return nothing, apart from documented false positives. Grep 4's `tone="` hits are the current `InlineAlert tone="info"` and `Logo tone="inverse"` props (Badge has no `tone`); grep 5's "Submit" hits are code identifiers only (`onSubmit`, `type="submit"`). The class-precise burn-down is **0**. `npm run build` passes.
  - **Bundle (pre-redesign `e63bf6c` → now):**
    - CSS 31.5 → 26.0 kB (gzip 6.4 → 6.0).
    - Main JS 323.0 → 339.4 kB (+16 kB for the new primitives and helpers); recharts chunk 404.5 → 394.8 kB.
    - Google Fonts request: 7 files → 4 (Inter 400/500/600/700 + Playfair 500/600/700 → Inter 400/500/600 + Source Serif 4 600).
  - **Manual pass (headless Edge):** 29 pages × 1280/375 for signed-out, guest, receptionist, Kandy manager and admin. All 58 loads have an `h1` and a route title, with no console errors, failed requests or page-level horizontal scroll (the check compares against the requested width).
    - Clicked this round: home search → `/rooms` with the live summary, branch and room-type links, signed-out "Book this room" → `/login?next=…`, manager month switch and chart tooltip.
    - Covered earlier this session: guest book/409/bill/cancel, every receptionist action, and the admin create/edit/toggle/price/deactivate flows.
    - Error states: shown with the backend stopped and with the API blocked (UI-10).
  - **Lighthouse Accessibility 12.6 (Edge, signed in where needed): Home 100, Login 100, Today 100, Overview 100.**
  - **Contrast:** all 17 text/background pairs in use pass AA. The lowest is `signal-700` on `signal-100` at 5.58:1; footer `ink-300` on `ink-900` is 7.67:1.
  - **Spec 11 §10 tests:**
    - **Home:** passes (real photos and addresses of Galle Face, Kandy Lake and Galle Fort; the search is the one emphasis; ink/paper/tea only).
    - **Rooms:** passes, but logged: every card has a primary "Book this room". That was accepted in UI-05 as a list-row action, like Today's rows; revisit if the team wants one emphasis per screen strictly.
    - **Today:** passes (the eye lands on the Check out / Check in buttons; red only on "Overdue checkout").
    - **Overview:** passes (strip → chart → top services; red only on Balance due).
  - **Spec sync:**
    - **09:** route map; Home (§7.1 structure, D1, public `/api/branches`, D4); ServiceRequest; Receptionist "Today" (summary strip, stacked task tables, RowMenu, 402 copy); Manager Overview (strip, no ring, top services by quantity); Admin "Accounts"; shared components (SummaryStrip/RowMenu/Logo/chartTheme, new BillTable/BillPaymentModal props); navbar labels; sign-out toast; ErrorBoundary copy.
    - **11:** `tea-300` row; SummaryStrip/RowMenu/Logo in §6; chartTheme as the only chart hex; new §6.1 Brand; §9.1 location + `fieldErrors()` + `failMessage` + 503; §11 marked done.
    - D1–D4 are recorded as resolved above. No member `todo.md` had open frontend items.
  - **Still open:** the billing-report "View bill" on a non-billable booking without a bill (logged under UI-09).
  - **Dev DB test data:** a `qa.rec.…@skynest.lk` receptionist and the deactivated "QA Late Checkout" service remain. Other test edits were reverted.
