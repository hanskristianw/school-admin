import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
  const { prompt, model: modelFromBody, context } = await req.json()
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 })
    }
  // Call Gemini (Google Generative Language API)
  // Use model from env or request body
  const model = (typeof modelFromBody === 'string' && modelFromBody.trim()) || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const parts = []
    if (context && typeof context === 'string' && context.trim()) {
      parts.push({ text: `SYSTEM CONTEXT:\n${context}\n---\n` })
    }
    parts.push({ text: prompt })
    const body = { contents: [{ parts }] }
    
    console.log('Calling Gemini API with model:', model)
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    console.log('Gemini API response status:', resp.status)
    
    if (!resp.ok) {
      const err = await resp.text()
      console.error('Gemini API error:', err)
      return NextResponse.json({ error: 'Gemini error', detail: err }, { status: 502 })
    }
    
    const data = await resp.json()
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''
    
    console.log('Gemini API response length:', text.length)
    
    return NextResponse.json({ text })
  } catch (e) {
    console.error('Gemini API exception:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
