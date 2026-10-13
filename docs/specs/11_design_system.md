# 11 — Design System

> Source of truth for how the SkyNest frontend looks and reads. It covers colour, type, components, status display, copy and error messages for both surfaces: the **public site** (guests) and the **staff console** (receptionist, manager, admin). Page structure and routes stay in `09_frontend_pages.md`; this file only governs presentation.
>
> Stack is unchanged: React + Vite + Tailwind CSS + recharts. Tokens live in `frontend/tailwind.config.js` and `frontend/src/styles/index.css`.

---

## 1. Principles

1. **Two surfaces, two jobs.** The public site makes one real place feel worth staying in and makes "check availability" obvious. The console lets staff finish a task correctly in seconds. Same tokens, different density.
2. **Three colours.** Ink, paper and tea green. Everything else is a shade of those three. One reserved signal red is used **only** for problems (errors, balance due), never for decoration.
3. **Sri Lankan, not touristy.** Draw from real places (Galle Face, Kandy Lake, Galle Fort, tea country) through photos, plain facts and line drawings. No lotus, elephant, palm-sunset or "paradise island" clichés.
4. **The database decides, the UI shows.** Prices, nights, tax, discounts, balances and status transitions come from the API. The browser may show a clearly labelled *estimate* (spec 09: rate × nights) but never a figure that decides an outcome.
5. **Quiet by default.** One emphasis per screen. No shadows on cards, no hover lifts, no gradients, no decorative badges.

---

## 2. Colour

### 2.1 Palette

The Tailwind theme **replaces** the default palette (`theme.colors`, not `theme.extend.colors`), so `emerald-*`, `sky-*`, `navy-*`, `gold-*` and the other defaults can't be used by accident.

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#17201B` | Body text, headings, dark surfaces (footer) |
| `ink-600` | `#4A554F` | Secondary text, table headers, icons |
| `ink-300` | `#A9B2AC` | Disabled text, input borders, chart secondary series |
| `ink-100` | `#E4E7E3` | Hairline dividers, card borders |
| `paper-50` | `#FFFFFF` | Cards, inputs, modals, tables |
| `paper-100` | `#F7F5EF` | Page background |
| `paper-200` | `#EEEBE3` | Subtle fills: table header row, hover row, neutral chips |
| `tea-900` | `#173A2B` | Primary button hover, text on `tea-100` |
| `tea-700` | `#24513D` | **Primary actions**, links, active nav item, "Checked in" chip |
| `tea-500` | `#3D7A5C` | Focus ring, chart primary series, non-text accents |
| `tea-100` | `#E3EEE7` | Selected row, "Available"/"Paid" chip background, success toast |
| `signal-700` | `#B3261E` | **Problems only**: errors, "Balance due", destructive confirm |
| `signal-100` | `#FBE9E7` | Background of error banners and "Balance due" chips |

Plus `transparent`, `current` and `white`/`black` for utilities.

### 2.2 Rules

- **Tea green is the only accent.** It marks the one thing to do next (primary button, active tab, selected item) and positive states. If two tea-green elements compete on one screen, demote one to a secondary button.
- **Signal red is never decorative.** Use it only for: error messages, "Balance due" / unpaid amounts, destructive confirmations (Cancel booking). A screen with nothing wrong shows no red.
- There are no amber, blue or purple states. Status is carried by **words** first and these three colours second (§5).
- **Contrast (WCAG AA).** These pairings are checked:
  - `ink-900` on `paper-100`: about 15:1.
  - `ink-600` on `paper-100`: about 7:1.
  - `tea-700` on `paper-100`: about 8:1.
  - white on `tea-700`: about 9:1.
  - `signal-700` on `paper-100`: about 6:1.

  `tea-500` and `ink-300` are below 4.5:1, so never use them for body text.
- Dark mode is out of scope.

---

## 3. Typography

| Role | Family | Where |
|---|---|---|
| Display | **Source Serif 4** (600) | Public site headings only (`h1`, `h2` on Home, RoomsBrowse, Login, Register) |
| UI / body | **Inter** (400, 500, 600) | Everything else, including all console headings |

- Load both from Google Fonts with fallbacks: `"Source Serif 4", Georgia, serif` and `Inter, system-ui, sans-serif`. Remove Playfair Display.
- Numbers in tables, bills and stats use `tabular-nums` and are right-aligned.
- Scale (px), public: 48 / 32 / 24 / 18 / 16. Console: 20 (page title) / 16 (section) / 14 (body, table) / 12 (meta). Nothing below 12.
- **No eyebrow labels**: no small tracked-out uppercase text above every heading, and no uppercase table headers. Headers are sentence case, `ink-600`, 12–13px, weight 500.
- No italic or coloured "accent word" inside headlines.

---

## 4. Shape, space, elevation

| Token | Value | Use |
|---|---|---|
| Radius `sm` | 4px | Status chips, small tags |
| Radius `md` | 6px | Buttons, inputs, selects |
| Radius `lg` | 10px | Cards, modals, drawers, photos |
| Border | 1px `ink-100` | Cards and tables are separated by borders, not shadows |
| Shadow `overlay` | `0 8px 24px rgba(23,32,27,.12)` | **Only** modals, drawers, dropdowns, toasts |

- No `rounded-full` except avatars and the toggle switch. No `rounded-2xl`.
- No `hover:-translate-y`, no `shadow-lift`, no glass/blur (`backdrop-blur`).
- Spacing uses Tailwind's 4px scale. Console pages use `gap-4`/`p-4` between blocks; the public site uses `py-16`–`py-24` between sections.
- Motion: only feedback (button pressed, toast in, row updated), 150ms. Respect `prefers-reduced-motion`.

---

## 5. Status display

Defined once in `components/ui/Badge.jsx`, reused everywhere. Every status is shown as **a word**; colour only supports it.

| Status (DB value) | Label shown | Chip style |
|---|---|---|
| Room `Available` | Available | `tea-100` bg, `tea-900` text |
| Room `Occupied` | Occupied | `paper-200` bg, `ink-900` text |
| Room `Maintenance` | Maintenance | `paper-200` bg with diagonal hatch, `ink-600` text |
| Booking `Booked` | Booked | `paper-50` bg, 1px `ink-300` border, `ink-900` text |
| Booking `Checked-In` | Checked in | `tea-700` bg, white text |
| Booking `Checked-Out` | Checked out | `paper-200` bg, `ink-600` text |
| Booking `Cancelled` | Cancelled | transparent, 1px dashed `ink-300` border, `ink-600` text |
| Bill fully paid | Paid | `tea-100` bg, `tea-900` text |
| Bill partly paid / unpaid | Balance due LKR 12,400.00 | `signal-100` bg, `signal-700` text, **always with the amount** |

Chips: radius `sm`, 12px, weight 500, `px-2 py-0.5`. No status dot unless it's needed in a dense chart legend.

---

## 6. Components (`src/components/ui/`)

| Component | Rule |
|---|---|
| `Button` | Variants: `primary` (tea-700 fill, white text), `secondary` (white, ink-100 border, ink-900 text), `ghost` (text only, tea-700), `danger` (signal-700 fill; only inside a confirm dialog). Label is the verb that happens. |
| `Field` / inputs | Label above (sentence case, 13px, ink-900). Error below the field in `signal-700` with `role="alert"`. White background, `ink-300` border, `tea-500` focus ring. Native `date`, `email`, `tel` inputs. |
| Card | `paper-50`, 1px `ink-100` border, radius `lg`, no shadow. Use only when grouping is needed; plain sections are preferred. |
| `Tabs` | Text tabs with a 2px `tea-700` underline on the active tab. No pill tabs. |
| `Modal` / drawer | The only place `overlay` shadow appears. Title states the object ("Bill · Booking for Kamal Perera, Suite 101"). |
| `Toast` | Says what happened with the specific object: "Checked in: Kamal Perera, Room 101". No "Success!". Success is ink text with a tea-500 left rule; error is signal. |
| `StatCard` | Replace with a **summary strip**: one row of `label: number` pairs in text, separated by hairlines, not tile cards. |
| Tables | White, hairline row dividers, header row `paper-200`, sticky header, numbers right-aligned `tabular-nums`, scroll inside their own container. |
| `States` | Every data view designs loading (skeleton in `paper-200`), empty (says what to do next), error (says what failed + Retry), populated. |
| Charts (recharts) | Series colours: `tea-700`, then `ink-300`, then `tea-300` tint if a third is unavoidable. Bars start at zero, axes labelled with units (LKR), direct value labels where readable, no gradients, no donut charts. |
| Focus | Visible `tea-500` 2px ring with offset on every interactive element. |

---

## 7. Public site

Pages: `Home`, `RoomsBrowse`, `Login`, `Register` (and guest pages `MyBookings`, `BookingCheckout`). Guests **can** register and book online, so the copy may say "Book".

### 7.1 Home structure

1. **Opening:** the name, one plain sentence of what SkyNest is (three hotels: Colombo, Kandy, Galle), and the **availability search** (`StaySearch`) as the clearest control on the page. One photograph beside or below the text, **not** behind it with a dark gradient overlay.
2. **Three branches:** each with a photo, city, address and phone (from `GET /admin/branches` / seed), "Rooms from LKR …" (from the API), and a link "See rooms in Kandy". Same layout for all three; only the photo, sentence and line drawing differ.
3. **Room types:** Single, Double, Deluxe, Suite as a compact list: capacity, from-rate, amenities as text. No "Most popular" ribbons, no star ratings.
4. **During your stay:** services as a plain list (name and what it is), only if the data is publicly available; otherwise omit.
5. **Footer** (`ink-900` background, paper text): three addresses and phone numbers, policy links, and a quiet "Staff sign-in" link.

### 7.2 Branch identity

All branches share the same colours and layout. Each differs by:

| Branch | Photo subject | Optional line drawing (inline SVG, ink-300 stroke) |
|---|---|---|
| Colombo (Galle Face Terrace) | Seafront / Galle Face Green | Promenade and sea line |
| Kandy (Temple Road) | Kandy Lake and hills | Lake outline with hill contour lines |
| Galle (Lighthouse Street, Galle Fort) | Fort ramparts / lighthouse | Bastion outline with the lighthouse |

Use real facts only. The current blurbs in `lib/media.js` ("emerald tea slopes", "curated art", "UNESCO colonial gem") are to be rewritten in plain description.

---

## 8. Staff console

Pages: `ReceptionistDashboard`, `ManagerDashboard`, `AdminDashboard`, `ServiceRequest`, plus `BookingCheckout` when staff book for a guest.

- **Calm instrument.** `paper-100` page, white work areas, ink text, tea green only on the primary action and active nav item.
- **Header:** SkyNest mark, the role's tabs as text links, the branch name (fixed for branch staff, a selector for admin), user menu. No coloured or gradient header bar.
- **Landing is a task list, not a KPI wall.** The receptionist lands on Today: arrivals, in-house, departures due, each a table with one action per row ("Check in", "Check out", "Take payment"). Manager/admin Overview starts with the summary strip, then the revenue chart and top services.
- **Bill / folio** (`BillPaymentModal`, `BillTable`): receipt layout with lines, right-aligned figures and a rule above the total; amount paid; balance due. If the balance is above zero, a `signal` "Balance due" block with "Take payment". "Check out" stays enabled. If the server answers 402, the payment window opens (spec 09).
- **Destructive actions** confirm with a sentence stating the consequence: "Cancel this booking? Room 204 becomes available for 12/11–15/11."
- Density: table rows 40px, body 14px.

---

## 9. Copy

- Name actions by what happens: **Check availability, Book this room, Check in, Check out, Take payment, Add service, Save changes, Create staff account**. Never "Submit", "Get started" or "Learn more".
- One verb per action across the flow: the button says "Check in", the toast says "Checked in".
- No marketing superlatives: luxury, unparalleled, world-class, curated, nestled, paradise, "Experience…", "Discover…", "Stay above the ordinary".
- Formats: money `LKR 12,400.00`; dates `DD/MM/YYYY` (`12 Nov 2026` allowed in headings); times 24-hour or `2:00 pm`, consistent per page.
- Don't state facts that aren't in the specs or seed data (check-in times, distances, ratings). Leave them out rather than invent them.

### 9.1 Error messages

All API errors go through `errorMessage()` in `src/api/client.js`. Show the server's `detail` when it is a readable sentence; otherwise use these patterns. Messages sit next to the control that caused them and stay until corrected.

| HTTP | Situation | Message pattern |
|---|---|---|
| 400 | Business rule rejected (wrong status, invalid dates) | Server `detail`, plus the next step ("Only booked stays can be cancelled.") |
| 401 | Session expired / bad login | "Email or password is incorrect." / "Your session has ended. Sign in again." |
| 402 | Checkout with balance | Open the payment window: "Balance due: LKR 18,400.00. Take payment before checking out." |
| 403 | Other branch / other guest | "You don't have access to this record." |
| 404 | Missing record | "This booking no longer exists. Refresh the list." |
| 409 | Overlap / duplicate | Server `detail` + a way forward ("Choose other dates or another room." / "Open the existing guest instead.") |
| 422 | Validation | Inline under each field, using the field's label |
| 429 | Too many sign-in attempts | "Too many sign-in attempts. Wait a minute and try again." |
| 5xx / network | Server error | "The server couldn't complete this. Try again; if it keeps happening, tell the system admin." Never raw SQL, never "Oops". |

---

## 10. Anti-slop checklist (review before merging any UI change)

Fail the review if any of these appear without a reason from this spec:

- Full-bleed hero photo with dark gradient, centred white headline and two buttons; glass search bar floating over it.
- Navy + gold, cream + terracotta, or any palette outside §2.
- Playfair-style serif in the console; eyebrow labels; accent-coloured words in headlines.
- Rows of identical icon cards; KPI tile walls with sparklines; donut charts.
- Card shadows, hover lifts, `rounded-2xl`, pill-shaped status chips in many hues.
- "Success!" toasts, "Something went wrong", "Submit" buttons.
- Lotus, elephant, palm-sunset or "paradise" imagery.
- Placeholder names ("John Doe"), invented ratings or testimonials.

Three quick tests: (1) cover the logo — could this page be any hotel anywhere? (2) squint at a console screen — does the eye land on what needs action? (3) count the colours — more than ink, paper, tea, and red-for-problems means something is wrong.

---

## 11. Migration from the current UI

Applies to the redesign issue (planned as a separate issue after the current fixes).

| Current | New |
|---|---|
| `navy-*` text/borders | `ink-*` |
| `gold-*` accents, focus ring | `tea-*` |
| `emerald-*` | `tea-*` |
| `sky-*` (Booked) | outlined `ink` chip |
| `red-*` | `signal-*` (problems only) |
| `bg-surface` | `paper-100` |
| `.card` with `shadow-card` | border only |
| `.eyebrow`, uppercase `.label` / `.th` | removed / sentence case |
| `font-serif` (Playfair) everywhere on `h1–h3` | Source Serif 4 on public pages only |
| `StatCard` tiles | summary strip |
| Home hero (photo + gradient + centred headline) | §7.1 structure |

Order: tokens (`tailwind.config.js`, `index.css`, `index.html` fonts, `theme-color`) → `ui/` primitives → `Navbar`/`Layout` → `Home` → console pages. Changing the tokens first restyles most pages without touching their logic.
