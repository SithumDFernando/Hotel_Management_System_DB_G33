# UI-03 — Navbar, footer and page layout

| | |
|---|---|
| **Effort** | 🟡 Medium |
| **Area** | `frontend/src/components/Navbar.jsx`, `frontend/src/components/Layout.jsx` |
| **Spec** | 11 §7.1 item 5 (footer), §8 (console header), §4 (no blur) |
| **Depends on** | UI-00 (`Logo`), UI-01, UI-02 (`Button`) |

## Current state

**Navbar** ([Navbar.jsx](../../../frontend/src/components/Navbar.jsx))
- Logo placeholder: `building` icon in a navy box, "SkyNest" in Playfair, plus an uppercase gold eyebrow ("Staff Portal" / "Hospitality · Sri Lanka").
- **Mojibake:** lines 87 and 126 render `Hospitality Â· Sri Lanka` and `email Â· Role`. The file was saved with a BOM and a double-encoded middle dot.
- `bg-white/90 backdrop-blur` (glass, banned by spec 11 §4).
- Active link is a filled navy pill (`bg-navy-900 text-white`).
- The role is shown as uppercase gold text; "Logout" uses the old `outline` button.
- Public CTA "Book a Stay" duplicates the Home search; the copy isn't a spec 11 verb.
- Console header has no branch name (spec 11 §8 requires it: fixed for branch staff, a selector for admin).

**Footer** (inside [Layout.jsx](../../../frontend/src/components/Layout.jsx))
- White, with only city links and "© SkyNest Hospitality Group". Spec 11 §7.1 wants an `ink-900` footer with the three addresses and phone numbers, policy links and a quiet "Staff sign-in".
- The footer is shown on console pages too; staff don't need it.

## Goal

A quiet header that does the same job on both surfaces (logo, text links with a tea underline on the active page, user menu) and shows the branch for staff. The footer carries real branch facts on the public site only.

## Implementation plan

### 1. Fix the encoding first

Re-save `Navbar.jsx` as UTF-8 **without BOM** and replace both `Â·` with `·`. Check other files:

```bash
grep -rln $'\xEF\xBB\xBF' frontend/src   # files with a BOM
grep -rn "Â" frontend/src                # double-encoded characters
```

### 2. Navbar structure

```
[mark] SkyNest      Home  Rooms  My bookings                 kamal@… ▾
                    ‾‾‾‾
Console:
[mark] SkyNest      Today  Rooms  New booking     Colombo · Galle Face Terrace     nimal@… ▾
```

- `<Logo variant="full" />` (UI-00). Delete the gold eyebrow line.
- Header: `bg-paper-50 border-b border-ink-100`, height 56px, sticky, **no blur**.
- Links: `text-sm font-medium text-ink-600 hover:text-ink-900`. Active: `text-ink-900` with a 2px `tea-700` bottom border (same style as `Tabs`), keeping `aria-current="page"`.
- Rename the receptionist "Dashboard" link to **"Today"**, to match UI-07.
- **Branch label for staff:** receptionists and managers show their branch name and city as plain `ink-600` text. Read it from the user/branch data already loaded in AuthContext or `/auth/me`; if it isn't available there, use the branch lookup already done in `ReceptionistDashboard` (`branch.name`). **Don't add a new API.** For admins, this slot stays empty in this task; a branch selector is a separate feature and isn't required by the API.
- **User menu:** a button showing the email (truncated) that opens a small dropdown (`shadow-overlay`, allowed for dropdowns) with the role as plain text ("Receptionist") and "Sign out". Esc closes it, focus returns to the button, and it closes on outside click.
  - Rename "Logout" to **"Sign out"**, to match "Sign in".
- **Public, signed out:** links Home, Rooms, then "Sign in" as a `ghost` button. Remove "Book a Stay": the Home search is the one main action (spec 11 §1.5).
- **Mobile (< lg):** the menu button opens a panel below the header (not a drawer) with the same links as stacked rows, plus the branch name and Sign out. Close it on navigation (already done) and on Esc.

### 3. Footer (public pages only)

```
┌ ink-900 ─────────────────────────────────────────────────────────┐
│ [mono mark] SkyNest                                               │
│                                                                   │
│ Colombo              Kandy                Galle                   │
│ Galle Face Terrace   Temple Road          Lighthouse Street,      │
│ +94 …                +94 …                Galle Fort · +94 …      │
│                                                                   │
│ Cancellation policy · Privacy        Staff sign-in      © 2026    │
└───────────────────────────────────────────────────────────────────┘
```

- Addresses and phones come from **`GET /api/branches`** (`getBranches()`, public). Use `useFetch`; while loading, show the city names only; on error, show the city names with links. **Don't hard-code addresses or phones.**
- Text `paper-100`, secondary `ink-300`. Links underline on hover. Focus ring offset uses `ring-offset-ink-900`.
- **Policy links:** only link pages that exist. There's no policy page today, so leave them out rather than linking to `#`. Add a `TODO(UI-11)` note in the README open decisions if the team wants them.
- "Staff sign-in" → `/login`, quiet `ink-300` text.
- Each city name links to `/rooms?city=<City>`.

### 4. `Layout.jsx`

- Render `<Footer />` only when the route is public or guest (`/`, `/rooms`, `/login`, `/register`, `/my-bookings`, `/booking/*` when the role is guest). Staff console pages end with the content.
- Page background stays `paper-100` (global, from UI-01).
- Keep the skip link and restyle it (`bg-paper-50 rounded-md shadow-overlay`).
- Update the `TITLES` map: `'/dashboard/receptionist'` → `'Today'`.

## Files touched

- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/Layout.jsx` (footer may move to `frontend/src/components/Footer.jsx`)

## Out of scope

- An admin branch selector.
- Policy pages.

## Acceptance criteria

- [ ] No `Â` or BOM left in `frontend/src`.
- [ ] Header has no blur, no gradient and no coloured bar; the active link has a `tea-700` underline and `aria-current="page"`.
- [ ] Receptionist and manager see their branch name in the header; nobody else does.
- [ ] The user menu opens and closes with mouse, Enter, Esc and outside click; "Sign out" works and returns to `/`.
- [ ] Footer shows the three branch addresses and phones from the API on public pages and is absent on console pages.
- [ ] At 375px: the header fits on one line, the menu panel works, and the footer stacks into one column without horizontal scroll.
- [ ] `npm run build` passes; checked signed out and as each of the four roles.
