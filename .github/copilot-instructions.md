# School Admin AI Guide

## Architecture
- Next.js App Router in `src/app`; layouts provide sidebar + guards (see `src/components/AccessGuard.jsx`, namespace layouts like `src/app/dashboard/layout.jsx`, `/sales/layout.jsx`, `/reports/layout.jsx`).
- PostgreSQL via Supabase; client configured in `src/lib/supabase.js` with env `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`. For authenticated queries use `createSupabaseWithAuth(token)` so PostgREST sees the bearer.
- Custom auth stored in `users` table. JWT helpers live in `src/lib/auth.js`. Session context (role, unit, ids) is cached in `localStorage` keys (`user_data`, `user_role`, `kr_id`).

## Data & Business Rules
- Schemas documented in `MAIN_DOCUMENTATION.md` (searchable by feature). Migrations live under `migrations/`; avoid editing `.next` artifacts.
- Assessments: teacher submits via `/teacher/assessment_submission`, admin/principal approve via `/data/assessment_approval`. Enforce max **2 approved assessments per kelas per date** and status pipeline (`0 waiting`, `3 waiting principal`, `1 approved`, `2 rejected`).
- Topics bound to subject + class via `detail_kelas`. Topic selection is required when available; cache key format `<subject_id>|<kelas_id>`.
- Attendance uses QR sessions (`attendance_session`, `attendance_scan_log`) with device hashes, geofence flags, and daily uniqueness per student. Mind `ATTENDANCE_*` env flags before altering flows.
- Units flagged by `unit.is_school`; many pages filter on that (see `/settings/unit`). Icons for menus follow `iconMap` in `src/components/sidebar.jsx`.

## Frontend Patterns
- UI components reside in `src/components/ui/*`. Use provided `Modal`, `NotificationModal`, `Button`, etc. Keep Tailwind classes consistent with existing styles.
- Pages are client components (`'use client'`) when they access Supabase or localStorage. Prefer `useEffect` for async loads; wrap supabase calls in try/catch and surface errors with `showNotification(...)` (pattern used in assessment pages).
- Forms often keep `formData` state + `formErrors`; validators live inline. Follow existing conventions (trim text, set `null` for optional fields before insert/update).
- Localization via `useI18n()` hook; strings defined in `src/i18n`. When adding UI copy, provide keys for `en`, `id`, `zh`.

## API & Server Routes
- Custom APIs reside under `src/app/api/**/route.js`. Most actions (login, profile, admin) call Supabase using service role keys. Before creating new endpoints, verify if client-side Supabase with JWT is sufficient.
- Avoid embedding secrets client-side. Service role access should stay server-only.

## Development Workflow
- Install deps with `npm install`. Start dev server via `npm run dev`; lint with `npm run lint`; build with `npm run build`.
- Environment setup: copy `.env.local` sample from `SETUP_SUPABASE.md`. Include `SUPABASE_JWT_SECRET` when working with RLS. Attendance features also rely on `ATTENDANCE_*` toggles discussed in `ATTENDANCE_SYSTEM_DOCS.md`.
- This repo has no automated tests; verify changes manually (e.g., use `/debug/supabase` to test connection, `/login` for auth, `/teacher/assessment_submission` + `/data/assessment_approval` for assessments, `/student/scan` for attendance).

## Tips for New Changes
- Review `MAIN_DOCUMENTATION.md` section relevant to your feature before altering schemas or flows.
- When introducing new DB interactions, ensure the Supabase policy allows it or adjust RLS accordingly.
- Preserve adherence to localized copy, menu permissions, and role-based guards—update menus plus `AccessGuard` when adding new routes.
