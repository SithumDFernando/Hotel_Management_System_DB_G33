# Public site

Contents: purpose and structure, hero, rooms, branches, services, availability and enquiry, trust and proof, imagery without photos, navigation and footer, copy examples.

## Purpose and structure

A visitor arrives with three questions: where is it, what is the room like, and can I stay on my dates. Structure the site around answering them in that order. Do not build the usual stack of hero, three feature cards, testimonials, newsletter. Derive the page list from the content that exists.

A reasonable skeleton for a multi-branch chain:

- **Home**: one strong opening, then a way into each branch, then rooms, then services in brief.
- **Branch page** (one per town): the place, the building, the rooms there, how to get there, local services.
- **Room type page or section**: capacity, rate, amenities, a drawn plan, what is and is not included.
- **Services**: what can be requested during a stay and what it costs.
- **Availability / enquiry**: dates, branch, room type, guests.
- **Contact and policies**: check-in and check-out times, cancellation, tax line, late checkout.

## Hero

Open with the most characteristic thing about the hotel, in the form that carries it best. Options, pick deliberately:

- A large, quiet piece of typography naming the place, with the actual address or coordinates treated as part of the design.
- A drawn plan, elevation or map specific to the property (the building footprint, the lake edge, the fort wall).
- A live strip showing which room types are open this week at each branch (needs the API; show real data).
- A single photograph, if the user supplies one, treated with restraint: no stacked gradient overlay, no centred white headline over a darkened image.

Do not default to a full-bleed stock image, a dark gradient, and a centred "Welcome to" headline with two buttons.

## Rooms

Show a room as a place with measurable facts, not as a card with a stock photo and a star.

- A drawn floor plan in inline SVG: bed positions, bathroom, window wall, with a scale bar. This is cheap to produce, accurate to the brief, and unlike anything a template produces. Keep line weight consistent and labels plain ("Bed 1.8 m", "Window onto courtyard").
- Facts in a definition-style list: capacity, daily rate in LKR, bed type, view, floor range, amenities. Rates come from the API or seed data, never invented.
- Rate display: the number, the unit ("per night"), and a single line stating whether VAT and levy are included. State the rule as the system defines it, and let the API supply the figure.
- Differentiate types by what actually differs (capacity, plan, view), not by a decorative badge ("Most popular").

## Branches

Each branch is a distinct place within one system. Give each:

- Its own accent colour and one drawn motif derived from the town (see `skynest-context.md` for a worked set).
- Its own opening sentence of real description (where it sits, what is within a short walk).
- A practical block: address, phone, how guests arrive, check-in and check-out times.

Keep layout, type and components identical across branches. Only accent, motif, copy and imagery change; that is what makes it a chain rather than three websites.

## Services

Present the catalogue as a plain, scannable list: name, one line of what it is, the price or "priced at time of use". Group by category if there are more than a handful. Do not give each service an icon in a circle. If an illustration helps, make one small consistent line drawing set and use it only where it clarifies.

## Availability and enquiry

This is the conversion point; make it the clearest control on the page.

- Fields: branch, check-in, check-out, guests, optional room type. Native date inputs are fine; style them, do not replace them with a broken custom picker.
- On submit, call the API and render exactly what comes back: available room types with rate, or a clear statement that nothing is available for those dates and what the nearest open dates are if the API provides them.
- Never compute nights, totals, tax or discounts in the browser. Show the figures the API returns.
- Validate in the interface only for clarity (check-out after check-in); the database remains the authority, and its rejection message must still be shown properly.
- If the system is an internal operations database and not a booking portal, the public flow ends in an enquiry or reservation request that staff confirm, and the copy says so ("We'll confirm by phone or email"). Do not imply instant online confirmation the system does not provide.

## Trust and proof

Replace fake testimonials and five-star rows with things that can be true and checked: check-in and check-out times, cancellation terms, the tax line, the address on a map drawing, a named front-desk contact number. If real guest quotes are supplied, attribute them properly and keep them few.

## Imagery without photographs

When no photos are provided, do not fill with grey rectangles or stock-looking gradients. Use:

- Inline SVG plans, sections and maps drawn for the property.
- Texture from the place (laterite, tile pattern, tea-terrace contours) rendered as simple CSS or SVG patterns used sparingly.
- Typography as image where the name of the place is strong.

State plainly in the hand-off where real photographs should go and what ratio they need.

## Navigation and footer

Short top navigation using the real page names. A footer that carries real information (three addresses, phone numbers, reception hours, policy links), not a link farm or social icon row. A staff login link belongs in the footer, quiet and labelled "Staff sign-in".

## Copy examples

Weak: "Experience unparalleled luxury in the heart of the city."
Better: "Forty rooms above Galle Fort's southern rampart. Check-in from 2 pm."

Weak: "Book Now"
Better: "Check availability"

Weak: "Our amenities"
Better: "What's in the room" (followed by the actual list)

(The better examples are illustrations of tone; use only facts from the user's content.)
