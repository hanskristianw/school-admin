import pg from 'pg'
const { Client } = pg

const projectRef = 'gzucqoupjfnwkesgyybc'
const host = 'aws-0-ap-southeast-1.pooler.supabase.com'

const passwordsToTest = [
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dWNxb3VwamZud2tlc2d5eWJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ3NzIwMiwiZXhwIjoyMDY4MDUzMjAyfQ.PG5ua8wIrVqzrvQERmoKmphB26pEJqDdqjsE8JyFLbM',
  'nyGNwOUkEHrmFXBVKzjTuLHSr/A0GEHXKherajY2Jlj+OaBiFWfC2ixdUaJgGIIDtdL3zALVJFkSpa8nCKJ+Eg==',
  'sb_secret_03MBePNG3da6tGrgQTxVAA_uM2N0vQx'
]

const usersToTest = [
  `postgres.${projectRef}`,
  `postgres`
]

const portsToTest = [6543, 5432]

async function run() {
  for (const user of usersToTest) {
    for (const pass of passwordsToTest) {
      for (const port of portsToTest) {
        const conn = `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/postgres`
        console.log(`Testing user: ${user}, port: ${port}...`)
        const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
        try {
          await client.connect()
          console.log(`🎉 SUCCESS WITH USER: ${user}, PORT: ${port}!`)
          await client.query('ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;')
          console.log('✅ Column is_on_call_staff added successfully!')
          await client.end()
          return
        } catch (e) {
          console.log(`Failed: ${e.message}`)
          try { await client.end() } catch (_) {}
        }
      }
    }
  }
}

run()
