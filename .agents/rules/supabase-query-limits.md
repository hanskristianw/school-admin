---
trigger: always_on
description: Mandatory rules for Supabase query limits (1,000 rows PostgREST cap) and batch operations.
---

# Supabase Query Limits & Bulk Operations Rules

## 1. PostgREST Hard Limit of 1,000 Rows per Query
- **THE TRAP**: Supabase (PostgREST) has a server-side default limit of **1,000 rows per HTTP response** (`max-rows = 1000`).
- **CRITICAL WARNING**: Calling `.range(0, 99999)` **DOES NOT** bypass this limit! PostgREST will still silently truncate the returned rows to 1,000 without returning an error.
- **MANDATORY PATTERN**: Any query that fetches cumulative data, historical logs, large class data, or export reports (e.g. `kelas_attendance`, `assessment_grades`, `timetable`, `audit_log`) **MUST** use chunked pagination:
  ```javascript
  async function fetchAllRows(queryFn, chunkSize = 1000) {
    let allRows = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data, error } = await queryFn(from, from + chunkSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allRows = allRows.concat(data)
      if (data.length < chunkSize) {
        hasMore = false
      } else {
        from += chunkSize
      }
    }
    return allRows
  }
  ```
- **VERIFICATION**: Always check the true row count in the table using `{ count: 'exact', head: true }` when investigating or designing data retrieval.

## 2. Bulk/Batch Writes vs N+1 Loops
- **NEVER** iterate through an array making individual sequential HTTP requests or individual Supabase upserts in a loop (e.g. `for (const student of students) await saveSingleAttendance(...)`).
- **ALWAYS** support and use batch endpoints with array upserts:
  ```javascript
  await supabaseAdmin.from('table_name').upsert(recordsArray, { onConflict: '...' })
  ```
  and perform any re-computation or summary aggregation only **once** after the batch operation finishes.
