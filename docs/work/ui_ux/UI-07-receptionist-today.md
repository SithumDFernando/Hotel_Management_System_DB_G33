# UI-07 — Receptionist dashboard as the "Today" task list

| | |
|---|---|
| **Effort** | 🔴 Large |
| **Area** | `frontend/src/pages/ReceptionistDashboard.jsx` |
| **Spec** | 11 §8 (staff console: "Landing is a task list, not a KPI wall"), §5, §9; 09 §6 (sections and API calls) |
| **Depends on** | UI-01, UI-02 (`SummaryStrip`, `Tabs`, `Badge`, `Button`), UI-03 (header shows the branch) |

## Current state

[ReceptionistDashboard.jsx](../../../frontend/src/pages/ReceptionistDashboard.jsx):

- Header: eyebrow "Front desk · {branch}", `h1` `greeting()` ("Good morning") in Playfair 36px, then the date.
- **Four `StatCard` tiles** (arrivals, in-house, departures, rooms available): the KPI wall spec 11 §8 replaces.
- One card holding pill `Tabs` (Today's arrivals / In-house / Departures / Upcoming), a search box, a refresh button, then one table of 820px minimum width.
- Row actions:
  - `Booked`: "Check in" (primary, gold) and "Cancel" (`dangerOutline`, red).
  - `Checked-In`: "Services", "Bill" (outline) and "Check out" (`dark`).
  - Three or four buttons per row compete; no single next action stands out.
- Chips: "Overdue arrival" / "Overdue checkout" (red), "Departs today" (amber).
- Confirm dialogs "Check out guest?" and "Cancel this booking?" don't state the consequence.

**Logic to keep untouched:** `lists` (arrivals, inhouse, departures, upcoming) derived from `GET /bookings`, check-in disabled reasons ("Arrives on …", "The stay period has ended"), the 402-on-checkout → bill window flow, `GuestFormDrawer`/`GuestPicker`, search filtering, pagination.

## Goal

**Job of the screen:** at the front desk, see what needs doing today and do it in one click per guest: check in, check out, take payment.

Squint test (spec 11 §10): the eye should land on the rows that need action, not on numbers.

## Implementation plan

### 1. Header

```
Today · Monday 12 October 2026                        [Register guest]  [New booking]
Arrivals 3  │  In-house 5  │  Departures due 2  │  Rooms available 7
```

- `h1` "Today" (Inter 20px/600) + the date in `ink-600`. Remove `greeting()` (and delete the function if unused) and the eyebrow. The branch is now in the navbar (UI-03).
- `SummaryStrip` replaces the four `StatCard`s, with the same values and sources (`lists.*.length`, `rooms.data.length`).
- Header buttons: "New booking" is `secondary`, not `primary`, because the screen's emphasis belongs to the row actions. "Register guest" is `secondary`.

### 2. Three task tables instead of tabs (desktop)

Spec 11 §8 describes three tables on one screen. Render them stacked, in this order:

1. **Departures due** (check-out today or overdue): the most urgent, because rooms need turning over.
2. **Arrivals today**.
3. **In-house**.

Then **Upcoming** behind a fourth section, collapsed by default (`<details>`), or as a link "Show upcoming arrivals (12)".

> Alternative if the stacked view feels long: keep the underline `Tabs`, with "Departures due" first. Decide during implementation by checking with seed data (7 bookings) **and** a busy day (e.g. 15 rows). Stacked is preferred when each list is short, which is the normal case for a three-branch group.

Each section has an `h2` (Inter 16px/600) with the count as text, e.g. "Arrivals today · 3", and its own empty line ("No arrivals left today.") instead of a big empty box.

### 3. Table design (spec 11 §6, §8)

| Guest | Room | Stay | Status | |
|---|---|---|---|---|
| Kamal Perera<br><span>SN-1A2B3C4D</span> | 204<br><span>Deluxe</span> | 12/10 → 14/10<br><span>2 nights</span> | Booked | **[Check in]** ⋯ |

- Row height 40px (`.td` from UI-01); header `paper-200`, sentence case; sticky header; table scrolls inside its own container; `min-w` only as wide as needed.
- The booking reference moves under the guest name (`text-2xs ink-600 font-mono`); it's secondary information.
- Overdue rows: a `Badge kind="problem"` "Overdue checkout" next to the status. That's the only red on the screen, and only when something is actually wrong. "Departs today" is a neutral chip or plain text.

### 4. One action per row

| Section | Primary action (visible) | Secondary (in a row "More" menu `⋯`) |
|---|---|---|
| Arrivals today | **Check in** (`primary`, `sm`) | Cancel booking |
| In-house | **Add service** (`secondary`) | Bill, Check out |
| Departures due | **Check out** (`primary`) or, if the API reports a balance, **Take payment** | Bill, Add service |

- Only Departures and Arrivals carry tea-green buttons, which matches spec 11's "the one thing to do next".
- If a check-in is blocked, show the existing reason as text **in the row** ("Arrives on 14/10/2026"), not only as a `title` tooltip, which touch and keyboard users never see.
- The "More" menu is a small dropdown (`shadow-overlay`), keyboard accessible (Enter or Space opens it, arrows move, Esc closes). If building it is too much for this task, show the secondary actions as `ghost` text buttons. They must still be visually quieter than the primary.
- **Take payment** opens `BillPaymentModal` (UI-08). **Check out** stays enabled even with a balance; a 402 opens the payment window with "Balance due: LKR 18,400.00. Take payment before checking out." (spec 11 §8, §9.1). Keep the existing flow; change only the copy.

### 5. Confirm dialogs (spec 11 §8)

- **Check out:** title "Check out Kamal Perera?"; body "Room 204 becomes available. The final bill is LKR 41,400.00, already paid." (use the API amount if the dialog has it; otherwise omit the amount rather than compute it). Buttons: `ghost` "Not now", `primary` "Check out".
- **Cancel:** title "Cancel this booking?"; body "Room 204 becomes available for 14/10–16/10. This can't be undone." Buttons: `ghost` "Keep booking", `danger` "Cancel booking".

### 6. Search and refresh

- Search ("Guest, room or booking reference") sits above the tables and filters all sections at once.
- Refresh becomes a `ghost` icon button with `aria-label="Refresh lists"`, showing the time of the last load as text ("Updated 09:42").

### 7. Toasts

Already specific ("Kamal Perera checked in to Room 204"). Align the verbs with the buttons: "Checked in: Kamal Perera, Room 204"; "Checked out: Kamal Perera. Room 204 is now available." (UI-10 owns the final wording.)

### 8. States

- Loading: skeleton rows in each section (3 per section).
- Error: one `ErrorState` with Retry at the top (all lists share one request).
- Empty for the whole day: "Nothing due today. New bookings appear here on their arrival date." with `secondary` "New booking".

### 9. Mobile (375px)

Tables become stacked row cards: guest + room on line 1, dates + status on line 2, the primary action as a full-width button. The "More" menu stays.

## Files touched

- `frontend/src/pages/ReceptionistDashboard.jsx`
- Possibly a new `frontend/src/components/ui/RowMenu.jsx` (the `⋯` dropdown, reusable in UI-09)

## Out of scope

- Changes to API calls, list derivation, or the 402/check-in rules.

## Acceptance criteria

- [ ] No `StatCard`, no greeting, no eyebrow; the header is "Today" + date + `SummaryStrip`.
- [ ] Departures due, Arrivals today and In-house are visible without switching tabs on desktop (or tabs with Departures first, if the alternative was chosen and noted in the README).
- [ ] Each row shows one visually primary action; other actions are quieter.
- [ ] Blocked check-in reasons are visible as text in the row.
- [ ] Red appears only on overdue chips, "Balance due" and the cancel confirm.
- [ ] A 402 on check-out opens the payment window with the balance amount in the message.
- [ ] Confirm dialogs state the consequence (room freed, dates).
- [ ] Keyboard: every action and the row menu work with Tab, Enter and Esc.
- [ ] 375px: rows render as stacked cards with no horizontal page scroll.
- [ ] `npm run build` passes; tested as a receptionist with seed data: check in, add service, take payment, check out with a balance (402 path), cancel.
