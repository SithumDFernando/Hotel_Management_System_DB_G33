# SkyNest viva: demo script

**Format:** 15 minutes of technical demo, then 10 minutes of Q&A. No slides: one ER diagram, the live app, and live SQL.

**The story:** we follow one hotel day at SkyNest Colombo. A guest searches and books, the front desk checks guests in and adds services, a guest checks out and pays, and the manager sees it all in the reports. Each person demos the part they built. Between segments, we show the database doing the work, not just the UI.

**The one sentence to repeat:** *the business rules live in the database, so no client (UI, API or direct SQL) can break them.*

Related files:
- [sql/](sql/): the four scripts run live (all tested on a fresh build; everything that writes is rolled back).
- [MANUAL_TESTING_GUIDE.md](../work/manual_testing/MANUAL_TESTING_GUIDE.md): the source of every expected value below.
- [ER Diagram Refined.png](../refernce/ER%20Diagram%20Refined.png).

---

## 1. Marking criteria coverage

Check this table during the rehearsal: every row must actually be shown.

| Criterion (marks) | Where we show it | Evidence on screen |
|---|---|---|
| **Demo plan and communication (5)** | Whole demo | Roadmap in the first 90 seconds, one story, named handovers, time kept |
| **Functionality: use of the DB and UI (8)** | Segments 2–6 | Search → book → conflict → check-in → service → bill → part payment → checkout → reports, across 3 roles |
| **Database design (8)** | Segments 1, 3, 4, 5 | ER diagram, 3NF/BCNF, junction table, rate snapshots, 3 triggers, 6 procedures, 6 functions, CHECK/UNIQUE/exclusion constraints |
| **Performance tuning and advanced features (4)** | Segments 3, 5, 6, 7 | `EXPLAIN ANALYZE` at 50k rows: composite, partial and GiST indexes, before/after timing, row locking, views, window function, security |
| **Bonus (up to 5)** | Segment 7 | UX (design system, accessibility), CI/CD (GitHub Actions), cloud (AWS EC2), containerization (Docker Compose). We do **not** claim email or push notifications. |

---

## 2. Roles

| Person | Built | Demos | Owns these Q&A topics |
|---|---|---|---|
| **Sithum** | Schema, constraints, indexes, auth/JWT, Docker, CI | Segments 1 and 7, and **drives the laptop** for everyone | ER design, normalization, constraints, ACID, indexing, security, CI/CD, Docker, cloud |
| **Chamika** | Rate lookup, guests, services, price-snapshot trigger | Segments 2 and 4 | `fn_get_current_rate`, guest rules, `trg_service_usage`, price snapshots |
| **Vinuji** | Booking, double-booking trigger, check-in/out | Segment 3 | `create_booking`, `trg_double_booking`, `trg_room_status`, locking |
| **Sheereen** | Bill functions, `generate_bill`, `record_payment` | Segment 5 | Billing formula, transactions, payment edge cases, stored totals |
| **Sadeepa** | Views, seed data, reports, admin | Segment 6 | Views, `RANK()`, seed design, branch scoping, admin |

**One driver (Sithum), five voices.** The speaker narrates and points, and Sithum clicks. This avoids passing the laptop around. Each speaker stands next to the screen during their segment.

---

## 3. Setup

### The day before
- [ ] Run the full script twice with a timer. Each segment must finish on time. Cut from the list in §6 if needed.
- [ ] Record a screen video of a full clean run (Plan B).
- [ ] Confirm whether the **AWS EC2** deployment is up, and note its URL here: `http://________:8080`. If it's down, don't claim cloud hosting as a live feature: say it was deployed, and show [SETUP.md §5](../SETUP.md).
- [ ] Open the latest GitHub Actions run so a green pipeline is ready to show.

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
Tokens last 60 minutes and are stored per browser profile, so use **one browser profile per role** (Chrome profiles, or Chrome + Edge + Firefox). Password for all: `SkyNest@2026`.

| Window | Signed in as | Tabs open |
|---|---|---|
| **Guest** | `ruwan@mail.com` | `http://localhost:8080/` |
| **Front desk** | `rec.colombo@skynest.lk` | Today; second tab: `http://localhost:8080/services/71050000-0000-0000-0000-000000000000` (Ahmed, Booked) |
| **Manager** | `mgr.colombo@skynest.lk` | Overview |
| **Admin** | `admin@skynest.lk` | Accounts tab (optional) |
| **Terminal** | PowerShell in the repo root, font 18pt+ | The four commands below already typed into history |
| **Image** | ER diagram | Full screen |

The SQL commands (run from the repo root):
```powershell
Get-Content docs\viva\sql\1_double_booking.sql | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\2_billing.sql        | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\3_indexes.sql        | docker compose exec -T db psql -U skynest_user -d skynest -e
Get-Content docs\viva\sql\4_views.sql          | docker compose exec -T db psql -U skynest_user -d skynest -e
```
Run `cls` before each one so the output starts at the top of the screen.

---

## 4. The script

Each segment lists what to do, what to say, and the database point behind it. Say the lines in your own words, but keep every **bold** term. Those are the words the examiners are listening for.

### Segment 1. Sithum: architecture and design (0:00–1:30)

**Show:** the ER diagram.

**Say:**
- "SkyNest is a reservation and billing system for a hotel chain with three branches: Colombo, Kandy and Galle. It has four roles: guest, receptionist, manager and admin."
- "The stack is React, then FastAPI, then **PostgreSQL**. The important design decision is that **business rules live in the database**: 6 **stored procedures**, 6 **functions**, 3 **triggers**, 6 **views**, and constraints. The API calls a procedure and maps database errors to HTTP codes, so the rules hold for any client."
- Point at the diagram: "13 tables in **3NF**, and in fact **BCNF**, because every determinant is a candidate key. For example, the daily rate depends on branch *and* room type, not on the room, so it lives in `room_rate` with a **composite UNIQUE** key. The many-to-many between room types and amenities is resolved by the **junction table** `room_amenity`."
- "It runs in **Docker**, is tested by a **CI pipeline** on every push, and is deployed on **AWS EC2**. We'll come back to that at the end."
- Give the roadmap: "We'll follow one day at the Colombo branch: a guest books, the front desk checks guests in and adds services, a guest pays and checks out, and the manager sees it in the reports. Chamika starts with the guest."

### Segment 2. Chamika: search and rates (1:30–3:00)

**Window:** Guest (Ruwan). **Do:**
1. Home → Branch **Colombo**, Check-in **today**, Check-out **today + 2** → **Check availability**.
2. Filters: Room type **Double**, amenity chip **Mini-bar**. You should see "**2 rooms free in Colombo**": **102** and **111**.

**Say:**
- "Availability is a query against `booking`: a room is free if no **active** booking overlaps the dates. Overlap means `existing.check_in < new.check_out AND existing.check_out > new.check_in`. Rooms 106 and 107 are also Doubles with a mini-bar, but they're missing because they're booked for these dates."
- "Prices differ per branch. `fn_get_current_rate(branch, room_type)` reads `room_rate`. Rates aren't stored on `room`, because that would repeat the same rate for every room of the type and be a transitive dependency."
- "Amenity filters come from the `room_amenity` junction table, so a room type can have any number of amenities without repeating columns. That's **1NF**."
- Hand over: "Ruwan wants a Double. Vinuji will book it."

### Segment 3. Vinuji: booking, double booking, check-in (3:00–6:00)

**Window:** Guest. **Do (try the conflict first):**
1. **Rooms**, no dates → room **107 Colombo** → **Book this room**.
2. Check-in **D+10**, Check-out **D+14** → **Book this room**.
3. You'll see the alert "Room 107 is already booked for the selected dates", plus a "Free on these dates" list.

**Say:** "Room 107 is taken by another guest on those dates. The UI didn't decide that. The database did. Let me prove it by going around the UI completely."

**Terminal:** `cls`, then run **`1_double_booking.sql`**. Point at three results:

| Output | Say |
|---|---|
| `ERROR: Room 107 is already booked…` | "Layer 1: a **BEFORE INSERT trigger**, `trg_double_booking`. It also locks the room row with `SELECT … FOR UPDATE`." |
| `ERROR: … violates exclusion constraint "excl_booking_room_overlap"` | "Layer 2: with the trigger switched **off**, the **exclusion constraint** still blocks it. A trigger only sees *committed* rows, so two simultaneous bookings could both pass it. The constraint is enforced by a **GiST index** on `(room_id, daterange)`, so it holds under **concurrency**. It's **partial**: cancelled and checked-out stays don't block." |
| `INSERT 0 1` | "And back-to-back stays are allowed: the range is half-open, `[)`, so the check-out day can be the next guest's check-in day. Everything was **rolled back**." |

**Window:** Guest. **Do (now the booking that succeeds):**
4. Open room **102** (or click it in the suggestions) → dates **D+30 → D+32**, payment **Cash**.
5. Point at the summary: "Rate LKR 8,000.00 × 2".
6. Click **Book this room**. You'll see the toast "Booked: Double Room 102…".

**Say:** "`create_booking` is a **stored procedure**. It validates the guest, the room, no past dates, a maximum of 30 nights, and not under maintenance. Then it **snapshots** the rate into `booking.rate_at_booking`. That isn't redundancy: if the hotel raises prices tomorrow, Ruwan's booking keeps the price he agreed to."

**Window:** Front desk (rec.colombo, **Today**). **Do:**
7. Point at "Arrivals today": Ruwan, room 106 → **Check in**.
8. You'll see the toast "Checked in: Ruwan Jayasinghe, Room 106". The summary changes to In-house 6 and Rooms available 4.

**Say:** "`perform_checkin` locks the booking row `FOR UPDATE`, so two receptionists can't check in the same guest twice. It sets the status to Checked-In. An **AFTER UPDATE trigger**, `trg_room_status`, then marks room 106 **Occupied**. The room status is always derived from the booking, and nobody updates it by hand."

Hand over: "Guests who are in house use hotel services. Chamika."

### Segment 4. Chamika: services and price snapshot (6:00–7:15)

**Window:** Front desk. **Do:**
1. Today → "Staying on": **Tharindu, 110** → **Add service**.
2. **Laundry**, quantity **3** → **Add**. You'll see the toast "Added: 3 × Laundry…" and Services total **LKR 6,000.00**.
3. Switch to the second tab (Ahmed, Booked). It reads "Services can only be added while the guest is checked in."

**Say:**
- "Every insert into `service_usage` passes a **BEFORE INSERT trigger**, `trg_service_usage`. It rejects the insert unless the booking is **Checked-In**, the service is **active**, and the date is **within the stay**."
- "It also **copies the current `base_price` into `unit_price`**. That's the same snapshot idea as the room rate: a later price change never rewrites an old bill."
- "Ahmed hasn't arrived, so the database would refuse the insert. The UI simply reflects that rule."
- Hand over: "Sanduni is due to check out today and hasn't paid. Sheereen."

### Segment 5. Sheereen: bill, payment, checkout (7:15–10:15)

**Window:** Front desk → Today. **Do:**
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

*(Optional, if ahead of time: run `2_billing.sql` to show each function's output and the overpayment `ERROR` from the database itself.)*

Hand over: "That payment is already in the manager's numbers. Sadeepa."

### Segment 6. Sadeepa: reports and roles (10:15–12:30)

**Window:** Manager (mgr.colombo). **Do:**
1. **Overview**, then **refresh the page**. Point at the **Balance due** tile. It was LKR 141,975 at the start of the day, and is now about **LKR 110,350** with **3 bills** (141,975 − Sanduni's 31,625).
2. Point at the "Monthly revenue, last 6 months" chart and "Top services by quantity".
3. **Reports** → **Billing summary** → tick **Balance due only**. 3 rows: Kamal 101, Malith 105 and Tharindu 110.
4. **Top services** sub-tab.

**Say:**
- "Each report is a **view**: `v_monthly_revenue`, `v_guest_billing_summary`, `v_room_occupancy`, `v_service_usage_breakdown`, `v_top_services`. The joins and aggregates are written once in SQL, and the API just runs `SELECT … FROM view WHERE branch_id = $1`."
- "Revenue is recognized at checkout, grouped by checkout month. That's why `booking.check_out_date` has its own index."
- "'Balance due only' is the query the **partial index** on unpaid bills exists for."
- "Top services per branch uses a **window function**: `RANK() OVER (PARTITION BY branch_id ORDER BY SUM(quantity) DESC)`. RANK keeps ties, and Galle has one."
- "**Branch scoping**: this manager only ever sees Colombo. The server takes the branch from the signed-in account (the **JWT**) and ignores any branch in the URL, so it can't be changed from the browser."

**Window:** Admin (optional, 20 seconds). **Do:** Accounts → filter **Receptionist**.
**Say:** "Admins create staff accounts. Each route is protected by a **role check**, `require_role(...)`. Guests can't reach staff pages, and the API returns **403** even if they try."

*(Optional, if ahead of time: run `4_views.sql` to show the RANK() output, including the Galle tie at rank 2.)*

Hand over: "Sithum will show what makes this fast and secure."

### Segment 7. Sithum: performance, security, bonus features (12:30–15:00)

**Terminal:** `cls`, then run **`3_indexes.sql`**. Scroll and point at these lines only:

| Output | Say |
|---|---|
| (A) `Seq Scan on booking` | "With 57 bookings Postgres **ignores** our indexes, and that's correct: the table is one or two pages. So to show the indexes working, we load **16 years of history**, 49,500 stays and bills, inside a transaction, and run `ANALYZE`." |
| (B1) `Index Scan using excl_booking_room_overlap` | "The double-booking check uses the **GiST index** behind the exclusion constraint. It's **partial**, so the 49,500 old stays aren't even in it." |
| (B2) `Bitmap Index Scan on idx_booking_room_dates`, ~0.05 ms | "A **composite B-tree**, `(room_id, check_in_date, check_out_date)`. The **equality column goes first**, then the range columns, so all three are used in the index condition." |
| (B3) after `DROP INDEX`, ~2–12 ms | "Same query without it: about **50 times slower**, and the gap grows with the table." |
| (B4) `Index Scan using idx_booking_guest` | "Postgres **doesn't index foreign keys automatically**, so we indexed the ones we join and filter on." |
| (B5) `idx_bill_outstanding`, then `16 kB` vs `352 kB` | "The **partial index** only holds unpaid bills: 16 kB against 352 kB for a full index, and it stays small as the hotel grows." |
| `bookings_after_rollback 57` | "All rolled back. The trade-off is that every index slows writes slightly, so we only indexed real query paths. Spec 06 maps each index to its query." |

**Say: security (20 seconds):**
- "Passwords are hashed with **bcrypt** and a salt, never encrypted. Logins return a **JWT** (HS256, 60 minutes)."
- "Every route has **role-based access control**, and staff are **scoped to their branch** on the server."
- "All SQL uses **parameterized queries** (`$1`, `$2`), which prevents **SQL injection**. Sign-in is **rate-limited** (HTTP 429)."
- "Database errors map to HTTP codes. A constraint violation returns **409 Conflict**, not a crash."

**Say: bonus features (40 seconds):**
- **Containerization:** "`docker compose up` starts four containers: Postgres, pgAdmin, the API and the frontend behind Nginx. There are **health checks**, and data lives in a **named volume**. A new machine gets the full system from an empty database with one command."
- **CI/CD:** "GitHub Actions runs three jobs on every push and pull request. It builds the schema from `run_all.sql` with `ON_ERROR_STOP`, so any SQL error fails the build. It runs the backend tests against a real Postgres, builds the frontend, and smoke-tests the whole Docker stack." *(Show the green run if there's time.)*
- **Cloud:** "Deployed on **AWS EC2** with the same Compose file, behind a security group that opens only port 8080." *(Only if it's live: show the URL.)*
- **UX:** "There's one design system, spec 11. Errors tell the user what to do next. Pages are keyboard accessible (skip link, focus trapped in dialogs) and work at phone width."

**Close (Sithum):** "To sum up: business rules in the database, proven by bypassing the UI; indexes chosen for real queries, proven with query plans; and the whole system reproducible from one command. Thank you, we're happy to take questions."

---

## 5. Q&A plan (10 min)

**Rules**
- The **owner answers first** (table in §2). Anyone else adds one sentence at most, only if it's needed.
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
- **Known UI issues** (logged): the manager's "Rooms occupied today" tile undercounts (KI-13), and overdue in-house rooms 101 and 105 show as free in search (KI-14). **Don't open those screens in the demo.** If asked, explain the date filter and say it's logged.

---

## 6. Time control and Plan B

**Time check:** at **7:15** Sheereen should be starting. At **12:30** Sithum should be starting. Sithum signals the time with a hand gesture.

**If you're behind, cut in this order:**
1. The admin window (segment 6).
2. The Ahmed "Booked" tab (segment 4). Mention the rule verbally instead.
3. The 40,000 overpayment attempt (segment 5).
4. In segment 7, skip B4 and only mention the bonus features in one sentence each.

**Never cut:** the double-booking SQL (segment 3), the bill walkthrough (segment 5), or the `EXPLAIN` before/after (segment 7). They carry the design and tuning marks.

**If something breaks:**

| Failure | Do |
|---|---|
| Docker or laptop fails | Switch to the cloud URL if it's live; otherwise play the recorded video and narrate it live. |
| Signed out mid-demo (token expired) | Use the dev "Demo accounts" panel on the sign-in page: one click fills the account. |
| A number doesn't match the script | Don't stop. Say "this is live data", and explain the rule rather than the number. |
| A SQL script errors | Run `docker compose exec db psql -U skynest_user -d skynest` and type the single statement you need, such as the `INSERT` from `1_double_booking.sql`. |

---

## 7. Reference

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
| Ruwan | 106 | D → D+2 | Booked → checked in | Segment 3 |
| Sarah Williams | 107 | D+10 → D+14 | Booked (blocks the conflict) | Segment 3, `1_double_booking.sql` |
| Tharindu | 110 | D−1 → D+3 | Checked in, discount, part paid | Segment 4, `2_billing.sql` |
| Ahmed | 108 | D+5 → D+8 | Booked | Segment 4 (blocked services) |
| Sanduni | 108 | D−2 → D | Checked in, owes 31,625 | Segment 5 |

**Database objects to name**

| Kind | Names |
|---|---|
| Procedures | `create_booking`, `cancel_booking`, `perform_checkin`, `perform_checkout`, `generate_bill`, `record_payment` |
| Functions | `fn_get_current_rate`, `fn_calculate_nights`, `fn_get_room_charges`, `fn_get_service_charges`, `fn_calculate_tax`, `fn_get_outstanding_balance` |
| Triggers | `trg_double_booking` (BEFORE INSERT/UPDATE on booking), `trg_room_status` (AFTER UPDATE OF status on booking), `trg_service_usage` (BEFORE INSERT on service_usage) |
| Views | `v_room_occupancy`, `v_guest_billing_summary`, `v_service_usage_breakdown`, `v_monthly_revenue`, `v_top_services`, `v_top_services_by_branch` |
| Indexes | 11 B-tree (`idx_*`, one of them partial: `idx_bill_outstanding`), plus the GiST index behind `excl_booking_room_overlap` |
| Constraints | FKs, `chk_booking_dates`, `chk_guest_corporate_company`, `chk_bill_outstanding`, UNIQUE keys, `uq_user_account_email_ci` (case-insensitive email), `excl_booking_room_overlap` |
