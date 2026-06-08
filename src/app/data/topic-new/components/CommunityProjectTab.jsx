'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'

/**
 * Community Project Tab
 * - Skips planning; directly enters A/B/C/D grades + comment per student.
 * - Stores in assessment (semester=0) + assessment_grades + subject_comment (semester=0).
 * - Access: admin | principal | curriculum | teacher who owns the CP subject.
 */
export default function CommunityProjectTab({ currentUserId, isAdmin }) {
  const { theme } = useTheme()
  const { t } = useI18n()

  const [years,        setYears]        = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [cpDetailKelas, setCpDetailKelas] = useState([])
  const [selectedDK,    setSelectedDK]    = useState('')
  const [loading,       setLoading]       = useState(false)
  const [fetchError,    setFetchError]    = useState('')

  const [students,  setStudents]  = useState([])
  const [grades,    setGrades]    = useState({})
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')

  // ── Fetch academic years ───────────────────────────────────────────────
  useEffect(() => {
    supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false })
      .then(({ data }) => setYears(data || []))
  }, [])

  // ── Fetch CP detail_kelas combos ──────────────────────────────────────
  const fetchCpDetailKelas = useCallback(async () => {
    // Wait until we have userId (for non-admin) or just isAdmin flag
    if (!isAdmin && !currentUserId) return

    setLoading(true)
    setFetchError('')
    try {
      // 1. Get CP subjects accessible to this user
      let subjectQ = supabase
        .from('subject')
        .select('subject_id, subject_name, subject_user_id')
        .eq('is_community_project', true)
      if (!isAdmin) {
        subjectQ = subjectQ.eq('subject_user_id', currentUserId)
      }
      const { data: cpSubjects, error: subErr } = await subjectQ
      if (subErr) throw subErr

      if (!cpSubjects?.length) {
        setCpDetailKelas([])
        setFetchError('no_subjects')
        setLoading(false)
        return
      }

      const cpSubjectIds = cpSubjects.map(s => s.subject_id)

      // 2. Get detail_kelas for those subjects
      const { data: dkData, error: dkErr } = await supabase
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_kelas_id, detail_kelas_subject_id')
        .in('detail_kelas_subject_id', cpSubjectIds)
      if (dkErr) throw dkErr

      if (!dkData?.length) {
        setCpDetailKelas([])
        setFetchError('no_detail_kelas')
        setLoading(false)
        return
      }

      // 3. Fetch kelas names + year_id
      const kelasIds = [...new Set(dkData.map(d => d.detail_kelas_kelas_id))]
      const { data: kelasData } = await supabase
        .from('kelas').select('kelas_id, kelas_nama, kelas_year_id').in('kelas_id', kelasIds)
      const kelasMap = Object.fromEntries((kelasData || []).map(k => [k.kelas_id, k]))
      const subjectMap = Object.fromEntries(cpSubjects.map(s => [s.subject_id, s.subject_name]))

      const combined = dkData.map(dk => ({
        detail_kelas_id: dk.detail_kelas_id,
        kelas_id:        dk.detail_kelas_kelas_id,
        kelas_nama:      kelasMap[dk.detail_kelas_kelas_id]?.kelas_nama || '-',
        kelas_year_id:   kelasMap[dk.detail_kelas_kelas_id]?.kelas_year_id || null,
        subject_id:      dk.detail_kelas_subject_id,
        subject_name:    subjectMap[dk.detail_kelas_subject_id] || '-',
      })).sort((a, b) => a.kelas_nama.localeCompare(b.kelas_nama))

      setCpDetailKelas(combined)
      setFetchError('')
    } catch (e) {
      console.error('CP fetch error:', e)
      setFetchError('error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [currentUserId, isAdmin])

  useEffect(() => { fetchCpDetailKelas() }, [fetchCpDetailKelas])

  // ── Filter DK by selected year ─────────────────────────────────────────
  const filteredDK = selectedYear
    ? cpDetailKelas.filter(dk => String(dk.kelas_year_id) === String(selectedYear))
    : []

  // Reset class when year changes
  useEffect(() => { setSelectedDK(''); setStudents([]); setGrades({}) }, [selectedYear])

  // ── Load students + existing grades when kelas+subject selected ───────
  useEffect(() => {
    if (!selectedDK) { setStudents([]); setGrades({}); return }
    loadStudentsAndGrades(selectedDK)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDK])

  const loadStudentsAndGrades = async (dkId) => {
    const dk = cpDetailKelas.find(d => String(d.detail_kelas_id) === String(dkId))
    if (!dk) return
    setLoading(true)
    try {
      const { data: siswaData, error: sisErr } = await supabase
        .from('detail_siswa')
        .select('detail_siswa_id, detail_siswa_user_id, users:detail_siswa_user_id(user_nama_depan, user_nama_belakang)')
        .eq('detail_siswa_kelas_id', dk.kelas_id)
        .order('detail_siswa_id')
      if (sisErr) throw sisErr

      const studentList = (siswaData || []).map(s => ({
        detail_siswa_id: s.detail_siswa_id,
        user_id: s.detail_siswa_user_id,
        nama: `${s.users?.user_nama_depan || ''} ${s.users?.user_nama_belakang || ''}`.trim()
      }))
      setStudents(studentList)

      const gradeMap = {}
      studentList.forEach(s => { gradeMap[s.user_id] = { A: '', B: '', C: '', D: '', comment: '', cp_topic: '' } })

      // Load existing assessment (semester=0)
      const { data: asmData } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_detail_kelas_id', dkId)
        .eq('assessment_semester', 0)
        .maybeSingle()

      if (asmData?.assessment_id) {
        const { data: gradeData } = await supabase
          .from('assessment_grades')
          .select('detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade, cp_topic')
          .eq('assessment_id', asmData.assessment_id)

        const siswaIdToUserId = Object.fromEntries(studentList.map(s => [s.detail_siswa_id, s.user_id]))
        ;(gradeData || []).forEach(g => {
          const uid = siswaIdToUserId[g.detail_siswa_id]
          if (uid) gradeMap[uid] = {
            ...gradeMap[uid],
            A: g.criterion_a_grade ?? '',
            B: g.criterion_b_grade ?? '',
            C: g.criterion_c_grade ?? '',
            D: g.criterion_d_grade ?? '',
            cp_topic: g.cp_topic || '',
          }
        })

        const userIds = studentList.map(s => s.user_id)
        const { data: commentData } = await supabase
          .from('subject_comment')
          .select('student_user_id, comment_text')
          .eq('subject_id', dk.subject_id)
          .eq('kelas_id', dk.kelas_id)
          .eq('semester', 0)
          .in('student_user_id', userIds)
        ;(commentData || []).forEach(c => {
          if (gradeMap[c.student_user_id]) gradeMap[c.student_user_id].comment = c.comment_text || ''
        })
      }

      setGrades(gradeMap)
    } catch (e) {
      console.error('Load students error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleGradeChange = (userId, field, val) => {
    setGrades(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: val } }))
  }

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const dk = cpDetailKelas.find(d => String(d.detail_kelas_id) === String(selectedDK))
    if (!dk) return
    setSaving(true); setSaveMsg('')
    try {
      // 1. Get or create assessment (semester=0)
      let assessmentId
      const { data: existing, error: existErr } = await supabase
        .from('assessment')
        .select('assessment_id')
        .eq('assessment_detail_kelas_id', dk.detail_kelas_id)
        .eq('assessment_semester', 0)
        .maybeSingle()
      if (existErr) throw existErr

      if (existing?.assessment_id) {
        assessmentId = existing.assessment_id
      } else {
        const { data: newAsm, error: asmErr } = await supabase
          .from('assessment')
          .insert({
            assessment_nama: `Community Project — ${dk.kelas_nama}`,
            assessment_detail_kelas_id: dk.detail_kelas_id,
            assessment_semester: 0,
            assessment_status: 1,
            assessment_user_id: currentUserId,
            assessment_tanggal: new Date().toISOString().slice(0, 10),
          })
          .select('assessment_id')
          .single()
        if (asmErr) throw asmErr
        assessmentId = newAsm.assessment_id
      }

      const now = new Date().toISOString()

      for (const student of students) {
        const g = grades[student.user_id] || {}
        const aGrade = g.A !== '' ? Number(g.A) : null
        const bGrade = g.B !== '' ? Number(g.B) : null
        const cGrade = g.C !== '' ? Number(g.C) : null
        const dGrade = g.D !== '' ? Number(g.D) : null

        // 2. Save grades
        const { data: existingGrade, error: egErr } = await supabase
          .from('assessment_grades')
          .select('grade_id')
          .eq('assessment_id', assessmentId)
          .eq('detail_siswa_id', student.detail_siswa_id)
          .maybeSingle()
        if (egErr) throw egErr

        if (existingGrade?.grade_id) {
          const { error: ugErr } = await supabase.from('assessment_grades').update({
            criterion_a_grade: aGrade, criterion_b_grade: bGrade,
            criterion_c_grade: cGrade, criterion_d_grade: dGrade,
            cp_topic: (g.cp_topic || '').trim() || null,
          }).eq('grade_id', existingGrade.grade_id)
          if (ugErr) throw ugErr
        } else {
          const { error: igErr } = await supabase.from('assessment_grades').insert({
            assessment_id: assessmentId, detail_siswa_id: student.detail_siswa_id,
            criterion_a_grade: aGrade, criterion_b_grade: bGrade,
            criterion_c_grade: cGrade, criterion_d_grade: dGrade,
            cp_topic: (g.cp_topic || '').trim() || null,
          })
          if (igErr) throw igErr
        }

        // 3. Save comment
        const commentText = (g.comment || '').trim()
        const { data: existingComment, error: ecErr } = await supabase
          .from('subject_comment')
          .select('id')
          .eq('subject_id', parseInt(dk.subject_id))
          .eq('kelas_id', parseInt(dk.kelas_id))
          .eq('semester', 0)
          .eq('student_user_id', student.user_id)
          .maybeSingle()
        if (ecErr) throw ecErr

        if (existingComment?.id) {
          const { error: ucErr } = await supabase.from('subject_comment')
            .update({ comment_text: commentText, updated_at: now })
            .eq('id', existingComment.id)
          if (ucErr) throw ucErr
        } else if (commentText) {
          const { error: icErr } = await supabase.from('subject_comment').insert({
            subject_id: parseInt(dk.subject_id),
            kelas_id: parseInt(dk.kelas_id),
            semester: 0,
            student_user_id: student.user_id,
            comment_text: commentText,
            updated_at: now,
          })
          if (icErr) throw icErr
        }
      }

      setSaveMsg('Tersimpan ✓')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      console.error('Save error:', e)
      setSaveMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedDkObj = cpDetailKelas.find(d => String(d.detail_kelas_id) === String(selectedDK))

  // ── Empty states ──────────────────────────────────────────────────────
  if (loading && !cpDetailKelas.length) {
    return <div className="p-8 text-center text-sm" style={{ color: theme.textSecondary }}>Memuat data Community Project…</div>
  }

  if (fetchError === 'no_subjects') {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>Tidak ada subject Community Project yang tersedia.</p>
        <p className="text-xs" style={{ color: theme.textSecondary }}>
          Pastikan subject sudah dibuat di <strong>/data/subject</strong> dengan toggle <em>Community Project</em> diaktifkan.
        </p>
      </div>
    )
  }

  if (fetchError === 'no_detail_kelas') {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>Subject Community Project belum ditugaskan ke kelas manapun.</p>
        <p className="text-xs" style={{ color: theme.textSecondary }}>
          Buka <strong>/data/class</strong> → pilih kelas → tambahkan subject Community Project ke daftar mata pelajaran kelas tersebut.
        </p>
      </div>
    )
  }

  if (fetchError && fetchError.startsWith('error:')) {
    return <div className="p-8 text-center text-sm text-red-500">{fetchError}</div>
  }

  if (!loading && !cpDetailKelas.length) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>{t('topicNew.cp.noDetailKelas')}</p>
        <p className="text-xs" style={{ color: theme.textSecondary }}>{t('topicNew.cp.noDetailKelasHint')}</p>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: theme.textPrimary }}>{t('topicNew.cp.title')}</h2>
        <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>{t('topicNew.cp.description')}</p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* 1. Year selector */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>
            {t('topicNew.cp.selectYear')}
          </label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="text-sm rounded-md px-3 py-2 pr-8"
            style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, minWidth: 200 }}
          >
            <option value="">{t('topicNew.cp.selectYearPlaceholder')}</option>
            {years.map(y => (
              <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
            ))}
          </select>
        </div>

        {/* 2. Class + Subject selector (only shown after year selected) */}
        {selectedYear && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textSecondary }}>
              {t('topicNew.cp.selectClass')}
            </label>
            <select
              value={selectedDK}
              onChange={e => setSelectedDK(e.target.value)}
              className="text-sm rounded-md px-3 py-2 pr-8"
              style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, minWidth: 240 }}
            >
              <option value="">{t('topicNew.cp.selectClassPlaceholder')}</option>
              {filteredDK.length === 0
                ? <option disabled>{t('topicNew.cp.noClassesForYear')}</option>
                : filteredDK.map(dk => (
                  <option key={dk.detail_kelas_id} value={dk.detail_kelas_id}>
                    {dk.kelas_nama} · {dk.subject_name}
                  </option>
                ))
              }
            </select>
          </div>
        )}

        {selectedDkObj && students.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
            style={{ background: theme.textPrimary, color: theme.cardBg, opacity: saving ? 0.6 : 1 }}>
            {saving ? t('topicNew.cp.saving') : t('topicNew.cp.saveAll')}
          </button>
        )}
        {saveMsg && (
          <span className="text-sm font-medium" style={{ color: saveMsg.startsWith('Error') ? '#ef4444' : '#22c55e' }}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* Hint when no year selected */}
      {!selectedYear && (
        <p className="text-sm" style={{ color: theme.textSecondary }}>{t('topicNew.cp.selectYearFirst')}</p>
      )}

      {/* Student grade table */}
      {loading && <div className="text-sm text-center py-4" style={{ color: theme.textSecondary }}>{t('topicNew.cp.loadingStudents')}</div>}
      {!loading && selectedDK && students.length === 0 && (
        <div className="text-sm text-center py-4" style={{ color: theme.textSecondary }}>{t('topicNew.cp.noStudents')}</div>
      )}

      {!loading && students.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: theme.textSecondary, width: '25%' }}>{t('topicNew.cp.student')}</th>
                <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: theme.textSecondary, width: '25%' }}>{t('topicNew.cp.topic')}</th>
                {['A','B','C','D'].map(c => (
                  <th key={c} className="text-center py-2 px-2 font-semibold text-xs uppercase tracking-wider w-16" style={{ color: theme.textSecondary }}>{c}</th>
                ))}
                <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: theme.textSecondary }}>{t('topicNew.cp.comment')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const g = grades[student.user_id] || { A:'', B:'', C:'', D:'', comment:'', cp_topic:'' }
                return (
                  <tr key={student.user_id} style={{ borderBottom: `1px solid ${theme.border}`, background: idx % 2 === 0 ? 'transparent' : theme.subtleBg }}>
                    <td className="py-2 px-3 font-medium" style={{ color: theme.textPrimary }}>{student.nama}</td>
                    <td className="py-2 px-3">
                      <input type="text"
                        value={g.cp_topic || ''}
                        onChange={e => handleGradeChange(student.user_id, 'cp_topic', e.target.value)}
                        className="w-full rounded px-2 py-1 text-sm"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, minWidth: 160 }}
                        placeholder={t('topicNew.cp.topicPlaceholder')} />
                    </td>
                    {['A','B','C','D'].map(cr => (
                      <td key={cr} className="py-2 px-2 text-center">
                        <input type="number" min={0} max={8}
                          value={g[cr]}
                          onChange={e => handleGradeChange(student.user_id, cr, e.target.value)}
                          className="w-12 text-center rounded px-1 py-1 text-sm"
                          style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }}
                          placeholder="—" />
                      </td>
                    ))}
                    <td className="py-2 px-3">
                      <textarea rows={2} value={g.comment}
                        onChange={e => handleGradeChange(student.user_id, 'comment', e.target.value)}
                        className="w-full rounded px-2 py-1 text-sm resize-none"
                        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody, minWidth: 280 }}
                        placeholder={t('topicNew.cp.commentPlaceholder')} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && students.length > 5 && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
            style={{ background: theme.textPrimary, color: theme.cardBg, opacity: saving ? 0.6 : 1 }}>
            {saving ? t('topicNew.cp.saving') : t('topicNew.cp.saveAll')}
          </button>
          {saveMsg && (
            <span className="text-sm font-medium" style={{ color: saveMsg.startsWith('Error') ? '#ef4444' : '#22c55e' }}>
              {saveMsg}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
