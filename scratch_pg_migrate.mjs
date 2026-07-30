import pg from 'pg'
const { Client } = pg

const rawPass = 'nyGNwOUkEHrmFXBVKzjTuLHSr/A0GEHXKherajY2Jlj+OaBiFWfC2ixdUaJgGIIDtdL3zALVJFkSpa8nCKJ+Eg=='

const connectionStrings = [
  `postgres://postgres.gzucqoupjfnwkesgyybc:${encodeURIComponent(rawPass)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres:${encodeURIComponent(rawPass)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgres://postgres.gzucqoupjfnwkesgyybc:${encodeURIComponent(rawPass)}@db.gzucqoupjfnwkesgyybc.supabase.co:5432/postgres`,
  `postgres://postgres:${encodeURIComponent(rawPass)}@db.gzucqoupjfnwkesgyybc.supabase.co:5432/postgres`
]

async function run() {
  for (let i = 0; i < connectionStrings.length; i++) {
    console.log(`Testing connection string #${i + 1}...`)
    const client = new Client({
      connectionString: connectionStrings[i],
      ssl: { rejectUnauthorized: false }
    })
    try {
      await client.connect()
      console.log(`✅ Success with connection #${i + 1}!`)
      await client.query('ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;')
      console.log('✅ Column is_on_call_staff added successfully!')
      const res = await client.query('SELECT role_id, role_name, is_part_time_staff, is_flexible_hours, is_on_call_staff FROM role LIMIT 5;')
      console.log('Sample roles:', res.rows)
      await client.end()
      return
    } catch (err) {
      console.log(`Connection #${i + 1} error:`, err.message)
      try { await client.end() } catch (_) {}
    }
  }
}

run()
