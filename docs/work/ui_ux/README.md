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

- [ ] **0. [UI-00](UI-00-brand-assets.md)** 🟢 Brand assets: clean SVG emblem, `Logo` component, `frontend/public/` with favicons + manifest
- [ ] **1. [UI-01](UI-01-design-tokens.md)** 🟡 Design tokens: replace the palette, fonts, radii, shadows; rewrite `index.css` base and component classes
- [ ] **2. [UI-02](UI-02-ui-primitives.md)** 🔴 UI primitives: `Badge`, `Button`, `Field`, `Tabs`, `Modal`, `Toast`, `States`, `Pagination`, `SummaryStrip` (replaces `StatCard`)
- [ ] **3. [UI-03](UI-03-navbar-footer-layout.md)** 🟡 Navbar, footer and page layout

## Phase B: Public site

- [ ] **4. [UI-04](UI-04-home-page.md)** 🔴 Home page rebuilt to spec 11 §7.1 + plain-fact rewrite of `lib/media.js`
- [ ] **5. [UI-05](UI-05-rooms-and-auth-pages.md)** 🟡 RoomsBrowse, RoomCard, StaySearch, Login, Register, NotFound
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
