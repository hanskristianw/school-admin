"use client"

import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function GeminiChatPage() {
  const modelsFromEnv = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_GEMINI_MODELS || ''
    return raw.split(',').map(s=>s.trim()).filter(Boolean)
  }, [])
  const fallbackModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash']
  const models = modelsFromEnv.length ? modelsFromEnv : fallbackModels
  const [model, setModel] = useState(models[0] || 'gemini-1.5-flash')
  const [context, setContext] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([]) // {role:'user'|'model', text}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const send = async () => {
    const content = input.trim()
    if (!content) return
    setMessages(prev => [...prev, { role: 'user', text: content }])
    setInput(''); setLoading(true); setError('')
    try {
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          history: messages,
          message: content,
          context
        })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Request failed')
      setMessages(prev => [...prev, { role: 'model', text: data.text || '' }])
      // naive suggestions: split lines starting with '-' or '•'
      const lines = String(data.text || '').split(/\r?\n/)
      const sug = lines.filter(l => /^[-•]\s+/.test(l)).map(l => l.replace(/^[-•]\s+/, '').trim()).slice(0, 5)
      setSuggestions(sug)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Gemini Chat</h1>
      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
          <div>
            <Label>Model</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={model} onChange={e=>setModel(e.target.value)}>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Knowledge (opsional)</Label>
            <textarea className="mt-1 w-full border rounded p-2 min-h-[80px]" value={context} onChange={e=>setContext(e.target.value)} placeholder="Tambahkan konteks proyek/aturan jawaban agar hasil relevan" />
          </div>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-auto border rounded p-3 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={m.role === 'user' ? 'inline-block bg-blue-600 text-white px-3 py-2 rounded-lg' : 'inline-block bg-white border px-3 py-2 rounded-lg'}>
                {m.text}
              </div>
            </div>
          ))}
          {!messages.length && <div className="text-sm text-gray-500">Mulai percakapan…</div>}
        </div>

        <div className="flex gap-2">
          <Input placeholder="Ketik pesan…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <Button onClick={send} disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">{loading ? 'Mengirim…' : 'Kirim'}</Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!!suggestions.length && (
          <div className="pt-4">
            <h3 className="font-semibold mb-2">Saran Topik</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button key={i} className="text-sm px-3 py-1 rounded-full border hover:bg-gray-100" onClick={()=> setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
