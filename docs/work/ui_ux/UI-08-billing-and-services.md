# UI-08 — Bill / folio, ServiceRequest, GuestPicker

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/src/components/{BillTable,BillPaymentModal,GuestPicker}.jsx`, `frontend/src/pages/ServiceRequest.jsx` |
| **Spec** | 11 §5 (Paid / Balance due), §6 (Modal, tables, Field), §8 (Bill / folio), §9.1 (402); 09 §5–6 |
| **Depends on** | UI-01, UI-02 |

## Current state

**BillTable** ([BillTable.jsx](../../../frontend/src/components/BillTable.jsx))
- Uppercase gold-icon headings ("Charges", "Payment history"); a `rounded-xl` bordered list of rows.
- Discount shown in emerald.
- Status `Badge tone=green/amber/red`.
- An outstanding block that is either emerald or red, with the label "Outstanding balance" / "Fully paid" uppercase and the amount in a `rounded-full` pill.
- Payment history rows have icon squares.

**BillPaymentModal** ([BillPaymentModal.jsx](../../../frontend/src/components/BillPaymentModal.jsx))
- Title "Bill · {guest}"; the payment form sits in a `bg-navy-50 rounded-xl` box; errors in `red-400`/`red-600`; button "Record payment".

**ServiceRequest** ([ServiceRequest.jsx](../../../frontend/src/pages/ServiceRequest.jsx))
- Eyebrow "Folio additions"; Playfair `h1` "Service requests" (console page).
- Booking header card; catalogue card with uppercase category headings; "Services used" table with a decorative "Live folio" green badge.

**GuestPicker**: navy colours; `rounded-xl` inputs.

## Goal

- **Bill:** read like a receipt. Lines, right-aligned figures, a rule above the total, amount paid, and balance due. Taking a payment is one obvious step.
- **ServiceRequest:** add a service to an in-house guest's folio in two clicks and see the running total.

## Implementation plan

### 1. BillTable as a receipt

```
Charges
Room · Deluxe 204 · 2 nights            LKR 36,000.00
Services                                 LKR  4,500.00
Discount                               − LKR  1,000.00
Tax (15%)                                LKR  5,925.00
─────────────────────────────────────────────────────
Total                                    LKR 45,425.00
Paid to date                             LKR 30,000.00

┌ signal-100 ──────────────────────────────────────────┐
│ Balance due                LKR 15,425.00  [Take payment] │
└──────────────────────────────────────────────────────┘
or, when settled:
Paid                                   (tea-100 chip)

Bill calculated 12/10/2026 09:42
```

- Lines in a plain `<dl>` or table with `tabular-nums` right-aligned figures; **a 1px `ink-900` rule above Total**; Total in 16px/600.
- Discount as plain text with "−" (no green; spec 11: colour isn't decoration).
- Every figure comes from the API (`bill.*`). **No browser arithmetic** beyond formatting. Check that `outstanding` comes from the bill response; if it's computed client-side as `total - paid`, note it in the README and keep it only if the API has no field for it (don't change logic in a restyle PR).
- Balance due > 0: a `signal-100` block with "Balance due" + amount in `signal-700` + a `primary` "Take payment" button (when the caller provides `onTakePayment`). Settled: `<Badge balance={0} />` → "Paid".
- Headings: sentence case, Inter 14px/600, no icons.
- **Payment history:** a simple table (Date · Method · Note · Amount). Empty: "No payments yet."
- Print: keep the `print-folio` classes working (they're in `index.css` and unchanged).

### 2. BillPaymentModal

- Title: "Bill · Kamal Perera, Deluxe 204" (spec 11 §6: states the object); subtitle shows the booking reference and dates in `DD/MM/YYYY`.
- Layout: `BillTable` on top, then **Take payment** as a section (no tinted box; a hairline above):
  - Amount (prefilled with the balance due from the API), method (radio: Cash, Credit Card, Bank Transfer), optional note.
  - Button "Take payment" (`primary`). Toast: "Payment taken: LKR 15,425.00 by Cash, Kamal Perera." (UI-10.)
- Discount: a `secondary` "Apply discount" button that reveals the field; help text "Applied before tax. The bill is recalculated." Toast: "Bill recalculated: discount LKR 1,000.00."
- When opened from a **402 on check-out**: an inline `signal` banner at the top: "Balance due: LKR 18,400.00. Take payment before checking out." Focus goes to the amount field.
- Errors under the fields (`signal-700`, `role="alert"`); validation messages unchanged.
- Footer: "Print bill" (`ghost`) and "Close" (`secondary`).

### 3. ServiceRequest (console page)

```
Add services · Kamal Perera, Room 204          (Inter 20px)
Deluxe · 12/10 → 14/10 · Checked in · SN-1A2B3C4D

┌ Catalogue (lg: 2/3) ─────────────────┐  ┌ This stay ───────────────────┐
│ Dining                               │  │ 12/10 Breakfast ×2  LKR 3,000 │
│  Breakfast   LKR 1,500  [1▾] [Add]   │  │ 12/10 Laundry   ×1  LKR 1,500 │
│  …                                   │  │ ────────────────────────────  │
│ Wellness                             │  │ Services total   LKR 4,500.00 │
│  …                                   │  │ Tax is added on the bill.     │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

- Remove the eyebrow, Playfair and the "Live folio" badge. `h1` states the guest and room.
- Category headings: sentence case, Inter 14px/600, `ink-600`.
- Each service row: name, price (`tabular-nums`), quantity (number input, min 1), `secondary` "Add". The **first** row's button isn't special; there's no single primary on this page except after selection. Alternative: make "Add" `primary` only on the row being edited. Keep it simple: all `secondary`.
- "This stay" table: date, service, qty, amount; total row with a rule above. Label it "Services total" (from the API usage summary), not a computed bill total.
- Booking not `Checked-In`: show "Services can only be added while the guest is checked in." and hide the Add buttons (the API enforces this too).
- Back link: "← Today" to the receptionist dashboard (or manager dashboard for managers).
- **States:** catalogue loading skeleton, usage empty ("No services yet for this stay."), errors with Retry per panel.

### 4. GuestPicker

- Search field with the label "Find guest" and help text "Name, email, phone or NIC/passport"; results as a list with the selected row in `tea-100`.
- "Register new guest" is a `ghost` button that opens the drawer. The drawer form uses `Field`; the button says "Register guest"; toast "Registered: Kamal Perera".
- 409 duplicate → "A guest with this NIC/passport already exists. Open the existing guest instead." with a button that selects them (if the API returns the id; otherwise just the message).

## Files touched

- `frontend/src/components/BillTable.jsx`
- `frontend/src/components/BillPaymentModal.jsx`
- `frontend/src/components/GuestPicker.jsx`
- `frontend/src/pages/ServiceRequest.jsx`

## Out of scope

- Billing or payment API calls, payload shapes, and validation rules.

## Acceptance criteria

- [ ] The bill reads as a receipt: right-aligned `tabular-nums` figures, a rule above Total, Paid to date, then either "Paid" or "Balance due LKR …" with the amount.
- [ ] Red appears only in the Balance due block and in errors.
- [ ] The 402 path opens the modal with the balance banner and focuses the amount field.
- [ ] "Take payment" and "Apply discount" toasts name the amount and guest.
- [ ] ServiceRequest has no eyebrow, Playfair or decorative badge; non-checked-in bookings show the explanation instead of Add buttons.
- [ ] Print bill still prints only the folio.
- [ ] 375px: the modal is full-height and scrollable; ServiceRequest panels stack.
- [ ] `npm run build` passes; tested as a receptionist and a manager: add service, apply discount, partial payment, full payment, print.
