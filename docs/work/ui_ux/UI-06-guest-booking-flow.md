# UI-06 — Guest booking flow: BookingCheckout, BookingSummary, MyBookings

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/src/pages/BookingCheckout.jsx`, `frontend/src/pages/MyBookings.jsx`, `frontend/src/components/BookingSummary.jsx` |
| **Spec** | 11 §1.4 (labelled estimate only), §5, §6, §8 (destructive confirm), §9; 09 §4 (BookingCheckout), route `/my-bookings` |
| **Depends on** | UI-01, UI-02 |

## Current state

**BookingCheckout** ([BookingCheckout.jsx](../../../frontend/src/pages/BookingCheckout.jsx), 310 lines, the heaviest navy/gold user: 17× `navy-500`, 4× `gold-700`)
- Numbered sections with `rounded-full bg-navy-900 text-gold-200` step circles and Playfair `h2`s.
- The nights count is shown as an amber `Badge` (no amber in spec 11).
- The confirmation screen uses an `emerald-100` circle icon and "Booking confirmed".
- Payment method picker: a radiogroup of cards (`rounded-xl`).
- The summary sidebar shows the rate × nights estimate. Check that it's **labelled as an estimate** (spec 11 §1.4; `TAX_RATE` exists in `formatters.js`, so the browser may be computing tax).

**MyBookings** ([MyBookings.jsx](../../../frontend/src/pages/MyBookings.jsx))
- Eyebrow "Your stays"; pill `Tabs`; `rounded-2xl` skeletons; an uppercase "Services used" heading in the bill modal.
- Cancel confirm: "Cancel this booking?", with buttons "Keep booking" / "Yes, cancel". It doesn't state the consequence (spec 11 §8).

**BookingSummary**: navy text, `Badge status`.

## Goal

**BookingCheckout:** a guest (or staff for a guest) confirms one room, dates and payment method, and sees a clearly labelled estimate. The database decides the final price.

**MyBookings:** a guest sees upcoming, past and cancelled stays, the bill for each, and can cancel a `Booked` stay knowing what happens.

## Implementation plan

### 1. BookingCheckout layout

```
Book Deluxe · Room 204, SkyNest Kandy          (public: font-display 32px; staff: Inter 20px)

┌ main (lg: 2/3) ──────────────────────┐  ┌ summary (sticky) ──────────┐
│ Room                                 │  │ Deluxe · Room 204          │
│  photo · type · sleeps · amenities   │  │ 14/11/2026 → 16/11/2026    │
│  Change room                          │  │ 2 nights                   │
│ ──────────────────────────────────── │  │ LKR 18,000.00 × 2          │
│ Guest                                │  │ ───────────────            │
│  (guest: name, read-only)            │  │ Estimate   LKR 36,000.00   │
│  (staff: GuestPicker)                │  │ Before tax and services.   │
│ ──────────────────────────────────── │  │ The final bill is          │
│ Dates                                │  │ calculated at check-out.   │
│  Check-in [    ]  Check-out [    ]   │  │                            │
│  2 nights                            │  │ [ Book this room ]         │
│ ──────────────────────────────────── │  └────────────────────────────┘
│ Payment method                       │
│  ( ) Cash  ( ) Credit Card  ( ) Bank Transfer │
└──────────────────────────────────────┘
```

- **Sections are separated by hairlines and `h2`s (Inter 16px/600)**, not numbered circles or cards. If a progress cue is wanted, a plain "1. Room" text prefix is enough.
- **Nights** is plain text under the dates ("2 nights"), not a chip.
- **Payment method:** native radio inputs with labels in a bordered list; selected row `bg-tea-100 border-tea-500`. The values must stay exactly `Cash`, `Credit Card`, `Bank Transfer`.
- **Summary estimate (spec 11 §1.4, 09 §4):** show only `rate × nights` and label it **"Estimate"** with the note above. **If the current code adds tax with `TAX_RATE`, remove it from the summary**: tax is computed by `fn_calculate_tax` and shown on the bill. (Check this with `grep -n TAX_RATE frontend/src`. If it's used elsewhere for display of API data only, leave those uses.)
- **Primary button:** "Book this room", the page's single `primary`. It's disabled until the form is valid, with the reason shown as text under the button ("Choose a check-out date after check-in.").
- **Date validation copy** mirrors `create_booking`: check-in not in the past; at most 30 nights (`MAX_STAY_NIGHTS`). Errors go inline under the field.
- **409 overlap:** server `detail` + "Choose other dates or another room.", with a link back to `/rooms` keeping the dates.

### 2. Confirmation state

```
Booked: Deluxe · Room 204, SkyNest Kandy
14/11/2026 → 16/11/2026 · 2 nights · Booking SN-1A2B3C4D

[ View my bookings ]   Book another room
```

- No icon circle. The heading states what happened, using the same verb as the button ("Book this room" → "Booked").
- Guest: `primary` "View my bookings" + `ghost` "Book another room". Staff: `primary` "Back to Today" + `ghost` "Book another room".

### 3. MyBookings

- `h1` "My bookings" (`font-display`); remove the eyebrow. Keep "Book a room" as a `secondary` button in the header (the empty state carries the primary action).
- Underline `Tabs` (UI-02): Upcoming · Past · Cancelled, with counts as text.
- **Booking row/card:** a `.card`, not shadowed:

```
Deluxe · Room 204 · SkyNest Kandy                          [Booked]
14/11/2026 → 16/11/2026 · 2 nights · SN-1A2B3C4D
Balance due LKR 12,400.00                     View bill   Cancel booking
```

  - Show the balance chip only when the API provides a balance (from the bill). Don't compute it in the browser.
  - "Cancel booking" is a `secondary` button. Only the confirm dialog has `danger`.
- **Cancel confirm (spec 11 §8):**
  - Title: "Cancel this booking?"
  - Body: "Room 204 at SkyNest Kandy becomes available for 14/11–16/11. This can't be undone."
  - Buttons: `ghost` "Keep booking", `danger` "Cancel booking".
- **Bill modal:** title "Bill · Deluxe Room 204, 14/11–16/11"; reuse `BillTable` (UI-08); the "Services used" heading becomes sentence case, Inter 14px/600.
- **States:**
  - Loading: skeleton cards (`rounded-lg`).
  - Empty upcoming: "No upcoming stays. Check availability to book a room." with a `primary` "Check availability" → `/rooms`.
  - Empty past or cancelled: message only.
  - No guest profile: keep the existing "contact the front desk" empty state (spec 09), restyled.
  - Error: `ErrorState` with Retry.

### 4. BookingSummary

Recolour; dates `DD/MM/YYYY`; status via `Badge`; figures right-aligned `tabular-nums`.

## Files touched

- `frontend/src/pages/BookingCheckout.jsx`
- `frontend/src/pages/MyBookings.jsx`
- `frontend/src/components/BookingSummary.jsx`

## Out of scope

- Changes to booking or cancel API calls and their payloads.
- `GuestPicker` (UI-08).

## Acceptance criteria

- [ ] No step circles, amber chips, emerald icons, eyebrows or Playfair on these pages.
- [ ] The summary shows only rate × nights, labelled "Estimate", with the note that the final bill is calculated by the hotel; no browser-computed tax.
- [ ] Payment values sent to the API are unchanged (`Cash`, `Credit Card`, `Bank Transfer`).
- [ ] Booking with a past check-in or more than 30 nights shows an inline error; a 409 shows the server detail plus the next step.
- [ ] The confirmation heading reads "Booked: …" with the booking reference.
- [ ] Cancel confirm states the room and dates freed; `danger` appears only in that dialog.
- [ ] MyBookings handles loading, empty (per tab), no-profile and error.
- [ ] 375px: the summary moves below the form and the button stays reachable.
- [ ] `npm run build` passes; tested as a guest (book, view bill, cancel) and as a receptionist booking for a guest.
