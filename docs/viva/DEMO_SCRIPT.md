# SkyNest viva: demo script

**Format:** 15 minutes of technical demo, then 10 minutes of Q&A. No slides: one ER diagram, the live app in **two browsers**, and live SQL.

**The story:** we follow one hotel day at SkyNest Colombo. A guest browses, signs in and books; the front desk checks the guest in and adds services; another guest pays and checks out; then management sees all of it in the reports. Each person demos the part they built, and between segments we show the database doing the work, not just the UI.

**The one sentence to repeat:** *the business rules live in the database, so no client (UI, API or direct SQL) can break them.*

Related files:
- [sql/](sql/): the four scripts run live (all tested on a fresh build; everything that writes is rolled back).
- [MANUAL_TESTING_GUIDE.md](../work/manual_testing/MANUAL_TESTING_GUIDE.md): the source of every expected value below.
- [ER Diagram Refined.png](../refernce/ER%20Diagram%20Refined.png).

---

## 1. Running order at a glance

| Time | Segment | Speaker | Screen |
|---|---|---|---|
| 0:00–3:00 | 1. Overview, architecture, auth and security | **Sithum** | ER diagram → **Browser A** (signed out → Ruwan) |
| 3:00–6:00 | 2. Booking, double booking, check-in | **Vinuji** | Browser A (guest) → terminal → **Browser B** (signs in as front desk) |
| 6:00–7:15 | 3. Services and price snapshot | **Chamika** | Browser B (front desk) |
| 7:15–10:00 | 4. Bill, payment, checkout | **Sheereen** | Browser B (front desk) |
| 10:00–10:30 | Switch: sign out both, sign in admin and manager | Sadeepa | A = **Admin**, B = **Manager**, snapped side by side |
| 10:30–12:15 | 5. Same data, different scope: reports and roles | **Sadeepa** | A and B side by side |
| 12:15–13:00 | 6. Manager changes a price | **Chamika** | Browser B (manager) |
| 13:00–15:00 | 7. Performance, then close | **Sithum** | Terminal → close |

**Time checks:** Vinuji starts by **3:00**, Sheereen by **7:15**, the switch by **10:00**, Sithum's close by **13:00**. Sithum signals time with a hand gesture.

---

## 2. Marking criteria coverage

Check this table during the rehearsal: every row must actually be shown.

| Criterion (marks) | Where we show it | Evidence on screen |
|---|---|---|
| **Demo plan and communication (5)** | Whole demo | Sithum's roadmap and team intro in the first minute, one story, named handovers, two browsers so roles never get confused, time kept |
| **Functionality: use of the DB and UI (8)** | Segments 1–6 | Browse → sign in → conflict → book → check-in → service → bill → part payment → checkout → reports → price change, across **all four roles** |
| **Database design (8)** | Segments 1–6 | ER diagram, 3NF/BCNF, junction table, rate and price snapshots, 3 triggers, 6 procedures, 6 functions, 6 views, CHECK/UNIQUE/exclusion constraints, deliberate denormalization |
| **Performance tuning and advanced features (4)** | Segments 1, 2, 5, 7 | `EXPLAIN ANALYZE` at 50k rows (GiST, composite, FK and partial indexes, ~50× before/after), row locking, window function, security (bcrypt, JWT, RBAC, branch scoping, rate limiting, parameterized SQL) |
| **Bonus (up to 5)** | Segment 1, recapped in 7 | UX (design system, accessibility), CI/CD (GitHub Actions), cloud (AWS EC2), containerization (Docker Compose). We do **not** claim email or push notifications. |

---

## 3. Roles

| Person | Built | Demos | Owns these Q&A topics |
|---|---|---|---|
| **Sithum** | Schema, constraints, indexes, auth/JWT, Docker, CI/CD, deployment | Segments 1 and 7 | ER design, normalization, constraints, ACID, indexing, security, CI/CD, Docker, cloud |
| **Vinuji** | Booking, double-booking trigger, check-in/out | Segment 2 | `create_booking`, `trg_double_booking`, `trg_room_status`, locking |
| **Chamika** | Rate lookup, guests, services, price-snapshot trigger | Segments 3 and 6 | `fn_get_current_rate`, guest rules, `trg_service_usage`, price snapshots |
| **Sheereen** | Bill functions, `generate_bill`, `record_payment` | Segment 4 | Billing formula, transactions, payment edge cases, stored totals |
| **Sadeepa** | Views, seed data, reports, admin | Switch + Segment 5 | Views, `RANK()`, seed design, branch scoping, admin |

**Who clicks:** each speaker drives the laptop during their own segment (they know their own flow best). The next speaker stands ready beside them, so a handover is one sentence, not a pause. Sithum runs the terminal commands for Vinuji and himself, so nobody has to hunt through command history.

---

## 4. Setup

### The day before
- [ ] Run the full script twice with a timer. Each segment must finish on time. Cut from the list in §7 if needed.
- [ ] Record a screen video of a full clean run (Plan B).
- [ ] Confirm whether the **AWS EC2** deployment is up, and note its URL here: `http://________:8080`. If it's down, don't claim cloud hosting as a live feature: say it was deployed, and show [SETUP.md §5](../SETUP.md).
- [ ] Open the latest **green** GitHub Actions run in a tab, so it's one click away in segment 1.

### 60 minutes before (after 05:30 Sri Lanka time, so the database date matches)
```powershell
docker compose down -v
docker compose up --build -d --wait
```
- [ ] http://localhost:8000/api/health returns `200`.
- [ ] `docker compose exec db psql -U skynest_user -d skynest -c "SELECT CURRENT_DATE, count(*) FROM booking"` shows **today** and **57**.
- [ ] Do a dry run of all four SQL scripts (they roll back, so they're safe to run twice).

> The rebuild resets every demo account and booking. Don't click through the demo after this point, or the numbers in this script will be wrong. If you must rehearse again, rebuild again.

### 15 minutes before: the screen

Two **different browsers** (for example Chrome and Edge). The sign-in token is kept per browser, so two tabs in the same browser would share one account. Password for every account: `SkyNest@2026`.

| Window | Starts as | Open on | Later becomes |
|---|---|---|---|
| **Browser A** (Chrome) | **Signed out** | `http://localhost:8080/`. Second tab: the green GitHub Actions run | **Admin** (`admin@skynest.lk`) |
| **Browser B** (Edge) | **Signed out** | `http://localhost:8080/login` | **Manager** (`mgr.colombo@skynest.lk`) |
| **Terminal** | PowerShell in the repo root, font 18pt+ | The SQL commands below already in history | |
| **Image** | ER diagram | Full screen, ready to Alt-Tab to | |

- Zoom both browsers to 110–125% so the back row can read them.
- Practise the side-by-side snap: **Win + ←** on Browser A, **Win + →** on Browser B.
- Both browsers start signed out on purpose: signing in live is part of the demo.

The SQL commands (run from the repo root):
```powershell
Get-Content docs\viva\sql\1_double_booking.sql | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\2_billing.sql        | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\3_indexes.sql        | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\4_views.sql          | docker compose exec -T db psql -U skynest_user -d skynest -e
```
Run `cls` before each one so the output starts at the top of the screen.

---

## 5. The script

Each segment lists what to do, what to say, and the database point behind it. Say the lines in your own words, but keep every **bold** term. Those are the words the examiners are listening for.

### Segment 1. Sithum: overview, architecture, auth and security (0:00–3:00)

This segment sets the tone for the whole demo. Don't rush, face the examiners rather than the screen, and point only when you name something on it. The spoken part is about 460 words: 3 minutes at a steady pace. Rehearse it with a timer; if you go over, drop the UX sentence in 1d and the wrong-password step in 1e first. Never cut the ACID or security lines.

#### 1a. Opening and the team (0:00–0:35). Screen: Browser A, home page, signed out

> "Good morning. We're Group 33, and this is **SkyNest**: a reservation, front-desk and billing system for a hotel chain with branches in Colombo, Kandy and Galle, and four roles: **guest, receptionist, manager and admin**.
>
> In fifteen minutes we'll run **one hotel day, live**, on a **freshly built database**: a guest books, the front desk checks them in and charges services, another guest pays and checks out, and management sees it in the reports. Where it matters, we'll go around the UI and prove it **directly in SQL**.
>
> Each of us demos what we built. **Vinuji**: bookings, double-booking prevention, check-in. **Chamika**: rates and hotel services. **Sheereen**: billing and payments. **Sadeepa**: reports, views and the admin side. I designed the **schema, indexes, security, and the Docker and CI/CD** setup."

#### 1b. Architecture, design and ACID (0:35–1:30). Screen: Alt-Tab to the ER diagram

> "It's **three tiers**: **React**, **FastAPI**, and **PostgreSQL**. Our key decision: **the business rules live in the database**, in **stored procedures, functions, triggers, views and constraints**. The API stays thin: it checks who you are, calls the database, and turns database errors into proper HTTP codes. So the rules hold for **any** client, even someone typing raw SQL.
>
> *(point at the diagram)* **Thirteen tables, in 3NF and in fact BCNF**. For example, a room's price depends on the branch **and** the room type, so prices have their own table instead of repeating on every room, and many-to-many links go through **junction tables**.
>
> And every operation is **ACID**. **Atomic**: a payment and its bill update commit together or not at all. **Consistent**: keys, CHECK constraints, triggers, and an **exclusion constraint** that makes a double booking impossible. **Isolated**: **row locks**, so two receptionists can't act on the same booking at once. **Durable**: PostgreSQL's **write-ahead log** on a persistent volume."

#### 1c. DevOps (1:30–1:55). Screen: Browser A, GitHub Actions tab (green run)

> "**Containerization**: one command, `docker compose up`, starts **four containers** (database, pgAdmin, API, and the front end on Nginx) with **health checks**. **CI/CD**: on every push, **GitHub Actions** rebuilds the schema from scratch and **fails on any SQL error**, runs our tests against real Postgres, builds the front end, and smoke-tests the Docker stack. *(point at the green ticks)* And it's **deployed on AWS EC2**."

*(Say "deployed on AWS EC2" only if it's live today. Otherwise: "and it has been deployed on AWS EC2".)*

#### 1d. Live: public browsing (1:55–2:15). Screen: Browser A, SkyNest tab

**Do:** Branch **Colombo**, Check-in **today**, Check-out **today + 2** → **Check availability** → Room type **Double**, amenity chip **Mini-bar**. You should see "**2 rooms free in Colombo**": **102** and **111**.

> "Anyone can browse without an account. Availability is **calculated live from the bookings**, at **Colombo's rate**. The UI follows **one design system**: calm colours, red only for problems, **keyboard accessible**, and it works on a phone."

#### 1e. Live: sign-in and security (2:15–3:00). Screen: Browser A

**Do:**
1. Click room **102** → **Book this room**. You're sent to the sign-in page.
2. `ruwan@mail.com` with a **wrong** password → **Sign in**. An error appears.
3. Correct password `SkyNest@2026` → **Sign in**. You land back on room 102's booking page, as Ruwan.

> "Booking needs an account, so it sends me to sign in and **remembers where I was going**.
>
> A wrong password and an unknown email get the **same message in the same time**, so nobody can probe which emails exist, and repeated failures are **rate-limited**.
>
> Passwords are **hashed with bcrypt**. Signing in returns a **signed JWT** that expires in an hour. The server checks the **role on every route**, not just the UI, staff are **locked to their branch on the server**, and every query is **parameterized**, so no SQL injection.
>
> I'm now Ruwan, a guest, and he wants a room. **Vinuji.**"

*(Running late? Drop step 2 and the rate-limit sentence. Never drop the JWT, role and branch sentence.)*

### Segment 2. Vinuji: booking, double booking, check-in (3:00–6:00)

**Window:** Browser A (Ruwan). **Do (try the conflict first):**
1. **Rooms**, no dates → room **107 Colombo** → **Book this room**.
2. Check-in **D+10**, Check-out **D+14** → **Book this room**.
3. You'll see the alert "Room 107 is already booked for the selected dates", plus a "Free on these dates" list.

**Say:** "Room 107 is taken by another guest on those dates. The UI didn't decide that. The database did. Let me prove it by going around the UI completely."

**Terminal** (Sithum runs it): `cls`, then **`1_double_booking.sql`**. Point at three results:

| Output | Say |
|---|---|
| `ERROR: Room 107 is already booked…` | "Layer 1: a **BEFORE INSERT trigger**, `trg_double_booking`. It also locks the room row with `SELECT … FOR UPDATE`." |
| `ERROR: … violates exclusion constraint "excl_booking_room_overlap"` | "Layer 2: with the trigger switched **off**, the **exclusion constraint** still blocks it. A trigger only sees *committed* rows, so two simultaneous bookings could both pass it. The constraint is enforced by a **GiST index** on `(room_id, daterange)`, so it holds under **concurrency**. It's **partial**: cancelled and checked-out stays don't block." |
| `INSERT 0 1` | "And back-to-back stays are allowed: the range is half-open, `[)`, so the check-out day can be the next guest's check-in day. Everything was **rolled back**." |

**Window:** Browser A. **Do (now the booking that succeeds):**
4. Open room **102** (or click it in the suggestions) → dates **D+30 → D+32**, payment **Cash**.
5. Point at the summary: "Rate LKR 8,000.00 × 2".
6. Click **Book this room**. You'll see the toast "Booked: Double Room 102…".

**Say:** "`create_booking` is a **stored procedure**. It validates the guest, the room, no past dates, a maximum of 30 nights, and not under maintenance. Then it **snapshots** the rate into `booking.rate_at_booking`. That isn't redundancy: if the hotel raises prices tomorrow, Ruwan's booking keeps the price he agreed to."

**Window:** Browser B. **Do (sign in live as the front desk):**
7. Sign in as `rec.colombo@skynest.lk` / `SkyNest@2026`. It opens straight on **Today**.

**Say (while it loads):** "Now I'm the receptionist at Colombo, in a separate browser. The same sign-in gives me a different role, so I get the **front-desk console**, and only **Colombo's** rooms and guests."

**Do:**
8. Point at "Arrivals today": Ruwan, room 106 → **Check in**.
9. You'll see the toast "Checked in: Ruwan Jayasinghe, Room 106". The summary changes to In-house 6 and Rooms available 4.

**Say:** "`perform_checkin` locks the booking row `FOR UPDATE`, so two receptionists can't check in the same guest twice. It sets the status to Checked-In. An **AFTER UPDATE trigger**, `trg_room_status`, then marks room 106 **Occupied**. The room status is always derived from the booking, and nobody updates it by hand."

Hand over: "Guests who are in house use hotel services. Chamika."

### Segment 3. Chamika: services and price snapshot (6:00–7:15)

**Window:** Browser B (front desk). **Do:**
1. Today → "Staying on": **Tharindu, 110** → **Add service**.
2. **Laundry**, quantity **3** → **Add**. You'll see the toast "Added: 3 × Laundry…" and Services total **LKR 6,000.00**.
3. Open `http://localhost:8080/services/71050000-0000-0000-0000-000000000000` (Ahmed, Booked). It reads "Services can only be added while the guest is checked in."

**Say:**
- "Every insert into `service_usage` passes a **BEFORE INSERT trigger**, `trg_service_usage`. It rejects the insert unless the booking is **Checked-In**, the service is **active**, and the date is **within the stay**."
- "It also **copies the current `base_price` into `unit_price`**. That's the same snapshot idea as the room rate: a later price change never rewrites an old bill. I'll prove that from the manager's side later."
- "Ahmed hasn't arrived, so the database would refuse the insert. The UI simply reflects that rule."
- Hand over: "Sanduni is due to check out today and hasn't paid. Sheereen."

### Segment 4. Sheereen: bill, payment, checkout (7:15–10:00)

**Window:** Browser B → Today. **Do:**
1. "Departures due": **Sanduni, 108** → **Check out** → confirm.
2. The bill window opens instead, showing "**Balance due: LKR 31,625.00**. Take payment before checking out."

**Say: walk through the bill on screen:**
- "Checkout first calls `generate_bill`. That procedure **composes small functions**: `fn_calculate_nights`, `fn_get_room_charges` (2 nights × the snapshot rate = **24,000**), and `fn_get_service_charges` (**3,500**). `fn_calculate_tax` adds 15% of 27,500, which is **4,125**. The total is **31,625**."
- "The functions are in `db/functions` and are reused by the bill, the reports and the guest view, so there's one formula and no duplicated logic."
- "It's written as an **UPSERT**, `INSERT … ON CONFLICT (booking_id) DO UPDATE`, so the bill can be regenerated if a service is added later. `bill.booking_id` is UNIQUE, so it's one bill per booking."

**Do:**
3. Amount **40000** → shows "Amount cannot exceed the outstanding balance."
4. Amount **10000**, Method **Cash**, Note "Part payment" → submit. Balance due becomes **21,625.00**.

**Say:** "`record_payment` runs in **one transaction**. It locks the bill row **`FOR UPDATE`**, checks the amount against the balance, inserts the payment, recomputes `amount_paid` from the **SUM of payments**, and updates `outstanding_balance` and `balance_flag`. Two cashiers can't overpay the same bill at the same time. The overpayment check isn't only in the UI: the procedure raises an error too."

**Do:**
5. **Use full balance** → Method **Credit Card** → submit. You'll see "This bill is fully paid" and **Check out now** appears.
6. **Check out now**. You'll see the toast "Room 108 is now available".

**Say (design point):** "`outstanding_balance` is stored even though it can be derived. That's **deliberate denormalization**: the dashboards and the 'balance due' report read it constantly, and it's indexed with a **partial index**. It stays correct because only the two procedures ever write it, inside a transaction."

Hand over: "That payment is already in the manager's numbers. Sadeepa."

### Switch. Sadeepa: change of roles (10:00–10:30)

Sadeepa talks while he clicks, so there's no silence.

**Do:**
1. Browser A: account menu → **Sign out**. Sign in as `admin@skynest.lk`.
2. Browser B: account menu → **Sign out**. Sign in as `mgr.colombo@skynest.lk`.
3. **Win + ←** on Browser A (admin), **Win + →** on Browser B (manager). Both on **Overview**.

*(If typing is slow, use the "Demo accounts (dev only)" panel on the sign-in page: one click fills the account.)*

**Say (while signing in):** "The front desk's day is done. Now let's look at the same data from the top: on the left the **admin**, who runs the whole chain; on the right the **Colombo manager**. Same app, same database, and two very different views of it."

### Segment 5. Sadeepa: same data, different scope (10:30–12:15)

**Window:** both, side by side. **Do:**
1. Point at the manager's **Balance due** tile (right). It was LKR 141,975 at the start of the day, and is now about **LKR 110,350** with **3 bills** (141,975 − Sanduni's 31,625).
2. On the admin (left), pick branch **Colombo**: the same figures as the manager. Then switch to **Kandy**, then back to **All branches**: the numbers change. The manager (right) has no branch picker at all.
3. Point at "Monthly revenue, last 6 months" and "Top services by quantity".
4. Manager: **Reports** → **Billing summary** → tick **Balance due only**. 3 rows: Kamal 101, Malith 105 and Tharindu 110.
5. Admin: **Reports** (All branches) → **Top services**: ranks per branch, including the tie in Galle.
6. Admin: **Accounts** tab → filter **Receptionist** (20 seconds).

**Say:**
- "Both screens call **the same endpoints**, which read **the same views**: `v_monthly_revenue`, `v_guest_billing_summary`, `v_room_occupancy`, `v_service_usage_breakdown`, `v_top_services`. The joins and aggregates are written once in SQL, and the API just runs `SELECT … FROM view WHERE branch_id = $1`."
- "The difference is **branch scoping**. For a manager, the server takes the branch from the **signed-in token** and ignores any branch in the URL, so this manager can only ever see Colombo, even by editing the request. The admin can choose any branch, or all of them."
- "Revenue is recognized at checkout, grouped by checkout month. That's why `booking.check_out_date` has its own index. And 'Balance due only' is the query the **partial index** on unpaid bills exists for."
- "Top services per branch uses a **window function**: `RANK() OVER (PARTITION BY branch_id ORDER BY SUM(quantity) DESC)`. RANK keeps ties, and Galle has one."
- "Only the admin can create staff accounts. Every route is protected by a **role check**, so a guest or a manager who tries an admin route gets **403**, whatever the UI shows."

> **Avoid KI-13:** the "Rooms occupied today" tile on Overview undercounts. Don't point at it. If an examiner asks, it's a logged date-filter bug in the UI, not in the view.

*(Optional, if ahead of time: Sithum runs `4_views.sql` to show the RANK() output, including the Galle tie at rank 2.)*

Hand over: "Managers also control prices. Chamika."

### Segment 6. Chamika: a price change doesn't rewrite history (12:15–13:00)

**Window:** Browser B (manager). **Do:**
1. **Service catalogue** → **Laundry** (LKR 500.00) → change to **600** → **Save price**. You'll see "Saved: Laundry now LKR 600.00 for new orders".
2. Open `http://localhost:8080/services/71090000-0000-0000-0000-000000000000` (Tharindu, the stay from segment 3). The catalogue on the left now says **LKR 600.00 each**, but the 3 × Laundry line added earlier is still **LKR 1,500.00** (3 × 500).

**Say:** "The manager just raised the price of laundry. New orders will pay 600. But the laundry I added for Tharindu twenty minutes ago is still charged at 500, because the trigger **copied the price into the usage row at the moment it was ordered**. The bill is a record of what was agreed, so changing the catalogue never rewrites it. Same idea as `rate_at_booking` for rooms." Hand over: "Sithum."

### Segment 7. Sithum: performance, then close (13:00–15:00)

#### 7a. Indexes, proven with query plans (13:00–14:30). Screen: terminal

**Do:** `cls`, then run **`3_indexes.sql`**. Scroll and point at these lines only:

| Output | Say |
|---|---|
| (A) `Seq Scan on booking` | "With 57 bookings Postgres **ignores** our indexes, and that's correct: the whole table is one or two pages. So to show the indexes working, we load **16 years of history**, 49,500 stays and bills, inside a transaction." |
| (B1) `Index Scan using excl_booking_room_overlap` | "The double-booking check Vinuji showed uses the **GiST index** behind the exclusion constraint. It's **partial**, so old stays aren't even in it." |
| (B2) `Bitmap Index Scan on idx_booking_room_dates`, ~0.05 ms | "A **composite index**: room first, because it's an equality, then the dates." |
| (B3) after `DROP INDEX`, ~2–12 ms | "Same query without it: about **50 times slower**, and the gap grows with the table." |
| (B5) `idx_bill_outstanding`, then `16 kB` vs `352 kB` | "The **partial index** holds only unpaid bills: 16 kB against 352 kB for a full index." |
| `bookings_after_rollback 57` | "All rolled back. Every index slows writes slightly, so we only indexed real query paths, and **we indexed our foreign keys ourselves**, because Postgres doesn't." |

*(If short on time: show only (A), (B2)/(B3) and (B5). Never cut the before/after.)*

#### 7b. Close (14:30–15:00). Turn to the examiners

> "So, to sum up. **The business rules live in the database**, and we proved it by going around the UI. Every operation is **ACID**, with locks and constraints that hold under concurrency. Our indexes were chosen for real queries, and we proved them with query plans. And the whole system is **secured, containerized, tested on every push, and deployed to the cloud**.
>
> Thank you. We're happy to take your questions."

---

## 6. Q&A plan (10 min)

**Rules**
- The **owner answers first** (table in §3). Anyone else adds one sentence at most, only if it's needed.
- **Answer, reason, stop.** 30–45 seconds per answer.
- If a question goes to the wrong person: "Vinuji built that and can explain it," or a short answer followed by the hand-off.
- If you don't know, say how you'd find out ("I'd check it with `EXPLAIN ANALYZE`"). Never guess a number.
- Keep the terminal open: the best answer is often to run a query.

**Prepared answers**

| Likely question | Owner | Short answer |
|---|---|---|
| Is the schema normalized? | Sithum | 3NF, and BCNF: every determinant is a candidate key, declared with UNIQUE (`room(branch_id, room_number)`, `room_rate(branch_id, room_type_id)`, `guest(nic_passport)`, `bill(booking_id)`). |
| Where did you denormalize? | Sheereen | `bill` totals and `outstanding_balance`, for fast reads and the partial index. They're kept consistent because only `generate_bill` and `record_payment` write them, in a transaction. Rate and price snapshots aren't denormalization: they're a separate fact (the price at that moment). |
| 3NF vs BCNF? | Sithum | 3NF allows `X → Y` where X isn't a superkey if Y is prime. BCNF requires every determinant to be a superkey. BCNF decomposition is lossless but may not preserve dependencies. |
| Why both the trigger and the exclusion constraint? | Vinuji | The trigger gives a friendly message ("Room 107 is already booked"). The constraint is the real guarantee under concurrency, because the trigger can't see uncommitted rows from another transaction. |
| What if two receptionists check in the same booking at once? | Vinuji | `perform_checkin` takes `SELECT … FOR UPDATE` on the booking row. The second transaction waits, then sees `Checked-In` and gets an error. |
| Function vs procedure? | Sheereen | A function returns a value and can be used inside a `SELECT`. A procedure is `CALL`ed, can have OUT parameters, and wraps a multi-step operation. Our helpers are functions, and our operations are procedures. |
| Trigger vs procedure: when do you use which? | Chamika | A trigger is for a rule that must *always* hold, whoever writes the row (the snapshot price, valid status). A procedure is for an operation someone chooses to run (book, pay). |
| ACID examples? | Sithum | Atomicity: a payment's insert and bill update commit together or not at all. Consistency: CHECK, FK, exclusion constraint and triggers. Isolation: `FOR UPDATE` locks plus the constraint. Durability: Postgres WAL, plus the Docker volume. |
| Why didn't the planner use your index? | Sithum | The table is small, so a sequential scan is cheaper. We showed the plans at 50,000 rows instead. |
| Why index `status`? It has 4 values. | Sithum | Honestly, it's marginal. Low cardinality makes a B-tree weak. The partial GiST index already covers active bookings. We'd drop it or make it partial after measuring. |
| Why UUID keys? | Sithum | They can be generated anywhere, aren't guessable in URLs, and are safe to merge across branches. The cost is 16 bytes and random index inserts. |
| Why `NUMERIC` for money? | Sheereen | It's exact decimal. `FLOAT` can't represent 0.1 exactly, so totals would drift. |
| How is SQL injection prevented? | Sithum | asyncpg parameterized queries: values are sent separately from the SQL text, never concatenated into it. |
| How would you scale this? | Sithum | Partition `booking` by year, use a materialized view for monthly revenue refreshed nightly, add connection pooling (PgBouncer), and add read replicas for reports. |
| What does a view cost? Why not a materialized view? | Sadeepa | A plain view is just a saved query, run each time, so it's always current. The data is small, so freshness matters more. At scale, monthly revenue would become a materialized view. |
| How did you design the seed data? | Sadeepa | The dates are relative to the build day, so "arrives today" is always today. The same 11 cases (arrival, overdue, part paid, cancelled and so on) exist at every branch. |
| Corporate guests? | Chamika | `guest_type` ENUM plus `CHECK (guest_type <> 'Corporate' OR company_name IS NOT NULL)`. |

**Honest weaknesses (say these before an examiner finds them)**
- **Corporate fields on `guest`** are NULL for individual guests. A stricter design would split out a `corporate_guest` table. We chose one table to avoid a join.
- **`branch.manager_name`** is text, not a foreign key to `user_account`.
- **The `GRANT ALL` to `skynest_user`** is a dev setup. Production would use separate least-privilege roles (read-only for reports, EXECUTE-only on procedures).
- **Known UI issues** (logged): the manager's "Rooms occupied today" tile undercounts (KI-13), and overdue in-house rooms 101 and 105 show as free in search (KI-14). **Don't point at that tile or search for those rooms in the demo.** If asked, explain the date filter and say it's logged.

---

## 7. Time control and Plan B

**Time checks:** Vinuji by **3:00**, Sheereen by **7:15**, the switch by **10:00**, Sithum's close by **13:00**.

**If you're behind, cut in this order:**
1. Segment 6 (Chamika's price change). Chamika says the one-sentence version at the end of segment 3 instead.
2. The admin Accounts tab (segment 5).
3. The Ahmed "Booked" page (segment 3). Mention the rule verbally instead.
4. The 40,000 overpayment attempt (segment 4).
5. The wrong-password attempt (segment 1g). Keep the security sentences.
6. In segment 7, show only (A), (B2)/(B3) and (B5).

**Never cut:** the double-booking SQL (segment 2), the bill walkthrough (segment 4), the side-by-side branch scoping (segment 5), or the `EXPLAIN` before/after (segment 7). They carry the design and tuning marks.

**If you're ahead:** run `2_billing.sql` after segment 4 (each bill function's output and the overpayment `ERROR` from the database itself), or `4_views.sql` after segment 5 (the RANK() output).

**If something breaks:**

| Failure | Do |
|---|---|
| Docker or laptop fails | Switch to the cloud URL if it's live; otherwise play the recorded video and narrate it live. |
| Signed out mid-demo (token expired) | Use the "Demo accounts (dev only)" panel on the sign-in page: one click fills the account. |
| Both browsers show the same account | They're the same browser. Use Chrome for A and Edge for B, never two tabs of one browser. |
| A number doesn't match the script | Don't stop. Say "this is live data", and explain the rule rather than the number. |
| A SQL script errors | Run `docker compose exec db psql -U skynest_user -d skynest` and type the single statement you need, such as the `INSERT` from `1_double_booking.sql`. |

---

## 8. Reference

**Accounts** (password `SkyNest@2026`)

| Role | Account |
|---|---|
| Guest | `ruwan@mail.com` |
| Receptionist | `rec.colombo@skynest.lk` |
| Manager | `mgr.colombo@skynest.lk` |
| Admin | `admin@skynest.lk` |

**Demo bookings (Colombo, fresh build)**

| Who | Room | Dates | State | Used in |
|---|---|---|---|---|
| Ruwan | 106 | D → D+2 | Booked → checked in | Segment 2 |
| Sarah Williams | 107 | D+10 → D+14 | Booked (blocks the conflict) | Segment 2, `1_double_booking.sql` |
| Tharindu | 110 | D−1 → D+3 | Checked in, discount, part paid | Segments 3 and 6, `2_billing.sql` |
| Ahmed | 108 | D+5 → D+8 | Booked | Segment 3 (blocked services) |
| Sanduni | 108 | D−2 → D | Checked in, owes 31,625 | Segment 4 |

**Database objects to name**

| Kind | Names |
|---|---|
| Procedures | `create_booking`, `cancel_booking`, `perform_checkin`, `perform_checkout`, `generate_bill`, `record_payment` |
| Functions | `fn_get_current_rate`, `fn_calculate_nights`, `fn_get_room_charges`, `fn_get_service_charges`, `fn_calculate_tax`, `fn_get_outstanding_balance` |
| Triggers | `trg_double_booking` (BEFORE INSERT/UPDATE on booking), `trg_room_status` (AFTER UPDATE OF status on booking), `trg_service_usage` (BEFORE INSERT on service_usage) |
| Views | `v_room_occupancy`, `v_guest_billing_summary`, `v_service_usage_breakdown`, `v_monthly_revenue`, `v_top_services`, `v_top_services_by_branch` |
| Indexes | 11 B-tree (`idx_*`, one of them partial: `idx_bill_outstanding`), plus the GiST index behind `excl_booking_room_overlap` |
| Constraints | FKs, `chk_booking_dates`, `chk_guest_corporate_company`, `chk_bill_outstanding`, UNIQUE keys, `uq_user_account_email_ci` (case-insensitive email), `excl_booking_room_overlap` |
