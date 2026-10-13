---
name: hotel-frontend
description: Design and build distinctive hotel and hospitality frontends in vanilla HTML/CSS/JS, covering both the public-facing website (branches, rooms, services, availability enquiry) and the internal management console (front desk, billing, reports). Use this skill whenever the user mentions a hotel website, resort or guesthouse site, room booking pages, front-desk or reception screens, hotel admin dashboards, occupancy or billing screens, or the SkyNest / HRGSMS project, even if they only say "the UI", "the frontend", or "the website". Also use it when they want hotel UI that does not look AI-generated, templated, or generic.
---

# Hotel Frontend: public site + management console

This skill is a domain layer on top of `/mnt/skills/public/frontend-design/SKILL.md`. Read that file first and follow its process (design plan, review against the brief, build, self-critique). This skill adds what is specific to hotels: two audiences with opposite needs, the visual vocabulary of the trade, and the failure modes that make hotel UIs look generated.

## Reading order

1. `frontend-design` skill (general craft and process).
2. This file (structure, rules, process additions).
3. As needed:
   - `references/public-site.md` when building anything guests see.
   - `references/management-console.md` when building anything staff use.
   - `references/anti-slop.md` before finalising any design plan, and again before delivering.
   - `references/skynest-context.md` when the work is for SkyNest Hotels / HRGSMS (screens, statuses, API rules, branch identities).

## Two surfaces, two jobs

The most common failure is giving both surfaces the same treatment: a polished marketing look dragged into a tool people use eight hours a day, or a grey admin template used to sell a stay. Decide the job of each surface before choosing anything visual.

|         | Public site                                                      | Management console                                                              |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Who     | A traveller deciding where to stay, often on a phone             | Front desk, managers, finance staff, mid-shift and under time pressure          |
| Job     | Make one specific place feel real and make the next step obvious | Let someone complete a task correctly and quickly, and see problems at a glance |
| Density | Generous, paced, image and type led                              | Dense, scannable, keyboard friendly                                             |
| Type    | Expressive display face, comfortable reading sizes               | Highly legible text face, tabular numerals, small but not tiny                  |
| Motion  | One considered moment at most                                    | Only feedback for actions (saved, rejected, status changed)                     |
| Success | Enquiry or availability check started                            | Task done without a second look; errors understood on first read                |

Both surfaces share one token file (colour, type families, spacing, radii, status colours) so they read as the same hotel, but each sets its own dials: the console uses a quieter palette expression, tighter spacing, and smaller type steps than the public site.

## Ground the design in the place

Hotels are specific buildings in specific towns. A design that could belong to any hotel anywhere is the default and therefore the failure. Before planning visuals, write down for each branch: the town, the building or setting, its materials, its light, its season, how guests arrive, what a guest would photograph. Pull colour, texture, pattern and drawing style from that list. For SkyNest this is worked through in `references/skynest-context.md`; for any other client, do the same exercise from the brief or ask for the missing facts.

Avoid the tourist-brochure clichés for the region too (a gold lotus, an elephant silhouette, a generic palm on a gradient sunset). Use things that only that place has: the actual street grid, a real elevation profile, a particular stone, a local timetable.

## Process additions to the frontend-design plan

Add these to the design plan before any code:

1. **Surface split.** One sentence on the public job, one on the console job.
2. **Branch/property identity.** If multiple properties, a rule for how they differ (for example, one accent and one drawn motif each) inside a single system, so they feel related but not identical.
3. **The one memorable thing for each surface.** Public: one signature element (a drawn room plan, a live availability strip, a distinctive hero treatment). Console: one signature view (almost always the room-by-date occupancy chart). Everything else stays quiet.
4. **Real content inventory.** List the real rooms, rates, services, and branch facts from the brief or project files. Build with those, never lorem ipsum or "Feature One".
5. **Slop review.** Walk the plan through `references/anti-slop.md`. If any item matches, change it and say what you changed.

## Hard technical rules

These come from how the user actually ships (static frontend on a CDN, API behind it) and from the academic requirement that the UI is a thin client.

- **Vanilla only.** Plain HTML, CSS and JavaScript. No React, no JSX, no build step, no CSS framework. Inline SVG for icons, diagrams and illustration. Reason: the frontend deploys as static files and must be inspectable by examiners without tooling.
- **No business logic in the browser.** Never compute bills, tax, nights, discounts, availability, or status transitions in JavaScript. Call the API, render what comes back. Formatting (currency to 2 decimals, DD/MM/YYYY) is allowed; arithmetic that changes a business outcome is not. Reason: all rules live in the database and the thin-client principle is graded.
- **Surface database errors as human messages.** Constraint and trigger failures (overlapping booking, checkout with unpaid balance, service entry on a booking that is not checked in) arrive as API errors. Map each to a plain sentence that says what happened and what to do next. Never show raw SQL errors or a generic "Something went wrong".
- **Role-aware, not role-enforced.** Show each role only the screens it can use, based on the role the API returns. The security boundary is the per-role database credential; hiding a button is convenience, not protection. Never imply otherwise in comments or copy.
- **API base URL in one config object** at the top of the main script, so the frontend can point at a local or deployed backend without edits across files.
- **No external runtime dependencies except fonts.** If fonts are loaded from a CDN, give each a real fallback stack and test that the layout survives the fallback. Prefer self-hosted or system stacks when the brief allows.
- **Single-file or small static set.** For a deliverable the user will open directly: one self-contained `.html` with inline CSS/JS/SVG. For a project structure: `index.html`, `css/tokens.css`, `css/public.css`, `css/console.css`, `js/api.js`, `js/*.js`, with the shared tokens file linked from both surfaces.

## Quality floor (build it in, do not announce it)

- Visible keyboard focus on every interactive element; logical tab order.
- Status is never colour alone: pair every colour with a word or shape (Available, Occupied, Outstanding balance).
- Colour contrast at WCAG AA for text and for status chips.
- `prefers-reduced-motion` respected; no motion is required to understand anything.
- Responsive: public site mobile first; console usable down to tablet width, with tables that scroll inside their own container rather than the page.
- Forms have real labels, inline validation messages tied to fields, and sensible input types (`date`, `tel`, `email`, `inputmode`).
- Tables use proper `th scope`, right-aligned numerals, `font-variant-numeric: tabular-nums`.
- Every data view designs four states: loading, empty (says what to do next), error (says what failed and how to fix it), and populated.

## Copy rules

Words are interface. Name things the way staff and guests say them: "Check in", "Take payment", "Balance due", not "Execute transition" or "Submit". Keep one verb per action across the whole flow: the button says "Check in", the confirmation says "Checked in". Errors do not apologise and are specific. No marketing superlatives on the public site ("luxurious", "unforgettable", "world-class"); describe the room, the view, the walk to the lake, the breakfast hours.

## Verifying

When the environment allows, render the page and look at it at phone and desktop widths before delivering. Check the console's densest screen with realistic data volumes (40 bookings on the chart, a bill with 12 service lines), not three sample rows. Fix what looks cramped or empty rather than reporting it.

## Delivering

Give the user the file(s) ready to open or drop into their static host, with a short note stating the design decisions (what the signature element is, what each branch's identity rule is) and any place where the brief conflicted with a requirement. Do not pad the summary with a feature list.
