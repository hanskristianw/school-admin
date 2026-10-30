# Project Agent Rules

## Git Push Rule
- **STRICT DIRECTIVE**: NEVER execute `git push` or auto-push code to Git under any circumstances.
- All code edits, builds, and verifications must remain strictly local until the user explicitly decides to commit/push manually.

## Supabase Query Limit & Batch Operations Rule
- **STRICT DIRECTIVE**: Supabase (PostgREST) limits queries to a hard cap of **1,000 rows** per request (`max-rows = 1000`).
- Calling `.range(0, 99999)` DOES NOT bypass the 1,000 row limit! It still silently truncates at 1,000 rows.
- Any query fetching history, cumulative calculations, or export reports (such as `kelas_attendance`, `assessment_grades`, etc.) MUST use chunked range pagination (`fetchAllRows`) in a loop.
- NEVER execute sequential save/upsert queries in a client/server loop (N+1 queries). Always use batch upsert with arrays and recalculate summaries once.
