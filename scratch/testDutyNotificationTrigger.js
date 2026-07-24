import { createClient } from '@supabase/supabase-js'
import { sendGoogleChatMessage } from '../src/lib/googleChat.js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testTrigger() {
  const todayStr = '2026-07-24'
  console.log('Testing Duty Notification Trigger for date:', todayStr)

  const { data: schedule } = await supabaseAdmin
    .from('duty_schedules')
    .select('*')
    .eq('duty_date', todayStr)
    .single()

  if (!schedule) {
    console.log('No schedule for today')
    return
  }

  // Get user 7 (Devotion Leader for today)
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('user_id, user_email, user_nama_depan, user_nama_belakang')
    .eq('user_id', schedule.devotion_leader_user_id)
    .single()

  console.log('Devotion leader user:', userRow)

  if (userRow?.user_email) {
    const msg = `🔔 *REMINDER: Morning Devotion Duty (Test)*\n\n` +
      `Hello *${userRow.user_nama_depan}*,\n` +
      `You are scheduled as the *Devotion Leader* today at *07:30 AM*.\n\n` +
      `🙏 *Prayer Subjects:*\n` +
      `• *Teacher to Pray For:* ${schedule.teacher_to_be_prayed}\n` +
      `• *Student to Pray For:* ${schedule.student_to_be_prayed}\n\n` +
      `Please prepare and be ready at the devotion area. Thank you!`

    try {
      console.log(`Sending Google Chat DM to ${userRow.user_email}...`)
      await sendGoogleChatMessage(userRow.user_email, msg)
      console.log('✅ Google Chat message sent successfully!')
    } catch (e) {
      console.error('❌ Failed to send Google Chat message:', e.message)
    }
  }
}

testTrigger()
