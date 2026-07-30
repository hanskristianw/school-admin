const projectRef = 'gzucqoupjfnwkesgyybc'
const secretKey = 'sb_secret_03MBePNG3da6tGrgQTxVAA_uM2N0vQx'

async function run() {
  console.log('Attempting Supabase Management API db/query...')
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/db/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`
    },
    body: JSON.stringify({
      query: 'ALTER TABLE role ADD COLUMN IF NOT EXISTS is_on_call_staff BOOLEAN NOT NULL DEFAULT FALSE;'
    })
  })

  console.log('Status:', res.status, await res.text())
}

run()
