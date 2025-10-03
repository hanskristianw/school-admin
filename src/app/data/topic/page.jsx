"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/ui/modal";
import NotificationModal from "@/components/ui/notification-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEdit, faTrash, faSpinner, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";

export default function TopicPage() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [kelasCache, setKelasCache] = useState(new Map()); // subject_id -> kelas[]
  const [kelasOptions, setKelasOptions] = useState([]); // current subject's kelas list
  const [kelasLoading, setKelasLoading] = useState(false);
  const [kelasNameMap, setKelasNameMap] = useState(new Map()); // kelas_id -> kelas_nama for display in list
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({ subject: "", search: "" });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // topic row or null
  const [formData, setFormData] = useState({
    topic_nama: "",
    topic_subject_id: "",
    topic_kelas_id: "",
    topic_planner: "",
    topic_global_context: "",
    topic_key_concept: "",
    topic_related_concept: "",
    topic_statement: "",
    topic_learner_profile: "",
    topic_service_learning: "",
    topic_formative_assessment: "",
    topic_summative_assessment: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState({ open: false, row: null });

  // Notifications
  const [notification, setNotification] = useState({ isOpen: false, title: "", message: "", type: "success" });
  const showNotification = (title, message, type = "success") => setNotification({ isOpen: true, title, message, type });

  // AI Help state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiRaw, setAiRaw] = useState('')
  const [aiItems, setAiItems] = useState([]) // parsed items 1., 2., 3.
  const [aiLang, setAiLang] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  // AI Global Context state
  const [gcOpen, setGcOpen] = useState(false)
  const [gcLoading, setGcLoading] = useState(false)
  const [gcError, setGcError] = useState('')
  const [gcItems, setGcItems] = useState([])
  const [gcRaw, setGcRaw] = useState('')
  const [gcPrompt, setGcPrompt] = useState('')
  const [gcLang, setGcLang] = useState('')

  // AI Key Concept state
  const [kcOpen, setKcOpen] = useState(false)
  const [kcLoading, setKcLoading] = useState(false)
  const [kcError, setKcError] = useState('')
  const [kcItems, setKcItems] = useState([])
  const [kcRaw, setKcRaw] = useState('')
  const [kcPrompt, setKcPrompt] = useState('')
  const [kcLang, setKcLang] = useState('')
  const [kcSelected, setKcSelected] = useState([])
  const [kcSelectError, setKcSelectError] = useState('')

  // AI Related Concept state
  const [rcOpen, setRcOpen] = useState(false)
  const [rcLoading, setRcLoading] = useState(false)
  const [rcError, setRcError] = useState('')
  const [rcItems, setRcItems] = useState([])
  const [rcRaw, setRcRaw] = useState('')
  const [rcPrompt, setRcPrompt] = useState('')
  const [rcLang, setRcLang] = useState('')

  // AI Statement of Inquiry state
  const [soOpen, setSoOpen] = useState(false)
  const [soLoading, setSoLoading] = useState(false)
  const [soError, setSoError] = useState('')
  const [soItems, setSoItems] = useState([])
  const [soRaw, setSoRaw] = useState('')
  const [soPrompt, setSoPrompt] = useState('')
  const [soLang, setSoLang] = useState('')
  // single-select now; no selection state needed
  const [rcSelected, setRcSelected] = useState([])
  const [rcSelectError, setRcSelectError] = useState('')

  // AI Learner Profile state
  const [lpOpen, setLpOpen] = useState(false)
  const [lpLoading, setLpLoading] = useState(false)
  const [lpError, setLpError] = useState('')
  const [lpItems, setLpItems] = useState([])
  const [lpRaw, setLpRaw] = useState('')
  const [lpPrompt, setLpPrompt] = useState('')
  const [lpLang, setLpLang] = useState('')
  const [lpSelected, setLpSelected] = useState([])
  const [lpSelectError, setLpSelectError] = useState('')

  // AI Service Learning state
  const [slOpen, setSlOpen] = useState(false)
  const [slLoading, setSlLoading] = useState(false)
  const [slError, setSlError] = useState('')
  const [slItems, setSlItems] = useState([])
  const [slRaw, setSlRaw] = useState('')
  const [slPrompt, setSlPrompt] = useState('')
  const [slLang, setSlLang] = useState('')
  const [slSelected, setSlSelected] = useState([])
  const [slSelectError, setSlSelectError] = useState('')

  // AI Formative Assessment state
  const [faOpen, setFaOpen] = useState(false)
  const [faLoading, setFaLoading] = useState(false)
  const [faError, setFaError] = useState('')
  const [faItems, setFaItems] = useState([])
  const [faRaw, setFaRaw] = useState('')
  const [faPrompt, setFaPrompt] = useState('')
  const [faLang, setFaLang] = useState('')
  const [faSelected, setFaSelected] = useState([])
  const [faSelectError, setFaSelectError] = useState('')
  const [faParsedMeta, setFaParsedMeta] = useState({ json: false, count: 0 })

  // AI Summative Assessment state
  const [saOpen, setSaOpen] = useState(false)
  const [saLoading, setSaLoading] = useState(false)
  const [saError, setSaError] = useState('')
  const [saItems, setSaItems] = useState([])
  const [saRaw, setSaRaw] = useState('')
  const [saPrompt, setSaPrompt] = useState('')
  const [saLang, setSaLang] = useState('')
  const [saSelected, setSaSelected] = useState([])
  const [saSelectError, setSaSelectError] = useState('')
  const [saCriteria, setSaCriteria] = useState([]) // [{A:bool,B:bool,C:bool,D:bool} per assessment]

  const parseAiOutput = (text) => {
    if (!text || typeof text !== 'string') return []
    const lines = text.split(/\r?\n/)
    const items = []
    let current = null
    const startRe = /^\s*(\d+)[\.)]\s+/
    lines.forEach((ln) => {
      const m = ln.match(startRe)
      if (m) {
        if (current) items.push(current)
        current = { index: parseInt(m[1], 10), text: ln.replace(startRe, '').trim() }
      } else if (current) {
        current.text += (current.text ? '\n' : '') + ln.trim()
      }
    })
    if (current) items.push(current)
    // Fallback: if no numbered items, return whole as single item
    return items.length ? items : [{ index: 1, text: text.trim() }]
  }

  // Try to parse JSON from a text that may include code fences or extra prose
  const tryParseJsonFromText = (text) => {
    if (!text || typeof text !== 'string') return null
    const raw = text.trim()
    // 1) Direct JSON
    try { return JSON.parse(raw) } catch (_) {}
    // 2) Code fence ```json ... ``` or ``` ... ```
    try {
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence && fence[1]) {
        const inner = fence[1].trim()
        return JSON.parse(inner)
      }
    } catch (_) {}
    // 3) Best-effort: substring between first { and last }
    try {
      const first = raw.indexOf('{')
      const last = raw.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) {
        const slice = raw.slice(first, last + 1)
        return JSON.parse(slice)
      }
    } catch (_) {}
    // 4) Targeted extraction: find JSON object containing "jawaban" using brace matching
    try {
      const keyIdx = raw.toLowerCase().indexOf('"jawaban"')
      if (keyIdx !== -1) {
        // find nearest '{' before keyIdx
        let start = keyIdx
        while (start >= 0 && raw[start] !== '{') start--
        if (start >= 0) {
          // walk forward with brace depth, respecting string quotes
          let i = start
          let depth = 0
          let inStr = false
          let esc = false
          for (; i < raw.length; i++) {
            const ch = raw[i]
            if (inStr) {
              if (esc) { esc = false } else if (ch === '\\') { esc = true } else if (ch === '"') { inStr = false }
            } else {
              if (ch === '"') inStr = true
              else if (ch === '{') depth++
              else if (ch === '}') { depth--; if (depth === 0) { const slice = raw.slice(start, i + 1); return JSON.parse(slice) } }
            }
          }
        }
      }
    } catch (_) {}
    return null
  }

  const stripBoldWrap = (s) => {
    if (typeof s !== 'string') return s
    let out = s.trim()
    if (out.startsWith('**') && out.endsWith('**') && out.length >= 4) {
      out = out.slice(2, -2).trim()
    }
    return out
  }

  const stripAllBoldMarkers = (s) => {
    if (typeof s !== 'string') return s
        return s.replace(/\*\*/g, '').replace(/__/g, '')
  }

  const extractFirstBoldWord = (text) => {
    if (!text) return ''
    const str = String(text)
    const m = str.match(/\*\*([^*]+)\*\*/)
    if (m && m[1]) {
      const inner = m[1].trim()
      const first = inner.split(/\s+/)[0] || ''
      return first.replace(/[.,;:!?\-—–]+$/g, '')
    }
    const firstLine = String(text).split(/\r?\n/)[0]
    const cleaned = stripBoldWrap(firstLine)
    const first = cleaned.split(/\s+/)[0] || ''
    return first.replace(/[.,;:!?\-—–]+$/g, '')
  }

  const csvEscape = (val) => {
    const s = (val == null ? '' : String(val))
    // Escape double quotes by doubling them; keep newlines
    return '"' + s.replace(/"/g, '""') + '"'
  }

  const exportCsv = (sep) => {
    const header = [
      'Unit Title',
      'Global Context',
      'Key Concept',
      'Related Concept',
      'Statement of Inquiry',
      'IB LP Attributes',
      'Service Learning',
      'Formative Assessment',
      'Summative Assessment'
    ]
    const rows = (filtered || []).map((row) => [
      row.topic_nama || '',
      row.topic_global_context || '',
      row.topic_key_concept || '',
      row.topic_related_concept || '',
      row.topic_statement || '',
      row.topic_learner_profile || '',
      row.topic_service_learning || '',
      row.topic_formative_assessment || '',
      row.topic_summative_assessment || ''
    ])
    const sepChar = sep === 'semicolon' ? ';' : ','
    const lines = [header, ...rows].map(cols => cols.map(csvEscape).join(sepChar)).join('\r\n')
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const ts = new Date().toISOString().slice(0,10)
    const a = document.createElement('a')
    a.href = url
    a.download = `topics_${sep === 'semicolon' ? 'semicolon' : 'comma'}_${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const openAiHelp = async (lang) => {
    if (!formData.topic_subject_id) {
      showNotification('Info', 'Pilih mata pelajaran terlebih dahulu sebelum meminta AI untuk Unit Title.', 'warning')
      return
    }
    if (!formData.topic_kelas_id) {
      showNotification('Info', 'Pilih kelas terlebih dahulu sebelum meminta AI untuk Unit Title.', 'warning')
      return
    }
    const unitSeed = (formData.topic_nama || '').trim()
    const wordCount = unitSeed ? unitSeed.split(/\s+/).filter(Boolean).length : 0
    if (wordCount < 1) {
      showNotification('Info', 'Isi dulu Unit Title minimal 1–2 kata sebelum meminta bantuan AI.', 'warning')
      return
    }
    setAiOpen(true)
    setAiLoading(true)
    setAiError('')
    setAiRaw('')
    setAiItems([])
    setAiLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_unit').limit(1).single()
      if (rErr) throw new Error(rErr.message)
  const context = rule?.ai_rule_unit || ''
      const bahasaMap = {
        en: 'Inggris',
        id: 'Indonesia',
        zh: 'Mandarin'
      }
      const selected = bahasaMap[lang] || 'Indonesia'
  const subj = subjects.find(s => String(s.subject_id) === String(formData.topic_subject_id))
  const subjName = subj?.subject_name || ''
  const kelasName = (kelasOptions.find(k => String(k.kelas_id) === String(formData.topic_kelas_id))?.kelas_nama) || (kelasNameMap.get(parseInt(formData.topic_kelas_id)) || '')
  const unitTitleCurrent = (formData.topic_nama || '').trim()
  const promptWithLang = `${context ? context + "\n\n" : ''}Subject: ${subjName}\nKelas: ${kelasName}\nUnit Title (current): ${unitTitleCurrent || '-' }\n\nBuatkan beberapa usulan Unit Title yang relevan. Mohon jawab dalam bahasa ${selected}.`
  setAiPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setAiRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          // Normalize both legacy (opsi/isi) and new (option/text) keys
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text)
      }
      setAiItems(items)
    } catch (e) {
      console.error('AI Help error', e)
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const insertToTitle = (txt) => {
    if (!txt) return
    // Use first line, keep it concise
    const firstLine = stripAllBoldMarkers(stripBoldWrap(String(txt).split(/\r?\n/)[0]))
    setFormData(prev => ({ ...prev, topic_nama: firstLine }))
    setAiOpen(false)
  }

  // removed copy-all per request

  // Open AI help for Global Context
  const openGcHelp = async (lang) => {
    if (!formData.topic_nama || !formData.topic_nama.trim()) {
      showNotification('Info', 'Isi dulu Unit Title sebelum meminta bantuan AI untuk Global Context.', 'warning')
      return
    }
    setGcOpen(true)
    setGcLoading(true)
    setGcError('')
    setGcItems([])
    setGcRaw('')
    setGcPrompt('')
    setGcLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_global_context').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      const context = rule?.ai_rule_global_context || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
      const promptWithLang = `${formData.topic_nama.trim()}\n\nBuat dalam bahasa ${selected}.`
      setGcPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setGcRaw(text)
      const parsed = tryParseJsonFromText(text)
      let items = []
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text).slice(0, 2)
      }
      setGcItems(items)
    } catch (e) {
      console.error('AI Global Context error', e)
      setGcError(e.message)
    } finally {
      setGcLoading(false)
    }
  }

  const useGlobalContext = (txt) => {
    if (!txt) return
    const first = stripAllBoldMarkers(stripBoldWrap(String(txt).split(/\r?\n/)[0]))
    setFormData(prev => ({ ...prev, topic_global_context: first }))
    setGcOpen(false)
  }

  // Open AI help for Key Concept (expects 2 options)
  const openKcHelp = async (lang) => {
    if (!formData.topic_nama || !formData.topic_nama.trim()) {
      showNotification('Info', 'Isi dulu Unit Title sebelum meminta bantuan AI untuk Key Concept.', 'warning')
      return
    }
    setKcOpen(true)
    setKcLoading(true)
    setKcError('')
    setKcItems([])
    setKcRaw('')
    setKcPrompt('')
    setKcLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_key_concept').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      const context = rule?.ai_rule_key_concept || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
      const unit = formData.topic_nama.trim()
      const gc = (formData.topic_global_context || '').trim()
      const promptWithLang = `${context ? context + "\n\n" : ''}Unit Title: ${unit}${gc ? `\nGlobal Context: ${gc}` : ''}\n\nBuat dalam bahasa ${selected}. Jawab HANYA dalam format JSON dengan schema: {"jawaban":[{"option":"...","text":"...","reason":"..."}]}`
      setKcPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setKcRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text)
      }
      setKcItems(items)
      setKcSelected(items.map(() => true))
      setKcSelectError('')
    } catch (e) {
      console.error('AI Key Concept error', e)
      setKcError(e.message)
    } finally {
      setKcLoading(false)
    }
  }

  const useKeyConcept = (txt) => {
    if (!txt) return
    const concept = extractFirstBoldWord(txt)
    setFormData(prev => ({ ...prev, topic_key_concept: concept }))
    setKcOpen(false)
  }

  const useKeyConceptOption = (opt) => {
    const val = stripAllBoldMarkers((opt || '').trim())
    if (!val) return
    setFormData(prev => ({ ...prev, topic_key_concept: val }))
    setKcOpen(false)
  }

  // single-select now; confirmKeyConceptSelection removed

  // Open AI help for Related Concept (expects 2 options)
  const openRcHelp = async (lang) => {
    const subjId = formData.topic_subject_id
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    if (!unit || !gc || !kc) {
      showNotification('Info', 'Isi Subject, Unit Title, Global Context, dan Key Concept sebelum meminta bantuan AI untuk Related Concept.', 'warning')
      return
    }
    const subjName = subjects.find(s => String(s.subject_id) === String(subjId))?.subject_name || ''
    setRcOpen(true)
    setRcLoading(true)
    setRcError('')
    setRcItems([])
    setRcRaw('')
    setRcPrompt('')
    setRcLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_related_concept').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      const context = rule?.ai_rule_related_concept || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
      const promptWithLang = `${context ? context + "\n\n" : ''}Subject: ${subjName}\nUnit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\n\nBuat dalam bahasa ${selected}.`
      setRcPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setRcRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text)
      }
      setRcItems(items)
      setRcSelected(items.map(() => true))
      setRcSelectError('')
    } catch (e) {
      console.error('AI Related Concept error', e)
      setRcError(e.message)
    } finally {
      setRcLoading(false)
    }
  }

  const useRelatedConcept = (txt) => {
    if (!txt) return
    const first = stripAllBoldMarkers(stripBoldWrap(String(txt).split(/\r?\n/)[0]))
    setFormData(prev => ({ ...prev, topic_related_concept: first }))
    setRcOpen(false)
  }

  // Open AI help for Learner Profile (expects 3 options)
  const openLpHelp = async (lang) => {
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    const rc = formData.topic_related_concept?.trim()
    if (!unit || !gc || !kc || !rc) {
      showNotification('Info', 'Isi Unit Title, Global Context, Key Concept, dan Related Concept sebelum meminta bantuan AI untuk Learner Profile.', 'warning')
      return
    }
    setLpOpen(true)
    setLpLoading(true)
    setLpError('')
    setLpItems([])
    setLpRaw('')
    setLpPrompt('')
    setLpLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_learner_profile').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      const context = rule?.ai_rule_learner_profile || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
      const promptWithLang = `${context ? context + "\n\n" : ''}Unit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\nRelated Concept: ${rc}\n\nBuat dalam bahasa ${selected}.`
      setLpPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setLpRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text).slice(0, 3)
      }
      setLpItems(items)
      setLpSelected(items.map(() => true))
      setLpSelectError('')
    } catch (e) {
      console.error('AI Learner Profile error', e)
      setLpError(e.message)
    } finally {
      setLpLoading(false)
    }
  }

  const confirmLearnerProfileSelection = () => {
    if (!lpItems || lpItems.length === 0) return
      const anyJson = lpItems.some(it => typeof it?.opsi === 'string' || typeof it?.isi === 'string')
      const selectedAttrs = lpItems
        .filter((_, idx) => lpSelected[idx])
        .map(it => anyJson ? (it?.opsi || '') : extractFirstBoldWord(it.text))
        .map(s => stripAllBoldMarkers((s || '').trim()))
        .filter(Boolean)
    if (selectedAttrs.length === 0) {
      setLpSelectError('Pilih minimal 1 opsi.')
      return
    }
    setFormData(prev => ({ ...prev, topic_learner_profile: selectedAttrs.join(', ') }))
    setLpOpen(false)
  }

  // Open AI help for Service Learning (expects 3 options)
  const openSlHelp = async (lang) => {
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    const rc = formData.topic_related_concept?.trim()
    if (!unit || !gc || !kc || !rc) {
      showNotification('Info', 'Isi Unit Title, Global Context, Key Concept, dan Related Concept sebelum meminta bantuan AI untuk Service Learning.', 'warning')
      return
    }
    setSlOpen(true)
    setSlLoading(true)
    setSlError('')
    setSlItems([])
    setSlRaw('')
    setSlPrompt('')
    setSlLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_service_learning').limit(1).single()
      if (rErr) throw new Error(rErr.message)
      const context = rule?.ai_rule_service_learning || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
      const promptWithLang = `Unit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\nRelated Concept: ${rc}\n\nBuatkan tepat 3 opsi rencana Service Learning yang relevan dan aplikatif. Buat dalam bahasa ${selected}.`
      setSlPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setSlRaw(text)
      const items = parseAiOutput(text).slice(0, 3)
      setSlItems(items)
      setSlSelected(items.map((_, i) => i === 0))
      setSlSelectError('')
    } catch (e) {
      console.error('AI Service Learning error', e)
      setSlError(e.message)
    } finally {
      setSlLoading(false)
    }
  }

  const confirmServiceLearningSelection = () => {
    if (!slItems || slItems.length === 0) return
    const idx = slSelected.findIndex(v => v)
    if (idx === -1) {
      setSlSelectError('Pilih salah satu opsi.')
      return
    }
    const chosen = String(slItems[idx].text || '').trim()
    const cleaned = stripAllBoldMarkers(stripBoldWrap(chosen))
    setFormData(prev => ({ ...prev, topic_service_learning: cleaned }))
    setSlOpen(false)
  }

  // Open AI help for Statement of Inquiry (expects 2 options)
  const openSoHelp = async (lang) => {
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    const rc = formData.topic_related_concept?.trim()
    if (!unit || !gc || !kc || !rc) {
      showNotification('Info', 'Isi Unit Title, Global Context, Key Concept, dan Related Concept sebelum meminta bantuan AI untuk Statement of Inquiry.', 'warning')
      return
    }
    setSoOpen(true)
    setSoLoading(true)
    setSoError('')
    setSoItems([])
    setSoRaw('')
    setSoPrompt('')
    setSoLang(lang || '')
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_statement').limit(1).single()
      if (rErr) throw new Error(rErr.message)
  const context = rule?.ai_rule_statement || ''
  const promptWithLang = `${context ? context + "\n\n" : ''}Unit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\nRelated Concept: ${rc}`
      setSoPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setSoRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text).slice(0, 3)
      }
      setSoItems(items)
    } catch (e) {
      console.error('AI Statement error', e)
      setSoError(e.message)
    } finally {
      setSoLoading(false)
    }
  }

  const useStatement = (txt) => {
    if (!txt) return
    const cleaned = stripBoldWrap(String(txt).trim())
    setFormData(prev => ({ ...prev, topic_statement: cleaned }))
    setSoOpen(false)
  }

  const useStatementOption = (optOrText, preferText = true) => {
    const val = stripAllBoldMarkers((optOrText || '').trim())
    if (!val) return
    setFormData(prev => ({ ...prev, topic_statement: val }))
    setSoOpen(false)
  }

  // confirmStatementSelection removed (single-select)

  const confirmRelatedConceptSelection = () => {
    if (!rcItems || rcItems.length === 0) return
    const anyJson = rcItems.some(it => typeof it?.opsi === 'string' || typeof it?.isi === 'string')
    const selectedConcepts = rcItems
      .filter((_, idx) => rcSelected[idx])
      .map(it => anyJson ? (it?.opsi || '') : extractFirstBoldWord(it.text))
      .map(s => stripAllBoldMarkers((s || '').trim()))
      .filter(Boolean)
    if (selectedConcepts.length === 0) {
      setRcSelectError('Pilih minimal 1 opsi.')
      return
    }
    setFormData(prev => ({ ...prev, topic_related_concept: selectedConcepts.join(', ') }))
    setRcOpen(false)
  }

  // Open AI help for Formative Assessment (expects 3 options, multi-select allowed)
  const openFaHelp = async (lang) => {
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    const rc = formData.topic_related_concept?.trim()
    if (!unit || !gc || !kc || !rc) {
      showNotification('Info', 'Isi Unit Title, Global Context, Key Concept, dan Related Concept sebelum meminta bantuan AI untuk Formative Assessment.', 'warning')
      return
    }
    setFaOpen(true)
    setFaLoading(true)
    setFaError('')
    setFaItems([])
    setFaRaw('')
    setFaPrompt('')
    setFaLang(lang || '')
  setFaParsedMeta({ json: false, count: 0 })
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_formative_assessment').limit(1).single()
      if (rErr) throw new Error(rErr.message)
  const context = rule?.ai_rule_formative_assessment || ''
  const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
  const selected = bahasaMap[lang] || 'Indonesia'
  const promptWithLang = `${context ? context + "\n\n" : ''}Unit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\nRelated Concept: ${rc}\n\nBuat dalam bahasa ${selected}.`
      setFaPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setFaRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.jawaban)) {
        items = parsed.jawaban.map((a, idx) => ({
          index: idx + 1,
          opsi: (a?.opsi ?? a?.option ?? '').toString().trim(),
          isi: (a?.isi ?? a?.text ?? '').toString().trim(),
          reason: (a?.reason ?? '').toString().trim(),
        }))
      } else {
        items = parseAiOutput(text).slice(0, 3)
      }
      setFaItems(items)
      setFaSelected(items.map(() => true))
      setFaSelectError('')
      setFaParsedMeta({ json: !!(parsed && Array.isArray(parsed.jawaban)), count: items.length })
    } catch (e) {
      console.error('AI Formative Assessment error', e)
      setFaError(e.message)
    } finally {
      setFaLoading(false)
    }
  }

  const confirmFormativeAssessmentSelection = () => {
    if (!faItems || faItems.length === 0) return
    const anyJson = faItems.some(it => typeof it?.opsi === 'string' || typeof it?.isi === 'string')
    const selectedItems = faItems
      .filter((_, idx) => faSelected[idx])
      .map(it => {
        if (anyJson) {
          const opt = stripAllBoldMarkers((it?.opsi || '').trim())
          const isi = stripAllBoldMarkers(stripBoldWrap((it?.isi || '').trim()))
          if (opt && isi) return `${opt} - ${isi}`
          return opt || isi
        } else {
          const raw = String(it.text || '')
          const opt = extractFirstBoldWord(raw)
          const cleaned = stripAllBoldMarkers(stripBoldWrap(raw.trim()))
          if (opt && cleaned) return `${opt} - ${cleaned}`
          return cleaned || opt
        }
      })
      .map(s => (s || '').trim())
      .filter(Boolean)
    if (selectedItems.length === 0) {
      setFaSelectError('Pilih minimal 1 opsi.')
      return
    }
    const joined = selectedItems.join('\n\n')
    setFormData(prev => ({ ...prev, topic_formative_assessment: joined }))
    setFaOpen(false)
  }

  // Open AI help for Summative Assessment (expects exactly 2 options, single-select)
  const openSaHelp = async (lang) => {
    const subjId = formData.topic_subject_id
    const unit = formData.topic_nama?.trim()
    const gc = formData.topic_global_context?.trim()
    const kc = formData.topic_key_concept?.trim()
    const rc = formData.topic_related_concept?.trim()
    if (!subjId || !unit || !gc || !kc || !rc) {
      showNotification('Info', 'Isi Subject, Unit Title, Global Context, Key Concept, dan Related Concept sebelum meminta bantuan AI untuk Summative Assessment.', 'warning')
      return
    }
    const subj = subjects.find(s => String(s.subject_id) === String(subjId))
    const subjName = subj?.subject_name || ''
    setSaOpen(true)
    setSaLoading(true)
    setSaError('')
    setSaItems([])
    setSaRaw('')
    setSaPrompt('')
    setSaLang(lang || '')
    setSaSelected([])
  setSaCriteria([])
    try {
      const { data: rule, error: rErr } = await supabase.from('ai_rule').select('ai_rule_summative_assessment').limit(1).single()
      if (rErr) throw new Error(rErr.message)
  const context = rule?.ai_rule_summative_assessment || ''
      const bahasaMap = { en: 'Inggris', id: 'Indonesia', zh: 'Mandarin' }
      const selected = bahasaMap[lang] || 'Indonesia'
  const promptWithLang = `${context ? context + "\n\n" : ''}Subject: ${subjName}\nUnit Title: ${unit}\nGlobal Context: ${gc}\nKey Concept: ${kc}\nRelated Concept: ${rc}\n\nBuat dalam bahasa ${selected}.`
      setSaPrompt(promptWithLang)
      const body = { prompt: promptWithLang, model: 'gemini-2.5-flash', context }
      const resp = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json?.error || 'Gagal memanggil AI')
      const text = json?.text || ''
      setSaRaw(text)
      let items = []
      const parsed = tryParseJsonFromText(text)
      if (parsed && Array.isArray(parsed.assessments)) {
        items = parsed.assessments.map((a, idx) => ({
          index: idx + 1,
          judul: (a?.judul ?? '').toString().trim(),
          criteria: typeof a?.criteria === 'object' && a?.criteria ? {
            ...a.criteria
          } : {}
        }))
        setSaItems(items)
        // default: select first assessment, no criteria preselected (user must pick)
        setSaSelected(items.map((_, i) => i === 0))
        setSaCriteria(items.map((it, i) => {
          const obj = {}
          Object.keys(it.criteria || {}).forEach(k => { obj[k] = false })
          return obj
        }))
      } else {
        items = parseAiOutput(text).slice(0, 2)
        setSaItems(items)
        setSaSelected(items.map((_, i) => i === 0))
      }
      setSaSelectError('')
    } catch (e) {
      console.error('AI Summative Assessment error', e)
      setSaError(e.message)
    } finally {
      setSaLoading(false)
    }
  }

  const confirmSummativeAssessmentSelection = () => {
    if (!saItems || saItems.length === 0) return
    const idx = saSelected.findIndex(v => v)
    if (idx === -1) {
      setSaSelectError('Pilih salah satu assessment.')
      return
    }
    const it = saItems[idx]
    const isJson = it && typeof it.judul === 'string' && it.criteria && typeof it.criteria === 'object'
    if (isJson) {
      const critSel = saCriteria[idx] || {}
      const picked = Object.entries(critSel).filter(([, v]) => !!v).map(([k]) => k)
      if (picked.length === 0) {
        setSaSelectError('Pilih minimal 1 criteria pada assessment terpilih.')
        return
      }
      const judul = stripAllBoldMarkers((it.judul || '').trim())
      const lines = [judul, ...picked.map(k => `${k}: ${stripAllBoldMarkers((it.criteria?.[k] || '').trim())}`)]
      setFormData(prev => ({ ...prev, topic_summative_assessment: lines.join('\n') }))
      setSaOpen(false)
    } else {
      const chosen = String(it.text || '').trim()
      const cleaned = stripAllBoldMarkers(stripBoldWrap(chosen))
      setFormData(prev => ({ ...prev, topic_summative_assessment: cleaned }))
      setSaOpen(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        // Get current user ID from localStorage (same pattern as teacher submission)
        const kr_id = typeof window !== 'undefined' ? localStorage.getItem("kr_id") : null;
        if (!kr_id) {
          setError(t('teacherSubmission.unauth') || t('common.errorLoading') || 'User tidak terautentikasi');
          setSubjects([]);
          setTopics([]);
          return;
        }
        const userId = parseInt(kr_id);
        setCurrentUserId(userId);

        // 1) Load only subjects taught by this user
        const { data: subj, error: sErr } = await supabase
          .from('subject')
          .select('subject_id, subject_name, subject_guide')
          .eq('subject_user_id', userId)
          .order('subject_name');
        if (sErr) throw new Error(sErr.message);

        setSubjects(subj || []);

        // 2) Load topics only for those subjects
        let tops = [];
        if (subj && subj.length > 0) {
          const subjectIds = subj.map(s => s.subject_id);
      const { data: tData, error: tErr } = await supabase
        .from('topic')
  .select('topic_id, topic_nama, topic_subject_id, topic_kelas_id, topic_planner, topic_global_context, topic_key_concept, topic_related_concept, topic_statement, topic_learner_profile, topic_service_learning, topic_formative_assessment, topic_summative_assessment')
            .in('topic_subject_id', subjectIds)
            .order('topic_nama');
          if (tErr) throw new Error(tErr.message);
          tops = tData || [];
          // Build kelas name map for existing topics
          await loadKelasNamesForTopics(tops);
        }
        setTopics(tops);
      } catch (e) {
        console.error(e);
        setError(t('topic.loadError') || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [t]);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.subject_id, s.subject_name])), [subjects]);

  const filtered = useMemo(() => {
    const gradeOf = (name) => {
      if (!name || typeof name !== 'string') return 9999;
      const m = name.match(/(\d{1,2})/); // extract first number from class name
      return m ? parseInt(m[1], 10) : 9999;
    };
    return topics
      .filter(
        (row) => (!filters.subject || String(row.topic_subject_id) === filters.subject) && (!filters.search || row.topic_nama.toLowerCase().includes(filters.search.toLowerCase()))
      )
      .slice()
      .sort((a, b) => {
        const aName = a.topic_kelas_id ? (kelasNameMap.get(a.topic_kelas_id) || '') : ''
        const bName = b.topic_kelas_id ? (kelasNameMap.get(b.topic_kelas_id) || '') : ''
        const ga = gradeOf(aName)
        const gb = gradeOf(bName)
        if (ga !== gb) return ga - gb
        // fallback: class name asc, then topic title asc
        const ncmp = (aName || '').localeCompare(bName || '')
        if (ncmp !== 0) return ncmp
        return (a.topic_nama || '').localeCompare(b.topic_nama || '')
      })
  }, [topics, filters, kelasNameMap]);

  const resetForm = () => {
    setEditing(null);
    setFormData({
      topic_nama: "",
      topic_subject_id: "",
      topic_kelas_id: "",
      topic_planner: "",
      topic_global_context: "",
      topic_key_concept: "",
      topic_related_concept: "",
      topic_statement: "",
      topic_learner_profile: "",
      topic_service_learning: "",
      topic_formative_assessment: "",
      topic_summative_assessment: ""
    });
    setFormErrors({});
    setKelasOptions([]);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      topic_nama: row.topic_nama || "",
      topic_subject_id: String(row.topic_subject_id || ""),
      topic_kelas_id: row.topic_kelas_id ? String(row.topic_kelas_id) : "",
      topic_planner: row.topic_planner || "",
      topic_global_context: row.topic_global_context || "",
      topic_key_concept: row.topic_key_concept || "",
      topic_related_concept: row.topic_related_concept || "",
      topic_statement: row.topic_statement || "",
      topic_learner_profile: row.topic_learner_profile || "",
      topic_service_learning: row.topic_service_learning || "",
      topic_formative_assessment: row.topic_formative_assessment || "",
      topic_summative_assessment: row.topic_summative_assessment || ""
    });
    setFormErrors({});
    setShowForm(true);
    if (row.topic_subject_id) {
      loadKelasForSubject(row.topic_subject_id);
    }
  };

  const validate = () => {
    const e = {};
    if (!formData.topic_nama.trim()) e.topic_nama = t("topic.validation.unitTitleRequired") || "Unit title wajib diisi";
    if (!formData.topic_subject_id) e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
    // kelas required: only if subject selected
    if (formData.topic_subject_id && !formData.topic_kelas_id) e.topic_kelas_id = t('topic.validation.classRequired') || 'Kelas wajib dipilih';
    // optional planner URL validation
    if (formData.topic_planner && formData.topic_planner.trim()) {
      try {
        const u = new URL(formData.topic_planner.trim());
        if (!/^https?:$/.test(u.protocol)) throw new Error('invalid');
      } catch {
        e.topic_planner = 'Link harus berupa URL yang valid (contoh: https://drive.google.com/...)';
      }
    }
    // Ensure selected subject belongs to current user list
    if (formData.topic_subject_id && !subjects.find(s => String(s.subject_id) === String(formData.topic_subject_id))) {
      e.topic_subject_id = t("topic.validation.subjectRequired") || "Mata pelajaran wajib dipilih";
    }
    // Ensure kelas belongs to subject's kelasOptions
    if (formData.topic_kelas_id && !kelasOptions.find(k => String(k.kelas_id) === String(formData.topic_kelas_id))) {
      e.topic_kelas_id = t('topic.validation.classRequired') || 'Kelas wajib dipilih';
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadKelasForSubject = async (subjectId) => {
    if (kelasCache.has(subjectId)) {
      setKelasOptions(kelasCache.get(subjectId));
      return;
    }
    try {
      setKelasLoading(true);
      // Find kelas via detail_kelas mapping
      const { data: dk, error: dkErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_kelas_id')
        .eq('detail_kelas_subject_id', subjectId);
      if (dkErr) throw new Error(dkErr.message);
      const kelasIds = Array.from(new Set((dk || []).map(d => d.detail_kelas_kelas_id).filter(Boolean)));
      let kelasList = [];
      if (kelasIds.length) {
        const { data: kData, error: kErr } = await supabase
          .from('kelas')
          .select('kelas_id, kelas_nama')
          .in('kelas_id', kelasIds)
          .order('kelas_nama');
        if (kErr) throw new Error(kErr.message);
        kelasList = kData || [];
      }
      setKelasOptions(kelasList);
      setKelasCache(prev => new Map(prev).set(subjectId, kelasList));
    } catch (err) {
      console.error('Failed loading kelas for subject', subjectId, err);
      setKelasOptions([]);
    } finally {
      setKelasLoading(false);
    }
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      const payload = {
        topic_nama: formData.topic_nama.trim(),
        topic_subject_id: parseInt(formData.topic_subject_id),
        topic_kelas_id: formData.topic_kelas_id ? parseInt(formData.topic_kelas_id) : null,
        topic_planner: formData.topic_planner?.trim() || null,
        topic_global_context: formData.topic_global_context?.trim() || null,
        topic_key_concept: formData.topic_key_concept?.trim() || null,
        topic_related_concept: formData.topic_related_concept?.trim() || null,
        topic_statement: formData.topic_statement?.trim() || null,
        topic_learner_profile: formData.topic_learner_profile?.trim() || null,
        topic_service_learning: formData.topic_service_learning?.trim() || null,
  topic_formative_assessment: formData.topic_formative_assessment?.trim() || null,
  topic_summative_assessment: formData.topic_summative_assessment?.trim() || null,
      };
      if (editing) {
  const { data, error: upErr } = await supabase.from("topic").update(payload).eq("topic_id", editing.topic_id).select();
        if (upErr) throw new Error(upErr.message);
        if (data && data[0]) {
          setTopics((prev) => prev.map((r) => (r.topic_id === editing.topic_id ? data[0] : r)));
          if (data[0].topic_kelas_id) await ensureKelasNameLoaded(data[0].topic_kelas_id);
        }
        showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifUpdated") || "Unit berhasil diupdate", "success");
      } else {
  const { data, error: insErr } = await supabase.from("topic").insert([payload]).select();
        if (insErr) throw new Error(insErr.message);
        if (data && data[0]) {
          setTopics((prev) => [data[0], ...prev]);
          if (data[0].topic_kelas_id) await ensureKelasNameLoaded(data[0].topic_kelas_id);
        }
        showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifCreated") || "Unit berhasil dibuat", "success");
      }
      setShowForm(false);
      resetForm();
    } catch (e) {
      console.error(e);
      showNotification(t("topic.notifErrorTitle") || "Error", (t("topic.notifErrorSave") || "Gagal menyimpan: ") + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Load kelas names for a list of topics
  const loadKelasNamesForTopics = async (topicsList) => {
    try {
      const ids = Array.from(new Set((topicsList || []).map(tp => tp.topic_kelas_id).filter(Boolean)));
      const missing = ids.filter(id => !kelasNameMap.has(id));
      if (!missing.length) return;
      const { data, error } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .in('kelas_id', missing);
      if (error) throw new Error(error.message);
      if (data) {
        setKelasNameMap(prev => {
          const map = new Map(prev);
            data.forEach(k => map.set(k.kelas_id, k.kelas_nama));
          return map;
        });
      }
    } catch (err) {
      console.warn('Failed loading kelas names for topics', err);
    }
  };

  const ensureKelasNameLoaded = async (kelasId) => {
    if (!kelasId || kelasNameMap.has(kelasId)) return;
    try {
      const { data, error } = await supabase
        .from('kelas')
        .select('kelas_id, kelas_nama')
        .eq('kelas_id', kelasId)
        .single();
      if (!error && data) {
        setKelasNameMap(prev => new Map(prev).set(data.kelas_id, data.kelas_nama));
      }
    } catch (e) {
      /* ignore */
    }
  };

  const onDelete = async () => {
    if (!confirmDelete.row) return;
    try {
      setSubmitting(true);
      const { error: delErr } = await supabase.from("topic").delete().eq("topic_id", confirmDelete.row.topic_id);
      if (delErr) throw new Error(delErr.message);
      setTopics((prev) => prev.filter((r) => r.topic_id !== confirmDelete.row.topic_id));
      showNotification(t("topic.notifSuccessTitle") || "Berhasil", t("topic.notifDeleted") || "Unit berhasil dihapus", "success");
      setConfirmDelete({ open: false, row: null });
    } catch (e) {
      console.error(e);
      showNotification(t("topic.notifErrorTitle") || "Error", (t("topic.notifErrorDelete") || "Gagal menghapus: ") + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">{t('topic.pageTitle') || 'Topics'}</div>
        <div className="flex gap-2">
          <Button onClick={() => exportCsv('comma')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Export CSV (,)
          </Button>
          <Button onClick={() => exportCsv('semicolon')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Export CSV (;)
          </Button>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {t("topic.new") || "Tambah Unit"}
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("topic.filtersTitle") || "Filter"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("topic.subject") || "Mata Pelajaran"}</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("topic.allSubjects") || "Semua Mata Pelajaran"}</option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("topic.search") || "Cari Unit"}</label>
              <Input
                placeholder={t("topic.searchPlaceholder") || "Ketik untuk mencari..."}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          {/* Subject guide link for selected subject */}
          {filters.subject && (() => {
            const s = subjects.find(x => String(x.subject_id) === String(filters.subject));
            const guide = s?.subject_guide?.trim();
            return guide ? (
              <div className="md:col-span-3 text-sm text-gray-700">
                <span className="text-gray-600 mr-2">Guide:</span>
                <a href={guide} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
              </div>
            ) : null;
          })()}
          {/* If 'All Subjects' selected, show guides for all subjects that have links */}
          {!filters.subject && subjects && subjects.length > 0 && (
            <div className="md:col-span-3 text-sm text-gray-700">
              <div className="text-gray-600 mb-1">Guides:</div>
              <ul className="list-disc ml-5 space-y-1">
                {subjects.map((s) => {
                  const g = s.subject_guide?.trim();
                  if (!g) return null;
                  return (
                    <li key={s.subject_id}>
                      <span className="text-gray-800">{s.subject_name}:</span>
                      <a href={g} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900 ml-2">Open</a>
                    </li>
                  );
                })}
                {subjects.every((s) => !s.subject_guide) && (
                  <li className="text-gray-400">-</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("topic.listTitle") || "Daftar Unit"}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t("topic.empty") || "Tidak ada data unit"}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thUnitTitle") || "Unit Title"}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thSubject") || "Mata Pelajaran"}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('topic.thClass') || 'Kelas'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Global Context</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key Concept</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Concept</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Learning</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formative Assessment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summative Assessment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("topic.thActions") || "Aksi"}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row) => (
                    <tr key={row.topic_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.topic_nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subjectMap.get(row.topic_subject_id) || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.topic_kelas_id ? (kelasNameMap.get(row.topic_kelas_id) || row.topic_kelas_id) : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.topic_planner ? (
                          <a href={row.topic_planner} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[16rem] truncate" title={row.topic_global_context || ''}>{row.topic_global_context || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={row.topic_key_concept || ''}>{row.topic_key_concept || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={row.topic_related_concept || ''}>{row.topic_related_concept || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[16rem] truncate" title={row.topic_statement || ''}>{row.topic_statement || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" title={row.topic_learner_profile || ''}>{row.topic_learner_profile || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[16rem] truncate" title={row.topic_service_learning || ''}>{row.topic_service_learning || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[16rem] truncate" title={row.topic_formative_assessment || ''}>{row.topic_formative_assessment || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[16rem] truncate" title={row.topic_summative_assessment || ''}>{row.topic_summative_assessment || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button onClick={() => openEdit(row)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-sm">
                            <FontAwesomeIcon icon={faEdit} className="mr-1" />
                            {t("topic.edit") || "Edit"}
                          </Button>
                          <Button onClick={() => setConfirmDelete({ open: true, row })} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm">
                            <FontAwesomeIcon icon={faTrash} className="mr-1" />
                            {t("topic.delete") || "Hapus"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? t("topic.editTitle") || "Edit Unit" : t("topic.createTitle") || "Tambah Unit"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="topic_subject_id">{t("topic.subject") || "Mata Pelajaran"}</Label>
            <select
              id="topic_subject_id"
              name="topic_subject_id"
              value={formData.topic_subject_id}
              onChange={(e) => {
                const v = e.target.value;
                setFormData(prev => ({ ...prev, topic_subject_id: v, topic_kelas_id: '' }));
                if (v) loadKelasForSubject(parseInt(v)); else { setKelasOptions([]); }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.topic_subject_id ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="">{t("topic.selectSubject") || "Pilih Mata Pelajaran"}</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_name}
                </option>
              ))}
            </select>
            {formErrors.topic_subject_id && <p className="text-red-500 text-sm mt-1">{formErrors.topic_subject_id}</p>}
            {/* Guide link for selected subject in form */}
            {formData.topic_subject_id && (() => {
              const s = subjects.find(x => String(x.subject_id) === String(formData.topic_subject_id));
              const guide = s?.subject_guide?.trim();
              return guide ? (
                <p className="text-sm mt-2">
                  <span className="text-gray-600 mr-1">Guide:</span>
                  <a href={guide} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">Open</a>
                </p>
              ) : null;
            })()}
          </div>
          <div>
            <Label htmlFor="topic_kelas_id">{t('topic.class') || 'Kelas'}</Label>
            <select
              id="topic_kelas_id"
              name="topic_kelas_id"
              value={formData.topic_kelas_id}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_kelas_id: e.target.value }))}
              disabled={!formData.topic_subject_id || kelasLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed disabled:focus:ring-0 ${formErrors.topic_kelas_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">{kelasLoading ? (t('topic.classLoading') || 'Memuat kelas...') : (t('topic.selectClass') || 'Pilih Kelas')}</option>
              {kelasOptions.map(k => (
                <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
              ))}
            </select>
            {formErrors.topic_kelas_id && <p className="text-red-500 text-sm mt-1">{formErrors.topic_kelas_id}</p>}
            {(!kelasLoading && formData.topic_subject_id && kelasOptions.length === 0) && (
              <p className="text-xs text-gray-500 mt-1">{t('topic.classNoneForSubject') || 'Tidak ada kelas untuk subject ini.'}</p>
            )}
          </div>
          <div>
            <Label htmlFor="topic_nama">{t("topic.unitTitle") || "Unit Title"}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openAiHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Help (EN)
              </button>
              <button type="button" onClick={() => openAiHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Help (ID)
              </button>
              <button type="button" onClick={() => openAiHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Help (ZH)
              </button>
            </div>
            <Input
              id="topic_nama"
              name="topic_nama"
              value={formData.topic_nama}
              onChange={(e) => setFormData((prev) => ({ ...prev, topic_nama: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.topic_nama ? 'border-red-500' : 'border-gray-300'}`}
            />
            {formErrors.topic_nama && <p className="text-red-500 text-sm mt-1">{formErrors.topic_nama}</p>}
          </div>
          {/* New fields: Global Context, Key Concept, Related Concept, Statement */}
          <div>
            <Label htmlFor="topic_global_context">Global Context</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openGcHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Context (EN)
              </button>
              <button type="button" onClick={() => openGcHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Context (ID)
              </button>
              <button type="button" onClick={() => openGcHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Context (ZH)
              </button>
            </div>
            <textarea
              id="topic_global_context"
              name="topic_global_context"
              className="w-full px-3 py-2 border rounded-md border-gray-300 min-h-[80px]"
              value={formData.topic_global_context}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_global_context: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="topic_key_concept">Key Concept</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openKcHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Key Concept (EN)
              </button>
              <button type="button" onClick={() => openKcHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Key Concept (ID)
              </button>
              <button type="button" onClick={() => openKcHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Key Concept (ZH)
              </button>
            </div>
            <Input
              id="topic_key_concept"
              name="topic_key_concept"
              value={formData.topic_key_concept}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_key_concept: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md border-gray-300"
            />
          </div>
          <div>
            <Label htmlFor="topic_related_concept">Related Concept</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openRcHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Related Concept (EN)
              </button>
              <button type="button" onClick={() => openRcHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Related Concept (ID)
              </button>
              <button type="button" onClick={() => openRcHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Related Concept (ZH)
              </button>
            </div>
            <Input
              id="topic_related_concept"
              name="topic_related_concept"
              value={formData.topic_related_concept}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_related_concept: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md border-gray-300"
            />
          </div>
          <div>
            <Label htmlFor="topic_statement">Statement of Inquiry</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openSoHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Statement (EN)
              </button>
              <button type="button" onClick={() => openSoHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Statement (ID)
              </button>
              <button type="button" onClick={() => openSoHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Statement (ZH)
              </button>
            </div>
            <textarea
              id="topic_statement"
              name="topic_statement"
              className="w-full px-3 py-2 border rounded-md border-gray-300 min-h-[80px]"
              value={formData.topic_statement}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_statement: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="topic_service_learning">Service Learning</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openSlHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Service Learning (EN)
              </button>
              <button type="button" onClick={() => openSlHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Service Learning (ID)
              </button>
              <button type="button" onClick={() => openSlHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Service Learning (ZH)
              </button>
            </div>
            <textarea
              id="topic_service_learning"
              name="topic_service_learning"
              className="w-full px-3 py-2 border rounded-md border-gray-300 min-h-[80px]"
              value={formData.topic_service_learning || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_service_learning: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="topic_learner_profile">Learner Profile</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openLpHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Learner Profile (EN)
              </button>
              <button type="button" onClick={() => openLpHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Learner Profile (ID)
              </button>
              <button type="button" onClick={() => openLpHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Learner Profile (ZH)
              </button>
            </div>
            <Input
              id="topic_learner_profile"
              name="topic_learner_profile"
              value={formData.topic_learner_profile || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_learner_profile: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md border-gray-300"
            />
          </div>
          <div>
            <Label htmlFor="topic_formative_assessment">Formative Assessment</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openFaHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Formative (EN)
              </button>
              <button type="button" onClick={() => openFaHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Formative (ID)
              </button>
              <button type="button" onClick={() => openFaHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Formative (ZH)
              </button>
            </div>
            <textarea
              id="topic_formative_assessment"
              name="topic_formative_assessment"
              className="w-full px-3 py-2 border rounded-md border-gray-300 min-h-[80px]"
              value={formData.topic_formative_assessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_formative_assessment: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="topic_summative_assessment">Summative Assessment</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => openSaHelp('en')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Summative (EN)
              </button>
              <button type="button" onClick={() => openSaHelp('id')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Summative (ID)
              </button>
              <button type="button" onClick={() => openSaHelp('zh')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100">
                <FontAwesomeIcon icon={faWandMagicSparkles} /> AI Summative (ZH)
              </button>
            </div>
            <textarea
              id="topic_summative_assessment"
              name="topic_summative_assessment"
              className="w-full px-3 py-2 border rounded-md border-gray-300 min-h-[80px]"
              value={formData.topic_summative_assessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, topic_summative_assessment: e.target.value }))}
            />
          </div>
            <div>
              <Label htmlFor="topic_planner">Planner (Google Drive URL)</Label>
              <Input
                id="topic_planner"
                name="topic_planner"
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.topic_planner}
                onChange={(e) => setFormData(prev => ({ ...prev, topic_planner: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md ${formErrors.topic_planner ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.topic_planner && <p className="text-red-500 text-sm mt-1">{formErrors.topic_planner}</p>}
            </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="bg-gray-500 hover:bg-gray-600 text-white">
              {t("topic.cancel") || "Batal"}
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t("topic.saving") || "Menyimpan..."}
                </>
              ) : editing ? (
                t("topic.save") || "Simpan"
              ) : (
                t("topic.create") || "Buat"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Formative Assessment Modal */}
      <Modal isOpen={faOpen} onClose={() => setFaOpen(false)} title={`AI Formative Assessment${faLang ? ` (${faLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {faLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Formative Assessment...</div>
          )}
          {faError && (
            <div className="text-sm text-red-600">{faError}</div>
          )}
          {!faLoading && !faError && faPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{faPrompt}</pre>
              <div className="mt-1 text-[10px] text-gray-500">Parsed: JSON {faParsedMeta?.json ? 'yes' : 'no'} ({faParsedMeta?.count || 0} items)</div>
            </div>
          )}
          {!faLoading && !faError && faItems && faItems.length > 0 && (
            <div className="space-y-2">
              {faItems.map((it, idx) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!faSelected[idx]} onChange={(e) => { const arr = [...faSelected]; arr[idx] = e.target.checked; setFaSelected(arr); setFaSelectError('') }} />
                        <span className="font-semibold">Opsi {it.index}</span>
                      </label>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
              {faSelectError && <div className="text-xs text-red-600">{faSelectError}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {!faLoading && !faError && faItems && faItems.length > 0 && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmFormativeAssessmentSelection}>Gunakan yang dipilih</Button>
            )}
            <Button type="button" onClick={() => setFaOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Service Learning Modal */}
      <Modal isOpen={slOpen} onClose={() => setSlOpen(false)} title={`AI Service Learning${slLang ? ` (${slLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {slLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Service Learning...</div>
          )}
          {slError && (
            <div className="text-sm text-red-600">{slError}</div>
          )}
          {!slLoading && !slError && slPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{slPrompt}</pre>
            </div>
          )}
          {!slLoading && !slError && slItems && slItems.length > 0 && (
            <div className="space-y-2">
              {slItems.map((it, idx) => (
                <div key={it.index} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={!!slSelected[idx]} onChange={(e) => {
                        const arr = slItems.map(() => false)
                        if (e.target.checked) arr[idx] = true
                        setSlSelected(arr)
                        setSlSelectError('')
                      }} />
                      <span className="font-semibold">Opsi {it.index}</span>
                    </label>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{stripAllBoldMarkers(it.text)}</pre>
                </div>
              ))}
              {slSelectError && <div className="text-xs text-red-600">{slSelectError}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {!slLoading && !slError && slItems && slItems.length > 0 && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmServiceLearningSelection}>Gunakan yang dipilih</Button>
            )}
            <Button type="button" onClick={() => setSlOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Statement of Inquiry Modal */}
      <Modal isOpen={soOpen} onClose={() => setSoOpen(false)} title={`AI Statement of Inquiry${soLang ? ` (${soLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {soLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Statement of Inquiry...</div>
          )}
          {soError && (
            <div className="text-sm text-red-600">{soError}</div>
          )}
          {!soLoading && !soError && soPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{soPrompt}</pre>
            </div>
          )}
          {!soLoading && !soError && soItems && soItems.length > 0 && (
            <div className="space-y-2">
              {soItems.map((it) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                const valueToUse = hasJson ? (it.isi || '') : (it.text || '')
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Opsi {it.index}</div>
                      <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-sm" onClick={() => useStatementOption(valueToUse)}>
                        Gunakan
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setSoOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Learner Profile Modal */}
      <Modal isOpen={lpOpen} onClose={() => setLpOpen(false)} title={`AI Learner Profile${lpLang ? ` (${lpLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {lpLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Learner Profile...</div>
          )}
          {lpError && (
            <div className="text-sm text-red-600">{lpError}</div>
          )}
          {!lpLoading && !lpError && lpPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{lpPrompt}</pre>
            </div>
          )}
          {!lpLoading && !lpError && lpItems && lpItems.length > 0 && (
            <div className="space-y-2">
              {lpItems.map((it, idx) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!lpSelected[idx]} onChange={(e) => { const arr = [...lpSelected]; arr[idx] = e.target.checked; setLpSelected(arr); setLpSelectError('') }} />
                        <span className="font-semibold">Opsi {it.index}</span>
                      </label>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
              {lpSelectError && <div className="text-xs text-red-600">{lpSelectError}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {!lpLoading && !lpError && lpItems && lpItems.length > 0 && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmLearnerProfileSelection}>Gunakan yang dipilih</Button>
            )}
            <Button type="button" onClick={() => setLpOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Summative Assessment Modal */}
      <Modal isOpen={saOpen} onClose={() => setSaOpen(false)} title={`AI Summative Assessment${saLang ? ` (${saLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {saLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Summative Assessment...</div>
          )}
          {saError && (
            <div className="text-sm text-red-600">{saError}</div>
          )}
          {!saLoading && !saError && saPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{saPrompt}</pre>
            </div>
          )}
          {!saLoading && !saError && saItems && saItems.length > 0 && (
            <div className="space-y-2">
              {saItems.map((it, idx) => {
                const isJson = typeof it?.judul === 'string' && it?.criteria && typeof it.criteria === 'object'
                if (isJson) {
                  const selected = !!saSelected[idx]
                  const criteriaObj = it.criteria || {}
                  const criteriaKeys = Object.keys(criteriaObj)
                  const critSel = saCriteria[idx] || {}
                  return (
                    <div key={it.index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={selected} onChange={(e) => {
                            const arr = saItems.map(() => false)
                            if (e.target.checked) arr[idx] = true
                            setSaSelected(arr)
                            setSaSelectError('')
                          }} />
                          <span className="font-semibold">Assessment {it.index}: {stripAllBoldMarkers(it.judul || '')}</span>
                        </label>
                      </div>
                      {criteriaKeys.length > 0 && (
                        <div className="ml-6 space-y-1">
                          <div className="text-xs text-gray-600">Pilih minimal 1 criteria:</div>
                          {criteriaKeys.map((ck) => (
                            <label key={ck} className="flex items-start gap-2 text-sm">
                              <input type="checkbox" checked={!!critSel[ck]} onChange={(e) => {
                                // Only allow interacting with criteria of selected assessment
                                if (!saSelected[idx]) {
                                  const arr = saItems.map(() => false)
                                  arr[idx] = true
                                  setSaSelected(arr)
                                }
                                setSaCriteria(prev => {
                                  const copy = [...prev]
                                  while (copy.length < saItems.length) copy.push({})
                                  copy[idx] = { ...(copy[idx] || {}) }
                                  copy[idx][ck] = e.target.checked
                                  return copy
                                })
                                setSaSelectError('')
                              }} />
                              <span><span className="font-semibold mr-1">{ck}.</span>{stripAllBoldMarkers(criteriaObj[ck] || '')}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
                // Fallback plain text preview
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!saSelected[idx]} onChange={(e) => {
                          const arr = saItems.map(() => false)
                          if (e.target.checked) arr[idx] = true
                          setSaSelected(arr)
                          setSaSelectError('')
                        }} />
                        <span className="font-semibold">Opsi {it.index}</span>
                      </label>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{stripAllBoldMarkers(it.text)}</pre>
                  </div>
                )
              })}
              {saSelectError && <div className="text-xs text-red-600">{saSelectError}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {!saLoading && !saError && saItems && saItems.length > 0 && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmSummativeAssessmentSelection}>Gunakan yang dipilih</Button>
            )}
            <Button type="button" onClick={() => setSaOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Related Concept Modal */}
      <Modal isOpen={rcOpen} onClose={() => setRcOpen(false)} title={`AI Related Concept${rcLang ? ` (${rcLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {rcLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Related Concept...</div>
          )}
          {rcError && (
            <div className="text-sm text-red-600">{rcError}</div>
          )}
          {!rcLoading && !rcError && rcPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{rcPrompt}</pre>
            </div>
          )}
          {!rcLoading && !rcError && rcItems && rcItems.length > 0 && (
            <div className="space-y-2">
              {rcItems.map((it, idx) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!rcSelected[idx]} onChange={(e) => { const arr = [...rcSelected]; arr[idx] = e.target.checked; setRcSelected(arr); setRcSelectError('') }} />
                        <span className="font-semibold">Opsi {it.index}</span>
                      </label>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
              {rcSelectError && <div className="text-xs text-red-600">{rcSelectError}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            {!rcLoading && !rcError && rcItems && rcItems.length > 0 && (
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmRelatedConceptSelection}>Gunakan yang dipilih</Button>
            )}
            <Button type="button" onClick={() => setRcOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Key Concept Modal */}
      <Modal isOpen={kcOpen} onClose={() => setKcOpen(false)} title={`AI Key Concept${kcLang ? ` (${kcLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {kcLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Key Concept...</div>
          )}
          {kcError && (
            <div className="text-sm text-red-600">{kcError}</div>
          )}
          {!kcLoading && !kcError && kcPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{kcPrompt}</pre>
            </div>
          )}
          {!kcLoading && !kcError && kcItems && kcItems.length > 0 && (
            <div className="space-y-2">
              {kcItems.map((it) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                const valueToUse = hasJson ? (it.opsi || '') : extractFirstBoldWord(it.text)
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Opsi {it.index}</div>
                      <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-sm" onClick={() => useKeyConceptOption(valueToUse)}>
                        Gunakan
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setKcOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Global Context Modal */}
  <Modal isOpen={gcOpen} onClose={() => setGcOpen(false)} title={`AI Global Context${gcLang ? ` (${gcLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {gcLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran Global Context...</div>
          )}
          {gcError && (
            <div className="text-sm text-red-600">{gcError}</div>
          )}
          {!gcLoading && !gcError && gcPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{gcPrompt}</pre>
            </div>
          )}
          {!gcLoading && !gcError && gcItems && gcItems.length > 0 && (
            <div className="space-y-2">
              {gcItems.map((it) => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                const valueToUse = hasJson ? (it.opsi || '') : (it.text || '')
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Opsi {it.index}</div>
                      <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-sm" onClick={() => useGlobalContext(valueToUse)}>
                        Gunakan
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setGcOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* AI Help Modal */}
  <Modal isOpen={aiOpen} onClose={() => setAiOpen(false)} title={`AI Help untuk Unit Title${aiLang ? ` (${aiLang.toUpperCase()})` : ''}`}>
        <div className="space-y-3">
          {aiLoading && (
            <div className="text-sm text-gray-600 flex items-center"><FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> Meminta saran dari AI...</div>
          )}
          {aiError && (
            <div className="text-sm text-red-600">{aiError}</div>
          )}
          {!aiLoading && !aiError && aiPrompt && (
            <div className="text-xs text-gray-600 bg-gray-50 border rounded p-2">
              <div className="font-semibold mb-1">Prompt dikirim:</div>
              <pre className="whitespace-pre-wrap">{aiPrompt}</pre>
            </div>
          )}
          {!aiLoading && !aiError && aiItems && aiItems.length > 0 && (
            <div className="space-y-2">
              {aiItems.map(it => {
                const hasJson = typeof it.isi === 'string' || typeof it.opsi === 'string'
                const preview = hasJson
                  ? stripAllBoldMarkers(`${it.opsi ? `${it.opsi}` : ''}${it.opsi ? `\n\n` : ''}${it.isi ? `${it.isi}` : ''}${it.reason ? `\n\n${it.reason}` : ''}`)
                  : stripAllBoldMarkers(it.text)
                const titleToUse = hasJson ? (it.isi || it.opsi || '') : (it.text || '')
                return (
                  <div key={it.index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">Usulan {it.index}</div>
                      <div className="flex gap-2">
                        <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-sm" onClick={() => insertToTitle(titleToUse)}>
                          Gunakan sebagai Judul
                        </Button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">{preview}</pre>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setAiOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, row: null })} title={t("topic.confirmTitleDelete") || "Konfirmasi Penghapusan"}>
        <div className="space-y-4">
          <p className="text-gray-700">{t("topic.confirmDeleteQuestion", { name: confirmDelete.row?.topic_nama || "" }) || `Hapus unit "${confirmDelete.row?.topic_nama || ""}"?`}</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button onClick={() => setConfirmDelete({ open: false, row: null })} className="bg-gray-500 hover:bg-gray-600 text-white">
              {t("topic.cancel") || "Batal"}
            </Button>
            <Button onClick={onDelete} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  {t("topic.processing") || "Memproses..."}
                </>
              ) : (
                t("topic.btnYesDelete") || "Ya, Hapus"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification */}
      <NotificationModal isOpen={notification.isOpen} onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))} title={notification.title} message={notification.message} type={notification.type} />
    </div>
  );
}
