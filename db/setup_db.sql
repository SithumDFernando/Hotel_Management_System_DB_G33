-- =============================================================================
-- db/setup_db.sql
-- =============================================================================
-- Purpose:
--   One-time database and user setup script.
--   Run this file ONCE as the postgres superuser to:
--     1. Create the dedicated 'skynest_user' role (Principle of Least Privilege).
--     2. Create the 'skynest' database owned by 'skynest_user'.
--     3. Grant all necessary schema privileges.
--
-- Usage:
--   psql -U postgres -f db/setup_db.sql
--
-- Security Note:
--   Running your backend application under 'skynest_user' instead of the root
--   'postgres' superuser protects your system. 'skynest_user' only has access
--   to the 'skynest' database and cannot touch any other databases or execute
--   system-level administrative commands.
-- =============================================================================

-- Step 1: Create dedicated application user if it doesn't already exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE rolname = 'skynest_user'
   ) THEN
      CREATE ROLE skynest_user WITH LOGIN PASSWORD 'skynest_dev_pass';
      RAISE NOTICE 'Role skynest_user created with password: skynest_dev_pass';
   ELSE
      RAISE NOTICE 'Role skynest_user already exists.';
   END IF;
END
$do$;

-- Step 2: Create the database owned by skynest_user (if it doesn't exist)
SELECT 'CREATE DATABASE skynest OWNER skynest_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skynest')\gexec

-- Step 3: Connect to skynest and grant all privileges on schema public
\c skynest

GRANT ALL ON SCHEMA public TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO skynest_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO skynest_user;

\echo ''
\echo '=================================================='
\echo ' SkyNest Database & User Initialized Successfully!'
\echo '   Database: skynest'
\echo '   User:     skynest_user'
\echo '   Password: skynest_dev_pass'
\echo ''
\echo ' Next step: Run the full schema rebuild:'
\echo '   psql -U skynest_user -d skynest -f db/run_all.sql'
\echo '=================================================='
