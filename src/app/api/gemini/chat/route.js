import { NextResponse } from 'next/server'
import { getVertexModel } from '@/lib/vertexClient'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gemini/chat
 * Body: { message: string, history?: Array<{ role: 'user'|'model', text: string }>, context?: string }
 * Returns: { text: string }
 */
export async function POST(req) {
  try {
    const { history, message, context } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    const genModel = getVertexModel()

    // Build contents from optional system context + conversation history + current message
    const contents = []

    if (context && typeof context === 'string' && context.trim()) {
      contents.push({ role: 'user',  parts: [{ text: `SYSTEM CONTEXT:\n${context}\n---\n` }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow the system context above.' }] })
    }

    for (const m of Array.isArray(history) ? history : []) {
      if (m && typeof m.text === 'string') {
        contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] })

    console.log('[Vertex AI /api/gemini/chat] Generating, turns:', contents.length)

    const result = await genModel.generateContent({ contents })
    const text   = result.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''

    console.log('[Vertex AI /api/gemini/chat] Response length:', text.length)

    return NextResponse.json({ text })
  } catch (e) {
    console.error('[Vertex AI /api/gemini/chat] Error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Vertex AI request failed' }, { status: 500 })
  }
}
