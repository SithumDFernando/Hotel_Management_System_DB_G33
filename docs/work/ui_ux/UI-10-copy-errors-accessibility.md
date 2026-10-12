# UI-10 — Copy, error messages, toasts and accessibility

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/src/utils/formatters.js` (`errorMessage`), `frontend/src/hooks/useFetch.js`, `frontend/src/components/ErrorBoundary.jsx`, toast call sites, all pages (copy sweep) |
| **Spec** | 11 §9 (copy), §9.1 (error messages), §6 (focus), §4 (motion) |
| **Depends on** | UI-02 to UI-09 (done last to avoid merge conflicts with the page tasks) |

## Current state

- **`errorMessage()`** ([formatters.js:76](../../../frontend/src/utils/formatters.js#L76)):
  - The fallback is **"Something went wrong. Please try again."** (banned by spec 11 §10).
  - It returns the server `detail` string as is, without mapping by HTTP status.
  - A 422 `detail` array is joined as `"field.path: msg; …"`, a raw developer format, instead of being shown inline under each field.
  - 401, 403, 404, 429 and 5xx get no tailored message.
  - Spec 11 §9.1 says this function lives in `src/api/client.js`; it actually lives in `utils/formatters.js` (decision D3).
- **`ErrorBoundary.jsx`:** `h1` "Something went wrong" in Playfair.
- **Toasts** with generic or inconsistent copy:

| File | Current | Problem |
|---|---|---|
| `BookingCheckout.jsx:107` | "Booking confirmed" | No object named |
| `Register.jsx:63` | "Welcome to SkyNest! Your account is ready." | Marketing tone, exclamation |
| `admin/BranchesTab.jsx:54` | "Branch updated" / "Branch created" | No object named |
| `admin/UsersTab.jsx:71,164` | "Staff account created" / "Account updated" | No object named |
| `admin/UsersTab.jsx:100` | "Copied" | Doesn't say what was copied |
| `BillPaymentModal.jsx:58` | "Bill recalculated" | No amount |
| `BillPaymentModal.jsx:77` | "Payment of LKR … recorded" | Verb differs from the button ("Take payment") |
| `ServiceRequest.jsx:74` | "2 × Breakfast added to folio" | OK; align the verb ("Added: …") |
| `ReceptionistDashboard.jsx:96,109` | "X checked in to Room N" | OK; align the format |

- **Accessibility gaps** found while reviewing:
  - Blocked actions explained only via a `title` tooltip.
  - Icon-only buttons need checking for `aria-label`.
  - No `prefers-reduced-motion` handling (added in UI-01).
  - Tables lack `<caption>` or `aria-label`.

## Goal

Every message says what happened to which object, or what failed and what to do next, in plain sentences, with the same verb as the button that caused it.

## Implementation plan

### 1. `errorMessage(err, context?)`, mapped per spec 11 §9.1

```js
export function errorMessage(err, { fallback } = {}) {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  const readable = typeof detail === 'string' && detail.length < 200 && !/sql|asyncpg|traceback|constraint/i.test(detail);

  if (err?.code === 'ERR_NETWORK') return "Can't reach the server. Check your connection and try again.";
  switch (status) {
    case 401: return readable && /password|email/i.test(detail) ? 'Email or password is incorrect.' : 'Your session has ended. Sign in again.';
    case 403: return "You don't have access to this record.";
    case 404: return readable ? detail : 'This record no longer exists. Refresh the list.';
    case 429: return 'Too many sign-in attempts. Wait a minute and try again.';
    case 400:
    case 409: return readable ? detail : (fallback ?? 'This change conflicts with existing data.');
    case 422: return 'Some fields need attention.'; // per-field messages come from fieldErrors()
  }
  if (status >= 500) return "The server couldn't complete this. Try again; if it keeps happening, tell the system admin.";
  return readable ? detail : (fallback ?? "The server couldn't complete this. Try again.");
}

// Maps a FastAPI 422 detail array to { fieldName: 'message' } for inline Field errors.
export function fieldErrors(err, labels = {}) { … }
```

- Callers that know their next step pass it through: e.g. the 409 overlap in BookingCheckout appends "Choose other dates or another room."; the 409 duplicate guest appends "Open the existing guest instead."
- **402** is handled by the receptionist flow (opens the payment window), not here.
- Use `fieldErrors()` in the forms that post to the API (Register, BookingCheckout, GuestPicker, UsersTab, BranchesTab, CatalogueManager, BillPaymentModal) so 422s land under the right field.
- Write a quick test table in the PR description: status code → message, checked against the spec.

### 2. `useFetch` error text

`useFetch` calls `errorMessage(err)`. Let callers pass a load-specific fallback ("Couldn't load bookings."), so `ErrorState` reads "Couldn't load bookings." + Retry instead of a generic line.

### 3. ErrorBoundary

```
This page couldn't be shown.
Reload the page. If it keeps happening, tell the system admin.
[Reload page]  Go to home page
```

Inter, with no serif or illustration. Log the error to the console in dev only.

### 4. Toast copy (spec 11 §6: "Says what happened with the specific object")

Pattern: **`<Past-tense verb>: <object>`**, matching the button verb.

| Action (button) | Toast |
|---|---|
| Book this room | Booked: Deluxe Room 204, 14/11–16/11 |
| Check in | Checked in: Kamal Perera, Room 204 |
| Check out | Checked out: Kamal Perera. Room 204 is now available. |
| Cancel booking | Cancelled: booking SN-1A2B3C4D. Room 204 is free for 14/11–16/11. |
| Take payment | Payment taken: LKR 15,425.00 by Cash, Kamal Perera |
| Apply discount | Bill recalculated with a LKR 1,000.00 discount |
| Add (service) | Added: 2 × Breakfast to Room 204 |
| Register guest | Registered: Kamal Perera |
| Create account (Register) | Account created. You're signed in as kamal@example.com. |
| Create staff account | Created: staff account for nimal@skynest.lk |
| Save changes (user) | Saved: nimal@skynest.lk |
| Save changes / Add branch | Saved: SkyNest Kandy / Added: SkyNest Matara |
| Copy email and password | Copied email and password |
| Save price | Saved: Laundry now LKR 1,500.00 for new orders |
| Deactivate | Deactivated: Laundry |

### 5. Copy sweep (all pages)

Search and fix:

```bash
grep -rniE "luxury|unparalleled|world-class|curated|nestled|paradise|experience|discover|handcrafted|sanctuar|boutique|effortless|seamless|Submit|Get started|Learn more|Oops|Success!|Something went wrong|Welcome back|!\"|!'" frontend/src
```

- Dates: `DD/MM/YYYY` (headings may use `12 Nov 2026`). Check that `formatDate` / `formatShortDate` match, and that no page mixes formats.
- Money: `LKR 12,400.00` everywhere except chart axes.
- Times: one format per page.
- **No invented facts:** remove any check-in or check-out times, distances, ratings or counts not in the specs or seed.

### 6. Accessibility pass

- [ ] Every icon-only button has an `aria-label` (`grep -rn "<Icon" frontend/src` next to `<button` without text).
- [ ] Every input has a visible `<label>`; errors are linked with `aria-describedby` and set `aria-invalid`.
- [ ] Every table has a `<caption>` (visually hidden is fine) or `aria-label`.
- [ ] Disabled actions show their reason as visible text, not only in `title`.
- [ ] Modals and drawers trap focus, close on Esc, and return focus to the trigger.
- [ ] Focus ring is visible on every interactive element against both `paper-100` and `ink-900` (footer).
- [ ] The toast region is `aria-live="polite"`; error toasts are `role="alert"`.
- [ ] Page `<title>` per route (exists in `Layout.jsx`; update for the renamed pages).
- [ ] Colour contrast: only the pairs checked in spec 11 §2.2 are used for text; no `tea-500` or `ink-300` text.

## Files touched

- `frontend/src/utils/formatters.js`
- `frontend/src/hooks/useFetch.js`
- `frontend/src/components/ErrorBoundary.jsx`
- Toast and copy edits across pages and components (small, line-level)

## Out of scope

- Backend changes to `detail` texts. If a server message is unreadable, note it in the README for a backend follow-up.

## Acceptance criteria

- [ ] `errorMessage` returns the spec 11 §9.1 messages for 401, 403, 404, 409, 422, 429, 5xx and network errors; checked by forcing each (wrong password, other branch's booking id, deleted id, double booking, empty form, six quick sign-ins, backend stopped).
- [ ] 422 errors appear under the matching fields.
- [ ] The copy-sweep grep returns nothing (except legitimate uses, listed in the PR).
- [ ] Every toast in the table above uses the new wording.
- [ ] The accessibility checklist above is complete.
- [ ] `npm run build` passes.
