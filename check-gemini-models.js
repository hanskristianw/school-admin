// Script to check available Gemini models
// Usage: node check-gemini-models.js

const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCpvPiCov0vH3erp8ZvZmwi-bygDE8Gq1A'

async function listGeminiModels() {
  console.log('🔍 Checking available Gemini models...\n')
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Error:', error)
      return
    }
    
    const data = await response.json()
    const models = data.models || []
    
    console.log(`✅ Found ${models.length} models:\n`)
    console.log('═'.repeat(80))
    
    // Filter hanya Gemini models yang support generateContent
    const geminiModels = models.filter(m => 
      m.name.includes('gemini') && 
      m.supportedGenerationMethods?.includes('generateContent')
    )
    
    geminiModels.forEach(model => {
      const name = model.name.replace('models/', '')
      const displayName = model.displayName || name
      const description = model.description || 'No description'
      const inputLimit = model.inputTokenLimit || 'N/A'
      const outputLimit = model.outputTokenLimit || 'N/A'
      
      console.log(`\n📦 Model: ${name}`)
      console.log(`   Display Name: ${displayName}`)
      console.log(`   Description: ${description}`)
      console.log(`   Input Tokens: ${inputLimit.toLocaleString()}`)
      console.log(`   Output Tokens: ${outputLimit.toLocaleString()}`)
      console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ')}`)
      console.log('─'.repeat(80))
    })
    
    console.log(`\n\n💡 Recommended models for your app:`)
    console.log('   - gemini-2.0-flash-exp (fast, experimental, currently used)')
    console.log('   - gemini-1.5-pro (stable, production-ready)')
    console.log('   - gemini-1.5-flash (fast, cost-effective)')
    
    console.log(`\n\n📋 Copy this for GEMINI_MODEL in .env.local:`)
    const validModels = geminiModels
      .filter(m => m.name.includes('gemini-2.0-flash-exp') || m.name.includes('gemini-1.5'))
      .map(m => m.name.replace('models/', ''))
      .slice(0, 3)
    
    if (validModels.length > 0) {
      console.log(`   GEMINI_MODEL=${validModels[0]}`)
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch models:', error.message)
  }
}

listGeminiModels()
