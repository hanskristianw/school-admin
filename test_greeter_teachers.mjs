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

async function testGreeterTeachers() {
  const greeterTeachers = ['michel.habersaat@ccs.sch.id', 'martin.lasut@ccs.sch.id']

  for (const email of greeterTeachers) {
    console.log(`\n--- Testing Google Chat send to: ${email} ---`)
    try {
      const res = await sendGoogleChatMessage(email, '🧪 Test Door Greeter Notification Diagnosis')
      console.log(`Result for ${email}:`, res)
    } catch (err) {
      console.error(`Error sending to ${email}:`, err.message)
      if (err.response) {
        console.error('API Error Response Data:', JSON.stringify(err.response.data, null, 2))
      }
    }
  }
}

testGreeterTeachers()
