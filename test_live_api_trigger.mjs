async function testProductionNotifyEndpoint() {
  console.log('--- 1. Testing GET https://manageccs.online/api/duty/notify?test=true ---')
  try {
    const resTest = await fetch('https://manageccs.online/api/duty/notify?test=true')
    console.log('HTTP Status:', resTest.status)
    const jsonTest = await resTest.json()
    console.log('Response JSON:', JSON.stringify(jsonTest, null, 2))
  } catch (e) {
    console.error('Error testing test=true:', e.message)
  }

  console.log('\n--- 2. Testing GET https://manageccs.online/api/duty/notify (Standard Cron Trigger) ---')
  try {
    const resStd = await fetch('https://manageccs.online/api/duty/notify')
    console.log('HTTP Status:', resStd.status)
    const jsonStd = await resStd.json()
    console.log('Response JSON:', JSON.stringify(jsonStd, null, 2))
  } catch (e) {
    console.error('Error testing standard trigger:', e.message)
  }
}

testProductionNotifyEndpoint()
