import fs from 'fs'
import path from 'path'
import { sendGoogleChatMessage } from './src/lib/googleChat.js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length > 0) {
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
}

async function testDutyLive() {
  console.log('--- Checking Google Chat Credentials ---')
  console.log('GOOGLE_CHAT_CLIENT_EMAIL:', process.env.GOOGLE_CHAT_CLIENT_EMAIL ? 'OK' : 'MISSING')
  console.log('GOOGLE_WORKSPACE_ADMIN_EMAIL:', process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL ? 'OK' : 'MISSING')
  console.log('GOOGLE_CHAT_PRIVATE_KEY:', process.env.GOOGLE_CHAT_PRIVATE_KEY ? 'OK' : 'MISSING')

  // Test sending to hans@ccs.sch.id
  console.log('\n--- Test sending message to hans@ccs.sch.id ---')
  try {
    const res = await sendGoogleChatMessage('hans@ccs.sch.id', '🧪 Live Test Notification from Duty System Diagnosis')
    console.log('Send Result:', res)
  } catch (err) {
    console.error('Send Error:', err.message)
    if (err.response) {
      console.error('API Error Response Data:', JSON.stringify(err.response.data, null, 2))
    }
  }
}

testDutyLive()
