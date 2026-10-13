# Mock Login Credentials

Every account in the mock database (`db/seed/sample_data.sql`) for local development, testing and demos.

> These accounts exist only in the seed data. Do not use this password anywhere real.

**Password for every account:** `SkyNest@2026`

Rebuild the database to restore these accounts and this password (for example after the password-change test in the manual test guide).

## Admin

| Email | Role | Branch | Notes |
|---|---|---|---|
| admin@skynest.lk | Admin | All branches | Main admin |
| admin.ops@skynest.lk | Admin | All branches | Second admin |

## Managers

| Email | Role | Branch | Notes |
|---|---|---|---|
| mgr.colombo@skynest.lk | Manager | Colombo | Main manager |
| mgr.kandy@skynest.lk | Manager | Kandy | |
| mgr.galle@skynest.lk | Manager | Galle | |

## Receptionists

| Email | Role | Branch | Notes |
|---|---|---|---|
| rec.colombo@skynest.lk | Receptionist | Colombo | Main front desk |
| rec2.colombo@skynest.lk | Receptionist | Colombo | Second desk, same branch |
| rec.kandy@skynest.lk | Receptionist | Kandy | |
| rec.galle@skynest.lk | Receptionist | Galle | |

## Guests

| Email | Role | Branch | Notes |
|---|---|---|---|
| kamal@mail.com | Guest | — | In house (unpaid), upcoming, past and cancelled bookings |
| nimali@mail.com | Guest | — | Upcoming, 3 past stays, one cancelled booking |
| ruwan@mail.com | Guest | — | Arrives today |
| kasun@mail.com | Guest | — | Arrival was yesterday, not checked in yet |
| sanduni@mail.com | Guest | — | In house, departs today, nothing paid |
| dilan@mail.com | Guest | — | In house, departs today, paid in full |
| tharindu@mail.com | Guest | — | Staying on, discount, part paid |
| travel@ceylontea.lk | Guest (corporate) | — | Ceylon Tea Traders, Galle, part paid |
| ishara@mail.com | Guest | — | No bookings |

## Quick reference

- **Admin:** `admin@skynest.lk`
- **Manager:** `mgr.colombo@skynest.lk`
- **Receptionist:** `rec.colombo@skynest.lk`
- **Guest:** `kamal@mail.com`

The dev-only "Demo accounts" panel on the sign-in page fills in the admin, manager, receptionist and guest accounts above with one click.

## Related docs

- [Seed data spec](specs/07_seed_data.md): what each account's data looks like.
- [Manual testing guide](work/manual_testing/MANUAL_TESTING_GUIDE.md): which accounts each test case uses.
