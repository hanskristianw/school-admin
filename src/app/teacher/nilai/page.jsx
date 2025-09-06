'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, setAuthToken, createSupabaseWithAuth } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'

export default function NilaiPage() {
  const router = useRouter()
  const { t } = useI18n()
  const db = useRef(supabase)

  // Access restriction: teacher only, no admin bypass
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_data')
      const user = raw ? JSON.parse(raw) : null
      const isTeacher = !!user?.isTeacher
      if (!isTeacher) {
        router.replace('/dashboard?forbidden=1')
      }
      const tok = localStorage.getItem('app_jwt')
      if (tok) {
        setAuthToken(tok)
        db.current = createSupabaseWithAuth(tok)
      } else {
        db.current = supabase
      }
    } catch {
      router.replace('/login')
    }
  }, [router])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [years, setYears] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [topics, setTopics] = useState([])

  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')

  const [students, setStudents] = useState([]) // { detail_siswa_id, user_id, nama }
  const [nilaiMap, setNilaiMap] = useState(new Map()) // detail_siswa_id -> 1..8
  const [saving, setSaving] = useState(false)

  // Load initial years and teacher subjects
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError('')
      try {
  const { data: yData, error: yErr } = await db.current.from('year').select('*').order('year_name')
        if (yErr) throw new Error(yErr.message)
        setYears(yData || [])

        const kr_id = typeof window !== 'undefined' ? Number(localStorage.getItem('kr_id')) : null
        if (!kr_id) throw new Error('Unauthorized')
  const { data: sData, error: sErr } = await db.current
          .from('subject')
          .select('subject_id, subject_name')
          .eq('subject_user_id', kr_id)
          .order('subject_name')
        if (sErr) throw new Error(sErr.message)
        setSubjects(sData || [])
      } catch (e) {
        console.error(e)
        setError(t('nilai.loadError') || 'Gagal memuat data')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [t])

  // When year and subject change, load classes taught by this subject for that year
  useEffect(() => {
    const loadClasses = async () => {
      setClasses([])
      setSelectedClass('')
      setTopics([])
      setSelectedTopic('')
      setStudents([])
      setNilaiMap(new Map())
      if (!selectedYear || !selectedSubject) return
      try {
        // detail_kelas for subject
  const { data: dkRows, error: dkErr } = await db.current
          .from('detail_kelas')
          .select('detail_kelas_kelas_id')
          .eq('detail_kelas_subject_id', Number(selectedSubject))
        if (dkErr) throw new Error(dkErr.message)
        const kelasIds = [...new Set((dkRows || []).map(r => r.detail_kelas_kelas_id))]
        if (kelasIds.length === 0) { setClasses([]); return }
  const { data: kRows, error: kErr } = await db.current
          .from('kelas')
          .select('kelas_id, kelas_nama, kelas_year_id')
          .in('kelas_id', kelasIds)
          .eq('kelas_year_id', Number(selectedYear))
          .order('kelas_nama')
        if (kErr) throw new Error(kErr.message)
        setClasses(kRows || [])
      } catch (e) {
        console.error(e)
        setError(t('nilai.loadError') || 'Gagal memuat data')
      }
    }
    loadClasses()
  }, [selectedYear, selectedSubject, t])

  // When subject/class change, load topics (subject + optional class)
  useEffect(() => {
    const loadTopics = async () => {
      setTopics([])
      setSelectedTopic('')
      setStudents([])
      setNilaiMap(new Map())
      if (!selectedSubject || !selectedClass) return
      try {
  const { data: tRows, error: tErr } = await db.current
          .from('topic')
          .select('topic_id, topic_nama, topic_subject_id, topic_kelas_id')
          .eq('topic_subject_id', Number(selectedSubject))
          .or(`topic_kelas_id.is.null,topic_kelas_id.eq.${Number(selectedClass)}`)
          .order('topic_nama')
        if (tErr) throw new Error(tErr.message)
        setTopics(tRows || [])
      } catch (e) {
        console.error(e)
        setError(t('nilai.loadError') || 'Gagal memuat data')
      }
    }
    loadTopics()
  }, [selectedSubject, selectedClass, t])

  // When class selected, load students and names
  useEffect(() => {
    const loadStudents = async () => {
      setStudents([])
      setNilaiMap(new Map())
      if (!selectedClass) return
      try {
        // get detail_siswa rows for class
  const { data: dsRows, error: dsErr } = await db.current
          .from('detail_siswa')
          .select('detail_siswa_id, detail_siswa_user_id')
          .eq('detail_siswa_kelas_id', Number(selectedClass))
        if (dsErr) throw new Error(dsErr.message)
        const userIds = [...new Set((dsRows || []).map(r => r.detail_siswa_user_id).filter(Boolean))]
        let nameMap = new Map()
        if (userIds.length) {
          const { data: uRows, error: uErr } = await db.current
            .from('users')
            .select('user_id, user_nama_depan, user_nama_belakang')
            .in('user_id', userIds)
          if (uErr) throw new Error(uErr.message)
          nameMap = new Map((uRows || []).map(u => [u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim() || `User ${u.user_id}`]))
        }
        const list = (dsRows || []).map(d => ({ detail_siswa_id: d.detail_siswa_id, user_id: d.detail_siswa_user_id, nama: nameMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}` }))
        // sort by name
        list.sort((a,b) => (a.nama||'').localeCompare(b.nama||''))
        setStudents(list)
      } catch (e) {
        console.error(e)
        setError(t('nilai.loadError') || 'Gagal memuat data')
      }
    }
    loadStudents()
  }, [selectedClass, t])

  // When topic chosen, load existing grades for these students
  useEffect(() => {
    const loadNilai = async () => {
      setNilaiMap(new Map())
      if (!selectedTopic || students.length === 0) return
      try {
        const detailIds = students.map(s => s.detail_siswa_id)
  const { data: nRows, error: nErr } = await db.current
          .from('nilai')
          .select('nilai_detail_siswa_id, nilai_value')
          .eq('nilai_topic_id', Number(selectedTopic))
          .in('nilai_detail_siswa_id', detailIds)
        if (nErr) throw new Error(nErr.message)
        const map = new Map()
        ;(nRows || []).forEach(r => map.set(r.nilai_detail_siswa_id, r.nilai_value))
        setNilaiMap(map)
      } catch (e) {
        console.error(e)
        setError(t('nilai.loadError') || 'Gagal memuat data')
      }
    }
    loadNilai()
  }, [selectedTopic, students, t])

  const setNilaiFor = (detailId, value) => {
    setNilaiMap(prev => new Map(prev).set(detailId, value))
  }

  const validateValue = (v) => {
    if (v === '' || v === null || v === undefined) return true
    const n = Number(v)
    return Number.isInteger(n) && n >= 1 && n <= 8
  }

  const saveAll = async () => {
    if (!selectedTopic) return
    // Build rows where value present and valid
    const rows = students
      .map(s => ({ detail_siswa_id: s.detail_siswa_id, value: nilaiMap.get(s.detail_siswa_id) }))
      .filter(r => r.value !== undefined && r.value !== '' && validateValue(r.value))
    const invalid = students
      .map(s => ({ detail_siswa_id: s.detail_siswa_id, value: nilaiMap.get(s.detail_siswa_id) }))
      .filter(r => r.value !== undefined && r.value !== '' && !validateValue(r.value))
    if (invalid.length) {
      alert(t('nilai.invalidValue') || 'Nilai harus angka 1-8')
      return
    }
    const kr_id = typeof window !== 'undefined' ? Number(localStorage.getItem('kr_id')) : null
    if (!kr_id) { alert('Unauthorized'); return }
    setSaving(true)
    try {
      if (rows.length === 0) {
        alert(t('nilai.nothingToSave') || 'Tidak ada nilai yang disimpan')
        return
      }
      const payload = rows.map(r => ({ nilai_topic_id: Number(selectedTopic), nilai_detail_siswa_id: r.detail_siswa_id, nilai_value: Number(r.value), created_by_user_id: kr_id }))
  const { error } = await db.current
        .from('nilai')
        .upsert(payload, { onConflict: 'nilai_topic_id,nilai_detail_siswa_id' })
      if (error) throw new Error(error.message)
      alert(t('nilai.saved') || 'Tersimpan')
    } catch (e) {
      console.error(e)
      alert((t('nilai.saveErrorPrefix') || 'Gagal menyimpan: ') + e.message)
    } finally {
      setSaving(false)
    }
  }

  const removeNilai = async (detailId) => {
    if (!selectedTopic) return
    try {
  const { error } = await db.current
        .from('nilai')
        .delete()
        .eq('nilai_topic_id', Number(selectedTopic))
        .eq('nilai_detail_siswa_id', Number(detailId))
      if (error) throw new Error(error.message)
      setNilaiMap(prev => { const m = new Map(prev); m.delete(detailId); return m })
    } catch (e) {
      console.error(e)
      alert((t('nilai.deleteErrorPrefix') || 'Gagal menghapus: ') + e.message)
    }
  }

  const exportCSV = () => {
    const header = 'nama,nilai'
    const lines = students.map(s => {
      const name = (s.nama || '').replaceAll('"', '""')
      const val = nilaiMap.get(s.detail_siswa_id) ?? ''
      return `"${name}",${val}`
    })
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nilai_topic_${selectedTopic || 'unknown'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canProceed = selectedYear && selectedSubject && selectedClass && selectedTopic

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('nilai.title') || 'Input Nilai'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="year">{t('nilai.year') || 'Tahun'}</Label>
              <select id="year" className="w-full border rounded px-3 py-2" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>
                <option value="">{t('nilai.selectYear') || 'Pilih Tahun'}</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subject">{t('nilai.subject') || 'Mata Pelajaran'}</Label>
              <select id="subject" className="w-full border rounded px-3 py-2" value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} disabled={!selectedYear || loading}>
                <option value="">{t('nilai.selectSubject') || 'Pilih Mata Pelajaran'}</option>
                {subjects.map(s => (
                  <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="class">{t('nilai.class') || 'Kelas'}</Label>
              <select id="class" className="w-full border rounded px-3 py-2" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} disabled={!selectedSubject}>
                <option value="">{t('nilai.selectClass') || 'Pilih Kelas'}</option>
                {classes.map(k => (
                  <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="topic">{t('nilai.topic') || 'Topik'}</Label>
              <select id="topic" className="w-full border rounded px-3 py-2" value={selectedTopic} onChange={e=>setSelectedTopic(e.target.value)} disabled={!selectedClass}>
                <option value="">{t('nilai.selectTopic') || 'Pilih Topik'}</option>
                {topics.map(tp => (
                  <option key={tp.topic_id} value={tp.topic_id}>{tp.topic_nama}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('nilai.batchTitle') || 'Entri Nilai Siswa'}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportCSV} disabled={!canProceed}>{t('nilai.exportCsv') || 'Export CSV'}</Button>
              <Button onClick={saveAll} disabled={!canProceed || saving}>{saving ? (t('nilai.saving') || 'Menyimpan...') : (t('nilai.saveAll') || 'Simpan Semua')}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!canProceed ? (
            <p className="text-sm text-gray-600">{t('nilai.selectFiltersHint') || 'Pilih Tahun, Mapel, Kelas, dan Topik terlebih dahulu.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nilai.thStudent') || 'Siswa'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nilai.thScore') || 'Nilai (1-8)'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('nilai.thActions') || 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((s) => {
                    const v = nilaiMap.get(s.detail_siswa_id) ?? ''
                    const valid = validateValue(v)
                    return (
                      <tr key={s.detail_siswa_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.nama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            min={1}
                            max={8}
                            className={`w-24 border rounded px-2 py-1 ${!valid && v!=='' ? 'border-red-500' : 'border-gray-300'}`}
                            value={v}
                            onChange={(e)=>{
                              const val = e.target.value === '' ? '' : Number(e.target.value)
                              setNilaiFor(s.detail_siswa_id, val)
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-red-600 hover:underline" onClick={()=>removeNilai(s.detail_siswa_id)} disabled={!nilaiMap.has(s.detail_siswa_id)}>
                            {t('nilai.delete') || 'Hapus'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
