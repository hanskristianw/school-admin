/**
 * Helper to synchronize and reconcile `leave_quotas.used_days` with the single source
 * of truth: approved records in `attendance_excuses`.
 *
 * This prevents quota drift caused by:
 * - Imperative "+1" increments on repeated approvals
 * - Unrecorded cancellations / rejections after an initial approval
 * - Edits to excuse categories or dates
 * - Deletions of excuses
 */

/**
 * Synchronizes leave_quotas.used_days for a specific user and leave type (or all leave types of that user).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {object} params
 * @param {number} params.userId - Target user_id
 * @param {string} [params.leaveTypeCode] - Specific category to sync (optional)
 * @param {number} [params.yearId] - Target year_id (optional if attendanceDate is given)
 * @param {string} [params.attendanceDate] - Date string YYYY-MM-DD to resolve academic year (optional if yearId is given)
 */
export async function syncUserLeaveQuota(supabaseAdmin, { userId, leaveTypeCode, yearId, attendanceDate }) {
  if (!supabaseAdmin || !userId || (!yearId && !attendanceDate)) return null

  try {
    // 1. Resolve academic year date range
    let targetYearId = yearId
    let yearStart = null
    let yearEnd = null

    if (targetYearId) {
      const { data: y } = await supabaseAdmin
        .from('year')
        .select('year_id, start_date, end_date')
        .eq('year_id', targetYearId)
        .maybeSingle()
      if (y) {
        yearStart = y.start_date
        yearEnd = y.end_date
      }
    } else if (attendanceDate) {
      const { data: y } = await supabaseAdmin
        .from('year')
        .select('year_id, start_date, end_date')
        .lte('start_date', attendanceDate)
        .gte('end_date', attendanceDate)
        .maybeSingle()
      if (y) {
        targetYearId = y.year_id
        yearStart = y.start_date
        yearEnd = y.end_date
      }
    }

    if (!targetYearId || !yearStart || !yearEnd) return null

    // 2. Determine which categories to synchronize
    let targetCodes = []
    if (leaveTypeCode) {
      targetCodes = [leaveTypeCode]
    } else {
      const { data: userQuotas } = await supabaseAdmin
        .from('leave_quotas')
        .select('leave_type_code')
        .eq('user_id', userId)
        .eq('year_id', targetYearId)
      targetCodes = (userQuotas || []).map(q => q.leave_type_code)
    }

    for (const code of targetCodes) {
      // 3. Count distinct approved attendance dates for this user & category in this academic year
      const { data: excuses, error: excErr } = await supabaseAdmin
        .from('attendance_excuses')
        .select('attendance_date')
        .eq('user_id', userId)
        .eq('category', code)
        .eq('status', 'approved')
        .gte('attendance_date', yearStart)
        .lte('attendance_date', yearEnd)

      if (excErr) continue

      const distinctDates = new Set((excuses || []).map(e => e.attendance_date))
      const realUsedDays = distinctDates.size

      // 4. Check if quota record exists
      const { data: existingQuota } = await supabaseAdmin
        .from('leave_quotas')
        .select('id, total_days, used_days')
        .eq('user_id', userId)
        .eq('leave_type_code', code)
        .eq('year_id', targetYearId)
        .maybeSingle()

      if (existingQuota) {
        if (existingQuota.used_days !== realUsedDays) {
          await supabaseAdmin
            .from('leave_quotas')
            .update({
              used_days: realUsedDays,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingQuota.id)
        }
      } else {
        // If no individual row exists, check global template
        const { data: globalQuota } = await supabaseAdmin
          .from('leave_quotas')
          .select('id, total_days')
          .is('user_id', null)
          .eq('leave_type_code', code)
          .eq('year_id', targetYearId)
          .maybeSingle()

        if (globalQuota && realUsedDays > 0) {
          await supabaseAdmin
            .from('leave_quotas')
            .insert({
              user_id: userId,
              leave_type_code: code,
              year_id: targetYearId,
              total_days: globalQuota.total_days,
              used_days: realUsedDays,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }
      }
    }
  } catch (err) {
    console.error('syncUserLeaveQuota error:', err)
  }
}
