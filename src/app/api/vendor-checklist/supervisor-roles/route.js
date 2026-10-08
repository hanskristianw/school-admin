import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SETTING_KEY = 'vendor_checklist_supervisor_role_ids'
const DEFAULT_SUPERVISOR_ROLE_IDS = [1, 11, 16]
const MENU_ID = 131

/**
 * GET: Ambil daftar semua role dan role_id supervisor yang aktif
 */
export async function GET() {
  try {
    // 1. Ambil semua role dari database
    const { data: allRoles, error: rolesErr } = await supabaseAdmin
      .from('role')
      .select('role_id, role_name')
      .order('role_id', { ascending: true })

    if (rolesErr) throw rolesErr

    // 2. Ambil setting role_ids supervisor
    const { data: settingRow, error: settingErr } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle()

    if (settingErr) throw settingErr

    let supervisorRoleIds = DEFAULT_SUPERVISOR_ROLE_IDS
    if (settingRow?.value) {
      try {
        const parsed = typeof settingRow.value === 'string' ? JSON.parse(settingRow.value) : settingRow.value
        if (Array.isArray(parsed)) {
          supervisorRoleIds = parsed.map(Number)
        }
      } catch (e) {
        console.warn('Failed to parse supervisor role ids from settings, fallback to default', e)
      }
    }

    return NextResponse.json({
      success: true,
      supervisor_role_ids: supervisorRoleIds,
      all_roles: allRoles || []
    })
  } catch (err) {
    console.error('[SupervisorRoles API] GET Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST: Update role_id supervisor yang berhak me-review
 * Body: { role_ids: number[] }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { role_ids } = body

    if (!Array.isArray(role_ids)) {
      return NextResponse.json(
        { success: false, message: 'Parameter role_ids harus berupa array role_id angka' },
        { status: 400 }
      )
    }

    // Pastikan integer unik & positif
    const cleanRoleIds = [...new Set(role_ids.map(Number).filter(n => Number.isInteger(n) && n > 0))]

    // Simpan ke settings
    const nowISO = new Date().toISOString()
    const { error: saveErr } = await supabaseAdmin
      .from('settings')
      .upsert({
        key: SETTING_KEY,
        value: JSON.stringify(cleanRoleIds),
        description: 'Daftar role_id yang berhak menjadi supervisor / review checklist vendor',
        updated_at: nowISO
      }, { onConflict: 'key' })

    if (saveErr) throw saveErr

    // Sinkronisasi menu_permissions untuk menu Checklist Vendor (ID 131)
    // 1. Ambil izin menu_id 131 saat ini
    const { data: existingPerms } = await supabaseAdmin
      .from('menu_permissions')
      .select('permissions_id, role_id')
      .eq('menu_id', MENU_ID)

    const existingRoleSet = new Set((existingPerms || []).map(p => p.role_id))

    // Tambah izin untuk role supervisor yang belum ada
    const toAdd = cleanRoleIds.filter(rid => !existingRoleSet.has(rid))
    for (const rid of toAdd) {
      await supabaseAdmin.from('menu_permissions').insert({
        menu_id: MENU_ID,
        role_id: rid
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Pengaturan role supervisor berhasil disimpan.',
      supervisor_role_ids: cleanRoleIds
    })
  } catch (err) {
    console.error('[SupervisorRoles API] POST Error:', err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
