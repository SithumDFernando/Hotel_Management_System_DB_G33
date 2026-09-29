## Subsystem / Feature Description
<!-- Briefly describe what feature or bug fix this PR implements -->

## Related GitHub Issue
<!-- Link the issue using closing keywords, for example: Closes #12 or Fixes #5 -->
Closes #

## Branch Check
- [ ] Base branch is set to `dev` (NOT `main`)
- [ ] Feature branch was pulled from latest `dev` before submission

## Quality Checklist
- [ ] Database objects execute cleanly via `db/run_all.sql`
- [ ] Pydantic request & response schemas properly validate data
- [ ] Endpoints tested in Swagger UI (`/docs`)
- [ ] No hardcoded secrets (uses `.env` configurations)
