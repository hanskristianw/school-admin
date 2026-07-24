import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const todayStr = new Date().toISOString().slice(0, 10)
  console.log('Today date:', todayStr)

  const { data: schedule, error } = await supabaseAdmin
    .from('duty_schedules')
    .select('*')
    .eq('duty_date', todayStr)

  console.log('Schedule for today:', schedule, 'Error:', error)
}

test()
