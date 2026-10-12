# UI-02 — UI primitives (`src/components/ui/`)

| | |
|---|---|
| **Effort** | 🔴 Large |
| **Area** | `frontend/src/components/ui/*.jsx` |
| **Spec** | 11 §5 (status display), §6 (components) |
| **Depends on** | UI-01 |

## Current state

| Primitive | Problem |
|---|---|
| `Badge.jsx` | Six tones (`green`, `blue`, `amber`, `red`, `gray`, `navy`) built on emerald/sky/gold/red; `rounded-full` pills. **Maintenance and Cancelled are red**, which reads as "error". "Balance due" has no amount. |
| `Button.jsx` | Variants `primary` (gold), `dark` (navy), `gold`, `outline`, `ghost`, `danger`, `dangerOutline`; `rounded-xl`, `shadow-sm`. In use: `outline` ×21, `ghost` ×10, `dark` ×4, `dangerOutline` ×4, `danger` ×3. |
| `Field.jsx` | Errors in `red-500`/`red-600`. |
| `Tabs.jsx` | Pill tabs: `bg-navy-50` track, `bg-navy-900` active pill, `rounded-full` count bubble. |
| `Modal.jsx` | `navy-100` borders. |
| `Toast.jsx` | Emerald/red/navy boxes with `shadow-lift`, `rounded-xl`. |
| `States.jsx` | `rounded-2xl` empty and error boxes; red error box; "Failed to load data." fallback; `InlineAlert` has a gold "warn" tone (no amber states in spec 11). |
| `StatCard.jsx` | KPI tile with coloured icon square and Playfair number: the "KPI tile wall" spec 11 §10 bans. |
| `Pagination.jsx`, `Spinner.jsx`, `Icon.jsx` | Navy colours only. |

## Goal

Every primitive matches spec 11 §6. Most pages then need only class swaps and variant renames, not redesigns.

## Implementation plan

### 1. `Badge.jsx`: status as a word

Build it from the spec 11 §5 table. The API changes from `tone` to `status`, plus a `kind` for non-status labels.

```jsx
const STATUS = {
  // room
  Available:     { label: 'Available',   cls: 'bg-tea-100 text-tea-900' },
  Occupied:      { label: 'Occupied',    cls: 'bg-paper-200 text-ink-900' },
  Maintenance:   { label: 'Maintenance', cls: 'bg-paper-200 hatch text-ink-600' },
  // booking
  Booked:        { label: 'Booked',      cls: 'bg-paper-50 text-ink-900 border border-ink-300' },
  'Checked-In':  { label: 'Checked in',  cls: 'bg-tea-700 text-white' },
  'Checked-Out': { label: 'Checked out', cls: 'bg-paper-200 text-ink-600' },
  Cancelled:     { label: 'Cancelled',   cls: 'text-ink-600 border border-dashed border-ink-300' },
  // bill
  Paid:          { label: 'Paid',        cls: 'bg-tea-100 text-tea-900' },
};

// <Badge status="Checked-In" />                 → "Checked in"
// <Badge balance={12400} />                     → "Balance due LKR 12,400.00" (signal) or "Paid" when 0
// <Badge>Departs today</Badge>                  → neutral paper-200 chip
// <Badge kind="problem">Overdue checkout</Badge> → signal chip, problems only
```

- Shared chip classes: `inline-flex items-center rounded-sm px-2 py-0.5 text-2xs font-medium whitespace-nowrap`.
- `balance > 0` renders `bg-signal-100 text-signal-700` with `formatCurrency(balance)`. **Never "Balance due" without the amount.**
- Delete the `tone` prop. Update every caller (list below) so the build fails loudly rather than drifting.

**Callers to update** (all in this PR, since they're one-line changes):

| File | Current | New |
|---|---|---|
| `admin/BookingsTab.jsx:48`, `BookingSummary.jsx:20`, `ReportsPanel.jsx:60,64`, `RoomManager.jsx:54`, `BookingCheckout.jsx:180`, `ReceptionistDashboard.jsx:244`, `ServiceRequest.jsx:118` | `<Badge status=…/>` | unchanged API |
| `BillTable.jsx:30` | `tone={settled ? 'green' : …}` | `<Badge balance={…} />` |
| `ReportsPanel.jsx:92` | `tone="amber">Balance due` | `<Badge balance={r.outstanding_balance} />`; "No bill" stays neutral |
| `ReceptionistDashboard.jsx:245-246` | `tone="red">Overdue …` | `kind="problem"` (a real problem, so red is allowed) |
| `ReceptionistDashboard.jsx:247` | `tone="amber">Departs today` | neutral chip |
| `BookingCheckout.jsx:211` | `tone="amber">{n} nights` | plain text, not a chip |
| `RoomCard.jsx:77` | `tone=green/gray` | `<Badge status="Available" />` or neutral |
| `ServiceRequest.jsx:217` | `tone="green">Live folio` | remove (decorative badge, §1.5) |
| `admin/UsersTab.jsx:260` | `tone={ROLE_TONE[role]}` | neutral chip, role as text ("Receptionist") |

### 2. `Button.jsx`

```js
const VARIANTS = {
  primary:   'bg-tea-700 text-white hover:bg-tea-900',
  secondary: 'border border-ink-100 bg-paper-50 text-ink-900 hover:bg-paper-200',
  ghost:     'text-tea-700 hover:bg-tea-100',
  danger:    'bg-signal-700 text-white hover:brightness-95', // only inside a confirm dialog
};
const SIZES = { sm: 'h-8 px-3 text-[13px] gap-1.5', md: 'h-9 px-4 text-sm gap-2', lg: 'h-11 px-5 text-[15px] gap-2' };
// base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 disabled:…'
```

**Variant migration** (rename at every call site):

| Old | New | Notes |
|---|---|---|
| `outline` (×21) | `secondary` | |
| `dark` (×4) | `primary` or `secondary` | `ReceptionistDashboard` "Check out" becomes `primary` only if it's the row's one action; otherwise `secondary`. |
| `gold` | `primary` | |
| `dangerOutline` (×4) | `secondary` | The row-level "Cancel" opens a confirm; only the confirm button is `danger`. |
| `danger` (×3) | `danger` | Check each is inside a confirm `Modal`. |

Add `aria-busy` when `loading`. Keep the `to` → `<Link>` behaviour.

### 3. `Field.jsx`

- The label sits above in `.label` style (13px, sentence case, `ink-900`).
- Error below: `text-[13px] text-signal-700`, `role="alert"`, linked via `aria-describedby`. Set `aria-invalid` on the input.
- Optional hint text in `ink-600`, 12px.
- Input uses `.input` (white, `ink-300` border, `tea-500` focus). Keep native `type="date|email|tel"`.

### 4. `Tabs.jsx`: underline tabs

```
Arrivals 3    In-house 5    Departures 2
‾‾‾‾‾‾‾‾‾‾
```

- Container: `flex gap-6 border-b border-ink-100 overflow-x-auto`.
- Tab: `py-2.5 text-sm font-medium text-ink-600 border-b-2 border-transparent -mb-px`; active: `text-ink-900 border-tea-700`.
- Count shown as plain text `ink-600` after the label, not a bubble.
- Keep the arrow-key support and `role="tab"`/`aria-selected`. Add `aria-controls` and `Home`/`End` keys.

### 5. `Modal.jsx`

- Panel: `bg-paper-50 rounded-lg shadow-overlay border border-ink-100`. This is the only place the overlay shadow is allowed.
- Backdrop: `bg-ink-900/40`, no blur.
- Title states the object (the callers pass it; check the titles in UI-07/08).
- Keep the focus trap and Esc-to-close. If there's no focus trap, add one (focus the first field, return focus on close).

### 6. `Toast.jsx`

- `bg-paper-50 border border-ink-100 shadow-overlay rounded-lg text-ink-900`, with a 3px left rule: `tea-500` for success, `signal-700` for error, `ink-300` for info.
- Drop the coloured box fills. Use the icon only for errors.
- Entry animation: 150ms fade/slide, disabled under reduced motion.
- Message copy is fixed in UI-10 ("Booking confirmed" → "Booked: Suite 101, 12/11–15/11").

### 7. `States.jsx`

- `Skeleton`: `.skeleton` (`paper-200`).
- `EmptyState`: no icon circle. `rounded-lg border border-dashed border-ink-100 bg-paper-50`, title in Inter 16px/600 (not serif), message `ink-600`. **Requires an `action` or a message saying what to do next.**
- `ErrorState`: `bg-signal-100 border border-signal-700/20 text-ink-900`, with the message in `signal-700`. The button is `secondary` "Retry". Replace the "Failed to load data." fallback with "Couldn't load this list." (exact copy in UI-10).
- `InlineAlert`: tones `error` (signal) and `info` (paper-200 + ink). **Remove `warn` and `success`**; find callers with `grep -rn "InlineAlert" frontend/src` and map warn → info. Success messages become toasts or plain text.

### 8. `StatCard.jsx` → `SummaryStrip.jsx`

New component:

```jsx
// items: [{ label: 'Arrivals today', value: 3 }, …]
<SummaryStrip items={items} loading={…} />
```

Renders one row of `label: number` pairs in text, separated by hairlines (`divide-x divide-ink-100`), numbers `tabular-nums font-semibold`. It wraps to two columns at 375px. No icons, no tiles.

Delete `StatCard.jsx` once UI-07 and UI-09 have replaced its two users (`ReceptionistDashboard`, `BranchOverview`). Until then, restyle it minimally so nothing breaks.

### 9. `Pagination.jsx`, `Spinner.jsx`, `Icon.jsx`

Recolour to ink/tea. Pagination is ghost buttons with `aria-current="page"` on the active page.

## Files touched

- `frontend/src/components/ui/{Badge,Button,Field,Tabs,Modal,Toast,States,Pagination,Spinner,StatCard}.jsx`
- `frontend/src/components/ui/SummaryStrip.jsx` (new)
- One-line caller updates for the `Badge` and `Button` API changes (tables above).

## Out of scope

- Page layout changes. Callers only change props, not structure.

## Acceptance criteria

- [ ] `grep -rn "tone=" frontend/src` returns no `Badge` usages; every status chip shows the spec 11 §5 label (e.g. "Checked in", not "Checked-In").
- [ ] Maintenance shows a hatched neutral chip; Cancelled shows a dashed outline; no status is red except "Balance due LKR …" and overdue problems.
- [ ] `grep -rnE 'variant="(outline|dark|gold|dangerOutline)"' frontend/src` returns nothing.
- [ ] `danger` buttons appear only inside confirm dialogs.
- [ ] Tabs are underlined, not pills; arrow, Home and End keys work.
- [ ] Modal and Toast are the only components with `shadow-overlay`.
- [ ] Field errors are announced (`role="alert"`) and linked with `aria-describedby`.
- [ ] `npm run build` passes; spot-check Receptionist, MyBookings and Admin Users in the browser.
