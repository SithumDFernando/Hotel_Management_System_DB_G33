---
name: skynest-frontend
description: Design, restyle, review or build any SkyNest frontend screen (React + Vite + Tailwind in frontend/), covering the public site (Home, RoomsBrowse, Login, Register, MyBookings, BookingCheckout) and the staff console (receptionist, manager, admin dashboards, ServiceRequest, bills). Use whenever the task touches the UI, styling, colours, copy, layout, the home page, dashboards, or the user says the frontend looks generic, AI-generated, cluttered or too colourful.
---

# SkyNest frontend

The rules live in the repo, not here. This skill is the working process.

## Read first

1. `docs/specs/11_design_system.md`: colours, type, components, status chips, copy, error messages, anti-slop checklist. **Source of truth for appearance.**
2. `docs/specs/09_frontend_pages.md`: routes, page sections, which API each page calls.
3. `docs/specs/02_api_contract.md`: response shapes and error codes the UI must handle.
4. `AGENTS.md`: commit policy (never commit or push; suggest a message) and todo-ticking rules.

If a spec and the code disagree, follow the spec and tell the user. If two specs disagree, ask.

## Fixed facts (don't re-decide these)

- Stack: React 18 function components + hooks, Vite, Tailwind CSS, recharts, axios via `src/api/*.js`. No new UI libraries.
- Palette: ink, paper, tea green, plus signal red for problems only. Use the token names from spec 11 §2; never Tailwind default colours or raw hex in JSX.
- Branches: Colombo (Galle Face Terrace), Kandy (Temple Road), Galle (Lighthouse Street, Galle Fort). Room types: Single, Double, Deluxe, Suite. Currency LKR.
- Roles: guest, receptionist, manager, admin. Guests self-register and book online. Branch staff only see their branch, and the API enforces that (`require_role`, `assert_booking_access`). Hiding a button is convenience, not security.
- Payment methods: `Cash`, `Credit Card`, `Bank Transfer`. Statuses: room `Available | Occupied | Maintenance`; booking `Booked | Checked-In | Checked-Out | Cancelled`.
- Tax is computed by the database (`fn_calculate_tax`, 15%). Discounts exist on `generate_bill`. The UI shows what the API returns; the only browser arithmetic allowed is the labelled rate × nights estimate in `BookingCheckout`.

## Process

1. **State the job of the screen** in one sentence: who uses it and what they finish there.
2. **Inventory real content** from the API, seed data (`db/seed/sample_data.sql`) and specs. Never invent facts (check-in times, distances, ratings, reviews).
3. **Plan the change** against spec 11: which tokens and components, the one emphasis on the screen, and the four data states (loading, empty, error, populated).
4. **Run the anti-slop checklist** (spec 11 §10) on the plan. Change anything that matches.
5. **Build:**
   - Restyle by changing tokens and `src/components/ui/` primitives before touching pages.
   - Keep data-fetching and business logic as they are unless the task is a bug fix.
   - Keep each PR to one concern (a bug fix, or a restyle, not both).
6. **Verify:**
   - Run `npm run build` in `frontend/`.
   - Run the app (use the `run` skill) and look at the changed pages at phone (375px) and desktop widths, with every role that can reach them.
   - Click every button on the page and confirm it does something or shows a clear error.
   - Check contrast and visible keyboard focus.
7. **Hand off:**
   - Give a short note on what changed and why, and anything you couldn't verify.
   - Suggest a conventional commit message.

## Parallel work

Other agents may be editing backend files and individual pages at the same time. Before editing a frontend file, check `git status`; if it's already modified and you didn't change it, don't touch it. Tell the user instead.

## Public site vs console

|         | Public site                                       | Staff console                                      |
| ------- | ------------------------------------------------- | -------------------------------------------------- |
| Job     | Show a real place; make "Check availability" obvious | Finish the task fast and correctly                 |
| Type    | Source Serif 4 headings, generous spacing         | Inter only, 14px body, compact tables              |
| Colour  | Paper, ink, photos; tea green on the main action  | Paper and white, ink; tea green on the primary action only |
| Signature | The availability search plus real branch facts   | The Today task list (arrivals, in-house, departures) |

## Common mistakes to avoid

- Swapping one generic look for another (navy/gold → black/neon). Stay inside spec 11.
- Adding colour to separate things. Use spacing, borders and words instead.
- Generic copy: "Welcome to", "Experience", "Submit", "Success!", "Something went wrong".
- Status shown by colour alone, or "Balance due" without the amount.
- Hard-coding data the API provides (rates, branch addresses), except the photos and short descriptions in `src/lib/media.js`.
