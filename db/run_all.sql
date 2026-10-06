-- =============================================================================
-- db/run_all.sql
-- =============================================================================
-- Purpose:
--   Single entry point to (re)build the entire SkyNest database schema from
--   scratch. Run this file in psql or any SQL client to:
--     1. Drop and recreate enum types (if needed during development).
--     2. Create all 13 tables in dependency order.
--     3. Apply all CHECK, UNIQUE, and FK constraints.
--     4. Create performance indexes.
--     5. Install all stored functions (db/functions/).
--     6. Install all stored procedures (db/procedures/).
--     7. Install all triggers (db/triggers/).
--     8. Create all reporting views (db/views/).
--     9. (Optional) Load seed data (db/seed/).
--
-- Usage:
--   psql -U <user> -d skynest -f db/run_all.sql
--
-- IMPORTANT: Paths below use \i (psql meta-command). All paths are relative
--   to the db/ directory. Run psql from the project root OR set the search
--   path accordingly.
--
-- Execution order matters — do NOT reorder these \i statements:
--   Schema first (tables → constraints → indexes),
--   then functions (no dependencies on procedures),
--   then procedures (may call functions),
--   then triggers (depend on procedures/functions),
--   then views (read-only queries over tables),
--   finally seed data (needs all tables to exist).
-- =============================================================================

-- Step 0: Print start banner
\echo '============================================='
\echo '  SkyNest Database — Full Schema Rebuild'
\echo '============================================='

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Schema (tables, constraints, indexes)
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [1/8] Creating tables...'
\i schema/01_tables.sql

\echo '>>> [2/8] Adding constraints...'
\i schema/02_constraints.sql

\echo '>>> [3/8] Creating indexes...'
\i schema/03_indexes.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Functions (pure calculations, no side effects)
--   ⚠ These files are TODO stubs until team members implement them.
--     The \i will run without error (comments only), but no functions
--     will be created yet. You will see TODO warnings below.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [4/8] Installing functions...'
\echo '    ⚠ NOTE: Function files may still be TODO stubs.'
\i functions/fn_calculate_nights.sql
\i functions/fn_calculate_tax.sql
\i functions/fn_get_current_rate.sql
\i functions/fn_get_room_charges.sql
\i functions/fn_get_service_charges.sql
\i functions/fn_get_outstanding_balance.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Procedures (may call functions, modify data)
--   ⚠ These files are TODO stubs until team members implement them.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [5/8] Installing procedures...'
\echo '    ⚠ NOTE: Procedure files may still be TODO stubs.'
\i procedures/booking.sql
\i procedures/checkin_checkout.sql
\i procedures/billing.sql
\i procedures/payments.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4: Triggers (fire on table events, may call functions/procedures)
--   ⚠ These files are TODO stubs until team members implement them.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [6/8] Installing triggers...'
\echo '    ⚠ NOTE: Trigger files may still be TODO stubs.'
\i triggers/double_booking_trigger.sql
\i triggers/room_status_trigger.sql
\i triggers/service_usage_trigger.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 5: Views (read-only reporting queries)
--   ⚠ These files are TODO stubs until team members implement them.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [7/8] Creating views...'
\i views/reports.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 6: Seed data (optional — comment out for production)
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '>>> [8/8] Loading seed data...'
\i seed/sample_data.sql

\echo ''
\echo '============================================='
\echo '  SkyNest Database — Build Complete!'
\echo ''
\echo '  ⚠ If you see TODO stubs above, those DB'
\echo '    objects are not yet implemented. The'
\echo '    schema + seed data are ready to use.'
\echo '============================================='
