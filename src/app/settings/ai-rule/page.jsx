"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AiRuleSettingsPage() {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let { data, error } = await supabase.from('ai_rule').select('*').order('ai_rule_id').limit(1)
      if (error) throw error
      if (!data || data.length === 0) {
        const { data: ins, error: insErr } = await supabase.from('ai_rule').insert([{ 
          ai_rule_unit: '',
          ai_rule_global_context: '',
          ai_rule_key_concept: '',
          ai_rule_related_concept: '',
          ai_rule_statement: '',
          ai_rule_learner_profile: '',
          ai_rule_service_learning: '',
          ai_rule_formative_assessment: '',
          ai_rule_summative_assessment: '',
          ai_rule_inquiry_question: ''
        }]).select('*').single()
        if (insErr) throw insErr
        setRow(ins)
      } else {
        setRow(data[0])
      }
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!row) return
    setSaving(true)
    setError('')
    try {
      const payload = { 
        ai_rule_unit: row.ai_rule_unit,
        ai_rule_global_context: row.ai_rule_global_context || '',
        ai_rule_key_concept: row.ai_rule_key_concept || '',
        ai_rule_related_concept: row.ai_rule_related_concept || '',
        ai_rule_statement: row.ai_rule_statement || '',
        ai_rule_learner_profile: row.ai_rule_learner_profile || '',
        ai_rule_service_learning: row.ai_rule_service_learning || '',
        ai_rule_formative_assessment: row.ai_rule_formative_assessment || '',
        ai_rule_summative_assessment: row.ai_rule_summative_assessment || '',
        ai_rule_inquiry_question: row.ai_rule_inquiry_question || '',
        updated_at: new Date().toISOString() 
      }
      const { error } = await supabase.from('ai_rule').update(payload).eq('ai_rule_id', row.ai_rule_id)
      if (error) throw error
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI Rule</h1>
      <Card className="p-4 space-y-4">
        <div className="text-sm text-gray-600">Atur rule untuk masing-masing halaman. Hanya 1 baris yang disimpan.</div>
        {loading && <div className="text-sm text-gray-500">Memuat...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!!row && (
          <div className="grid gap-4">
            <div>
              <Label>Rule untuk Unit</Label>
              <Input
                value={row.ai_rule_unit || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_unit: e.target.value }))}
              />
            </div>
            <div>
              <Label>Global Context</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_global_context || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_global_context: e.target.value }))}
              />
            </div>
            <div>
              <Label>Key Concept</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_key_concept || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_key_concept: e.target.value }))}
              />
            </div>
            <div>
              <Label>Related Concept</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_related_concept || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_related_concept: e.target.value }))}
              />
            </div>
            <div>
              <Label>Statement of Inquiry</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_statement || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_statement: e.target.value }))}
              />
            </div>
            <div>
              <Label>Learner Profile</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_learner_profile || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_learner_profile: e.target.value }))}
              />
            </div>
            <div>
              <Label>Service Learning</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_service_learning || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_service_learning: e.target.value }))}
              />
            </div>
            <div>
              <Label>Formative Assessment</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_formative_assessment || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_formative_assessment: e.target.value }))}
              />
            </div>
            <div>
              <Label>Summative Assessment</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_summative_assessment || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_summative_assessment: e.target.value }))}
              />
            </div>
            <div>
              <Label>Inquiry Question</Label>
              <textarea
                className="mt-1 w-full border rounded p-2 min-h-[200px]"
                value={row.ai_rule_inquiry_question || ''}
                onChange={e => setRow(r => ({ ...r, ai_rule_inquiry_question: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={load} disabled={loading || saving}>Refresh</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
