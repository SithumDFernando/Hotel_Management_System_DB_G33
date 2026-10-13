# 07 — Seed Data

> Minimum data requirements from the project brief + extras for a convincing demo.

> **One seed file.** `db/run_all.sql` loads `db/seed/sample_data.sql`: part 1 has fixed dates and fixed IDs (the backend tests depend on it), part 2 has dates relative to the build day, for manual testing (see [Demo data](#demo-data-demo_datasql) below). The old `pg_temp` helper functions live unused in `db/seed/demo_helpers.sql`. Where the tables in the sections before Demo data disagree with `sample_data.sql`, the SQL file is what actually loads.

---

## Summary

| Entity | Required | Seed Count |
|--------|----------|-----------|
| Branches | 3 | 3 |
| Room Types | — | 4 |
| Amenities | — | 8 |
| Room-Amenity mappings | — | 12 |
| Room Rates | — | 12 (4 types × 3 branches) |
| Rooms | 10+ | 12 |
| Services | 6 | 6 |
| Guests | 5 | 6 |
| User Accounts | — | 8 |
| Bookings | 8 | 10 |
| Service Usage | — | 15 |
| Bills | — | 6 |
| Payments | 3 partial | 8 (including 3 partial) |

---

## Branches (3)

| Name | City | Phone |
|------|------|-------|
| SkyNest Colombo | Colombo | +94 11 234 5678 |
| SkyNest Kandy | Kandy | +94 81 234 5678 |
| SkyNest Galle | Galle | +94 91 234 5678 |

---

## Room Types (4)

| Type | Capacity |
|------|----------|
| Single | 1 |
| Double | 2 |
| Triple | 3 |
| Suite | 4 |

---

## Room Rates (per branch)

| Branch | Single | Double | Triple | Suite |
|--------|--------|--------|--------|-------|
| Colombo | 8,000 | 12,000 | 16,000 | 25,000 |
| Kandy | 6,000 | 10,000 | 13,000 | 20,000 |
| Galle | 7,000 | 11,000 | 14,500 | 22,000 |

> Rates in LKR per night.

---

## Rooms (12)

| Branch | Room # | Type |
|--------|--------|------|
| Colombo | 101 | Single |
| Colombo | 102 | Double |
| Colombo | 103 | Suite |
| Colombo | 104 | Triple |
| Kandy | 201 | Single |
| Kandy | 202 | Double |
| Kandy | 203 | Suite |
| Kandy | 204 | Single |
| Galle | 301 | Single |
| Galle | 302 | Double |
| Galle | 303 | Triple |
| Galle | 304 | Suite |

---

## Services (6)

| Service | Category | Base Price (LKR) |
|---------|----------|-----------------|
| Room Service | Food & Beverage | 1,500 |
| Spa Treatment | Wellness | 5,000 |
| Laundry | Housekeeping | 500 |
| Minibar | Food & Beverage | 800 |
| Airport Shuttle | Transport | 3,500 |
| Gym Access | Wellness | 1,000 |

---

## Guests (6)

| # | Name | NIC/Passport | Type | Notable |
|---|------|-------------|------|---------|
| 1 | Kamal Silva | 199512345678 | Individual | Sri Lankan |
| 2 | Nimal Perera | 198876543210 | Individual | Sri Lankan |
| 3 | Sarah Johnson | P12345678 | Individual | British tourist |
| 4 | Aisha Fernando | 200098765432 | Individual | Sri Lankan |
| 5 | TechCorp Lanka (Ravi Kumar) | 199234567890 | Corporate | Has company fields |
| 6 | Priya De Silva | 199712340000 | Individual | Sri Lankan |

---

## User Accounts (8)

| Email | Role | Branch | Guest Link |
|-------|------|--------|-----------|
| admin@skynest.lk | admin | — | — |
| mgr.colombo@skynest.lk | manager | Colombo | — |
| mgr.kandy@skynest.lk | manager | Kandy | — |
| rec.colombo@skynest.lk | receptionist | Colombo | — |
| rec.kandy@skynest.lk | receptionist | Kandy | — |
| rec.galle@skynest.lk | receptionist | Galle | — |
| kamal@mail.com | guest | — | → Kamal Silva |
| sarah@mail.com | guest | — | → Sarah Johnson |

> Default password for all seed accounts: `SkyNest@2026` (bcrypt hashed)

---

## Bookings (10)

| # | Guest | Room | Check-In | Check-Out | Status |
|---|-------|------|----------|-----------|--------|
| 1 | Kamal Silva | Colombo 101 | 2026-02-01 | 2026-02-04 | Checked-Out |
| 2 | Nimal Perera | Kandy 202 | 2026-02-02 | 2026-02-05 | Checked-Out |
| 3 | Sarah Johnson | Colombo 103 | 2026-02-05 | 2026-02-10 | Checked-In |
| 4 | Aisha Fernando | Galle 302 | 2026-02-08 | 2026-02-11 | Booked |
| 5 | Ravi Kumar (Corp) | Colombo 102 | 2026-02-10 | 2026-02-14 | Booked |
| 6 | Priya De Silva | Kandy 201 | 2026-02-03 | 2026-02-06 | Checked-Out |
| 7 | Kamal Silva | Galle 304 | 2026-02-15 | 2026-02-18 | Booked |
| 8 | Nimal Perera | Colombo 104 | 2026-02-12 | 2026-02-15 | Booked |
| 9 | Sarah Johnson | Kandy 203 | 2026-02-15 | 2026-02-20 | Booked |
| 10 | Aisha Fernando | Colombo 101 | 2026-02-20 | 2026-02-22 | Cancelled |

---

## Service Usage (15 entries)

Spread across bookings 1, 2, 3, 6 — only checked-in/checked-out bookings.

| Booking | Service | Qty |
|---------|---------|-----|
| 1 | Room Service | 2 |
| 1 | Minibar | 3 |
| 1 | Laundry | 1 |
| 2 | Spa Treatment | 1 |
| 2 | Room Service | 1 |
| 3 | Room Service | 3 |
| 3 | Spa Treatment | 1 |
| 3 | Minibar | 2 |
| 3 | Gym Access | 2 |
| 3 | Laundry | 2 |
| 6 | Airport Shuttle | 1 |
| 6 | Room Service | 1 |
| 6 | Laundry | 2 |
| 6 | Minibar | 1 |
| 6 | Gym Access | 1 |

---

## Payments (8 — including 3 partial)

| Booking | Amount | Method | Notes |
|---------|--------|--------|-------|
| 1 | 15,000 | Credit Card | Partial at check-in |
| 1 | 20,150 | Credit Card | Final at checkout |
| 2 | 10,000 | Cash | **Partial** — still owes |
| 2 | 15,725 | Debit Card | Final |
| 3 | 25,000 | Credit Card | **Partial** — stay ongoing |
| 6 | 8,000 | Cash | **Partial** at check-in |
| 6 | 14,575 | Credit Card | Final at checkout |
| 5 | 12,000 | Bank Transfer | Advance for corporate booking |

> Bookings 2, 3, and 6 demonstrate partial payment scenarios.

---

## Insertion Order in `sample_data.sql`

```
1. branch
2. room_type
3. amenity
4. room_amenity
5. room_rate
6. room
7. service
8. guest
9. user_account
10. booking
11. service_usage
12. bill (direct INSERT with precomputed totals; generate_bill() recalculates them on the next call)
13. payment (direct INSERT with fixed IDs and paid_at; bill.amount_paid matches the inserted payments)
```

> Use `SELECT` after inserts to verify trigger-set values (`unit_price`, `room.status`).

---

## Demo data (part 2 of `sample_data.sql`)

Sections 14–17 of `sample_data.sql`. They only add rows; they change nothing that part 1 inserts. Every date is relative to `CURRENT_DATE` on the day the database is built (written **D**), so the receptionist's Today screen always has work on it. **Rebuild the database on the day you test.** The manual test guide is [docs/work/manual_testing/MANUAL_TESTING_GUIDE.md](../work/manual_testing/MANUAL_TESTING_GUIDE.md).

Bookings, bills and payments go through the real triggers and procedures (`trg_room_status`, `trg_service_usage`, `generate_bill`, `record_payment`), so room status, prices, tax and balances are the system's own figures.

### Totals after both parts

| Entity | Part 1 | + Demo (part 2) | Total |
|---|---|---|---|
| Rooms | 12 | 21 (x05–x11 per branch) | 33 |
| Guests | 6 | 28 | 34 |
| User accounts | 7 | 11 | 18 |
| Bookings | 7 | 50 | 57 |
| Bills | 4 | 30 | 34 |

### Extra accounts (password `SkyNest@2026`)

| Email | Role | Branch / guest | Scenario |
|---|---|---|---|
| admin.ops@skynest.lk | admin | — | Second admin |
| mgr.galle@skynest.lk | manager | Galle | Every branch now has a manager |
| rec.kandy@skynest.lk | receptionist | Kandy | Every branch now has a receptionist |
| rec2.colombo@skynest.lk | receptionist | Colombo | Second desk at one branch |
| ruwan@mail.com | guest | Ruwan Jayasinghe | Colombo, arrives today |
| kasun@mail.com | guest | Kasun Herath | Colombo, overdue arrival (can still check in) |
| sanduni@mail.com | guest | Sanduni Wickramasinghe | Colombo, in house, departs today, balance due |
| dilan@mail.com | guest | Dilan Gunawardena | Colombo, in house, departs today, paid in full |
| tharindu@mail.com | guest | Tharindu Senanayake | Colombo, staying on, part paid, discount |
| ishara@mail.com | guest | Ishara Fonseka | No bookings (empty states) |
| travel@ceylontea.lk | guest | Ceylon Tea Traders (Corporate) | Galle, staying on, part paid |

John Smith (`f0…03`) keeps no login on purpose; the backend tests rely on it.

### Rooms

| Room | Colombo | Kandy | Galle |
|---|---|---|---|
| x05 | 105 Single | 205 Single | 305 Single |
| x06 | 106 Double | 206 Double | 306 Double |
| x07 | 107 Double | 207 Double | 307 Double |
| x08 | 108 Deluxe | 208 Deluxe | 308 Deluxe |
| x09 | 109 Suite | 209 Suite | 309 Suite |
| x10 | 110 Single | 210 Single | 310 Single |
| x11 | 111 Double | 211 Single, **Maintenance** | 311 Deluxe, **Maintenance** |

### Booking matrix (the same at each branch)

Booking IDs are `7XYY0000-0000-0000-0000-000000000000`, where X is the branch (1 Colombo, 2 Kandy, 3 Galle) and YY is the case. The UI reference therefore reads `SN-7XYY0000`; for example, `SN-71060000` is Colombo case F.

| Case | YY | Room | Dates | Status | Bill | Colombo / Kandy / Galle guest |
|---|---|---|---|---|---|---|
| A arrives today | 01 | x06 | D → D+2 | Booked | — | Ruwan / Nuwan Dissanayake / Gayan Weerasinghe |
| B overdue arrival | 02 | x07 | D−1 → D+2 | Booked | — | Kasun / Hiruni Ekanayake / Dinithi Abeysekara |
| C stay ended, never arrived | 03 | x06 | D−3 → D−1 | Booked | — | Chathuri Peiris / Pradeep Kumara / Sunil Rathnayake |
| E upcoming | 05 | x08 | D+5 → D+8 | Booked | — | Ahmed Rizvi / John Smith / Yuki Tanaka |
| F departs today, balance due | 06 | x08 | D−2 → D | Checked-In | unpaid | Sanduni / Emma Brown / Madushani Perera |
| G departs today, paid | 07 | x09 | D−2 → D | Checked-In | paid | Dilan / Ravi Shankar / Oliver Grant |
| H overdue checkout | 08 | x05 | D−4 → D−1 | Checked-In | LKR 10,000 paid | Malith Rodrigo / Lakmal Bandara / Asela Mendis |
| I staying on | 09 | x10 | D−1 → D+3 | Checked-In | LKR 2,000 discount, LKR 5,000 paid | Tharindu / Lanka Exports / Ceylon Tea Traders |
| K holds a Double (409 test) | 10 | x07 | D+10 → D+14 | Booked | — | Sarah Williams / Tomas Muller / Shanika Fernando |
| X cancelled | 11 | x06 (Colombo 111) | D+10 → D+12 | Cancelled | — | Nimali / Kamal / Priya |
| U upcoming | 12 | — | — | Booked | — | — / Nimali, 210, D+12 → D+14 / Kamal, 306, D+20 → D+22 |
| P0 this month | 90 | x05 | D−9 → D−6 | Checked-Out | paid | Nimali / Pradeep / Sunil |
| P1–P5 previous 5 months | 91–95 | x09 | day 10 → 13 | Checked-Out | paid (P2 corporate, LKR 3,000 discount in Kandy and Galle) | rotating |

Walk-ins with no bookings, for the GuestPicker: Nadeesha Karunaratne and Kevin Lee.

> **Clock:** `CURRENT_DATE` is the database server's date. The Docker database runs on UTC, so a build between 00:00 and 05:30 Sri Lanka time is dated the day before your local date. Build after 05:30 local time.

