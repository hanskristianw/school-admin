import { createClient } from './node_modules/@supabase/supabase-js/dist/main/index.js'

const supabaseUrl = 'https://gzucqoupjfnwkesgyybc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('Adding column is_on_call_staff to table role...')
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;'
  })
  
  if (error) {
    console.log('exec_sql failed:', error.message)
  } else {
    console.log('rpc exec_sql output:', data)
  }

  const { data: test, error: selErr } = await supabase.from('role').select('role_id, role_name, is_on_call_staff').limit(5)
  if (selErr) {
    console.error('Column check failed:', selErr.message)
  } else {
    console.log('✅ Column is_on_call_staff verified in role table! Sample roles:', test)
  }
}

run()
