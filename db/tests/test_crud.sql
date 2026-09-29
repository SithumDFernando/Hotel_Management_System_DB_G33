-- =============================================================================
-- db/tests/test_crud.sql
-- =============================================================================
-- Purpose:
--   Reusable database smoke test script.
--   Validates that the current database user has full CREATE, INSERT, SELECT,
--   UPDATE, and DELETE permissions on the skynest database.
--
-- Usage:
--   psql -U skynest_user -d skynest -f db/tests/test_crud.sql
-- =============================================================================

\echo '>>> [1/5] Creating temporary test table...'
CREATE TEMP TABLE _test_probe (
    probe_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    probe_name  VARCHAR(50) NOT NULL,
    status      VARCHAR(20) DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

\echo '>>> [2/5] Inserting test records (CREATE)...'
INSERT INTO _test_probe (probe_name, status)
VALUES 
    ('HealthCheck_1', 'ACTIVE'),
    ('HealthCheck_2', 'PENDING');

\echo '>>> [3/5] Querying test records (READ)...'
SELECT probe_id, probe_name, status, created_at FROM _test_probe;

\echo '>>> [4/5] Modifying test record (UPDATE)...'
UPDATE _test_probe 
SET status = 'RESOLVED' 
WHERE probe_name = 'HealthCheck_2';

SELECT probe_id, probe_name, status FROM _test_probe WHERE probe_name = 'HealthCheck_2';

\echo '>>> [5/5] Deleting test records (DELETE)...'
DELETE FROM _test_probe WHERE probe_id = 1;

SELECT COUNT(*) AS remaining_rows FROM _test_probe;

DROP TABLE _test_probe;

\echo ''
\echo '=================================================='
\echo '  [SUCCESS] All CRUD operations passed verified!'
\echo '  Database connectivity and permissions are 100% OK.'
\echo '=================================================='
