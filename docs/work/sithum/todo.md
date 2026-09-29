# Sithum's Task Checklist: Core Infrastructure & Golden Template

**Assignee:** Sithum (Team Lead & System Architect)  
**Assignment Guide:** [sithum.md](./sithum.md)  
**General Guides:** [System Architecture](../architecture.md) | [Learning Guide](../learn.md) | [Project README](../../../README.md)  

---

## Phase 1: Database Schema Foundation (PostgreSQL)

- [x] **ENUM Types & Core Tables** (`db/schema/01_tables.sql`)
  - [x] Define ENUM types (`user_role_enum`, `room_status_enum`, `booking_status_enum`, `guest_type_enum`, `payment_method_enum`, `balance_flag_enum`, `service_category_enum`)
  - [x] Define 13 core relational tables with primary keys and initial constraints
- [x] **Relational Constraints & Integrity** (`db/schema/02_constraints.sql`)
  - [x] Configure Foreign Key relationships with appropriate `ON DELETE` rules
  - [x] Configure CHECK constraints (positive prices, valid date intervals, capacity checks)
  - [x] Configure composite UNIQUE constraints (`branch_id + room_number`, `branch_id + room_type_id`)
- [x] **Performance Indexes** (`db/schema/03_indexes.sql`)
  - [x] Create B-Tree indexes on all foreign key columns
  - [x] Create B-Tree indexes on high-frequency lookup fields (`guest.email`, `guest.nic_passport`, `booking.status`)
- [x] **Master Execution Entry Point** (`db/run_all.sql`)
  - [x] Maintain idempotent, clean schema teardown and rebuild order

---

## Phase 2: Backend Core Infrastructure (FastAPI)

- [x] **Application Settings** (`backend/app/config.py`)
  - [x] Define `Settings` model loading environment variables (`DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `FRONTEND_ORIGIN`)
- [x] **Database Engine & Connection Pool** (`backend/app/db.py`)
  - [x] Initialize asyncpg connection pool on FastAPI startup lifespan
  - [x] Implement `get_db()` and `get_connection()` context managers for transactional execution
- [x] **Security & Cryptography** (`backend/app/auth.py`)
  - [x] Implement bcrypt password hashing (`hash_password`) and verification (`verify_password`)
  - [x] Implement JWT token creation (`create_access_token`) and verification (`decode_access_token`)
- [x] **Authentication & RBAC Dependencies** (`backend/app/dependencies.py`)
  - [x] Implement `get_current_user` OAuth2 Bearer token extractor
  - [x] Implement `require_role(*roles)` dependency factory for role-based endpoint protection
- [x] **Main Application Initialization** (`backend/app/main.py`)
  - [x] Initialize FastAPI app with title and OpenAPI metadata
  - [x] Configure CORS middleware for frontend communication
  - [x] Mount API routers with standard `/api` prefixes

---

## Phase 3: Golden Reference & Auth Routers

- [x] **Auth Router** (`backend/app/routers/auth.py`)
  - [x] `POST /api/auth/login` (credential validation, JWT token return)
  - [x] `POST /api/auth/register` (account creation with role handling)
  - [x] `GET /api/auth/me` (current authenticated profile retrieval)
- [x] **Golden Template Room Router** (`backend/app/routers/rooms.py`)
  - [x] `GET /api/rooms` (filter by branch, room type, status; pagination support)
  - [x] `GET /api/rooms/{room_id}` (detailed room data with amenities)
  - [x] `POST /api/rooms` (create room with admin/manager role restriction)
  - [x] `PUT /api/rooms/{room_id}` (full update of room details)
  - [x] `PATCH /api/rooms/{room_id}/status` (status transition with validation)
  - [x] `DELETE /api/rooms/{room_id}` (safe deletion with dependency checks)
- [x] **Room Pydantic Schemas** (`backend/app/schemas/room.py`)
  - [x] Define `RoomBase`, `RoomCreate`, `RoomUpdate`, `RoomStatusUpdate`, `RoomOut`

---

## Phase 4: Team Coordination & Integration

- [ ] **Teammate Pull Request Reviews**
  - [ ] Review Vinuji's PR: Booking lifecycle & double-booking trigger
  - [ ] Review Sheereen's PR: Rate/tax functions, bill UPSERT & payments
  - [ ] Review Chamika's PR: Service catalog, guest CRUD & price snapshot trigger
  - [ ] Review Sadeepa's PR: 5 management views & reporting endpoints
- [ ] **System Verification & Smoke Tests**
  - [ ] Execute `db/run_all.sql` cleanly against local PostgreSQL instance
  - [ ] Validate complete OpenAPI contract at `/docs`
  - [ ] Verify frontend authentication flow and role guard integration
