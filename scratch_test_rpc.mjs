import { createClient } from '@supabase/supabase-js'

const url = 'https://gzucqoupjfnwkesgyybc.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM'
const supabase = createClient(url, key)

const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql', 'query', 'exec', 'execute', 'run_ddl']

async function run() {
  for (const rpc of rpcNames) {
    const { data, error } = await supabase.rpc(rpc, { sql: 'ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;' })
    if (!error) {
      console.log(`🎉 SUCCESS WITH RPC: ${rpc}! Output:`, data)
      return
    } else {
      console.log(`RPC ${rpc}:`, error.message)
    }
  }
}

run()
