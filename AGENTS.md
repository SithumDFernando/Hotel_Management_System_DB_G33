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
