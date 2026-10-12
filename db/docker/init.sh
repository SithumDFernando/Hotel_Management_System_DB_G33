#!/bin/sh
# =============================================================================
# db/docker/init.sh
# =============================================================================
# Purpose:
#   Runs once, on first start of the Postgres container (empty data volume),
#   via /docker-entrypoint-initdb.d/. Builds the full schema + seed data.
#
#   run_all.sql uses \i with paths relative to db/, so psql must run from
#   /db (the repo's db/ folder is mounted there read-only).
#
#   The skynest_user role and skynest database are already created by the
#   postgres image from POSTGRES_USER / POSTGRES_DB, so db/setup_db.sql is
#   not needed here.
#
# Re-run:
#   docker compose down -v && docker compose up
# =============================================================================
set -e

cd /db
psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -f run_all.sql
