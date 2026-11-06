import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/system-feedback/[id]/upvote
// Body: { user_id }
// Toggles upvote on/off for this user on this feedback item
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ success: false, message: 'User ID wajib disertakan.' }, { status: 400 })
    }

    const feedbackId = parseInt(id, 10)
    const userId = parseInt(user_id, 10)

    // Check if already upvoted
    const { data: existing } = await supabaseAdmin
      .from('system_feedback_upvotes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', userId)
      .maybeSingle()

    let hasUpvoted = false

    if (existing) {
      // Remove upvote
      await supabaseAdmin
        .from('system_feedback_upvotes')
        .delete()
        .eq('id', existing.id)
      hasUpvoted = false
    } else {
      // Add upvote
      await supabaseAdmin
        .from('system_feedback_upvotes')
        .insert({
          feedback_id: feedbackId,
          user_id: userId,
          created_at: new Date().toISOString()
        })
      hasUpvoted = true
    }

    // Recalculate true upvote count
    const { count, error: countErr } = await supabaseAdmin
      .from('system_feedback_upvotes')
      .select('*', { count: 'exact', head: true })
      .eq('feedback_id', feedbackId)

    if (countErr) throw countErr

    const newCount = count || 0

    // Update feedback table with true count
    await supabaseAdmin
      .from('system_feedback')
      .update({ upvotes_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', feedbackId)

    return NextResponse.json({
      success: true,
      has_upvoted: hasUpvoted,
      upvotes_count: newCount
    })
  } catch (err) {
    console.error('Error toggling upvote:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
