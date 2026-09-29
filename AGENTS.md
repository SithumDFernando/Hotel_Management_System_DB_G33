# Antigravity Rules for SkyNest Project

This file (`AGENTS.md`) is used by the Antigravity agent to understand project-specific rules, guidelines, and context.

## Project Guidelines

1. **Architecture**:
   - The project uses **PostgreSQL** for the database, **FastAPI** for the backend, and **React + Vite** for the frontend.
   - Strictly separate helper functions (in `db/functions/`) from procedures (in `db/procedures/`) for the database to avoid redundancy.
   
2. **Code Style**:
   - **Database**: Use clear names for tables and columns (snake_case). All logic must ensure ACID compliance.
   - **Backend (Python)**: Follow PEP 8 guidelines. Use Pydantic models for request/response validation. Keep routers clean and delegate logic where possible.
   - **Frontend (React)**: Use functional components and hooks. Use Vanilla CSS or Tailwind CSS for styling depending on user preference, with a focus on modern, premium aesthetics.

3. **Documentation Integrity**:
   - Specifications in `docs/specs/` act as the source of truth for the API contract, database schema, and overall architecture.

## Workflow Rules

- When making database schema changes, ensure `db/run_all.sql` remains the single entry point to rebuild the schema.
- API endpoints must conform to the contract defined in `docs/specs/02_api_contract.md`.
- Frontend pages should align with the routing map defined in `docs/specs/09_frontend_pages.md`.

## Task Tracking & Feature Verification Rules

1. **Member Work Folders**:
   - Each team member's assignment guide and task tracker reside in dedicated subfolders:
     - **Sithum**: `docs/work/sithum/` (`sithum.md`, `todo.md`)
     - **Vinuji**: `docs/work/vinuji/` (`vinuji.md`, `todo.md`)
     - **Sheereen**: `docs/work/sheereen/` (`sheereen.md`, `todo.md`)
     - **Chamika**: `docs/work/chamika/` (`chamika.md`, `todo.md`)
     - **Sadeepa**: `docs/work/sadeepa/` (`sadeepa.md`, `todo.md`)

2. **Automated Feature Ticking (`todo.md`)**:
   - After implementing each feature, stored procedure, function, trigger, view, Pydantic schema, or API endpoint, the agent **MUST automatically tick off** the corresponding item in that member's `todo.md` (changing `- [ ]` to `- [x]`).

3. **Mandatory Pre-Tick Verification**:
   - **CRITICAL REQUIREMENT**: Before ticking any task in `todo.md`, the agent **MUST make sure that the feature has been implemented correctly**:
     - **Correctness & Contract Conformance**: Verify that the code strictly adheres to the specification in `docs/specs/` (correct parameter types, signatures, table and column names, HTTP status codes, and JSON response models).
     - **Database Robustness**: Verify that SQL procedures/functions/triggers compile without error, preserve ACID compliance, handle edge cases (e.g. date overlap, division by zero, non-existent foreign keys), and are properly included in `db/run_all.sql`.
     - **Backend Reliability**: Verify that FastAPI routes include appropriate RBAC dependencies (`require_role`), error handling (HTTP 400, 404, 409), and Pydantic validation rules.
     - **No Premature or Speculative Ticking**: NEVER tick off an item if it contains stubbed or placeholder code, unhandled TODO comments, failing checks, or unverified assumptions. Only tick once implementation and correctness have been verified.
