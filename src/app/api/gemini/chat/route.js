import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { model: modelFromBody, history, message, context } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing GEMINI_API_KEY' }, { status: 500 })
    }
    const model = (typeof modelFromBody === 'string' && modelFromBody.trim()) || process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    // Convert history to Gemini format: array of {role, parts:[{text}]}
    const contents = []
    if (context && typeof context === 'string' && context.trim()) {
      contents.push({ role: 'user', parts: [{ text: `SYSTEM CONTEXT:\n${context}\n---\n` }] })
    }
    for (const m of Array.isArray(history) ? history : []) {
      if (m && typeof m.text === 'string') {
        contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] })

    const body = { contents }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      const err = await resp.text()
      return NextResponse.json({ error: 'Gemini error', detail: err }, { status: 502 })
    }
    const data = await resp.json()
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''
    return NextResponse.json({ text })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
