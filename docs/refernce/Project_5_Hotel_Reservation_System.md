# Project 5 — Hotel Reservation and Guest Services Management System

## Background

**SkyNest Hotels** is a regional hotel chain operating in Sri Lanka, offering accommodation and premium services in its branches located in **Colombo**, **Kandy**, and **Galle**. The management has been using an outdated desktop-based system for bookings and service tracking, which has led to frequent overbookings, billing delays, and manual errors.

To modernise operations, SkyNest has decided to implement a unified **Hotel Reservation and Guest Services Management System (HRGSMS)**. Your team is hired to design the backend database that supports hotel room bookings, guest check-ins/check-outs, service tracking, and billing. A UI is required for the system, but the primary focus is on **database correctness, consistency, and report generation**.

---

## System Requirements

### Room & Branch Management

- Each hotel branch consists of a number of rooms, categorised by **room type** (e.g., Single, Double, Suite).
- Room types differ by **capacity**, **daily rate**, and **amenities**.

### Booking Management

- A guest can make a room booking for a given check-in and check-out period.
- Each booking includes:
  - Room details
  - Guest information
  - Payment method
  - Booking status: `Booked` | `Checked-In` | `Checked-Out` | `Cancelled`
- The system must **prevent double-booking** of the same room during overlapping periods.

### Check-In / Check-Out

- At check-in, the system must update the room status to **Occupied**.
- At check-out, the room status must be updated to **Available**.

### Guest Services

- During their stay, guests can request **chargeable services**, such as:
  - Room service
  - Spa treatments
  - Laundry
  - Minibar usage
- These services are stored in a **service catalogue** and linked to the respective booking.
- Each service usage entry includes:
  - Service name
  - Date
  - Quantity
  - Price at the time of usage

### Billing

At checkout, the system must calculate the **final bill**, which includes:

| Component       | Calculation                                |
|-----------------|--------------------------------------------|
| Room charges    | Room rate × number of nights               |
| Service charges | Sum of all services used during the stay   |

- The total bill **must be paid** before the booking is marked as `Checked-Out`.
- Guests can make **partial payments**, but the system must flag bookings with **outstanding dues**.

---

## Required Reports

| # | Report |
|---|--------|
| 1 | Room occupancy report for a selected date or period |
| 2 | Guest billing summary, including unpaid balances |
| 3 | Service usage breakdown per room and service type |
| 4 | Monthly revenue per branch (from room charges and services) |
| 5 | Top-used services and customer preference trends |

---

## Task

Your task is to **model the database design** to encapsulate these requirements. It should consider all entities and relationships given in the description.

### Design Requirements

- Identify where **procedures**, **functions**, and **triggers** are required to ensure **ACID compliance**.
- Define **foreign keys** and **primary keys** for referential integrity.
- Apply appropriate **indexing** to improve performance in frequent queries.

### Assumptions

Review materials related to hotel operations and make assumptions where necessary, for example:

- Tax rules
- Discount policies
- Late checkout charges

### Database Population

Populate the database with:

- **3** hotel branches
- At least **10** rooms with different types
- **6** services in the service catalogue
- **5** guests with **8** total bookings
- Room availability records, service usage, and at least **3** partial payments
