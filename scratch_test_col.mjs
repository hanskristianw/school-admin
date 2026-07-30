const url = 'https://gzucqoupjfnwkesgyybc.supabase.co/rest/v1/role?select=role_id,role_name,is_part_time_staff,is_flexible_hours,is_on_call_staff'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM'

async function run() {
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const roles = await res.json()
  console.log('Roles count:', roles.length)
  for (const r of roles) {
    if (r.role_name.toLowerCase().includes('marketing') || r.role_name.toLowerCase().includes('on call') || r.is_on_call_staff) {
      console.log('MATCHED ROLE:', r)
    }
  }
}

run()
