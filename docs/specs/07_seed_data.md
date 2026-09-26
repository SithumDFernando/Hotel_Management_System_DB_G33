# 07 — Seed Data

> Minimum data requirements from the project brief + extras for a convincing demo.

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
12. bill (generated via calculate_bill() for checked-out bookings)
13. payment (via record_payment())
```

> Use `SELECT` after inserts to verify trigger-set values (`unit_price`, `room.status`).
