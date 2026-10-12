# Anti-slop checklist for hotel UIs

Contents: what slop is, hotel-specific tells (public), tells (console), copy tells, how to review, replacements that work.

## What slop is

Slop is the statistical average of every hotel template: the output you would produce for any hotel without thinking about this one. Each item below is acceptable if the brief asks for it and a failure if it appears by default. The test for every element is "which fact about this hotel or this task does it carry?" If the answer is none, replace it.

## Public site tells

Layout and structure

- Full-bleed hero image with a dark gradient and centred white headline plus two buttons.
- A translucent glass booking bar floating over the hero.
- Three identical rounded cards with an icon each (wifi, pool, breakfast).
- Alternating image-left / text-right sections repeated down the page.
- Testimonial carousel with five gold stars and a circular avatar.
- "Our Rooms" grid of identical cards with a "Most popular" ribbon.
- Newsletter signup band above the footer.
- Fade-and-slide-up on every section, hover lift on every card.

Visual defaults

- Navy and gold "luxury" palette; or cream with terracotta; or near-black with one bright accent.
- Playfair-style high-contrast serif for headings over a neutral sans body.
- Emoji or generic icon set standing in for amenities.
- Stock-photo placeholders, grey boxes, or random gradient blobs as imagery.
- One word in each headline set in italic or accent colour.
- Small tracked-out all-caps label above every heading.
- Numbered 01 / 02 / 03 markers on content that is not a sequence.

## Console tells

- Purple-to-blue gradient sidebar or header.
- Row of four KPI cards with big numbers and tiny sparklines as the home screen.
- Donut charts for anything with categories; 3D or gradient-filled bars.
- Rounded-2xl white cards with the same soft shadow on a light grey page.
- Icon-only navigation with tooltips as the sole labels.
- Toasts that say "Success!" with no information.
- Tables with no right-aligned numerals, proportional digits, or sticky headers.
- Placeholder data: "John Doe", "Jane Smith", sequential round amounts, dates all in one week.
- Status shown only by colour; status chips as decorative pills in five hues.
- A dashboard home with no task on it. Staff land on what needs doing today (arrivals, departures, balances due).

## Copy tells

- "Welcome to", "Experience", "Discover", "Indulge", "Escape", "Your perfect stay awaits".
- "Luxury", "unparalleled", "world-class", "curated", "nestled" with nothing concrete after them.
- Em-dash fragments as labels ("Comfort — redefined").
- Buttons that say "Submit", "Learn more", "Get started".
- Error text such as "Something went wrong" or "Oops!".
- Feature lists that describe the system's architecture to users ("Powered by a robust database").

## How to review

1. Cover the logo. Could this page belong to any hotel in any country? If yes, it is slop. Find the place-specific thing and promote it.
2. Squint test on the console's main screen: does the eye land on the thing that needs action (a balance due, an arrival, a conflict), or on decoration?
3. Count distinct border-radius values and shadow styles. Decide them by hierarchy, not by habit. Many components should have no shadow at all.
4. Read every string aloud. Delete any that a hotel could say about itself without naming a fact.
5. Check each colour: is it identity, or is it status? Status colours must not be spent on decoration.
6. Remove one decorative element. Then look again.

## Replacements that work

| Slop                           | Replacement                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Hero stock photo with gradient | Place-specific drawing or typography; the real address as a design element                         |
| Amenity icon cards             | A plain list of what is in the room, as text                                                       |
| Testimonial carousel           | Check-in and check-out times, policies, a phone number you can call                                |
| Grey image placeholders        | Inline SVG plans or sections drawn for the building                                                |
| KPI tile dashboard             | "Today" view: arrivals, departures, in-house, balances due, each a list                            |
| Donut revenue chart            | Grouped bars by branch with direct value labels, table beneath                                     |
| Success toast                  | "Checked in: Room 204, Ms Fernando"                                                                |
| "Submit"                       | The verb that happens: "Create booking", "Take payment"                                            |
| Gold-on-navy                   | A palette derived from the actual place: stone, tile, lake light, tea-terrace green, sea-salt grey |

## A caution against over-correction

Replacing one default with its mirror image is still a default (swapping cream for black, serif for mono). Pick colour and type from the place and the task. Spend boldness in one location per surface and keep the rest disciplined; a console where everything is a statement is as tiring as a template.
