import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/system-feedback/recipients
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const listStaff = searchParams.get('list_staff') === 'true'

    // If requested, return active staff list to pick from
    if (listStaff) {
      const { data: staffList, error: staffErr } = await supabaseAdmin
        .from('users')
        .select(`
          user_id,
          user_nama_depan,
          user_nama_belakang,
          user_email,
          role:user_role_id(role_name)
        `)
        .order('user_nama_depan', { ascending: true })

      if (staffErr) throw staffErr
      return NextResponse.json({ success: true, data: staffList || [] })
    }

    const { data, error } = await supabaseAdmin
      .from('system_feedback_recipients')
      .select(`
        id,
        user_id,
        is_active,
        notify_on_new_ticket,
        created_at,
        user:user_id(
          user_id,
          user_nama_depan,
          user_nama_belakang,
          user_email,
          role:user_role_id(role_name)
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          tableMissing: true,
          data: [],
          message: 'Tabel system_feedback_recipients belum dibuat di Supabase.'
        }, { status: 200 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err) {
    console.error('[FeedbackRecipients GET] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/system-feedback/recipients
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, notify_on_new_ticket } = body

    if (!user_id) {
      return NextResponse.json({ success: false, message: 'User ID wajib dipilih.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('system_feedback_recipients')
      .upsert({
        user_id: parseInt(user_id, 10),
        is_active: true,
        notify_on_new_ticket: notify_on_new_ticket !== false,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select(`
        id,
        user_id,
        is_active,
        notify_on_new_ticket,
        created_at,
        user:user_id(
          user_id,
          user_nama_depan,
          user_nama_belakang,
          user_email,
          role:user_role_id(role_name)
        )
      `)
      .single()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          tableMissing: true,
          message: 'Tabel system_feedback_recipients belum dibuat di Supabase. Silakan jalankan migrasi SQL.'
        }, { status: 200 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[FeedbackRecipients POST] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// PATCH /api/system-feedback/recipients
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, is_active } = body

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID penerima wajib diisi.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('system_feedback_recipients')
      .update({ is_active })
      .eq('id', parseInt(id, 10))
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[FeedbackRecipients PATCH] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// DELETE /api/system-feedback/recipients
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID penerima wajib diisi.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('system_feedback_recipients')
      .delete()
      .eq('id', parseInt(id, 10))

    if (error) throw error
    return NextResponse.json({ success: true, message: 'Penerima berhasil dihapus.' })
  } catch (err) {
    console.error('[FeedbackRecipients DELETE] Error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
