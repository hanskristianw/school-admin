const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM'
const baseUrl = 'https://gzucqoupjfnwkesgyybc.supabase.co/rest/v1'

async function checkTodayDutySchedule() {
  const todayStr = '2026-07-28'
  console.log('Checking duty_schedules for:', todayStr)

  const schedRes = await fetch(`${baseUrl}/duty_schedules?select=*&duty_date=eq.${todayStr}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  const schedules = await schedRes.json()
  console.log(`\n--- duty_schedules for ${todayStr} ---`)
  console.log(JSON.stringify(schedules, null, 2))
}

checkTodayDutySchedule()
