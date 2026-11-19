import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/mailer'
import { emailTemplates } from '@/lib/emailTemplates'
import { sendGoogleChatMessage } from '@/lib/googleChat'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const APPROVAL_FLOW_KEY = 'court_rental_approval_flow'
export const APPROVAL_STATES_KEY = 'court_rental_approval_states'
export const MARKOM_RECIPIENTS_KEY = 'court_rental_markom_recipients'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Chunked range pagination to safely bypass PostgREST's 1,000-row limit.
 */
export async function fetchAllCourtRentals(queryFn, chunkSize = 1000) {
  let allRows = []
  let from = 0
  while (true) {
    const { data, error } = await queryFn(from, from + chunkSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < chunkSize) break
    from += chunkSize
  }
  return allRows
}

function parseSettingJson(rawValue, fallback) {
  if (!rawValue) return fallback
  try {
    return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
  } catch {
    return fallback
  }
}

export function formatStaffName(u) {
  if (!u) return ''
  return `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
}

export async function getCourtRentalSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .in('key', [APPROVAL_FLOW_KEY, APPROVAL_STATES_KEY, MARKOM_RECIPIENTS_KEY])

  if (error) throw error

  const map = Object.fromEntries((data || []).map(row => [row.key, row.value]))
  const rawFlow = parseSettingJson(map[APPROVAL_FLOW_KEY], {})
  const rawStates = parseSettingJson(map[APPROVAL_STATES_KEY], {})
  const rawRecipients = parseSettingJson(map[MARKOM_RECIPIENTS_KEY], [])

  return {
    approvalFlow: {
      approver1: rawFlow?.approver1 || null,
      approver2: rawFlow?.approver2 || null,
      updated_at: rawFlow?.updated_at || null,
      updated_by: rawFlow?.updated_by || null
    },
    approvalStates: rawStates && typeof rawStates === 'object' ? rawStates : {},
    markomRecipients: Array.isArray(rawRecipients) ? rawRecipients : []
  }
}

export async function saveCourtRentalSetting(key, value, description = '') {
  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(
      {
        key,
        value: JSON.stringify(value),
        description,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'key' }
    )
  if (error) throw error
}

export async function resolveStaffUser(userId) {
  if (!userId || isNaN(Number(userId))) return null
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      user_id,
      user_nama_depan,
      user_nama_belakang,
      user_email,
      is_active,
      resign_date,
      role:user_role_id(role_id, role_name, is_admin, is_student, is_vendor)
    `)
    .eq('user_id', Number(userId))
    .maybeSingle()

  if (error || !data) return null

  return {
    user_id: Number(data.user_id),
    user_nama_depan: data.user_nama_depan || '',
    user_nama_belakang: data.user_nama_belakang || '',
    full_name: formatStaffName(data) || `User #${data.user_id}`,
    user_email: (data.user_email || '').trim().toLowerCase(),
    role_id: data.role?.role_id ? Number(data.role.role_id) : null,
    role_name: data.role?.role_name || 'Staff',
    is_admin: Boolean(data.role?.is_admin),
    is_active: Boolean(data.is_active),
    is_student: Boolean(data.role?.is_student),
    is_vendor: Boolean(data.role?.is_vendor)
  }
}

/**
 * Ensures assigned Approver 1 & Approver 2 roles can access /data/court-rental in Sidebar & AccessGuard.
 */
export async function ensureCourtRentalMenuPermissions(roleIds = []) {
  const uniqueRoleIds = Array.from(new Set(roleIds.map(Number).filter(Boolean)))
  if (uniqueRoleIds.length === 0) return

  const { data: courtMenu } = await supabaseAdmin
    .from('menus')
    .select('menu_id, menu_parent_id')
    .eq('menu_path', '/data/court-rental')
    .maybeSingle()

  if (!courtMenu) return

  const targetMenuIds = [courtMenu.menu_id, courtMenu.menu_parent_id].filter(Boolean)
  const { data: existing } = await supabaseAdmin
    .from('menu_permissions')
    .select('menu_id, role_id')
    .in('menu_id', targetMenuIds)
    .in('role_id', uniqueRoleIds)

  const existingKeys = new Set((existing || []).map(p => `${p.menu_id}:${p.role_id}`))
  const toInsert = []
  for (const menu_id of targetMenuIds) {
    for (const role_id of uniqueRoleIds) {
      if (!existingKeys.has(`${menu_id}:${role_id}`)) {
        toInsert.push({ menu_id, role_id })
      }
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabaseAdmin.from('menu_permissions').insert(toInsert)
    if (error) console.warn('[CourtRental] Could not auto-grant menu_permissions:', error.message)
  }
}

/**
 * Derives consistent 2-step approval metadata without breaking existing cPanel status strings.
 */
export function enrichBookingWithApproval(booking, approvalStates = {}) {
  const state = approvalStates?.[String(booking.id)] || null

  if (booking.status === 'approved') {
    const legacyFallback = {
      status: 'approved',
      by_name: booking.approved_by || 'Admin CCS',
      at: booking.approved_at || booking.updated_at || booking.created_at
    }
    return {
      ...booking,
      approval_stage: 'completed',
      approval_steps: {
        step1: state?.step1 || legacyFallback,
        step2: state?.step2 || legacyFallback,
        rejected: null
      }
    }
  }

  if (booking.status === 'rejected') {
    return {
      ...booking,
      approval_stage: 'rejected',
      approval_steps: {
        step1: state?.step1 || null,
        step2: state?.step2 || null,
        rejected: state?.rejected || {
          by_name: 'Admin',
          reason: booking.admin_notes || '',
          at: booking.updated_at
        }
      }
    }
  }

  if (state?.step1?.status === 'approved') {
    return {
      ...booking,
      approval_stage: 'awaiting_approver_2',
      approval_steps: {
        step1: state.step1,
        step2: null,
        rejected: null
      }
    }
  }

  return {
    ...booking,
    approval_stage: 'awaiting_approver_1',
    approval_steps: {
      step1: null,
      step2: null,
      rejected: null
    }
  }
}

function getDashboardUrl() {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://manageccs.online'
  return `${appBaseUrl.replace(/\/$/, '')}/data/court-rental`
}

/**
 * Dispatches Email + Google Chat notifications for Step 1 (Finance) or Step 2 (Markom).
 */
export async function notifyApproversAndMarkom({
  stage,
  booking,
  primaryApprover = null,
  step1Info = null,
  extraRecipients = []
}) {
  const dashboardUrl = getDashboardUrl()
  const formattedPrice = `Rp ${Number(booking.price || 0).toLocaleString('id-ID')},-`
  const targets = new Map()

  if (primaryApprover?.user_email && EMAIL_REGEX.test(primaryApprover.user_email)) {
    const emailKey = primaryApprover.user_email.trim().toLowerCase()
    targets.set(emailKey, {
      name: primaryApprover.full_name || primaryApprover.user_nama_depan || 'Approver',
      email: emailKey,
      notify_email: true,
      notify_google_chat: true,
      isPrimaryApprover: true
    })
  }

  for (const r of extraRecipients) {
    if (!r || r.is_active === false || !r.user_email) continue
    const emailKey = String(r.user_email).trim().toLowerCase()
    if (!EMAIL_REGEX.test(emailKey)) continue
    if (!targets.has(emailKey)) {
      targets.set(emailKey, {
        name: r.user_nama_depan || formatStaffName(r) || 'Tim Markom',
        email: emailKey,
        notify_email: r.notify_email !== false,
        notify_google_chat: r.notify_google_chat !== false,
        isPrimaryApprover: false
      })
    }
  }

  let notifiedCount = 0

  for (const target of targets.values()) {
    if (stage === 'step2_turn') {
      if (target.notify_email && emailTemplates?.courtRentalStep2Notify) {
        try {
          const { subject, html } = emailTemplates.courtRentalStep2Notify({
            recipientName: target.name,
            bookingCode: booking.booking_code,
            renterName: booking.renter_name,
            renterPhone: booking.renter_phone,
            renterEmail: booking.renter_email,
            renterOrg: booking.renter_org,
            renterPurpose: booking.renter_purpose,
            packageName: booking.package_name,
            price: Number(booking.price || 0),
            bookingDate: booking.booking_date,
            timeSlot: booking.time_slot,
            step1ApproverName: step1Info?.by_name || 'Tim Finance',
            step1ApprovedAt: step1Info?.at || null,
            dashboardUrl
          })
          await sendEmail({ to: target.email, subject, html })
          notifiedCount++
        } catch (err) {
          console.warn(`[CourtRental Step2] Failed email to ${target.email}:`, err.message)
        }
      }

      if (target.notify_google_chat) {
        try {
          const chatText = `✅ *Tahap 1 Disetujui Finance — Giliran Approval Markom (Tahap 2)*\n\n` +
            `Halo *${target.name}*, dana untuk reservasi sewa lapangan berikut telah dikonfirmasi masuk oleh *${step1Info?.by_name || 'Finance'}*:\n\n` +
            `📌 *Kode Booking:* *${booking.booking_code}*\n` +
            `👤 *Pemesan:* ${booking.renter_name} (${booking.renter_org || 'Umum'})\n` +
            `📅 *Tanggal & Sesi:* *${booking.booking_date}* • *${booking.time_slot}*\n` +
            `📦 *Paket:* ${booking.package_name} (${formattedPrice})\n` +
            `📋 *Status Saat Ini:* Menunggu Approval Tahap 2 (Markom) sebelum email konfirmasi dikirim ke pendaftar.\n\n` +
            `🌐 *Buka Dashboard untuk Approve Tahap 2:*\n${dashboardUrl}`
          await sendGoogleChatMessage(target.email, chatText)
        } catch (err) {
          console.warn(`[CourtRental Step2] Failed Chat DM to ${target.email}:`, err.message)
        }
      }
      continue
    }

    // Default: 'step1_new_booking'
    if (target.notify_email && emailTemplates?.courtRentalMarkomAlert) {
      try {
        const { subject, html } = emailTemplates.courtRentalMarkomAlert({
          recipientName: target.name,
          bookingCode: booking.booking_code,
          renterName: booking.renter_name,
          renterPhone: booking.renter_phone,
          renterEmail: booking.renter_email,
          renterOrg: booking.renter_org,
          renterPurpose: booking.renter_purpose,
          packageName: booking.package_name,
          price: Number(booking.price || 0),
          bookingDate: booking.booking_date,
          timeSlot: booking.time_slot,
          dashboardUrl
        })
        await sendEmail({ to: target.email, subject, html })
        notifiedCount++
      } catch (err) {
        console.warn(`[CourtRental Step1] Failed email to ${target.email}:`, err.message)
      }
    }

    if (target.notify_google_chat) {
      try {
        const stageHint = target.isPrimaryApprover
          ? 'Mohon verifikasi mutasi dana masuk dan lakukan *Approval Tahap 1 (Finance)* di dashboard.'
          : 'Pesanan masuk sedang menunggu *Approval Tahap 1 (Finance)* terlebih dahulu sebelum diteruskan ke Markom.'
        const chatText = `🏸 *Pesanan Baru Sewa Lapangan — Sport Hall CCS*\n\n` +
          `Halo *${target.name}*, ada permohonan reservasi sewa lapangan baru yang masuk melalui website:\n\n` +
          `📌 *Kode Booking:* *${booking.booking_code}*\n` +
          `👤 *Nama Pemesan:* ${booking.renter_name}\n` +
          `📱 *No. WhatsApp:* ${booking.renter_phone || '-'}\n` +
          `✉️ *Email:* ${booking.renter_email || '-'}\n` +
          `🏢 *Klub / Komunitas:* ${booking.renter_org || 'Pribadi / Umum'}\n` +
          `🎯 *Tujuan:* ${booking.renter_purpose || '-'}\n` +
          `📅 *Tanggal Bermain:* *${booking.booking_date}*\n` +
          `⏰ *Sesi Jam:* *${booking.time_slot}*\n` +
          `📦 *Paket:* ${booking.package_name}\n` +
          `💰 *Total Biaya:* ${formattedPrice}\n` +
          `📋 *Alur:* ${stageHint}\n\n` +
          `🌐 *Buka Dashboard:*\n${dashboardUrl}`
        await sendGoogleChatMessage(target.email, chatText)
      } catch (err) {
        console.warn(`[CourtRental Step1] Failed Chat DM to ${target.email}:`, err.message)
      }
    }
  }

  return notifiedCount
}
