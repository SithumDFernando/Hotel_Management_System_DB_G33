# UI-11 — Verification pass and spec sync

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | Whole frontend; `docs/specs/09_frontend_pages.md`, `docs/specs/11_design_system.md`, `README.md` (screenshots, if any) |
| **Spec** | 11 §10 (anti-slop checklist and three tests), `AGENTS.md` (verification before ticking) |
| **Depends on** | UI-00 to UI-10 |

## Goal

Prove the redesign is complete and consistent, and make the specs describe what was built.

## Implementation plan

### 1. Automated checks

Run from the repo root. Every command must return **nothing** (or only the documented exceptions):

```bash
# Off-palette or legacy classes
grep -rnoE "(navy|gold|emerald|sky|red|amber|slate|gray|blue|surface)-[0-9]+|bg-surface" frontend/src
# Banned shape, effect and type utilities
grep -rnoE "rounded-(xl|2xl|3xl)|shadow-(card|lift|sm|md|lg|xl)|backdrop-blur|hover:-translate|font-serif|eyebrow|uppercase tracking" frontend/src
# Raw hex in JSX (only chartTheme.js allowed)
grep -rnE "#[0-9a-fA-F]{6}\b" frontend/src --include=*.jsx
# Old Badge and Button APIs
grep -rnE "tone=\"|variant=\"(outline|dark|gold|dangerOutline)\"" frontend/src
# Banned copy
grep -rniE "luxury|curated|nestled|paradise|handcrafted|sanctuar|Submit|Oops|Success!|Something went wrong" frontend/src
# Encoding
grep -rn "Â" frontend/src
```

Then:

```bash
cd frontend && npm run build
```

Record the bundle size before and after in the README progress log (dropping Playfair and Inter 700 should shrink the font payload).

### 2. Manual pass: every role, two widths

Use the `run` skill (or `docker compose up` + `npm run dev`). Seed data from `db/seed/sample_data.sql`. Check each page at **375px** and **1280px**.

| Role | Pages | Things to click |
|---|---|---|
| Signed out | Home, Rooms, Login, Register, 404 | Check availability; branch links; room-type links; Book this room (sends you to sign in); wrong password; register with a duplicate email |
| Guest | Home, Rooms, BookingCheckout, MyBookings | Book a room; 409 overlap; view bill; cancel booking |
| Receptionist | Today, Rooms (booking mode), BookingCheckout, ServiceRequest, Bill modal | Check in; blocked check-in reason; add service; apply discount; partial and full payment; check out with a balance (402); cancel; register guest; print bill |
| Manager | Overview, Reports, ServiceRequest, BookingCheckout | Month switch; each report tab; chart tooltip and table alternative |
| Admin | All admin tabs | Create staff account; edit branch; room maintenance toggle; edit price; deactivate service |

For each page, confirm:

- [ ] Loading, empty, error and populated states (stop the backend to see the errors).
- [ ] Every button does something or shows a clear error.
- [ ] Keyboard only: Tab order is logical, the focus ring is visible, Esc closes dialogs.
- [ ] No horizontal page scroll at 375px.

### 3. Anti-slop review (spec 11 §10)

Go through the checklist item by item for Home, Rooms, Today and Overview. Then run the three tests and write the results in the README progress log:

1. **Cover the logo:** could this page be any hotel anywhere?
2. **Squint at a console screen:** does the eye land on what needs action?
3. **Count the colours:** only ink, paper, tea, and red where something is wrong?

### 4. Contrast and focus

- Check every text and background pair with a contrast checker; record any that fail AA and fix them.
- Run Lighthouse Accessibility on Home, Login, Today and Overview; target ≥ 95, and list any remaining issues.

### 5. Spec sync (same PR)

- **`09_frontend_pages.md`:**
  - §1 Home: replace "Hero banner with hotel imagery and tagline / Browse Rooms CTA" with the spec 11 §7.1 structure (decision D1).
  - §6 Receptionist: rename the landing to "Today", replace "KPI cards" with "summary strip", and describe the stacked task tables.
  - §7 Manager: "Branch Overview" begins with the summary strip; no occupancy ring.
- **`11_design_system.md`:**
  - §2.1: add `tea-300` (chart third series) with its hex value.
  - §9.1: correct the location of `errorMessage()` to `src/utils/formatters.js` (decision D3) and mention `fieldErrors()`.
  - §6: add `SummaryStrip`, `Logo`, `RowMenu` (if built), and `chartTheme.js` as the only place for chart hex values.
  - §11 Migration: mark it done, with the date.
  - Add a short **Brand** subsection: the SVG mark is canonical, its colours, minimum size 16px, and that the wordmark is set in Source Serif 4.
- **Root `README.md`:** update screenshots, if any exist.

### 6. Close out

- Tick UI-00 to UI-11 in [README.md](README.md) with a one-line ✅ note each (what was verified, and how).
- If a member's `docs/work/<member>/todo.md` has frontend items now done, tick them (only after the checks above; `AGENTS.md` rule).
- Suggest a conventional commit message; don't commit or push.

## Acceptance criteria

- [ ] All automated greps return nothing; `npm run build` passes.
- [ ] Manual pass completed for all five audiences at both widths, with findings fixed or logged.
- [ ] The three spec 11 tests pass for Home, Rooms, Today and Overview.
- [ ] Lighthouse Accessibility ≥ 95 on the four key pages (or remaining issues listed).
- [ ] Specs 09 and 11 match the shipped UI; decisions D1 to D4 are recorded as resolved.
