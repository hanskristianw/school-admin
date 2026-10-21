import { NextResponse } from 'next/server'
import { getVertexModel } from '@/lib/vertexClient'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gemini
 * Body: { prompt: string, model?: string, context?: string }
 * Returns: { text: string }
 */
export async function POST(req) {
  try {
    const { prompt, context, model } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
    }

    const genModel = getVertexModel(model)

    // Build contents — inject optional system context as a user/model pair
    const contents = []
    if (context && typeof context === 'string' && context.trim()) {
      contents.push({ role: 'user',  parts: [{ text: `SYSTEM CONTEXT:\n${context}\n---\n` }] })
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow the system context above.' }] })
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] })

    console.log('[Gemini /api/gemini] Generating content, prompt length:', prompt.length)

    const result = await genModel.generateContent({ contents })
    const text   = result.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || ''

    console.log('[Gemini /api/gemini] Response length:', text.length)

    return NextResponse.json({ text })
  } catch (e) {
    console.error('[Gemini /api/gemini] Error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Gemini request failed' }, { status: 500 })
  }
}
