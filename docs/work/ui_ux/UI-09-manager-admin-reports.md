# UI-09 — Manager & admin: overview, charts, reports, management tabs

| | |
|---|---|
| **Effort** | 🔴 Large |
| **Area** | `frontend/src/pages/{ManagerDashboard,AdminDashboard}.jsx`, `frontend/src/components/{BranchOverview,ReportsPanel,ReportTable,RoomManager,CatalogueManager}.jsx`, `frontend/src/components/admin/{BookingsTab,BranchesTab,UsersTab}.jsx` |
| **Spec** | 11 §6 (summary strip, tables, charts), §8 (Overview starts with the summary strip, then revenue chart and top services), §5, §9; 09 §7–8 |
| **Depends on** | UI-01, UI-02 (`SummaryStrip`, `Tabs`, `Badge`, `Modal`) |

## Current state

**ManagerDashboard / AdminDashboard**
- Eyebrows ("Executive overview · …", "Administration · Group operations"); Playfair `h1`s ("Performance & financials").
- Pill `Tabs`.

**BranchOverview** ([BranchOverview.jsx](../../../frontend/src/components/BranchOverview.jsx))
- `OccupancyRing`, an SVG **donut** (banned by spec 11 §6), hard-coded `#e3e9f1` / `#7a5c00`.
- Three `StatCard` tiles (rooms occupied, revenue, outstanding balances, in red tone).
- Recharts stacked bar with **hard-coded hex fills** `#0b1b2e` (room) and `#d9ae45` (services), grid `#e3e9f1`. These aren't caught by the Tailwind palette swap.
- "Top performing services" subtitle says **"By revenue"**, but the view ranks by **quantity** (known issue, TASKLIST task 15 report).

**ReportsPanel / ReportTable**
- Playfair table titles; `navy-50` header rows; "Balance due" chip without an amount (`tone="amber"`).

**Admin tabs** (`UsersTab` 281 lines, `BranchesTab`, `BookingsTab`), **RoomManager**, **CatalogueManager**
- Navy colours; role chips in colour tones (`ROLE_TONE`); uppercase category headings; `rounded-xl` drawers and inputs.
- Toasts: "Branch updated", "Account updated", "Copied" (generic; see UI-10).

## Goal

**Manager Overview:** a branch manager sees in one glance how the branch is doing this month (occupancy, revenue, money owed) and what sells.

**Admin:** manage branches, staff accounts, rooms and the service catalogue with plain, dense forms and tables.

## Implementation plan

### 1. Page headers

- Manager: `h1` "Overview" / "Reports" (matching the active tab), Inter 20px/600. The branch is in the navbar (UI-03). Remove eyebrows.
- Admin: `h1` = the tab title ("Branches", "Staff accounts", "Rooms", "Service catalogue", "Reports", "Bookings"). Remove the "Administration · Group operations" eyebrow.
- Underline `Tabs` (UI-02). Keep the `?tab=` URL sync.

### 2. BranchOverview: summary strip, then the chart, then top services

```
October 2026 · SkyNest Kandy                                   [month ▾]
Rooms occupied 3 of 4 (75%) │ Revenue LKR 412,000.00 │ Collected LKR 380,000.00 │ Balance due LKR 32,000.00 (2 bills)

Monthly revenue, last 6 months (LKR)
 ▇▇ room  ░░ services    (stacked bars, value labels on top)

Top services this month, by quantity
 1. Breakfast        42
 2. Laundry          18
 …
```

- **Delete `OccupancyRing`**; occupancy becomes text in the strip ("3 of 4 (75%)").
- **Delete the `StatCard`s** → `SummaryStrip`. "Balance due" is the only figure in `signal-700`, and only when it's > 0. Use **`formatCurrency`** (full `LKR 412,000.00`) rather than `formatCompactCurrency` in the strip, per spec 11 §9 money format. Compact values are allowed only on chart axes.
- **Chart (spec 11 §6):**
  - Colours from tokens: room = `tea-700` `#24513D`, services = `ink-300` `#A9B2AC`; grid `ink-100` `#E4E7E3`; axis text `ink-600`. Put the hex values in **one exported constant** (e.g. `src/lib/chartTheme.js`), commented as mirroring `tailwind.config.js`, so they live in one place.
  - The y-axis starts at zero and is labelled "LKR"; x-axis months as "May", "Jun"…
  - Direct total labels above each bar where readable; a legend with plain text; no gradients; no radius on the stacked top except 2px.
  - Tooltip: `paper-50` box, `shadow-overlay`, figures `tabular-nums`.
  - Accessibility: `role="img"` + `aria-label` summarising the trend, plus a visually hidden table of the same numbers (or a "Show as table" toggle).
- **Top services:** an ordered list with right-aligned numbers. **Fix the label to match the data:** "by quantity" (the copy fix belongs in this PR). If the team instead wants ranking by revenue, that's a DB/view change in a **separate** PR; note it in the README.
- **States** per block: the strip shows `–` while loading; the chart shows a skeleton the same height as the chart; errors show `ErrorState` with Retry per block; no data shows "No checked-out stays in this period yet."

### 3. ReportsPanel and ReportTable

- Table titles in Inter 16px/600.
- Table style per spec 11 §6: white, hairline rows, `paper-200` sticky header, sentence-case headers, numbers right-aligned `tabular-nums`, scrolls inside its container.
- Billing summary row status: `<Badge balance={r.outstanding_balance} />` (shows "Balance due LKR …" or "Paid"); "No bill" stays neutral.
- Date-range and branch filters use `Field`; "Export CSV" (if present) is `secondary`.
- Empty: "No rows for 01/10/2026–12/10/2026. Choose a wider date range."

### 4. Admin: BranchesTab

- Table: city, name, address, phone, manager. Edit opens the drawer (a `Modal` variant, side panel, `shadow-overlay`).
- Drawer title "Edit branch · SkyNest Kandy" / "Add branch". Buttons "Save changes" / "Add branch".
- Toasts: "Saved: SkyNest Kandy" / "Added: SkyNest Matara" (UI-10).

### 5. Admin: UsersTab

- Table: name/email, role (plain text, **no colour per role**), branch, status. Delete `ROLE_TONE`.
- "Create staff account" (`primary`) opens a drawer. Spec 11 §9 lists this exact label.
- Generated-password screen: monospace field, `secondary` "Copy email and password"; toast "Copied email and password". A visible warning in `ink-900` on `paper-200` (not red; nothing is wrong): "This password is shown once. Share it with the staff member now."
- Self-demotion block (409 from ISSUE-06): show the server detail inline in the drawer.

### 6. Admin: BookingsTab

Same table style. Filters: branch, status, date range. Status via `Badge`. Empty and error states.

### 7. RoomManager

- Table: room, type, rate (`tabular-nums`), status `Badge`, action "Mark as maintenance" / "Return to service" (`secondary`).
- Keep the existing toasts (they're already specific): "Room 204 marked maintenance", "Room 204 is back in service. A guest is checked in, so it shows as occupied."

### 8. CatalogueManager

- Category headings sentence case (not uppercase bold).
- Price edit inline, with a "Save price" `secondary` button; deactivate goes behind a confirm: "Deactivate Laundry? It won't be offered for new orders. Past charges stay on bills." with `danger` "Deactivate".
- "Add service" (`primary`) opens a drawer.

## Files touched

- `frontend/src/pages/ManagerDashboard.jsx`, `AdminDashboard.jsx`
- `frontend/src/components/BranchOverview.jsx`, `ReportsPanel.jsx`, `ReportTable.jsx`, `RoomManager.jsx`, `CatalogueManager.jsx`
- `frontend/src/components/admin/BookingsTab.jsx`, `BranchesTab.jsx`, `UsersTab.jsx`
- `frontend/src/lib/chartTheme.js` (new)
- Delete `frontend/src/components/ui/StatCard.jsx` (its last user goes away here, after UI-07)

## Out of scope

- Changes to report queries, views, or API parameters.
- An admin branch selector in the header.

## Acceptance criteria

- [ ] No donut or ring, no `StatCard`, no eyebrow, no Playfair in the console.
- [ ] `grep -rnE "#[0-9a-fA-F]{6}" frontend/src --include=*.jsx` returns only `chartTheme.js` (or nothing).
- [ ] Revenue chart: tea-700 + ink-300 series, zero baseline, LKR axis label, value labels, an accessible table alternative.
- [ ] Top services subtitle matches the actual ranking.
- [ ] Money in summaries uses the full `LKR 12,400.00` format; "Balance due" always carries an amount.
- [ ] Role and status are text-first; no per-role colours.
- [ ] Destructive admin actions (deactivate service) confirm with a consequence sentence.
- [ ] Tables scroll inside their container at 375px; no page-level horizontal scroll.
- [ ] `npm run build` passes; tested as a manager (Kandy) and as an admin (all tabs, create user, edit branch, toggle room maintenance, edit price).
