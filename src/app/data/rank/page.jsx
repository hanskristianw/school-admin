'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

// ── IB boundary calculation (same as pdfGenerators) ─────────────────────────
function calcIBScore(gradeRows, customBounds) {
  const pick = (arr) => arr.filter(v => v !== null && v !== undefined)
  const allA = pick(gradeRows.map(g => g.criterion_a_grade))
  const allB = pick(gradeRows.map(g => g.criterion_b_grade))
  const allC = pick(gradeRows.map(g => g.criterion_c_grade))
  const allD = pick(gradeRows.map(g => g.criterion_d_grade))
  const vals = [
    allA.length ? Math.max(...allA) : null,
    allB.length ? Math.max(...allB) : null,
    allC.length ? Math.max(...allC) : null,
    allD.length ? Math.max(...allD) : null,
  ].filter(v => v !== null)
  if (!vals.length) return null
  const total = vals.reduce((a, b) => a + b, 0)
  const scale = vals.length / 4
  const b = (customBounds && customBounds.length === 6)
    ? customBounds
    : [5, 9, 14, 18, 23, 27].map(v => Math.round(v * scale))
  if (total <= b[0]) return 1
  if (total <= b[1]) return 2
  if (total <= b[2]) return 3
  if (total <= b[3]) return 4
  if (total <= b[4]) return 5
  if (total <= b[5]) return 6
  return 7
}

// ── Sub-components ───────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 22 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 22 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 22 }}>🥉</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', fontWeight: 700, fontSize: 13, color: '#6b7280' }}>{rank}</span>
}

function ScorePill({ score, theme }) {
  if (score === null || score === undefined) return <span style={{ color: theme.textSecondary, fontSize: 12 }}>—</span>
  const colors = [null,
    { bg: '#fef2f2', text: '#dc2626' },
    { bg: '#fff7ed', text: '#ea580c' },
    { bg: '#fefce8', text: '#ca8a04' },
    { bg: '#f0fdf4', text: '#16a34a' },
    { bg: '#eff6ff', text: '#2563eb' },
    { bg: '#f5f3ff', text: '#7c3aed' },
    { bg: '#fdf4ff', text: '#a21caf' },
  ]
  const c = colors[score] || { bg: theme.subtleBg, text: theme.textBody }
  return <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: c.bg, color: c.text, minWidth: 28, textAlign: 'center' }}>{score}</span>
}

function Avatar({ name, photo, size = 34 }) {
  const [imgError, setImgError] = useState(false)
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
  const palette = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#14b8a6']
  const bg = palette[(name?.charCodeAt(0) ?? 0) % palette.length]
  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt={name || ''}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e5e7eb' }}
      />
    )
  }
  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>{initials}</span>
}

function StatCard({ label, value, icon, color, theme }) {
  return (
    <Card style={{ background: theme.cardBg, borderColor: theme.border, flex: 1, minWidth: 140 }}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
          <div>
            <p style={{ fontSize: 10, color: theme.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.2 }}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterSelect({ label, value, onChange, disabled, children, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ color: theme.textSecondary, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, color: value ? theme.textBody : theme.textSecondary, borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 155, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
        {children}
      </select>
    </div>
  )
}

function PodiumBlock({ rank, entry, theme, height }) {
  const color = { 1: '#f59e0b', 2: '#9ca3af', 3: '#f97316' }[rank]
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[rank]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 110 }}>
      <Avatar name={entry?.nama} photo={entry?.photo} size={38} />
      <p style={{ fontWeight: 700, fontSize: 12, color: theme.textPrimary, textAlign: 'center', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry?.nama || '—'}</p>
      <p style={{ fontWeight: 800, fontSize: 15, color }}>{entry?.avg?.toFixed(2) ?? '—'}</p>
      <div style={{ width: '100%', height, borderRadius: '8px 8px 0 0', background: `linear-gradient(180deg,${color}55,${color}22)`, border: `2px solid ${color}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>{medal}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RankPage() {
  const { theme } = useTheme()
  const { t } = useI18n()

  const [years, setYears]           = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [selYear, setSelYear]       = useState('')
  const [selSem, setSelSem]         = useState('')
  const [selKelas, setSelKelas]     = useState('')
  const [rankData, setRankData]         = useState([])
  const [subjects, setSubjects]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [errorMsg, setErrorMsg]         = useState('')
  const [criteriaData, setCriteriaData]     = useState({})        // per-subject criteria avg for selected class
  const [classCritDist, setClassCritDist]   = useState(null)      // distribution {A:{1:n,...}, B:...} for selected class
  const [schoolCriteria, setSchoolCriteria] = useState({})    // school-wide criteria avg
  const [schoolLoading, setSchoolLoading]   = useState(false)
  const [schoolLoaded, setSchoolLoaded]     = useState(false)

  useEffect(() => {
    supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false })
      .then(({ data }) => setYears(data || []))
  }, [])

  useEffect(() => {
    if (!selYear) { setKelasOptions([]); setSelKelas(''); return }
    supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', selYear).order('kelas_nama')
      .then(({ data }) => { setKelasOptions(data || []); setSelKelas('') })
  }, [selYear])

  useEffect(() => { setRankData([]); setSubjects([]); setErrorMsg(''); setCriteriaData({}); setClassCritDist(null); setSchoolCriteria({}); setSchoolLoaded(false) }, [selYear, selSem, selKelas])

  const canGenerate = selYear && selSem && selKelas
  const yearName  = years.find(y => String(y.year_id) === String(selYear))?.year_name || ''
  const kelasName = kelasOptions.find(k => String(k.kelas_id) === String(selKelas))?.kelas_nama || ''

  const handleGenerate = async () => {
    setLoading(true); setRankData([]); setSubjects([]); setErrorMsg('')
    try {
      // 1. Students in class
      const { data: siswaData, error: e1 } = await supabase
        .from('detail_siswa').select('detail_siswa_id, detail_siswa_user_id')
        .eq('detail_siswa_kelas_id', selKelas)
      if (e1) throw e1
      if (!siswaData?.length) { setErrorMsg(t('rank.errors.noStudents')); return }

      const userIds  = siswaData.map(d => d.detail_siswa_user_id).filter(Boolean)
      const siswaIdMap = Object.fromEntries(siswaData.map(d => [d.detail_siswa_user_id, d.detail_siswa_id]))

      // 2. User names
      const { data: usersData } = await supabase
        .from('users').select('user_id, user_nama_depan, user_nama_belakang, user_profile_picture, user_manual_picture').in('user_id', userIds)
      const nameMap  = Object.fromEntries((usersData || []).map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()]))
      // Prefer manually uploaded picture, fallback to Google OAuth picture
      const photoMap = Object.fromEntries((usersData || []).map(u => [u.user_id, u.user_manual_picture || u.user_profile_picture || null]))

      // 3. Subjects (detail_kelas)
      const { data: dkData, error: e3 } = await supabase
        .from('detail_kelas')
        .select(`
          detail_kelas_id,
          detail_kelas_subject_id,
          subject:detail_kelas_subject_id (
            subject_id, subject_name, include_in_print, print_order, core_subject, custom_grade_boundaries
          )
        `)
        .eq('detail_kelas_kelas_id', selKelas)
      if (e3) throw e3

      const printable = (dkData || [])
        .filter(dk => dk.subject && dk.subject.include_in_print !== false)
        .sort((a, b) => {
          if (a.subject.core_subject !== b.subject.core_subject) return a.subject.core_subject ? -1 : 1
          return (a.subject.print_order ?? 0) - (b.subject.print_order ?? 0)
        })
      if (!printable.length) { setErrorMsg(t('rank.errors.noSubjects')); return }

      const dkIds = printable.map(dk => dk.detail_kelas_id)
      const subjectList = printable.map(dk => ({ id: dk.subject.subject_id, name: dk.subject.subject_name }))

      // 4. Assessments
      const { data: assData } = await supabase
        .from('assessment').select('assessment_id, assessment_detail_kelas_id')
        .in('assessment_detail_kelas_id', dkIds)
        .in('assessment_status', [0, 1, 3])
        .eq('assessment_semester', parseInt(selSem))
      const assIds = (assData || []).map(a => a.assessment_id)
      const assDkMap = Object.fromEntries((assData || []).map(a => [a.assessment_id, a.assessment_detail_kelas_id]))

      // 5. All grades
      let gradeRows = []
      if (assIds.length) {
        const { data: gd } = await supabase
          .from('assessment_grades')
          .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
          .in('assessment_id', assIds)
        gradeRows = gd || []
      }

      // 6. Group grades: studentGrades[detail_siswa_id][detail_kelas_id] = [rows]
      const studentGrades = {}
      const distAcc = { A:{}, B:{}, C:{}, D:{} }
      for (const g of gradeRows) {
        const dkId = assDkMap[g.assessment_id]
        if (!studentGrades[g.detail_siswa_id]) studentGrades[g.detail_siswa_id] = {}
        if (!studentGrades[g.detail_siswa_id][dkId]) studentGrades[g.detail_siswa_id][dkId] = []
        studentGrades[g.detail_siswa_id][dkId].push(g)
      }

      // 6b. Criteria averages per subject for Stats tab
      const critMap = {}
      for (const dk of printable) {
        const sid = dk.subject.subject_id
        const dkId = dk.detail_kelas_id
        const stuMax = {}
        for (const g of gradeRows) {
          if (assDkMap[g.assessment_id] !== dkId) continue
          if (!stuMax[g.detail_siswa_id]) stuMax[g.detail_siswa_id] = { a:[], b:[], c:[], d:[] }
          if (g.criterion_a_grade !== null) stuMax[g.detail_siswa_id].a.push(g.criterion_a_grade)
          if (g.criterion_b_grade !== null) stuMax[g.detail_siswa_id].b.push(g.criterion_b_grade)
          if (g.criterion_c_grade !== null) stuMax[g.detail_siswa_id].c.push(g.criterion_c_grade)
          if (g.criterion_d_grade !== null) stuMax[g.detail_siswa_id].d.push(g.criterion_d_grade)
        }
        const mA=[],mB=[],mC=[],mD=[]
        for (const v of Object.values(stuMax)) {
          if (v.a.length) mA.push(Math.max(...v.a))
          if (v.b.length) mB.push(Math.max(...v.b))
          if (v.c.length) mC.push(Math.max(...v.c))
          if (v.d.length) mD.push(Math.max(...v.d))
        }
        const avg = arr => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : null
        critMap[sid] = { name: dk.subject.subject_name, avgA: avg(mA), avgB: avg(mB), avgC: avg(mC), avgD: avg(mD), hasA: mA.length>0, hasB: mB.length>0, hasC: mC.length>0, hasD: mD.length>0 }
        // Accumulate distribution using max-per-student values
        for (const v of mA) distAcc.A[v] = (distAcc.A[v]||0)+1
        for (const v of mB) distAcc.B[v] = (distAcc.B[v]||0)+1
        for (const v of mC) distAcc.C[v] = (distAcc.C[v]||0)+1
        for (const v of mD) distAcc.D[v] = (distAcc.D[v]||0)+1
      }

      // 7. Calculate IB + average per student
      const ranked = siswaData.map(d => {
        const scores = {}
        let total = 0, count = 0
        for (const dk of printable) {
          const rows = studentGrades[d.detail_siswa_id]?.[dk.detail_kelas_id] || []
          const ib = rows.length ? calcIBScore(rows, dk.subject.custom_grade_boundaries) : null
          scores[dk.subject.subject_id] = ib
          if (ib !== null) { total += ib; count++ }
        }
        return {
          user_id: d.detail_siswa_user_id,
          detail_siswa_id: d.detail_siswa_id,
          nama: nameMap[d.detail_siswa_user_id] || '?',
          photo: photoMap[d.detail_siswa_user_id] || null,
          scores,
          avg: count > 0 ? total / count : null,
        }
      })

      // 8. Sort DESC, assign ranks (handle ties)
      ranked.sort((a, b) => {
        if (a.avg === null && b.avg === null) return 0
        if (a.avg === null) return 1
        if (b.avg === null) return -1
        return b.avg - a.avg
      })
      let r = 1
      for (let i = 0; i < ranked.length; i++) {
        if (i > 0 && ranked[i].avg !== ranked[i - 1].avg) r = i + 1
        ranked[i].rank = ranked[i].avg !== null ? r : null
      }

      setSubjects(subjectList)
      setRankData(ranked)
      setCriteriaData(critMap)
      setClassCritDist(distAcc)
      setSchoolLoaded(false)
    } catch (e) {
      console.error(e)
      setErrorMsg(t('rank.errors.load') + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  const loadSchoolStats = async () => {
    if (!selYear || !selSem) return
    setSchoolLoading(true)
    try {
      const { data: allKelas } = await supabase.from('kelas').select('kelas_id').eq('kelas_year_id', selYear)
      const allKelasIds = (allKelas||[]).map(k=>k.kelas_id)
      if (!allKelasIds.length) { setSchoolLoaded(true); return }
      const { data: allDk } = await supabase.from('detail_kelas')
        .select('detail_kelas_id, subject:detail_kelas_subject_id(subject_id, subject_name, include_in_print)')
        .in('detail_kelas_kelas_id', allKelasIds)
      const pDk = (allDk||[]).filter(dk=>dk.subject?.include_in_print!==false)
      const pIds = pDk.map(dk=>dk.detail_kelas_id)
      const dkSubjMap = Object.fromEntries(pDk.map(dk=>[dk.detail_kelas_id, dk.subject]))
      const { data: allAss } = await supabase.from('assessment').select('assessment_id, assessment_detail_kelas_id')
        .in('assessment_detail_kelas_id', pIds).in('assessment_status',[0,1,3]).eq('assessment_semester', parseInt(selSem))
      const aIds = (allAss||[]).map(a=>a.assessment_id)
      const aDkMap = Object.fromEntries((allAss||[]).map(a=>[a.assessment_id, a.assessment_detail_kelas_id]))
      if (!aIds.length) { setSchoolLoaded(true); return }
      const { data: allG } = await supabase.from('assessment_grades')
        .select('assessment_id, detail_siswa_id, criterion_a_grade, criterion_b_grade, criterion_c_grade, criterion_d_grade')
        .in('assessment_id', aIds)
      const subjStuMax = {}
      for (const g of (allG||[])) {
        const dkId = aDkMap[g.assessment_id]
        const subj = dkSubjMap[dkId]; if (!subj) continue
        const sid = subj.subject_id
        const key = `${g.detail_siswa_id}_${dkId}`
        if (!subjStuMax[sid]) subjStuMax[sid] = {}
        if (!subjStuMax[sid][key]) subjStuMax[sid][key] = {a:[],b:[],c:[],d:[]}
        if (g.criterion_a_grade!==null) subjStuMax[sid][key].a.push(g.criterion_a_grade)
        if (g.criterion_b_grade!==null) subjStuMax[sid][key].b.push(g.criterion_b_grade)
        if (g.criterion_c_grade!==null) subjStuMax[sid][key].c.push(g.criterion_c_grade)
        if (g.criterion_d_grade!==null) subjStuMax[sid][key].d.push(g.criterion_d_grade)
      }
      const res = {}
      for (const dk of pDk) {
        const sid = dk.subject.subject_id; if (res[sid]) continue
        const mA=[],mB=[],mC=[],mD=[]
        for (const v of Object.values(subjStuMax[sid]||{})) {
          if (v.a.length) mA.push(Math.max(...v.a))
          if (v.b.length) mB.push(Math.max(...v.b))
          if (v.c.length) mC.push(Math.max(...v.c))
          if (v.d.length) mD.push(Math.max(...v.d))
        }
        const avg = arr=>arr.length?+(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2):null
        res[sid]={ name:dk.subject.subject_name, avgA:avg(mA),avgB:avg(mB),avgC:avg(mC),avgD:avg(mD), hasA:mA.length>0,hasB:mB.length>0,hasC:mC.length>0,hasD:mD.length>0 }
      }
      setSchoolCriteria(res); setSchoolLoaded(true)
    } catch(e){console.error(e)} finally{setSchoolLoading(false)}
  }

  const [viewMode, setViewMode] = useState('overall') // 'overall' | 'subject' | 'stats'

  // Auto-load school stats when switching to stats tab
  useEffect(() => {
    if (viewMode === 'stats' && hasData && !schoolLoaded && !schoolLoading) {
      loadSchoolStats()
    }
  }, [viewMode])

  const hasData = rankData.length > 0
  const topAvg  = hasData ? (rankData[0]?.avg?.toFixed(2) ?? '—') : '—'
  const avgAll  = hasData ? (rankData.reduce((s, r) => s + (r.avg ?? 0), 0) / rankData.length).toFixed(2) : '—'

  // Build per-subject rankings from existing rankData
  const subjectRankings = subjects.map(s => {
    const rows = rankData
      .map(r => ({ user_id: r.user_id, nama: r.nama, photo: r.photo, score: r.scores?.[s.id] ?? null }))
      .filter(r => r.score !== null)
      .sort((a, b) => b.score - a.score)
    let rank = 1
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].score !== rows[i - 1].score) rank = i + 1
      rows[i].rank = rank
    }
    const topScore = rows[0]?.score ?? null
    const avg = rows.length ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(2) : '—'
    return { subject: s, rows, topScore, avg }
  })

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: theme.pageBg }}>
      <div style={{ padding: '24px 24px 40px' }} className="space-y-5">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>🏆 {t('rank.title')}</h1>
            <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 3 }}>{t('rank.subtitle')}</p>
          </div>
          {hasData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: theme.subtleBg, border: `1px solid ${theme.border}`, fontSize: 12, color: theme.textSecondary }}>
              {t('rank.badge').replace('{class}', kelasName).replace('{year}', yearName).replace('{sem}', selSem)}
            </div>
          )}
        </div>

        {/* Filter Card */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="pt-5 pb-5">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
              <FilterSelect label={t('rank.filters.academicYear')} value={selYear} onChange={setSelYear} theme={theme}>
                <option value="">{t('rank.filters.selectYear')}</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </FilterSelect>
              <FilterSelect label={t('rank.filters.semester')} value={selSem} onChange={setSelSem} theme={theme}>
                <option value="">{t('rank.filters.selectSemester')}</option>
                <option value="1">{t('rank.filters.semester1')}</option>
                <option value="2">{t('rank.filters.semester2')}</option>
              </FilterSelect>
              <FilterSelect label={t('rank.filters.class')} value={selKelas} onChange={setSelKelas} disabled={!selYear} theme={theme}>
                <option value="">{t('rank.filters.selectClass')}</option>
                {kelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
              </FilterSelect>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || loading}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: canGenerate && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                  background: canGenerate && !loading ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : theme.subtleBg,
                  color: canGenerate && !loading ? '#fff' : theme.textSecondary,
                  boxShadow: canGenerate && !loading ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {loading ? t('rank.generating') : t('rank.generate')}
              </button>
            </div>
            {errorMsg && <p style={{ marginTop: 10, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>⚠ {errorMsg}</p>}
          </CardContent>
        </Card>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 50, borderRadius: 10, background: theme.subtleBg, opacity: 0.7 - i * 0.08 }} />
            ))}
          </div>
        )}

        {/* Stats */}
        {hasData && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label={t('rank.stats.totalStudents')} value={rankData.length} icon="👥" color="#6366f1" theme={theme} />
            <StatCard label={t('rank.stats.topScore')}      value={topAvg}          icon="🥇" color="#f59e0b" theme={theme} />
            <StatCard label={t('rank.stats.classAverage')}  value={avgAll}          icon="📈" color="#10b981" theme={theme} />
            <StatCard label={t('rank.stats.subjects')}      value={subjects.length} icon="📚" color="#0ea5e9" theme={theme} />
          </div>
        )}

        {/* View Mode Tabs */}
        {hasData && !loading && (
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: theme.subtleBg, border: `1px solid ${theme.border}`, width: 'fit-content' }}>
            {[{ key: 'overall', label: t('rank.tabs.overall') }, { key: 'subject', label: t('rank.tabs.subject') }, { key: 'stats', label: t('rank.tabs.statistics') }].map(tab => (
              <button key={tab.key} onClick={() => setViewMode(tab.key)}
                style={{
                  padding: '7px 18px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  background: viewMode === tab.key ? '#6366f1' : 'transparent',
                  color: viewMode === tab.key ? '#fff' : theme.textSecondary,
                  boxShadow: viewMode === tab.key ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── OVERALL VIEW ── */}
        {hasData && !loading && viewMode === 'overall' && (
          <>
            {/* Podium */}
            {rankData.length >= 3 && (
              <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
                <CardContent className="pt-5 pb-2">
                  <p style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{t('rank.podium')}</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16 }}>
                    <PodiumBlock rank={2} entry={rankData[1]} theme={theme} height={80} />
                    <PodiumBlock rank={1} entry={rankData[0]} theme={theme} height={110} />
                    <PodiumBlock rank={3} entry={rankData[2]} theme={theme} height={60} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full table */}
            <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
              <CardHeader className="pb-2">
                <CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>{t('rank.fullRankings')} — {kelasName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: theme.subtleBg, borderBottom: `2px solid ${theme.border}` }}>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 56 }}>{t('rank.table.rank')}</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11, minWidth: 170 }}>{t('rank.table.student')}</th>
                        {subjects.map(s => (
                          <th key={s.id} title={s.name} style={{ padding: '10px 6px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, maxWidth: 72 }}>
                            {s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name}
                          </th>
                        ))}
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: '#6366f1', fontWeight: 700, fontSize: 11, background: 'rgba(99,102,241,0.07)', minWidth: 60 }}>{t('rank.table.avg')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankData.map((row, i) => (
                        <tr key={row.user_id}
                          style={{ borderBottom: `1px solid ${theme.border}`, background: i < 3 ? `rgba(99,102,241,${0.04 - i * 0.01})` : 'transparent', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                          onMouseLeave={e => e.currentTarget.style.background = i < 3 ? `rgba(99,102,241,${0.04 - i * 0.01})` : 'transparent'}
                        >
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}><RankBadge rank={row.rank} /></td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar name={row.nama} photo={row.photo} />
                              <span style={{ fontWeight: 600, color: theme.textPrimary }}>{row.nama}</span>
                            </div>
                          </td>
                          {subjects.map(s => (
                            <td key={s.id} style={{ padding: '10px 6px', textAlign: 'center' }}>
                              <ScorePill score={row.scores?.[s.id] ?? null} theme={theme} />
                            </td>
                          ))}
                          <td style={{ padding: '10px 14px', textAlign: 'center', background: 'rgba(99,102,241,0.05)' }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: '#6366f1' }}>{row.avg !== null ? row.avg.toFixed(2) : '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── PER SUBJECT VIEW ── */}
        {hasData && !loading && viewMode === 'subject' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {subjectRankings.map(({ subject, rows, topScore, avg }) => (
              <Card key={subject.id} style={{ background: theme.cardBg, borderColor: theme.border }}>
                <CardHeader className="pb-2 pt-4">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <CardTitle style={{ color: theme.textPrimary, fontSize: 14 }}>📖 {subject.name}</CardTitle>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: '#fef9c3', color: '#a16207', fontWeight: 700 }}>{t('rank.top')}: {topScore ?? '—'}</span>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: theme.subtleBg, color: theme.textSecondary, fontWeight: 600 }}>Avg: {avg}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <p style={{ padding: '14px 16px', fontSize: 12, color: theme.textSecondary }}>{t('rank.noGrades')}</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                          <th style={{ padding: '7px 10px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, width: 44 }}>{t('rank.table.rank')}</th>
                          <th style={{ padding: '7px 10px', textAlign: 'left',   color: theme.textSecondary, fontWeight: 600, fontSize: 10 }}>{t('rank.table.student')}</th>
                          <th style={{ padding: '7px 10px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, width: 60 }}>{t('rank.table.score')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={row.user_id}
                            style={{ borderBottom: `1px solid ${theme.border}`, background: i < 3 ? `rgba(99,102,241,${0.04 - i * 0.01})` : 'transparent', transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
                            onMouseLeave={e => e.currentTarget.style.background = i < 3 ? `rgba(99,102,241,${0.04 - i * 0.01})` : 'transparent'}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}><RankBadge rank={row.rank} /></td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={row.nama} photo={row.photo} size={28} />
                                <span style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 12 }}>{row.nama}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <ScorePill score={row.score} theme={theme} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── STATISTICS VIEW ── */}
        {hasData && !loading && viewMode === 'stats' && (() => {
          // IB distribution: count student×subject pairs per IB level
          const ibDist = {1:0,2:0,3:0,4:0,5:0,6:0,7:0}
          let totalPairs = 0
          for (const row of rankData) {
            for (const s of subjects) {
              const sc = row.scores?.[s.id]
              if (sc !== null && sc !== undefined) { ibDist[sc] = (ibDist[sc]||0)+1; totalPairs++ }
            }
          }
          const belowAvg3 = rankData.filter(r => r.avg !== null && r.avg < 3)
          const critEntries = Object.entries(criteriaData)
          const schoolEntries = Object.entries(schoolCriteria)
          const CRIT_MAX = 8
          const barColor = (v) => v === null ? '#e5e7eb' : v < 3 ? '#ef4444' : v < 5 ? '#f59e0b' : '#22c55e'
          const ibColor = (lv) => lv <= 2 ? '#ef4444' : lv === 3 ? '#f59e0b' : '#22c55e'
          const maxIBCount = Math.max(...Object.values(ibDist), 1)
          const CritRow = ({ label, val, show }) => !show ? null : (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ width:22, fontSize:11, fontWeight:700, color: barColor(val) }}>{label}</span>
              <div style={{ flex:1, background:'#f3f4f6', borderRadius:4, overflow:'hidden', height:16 }}>
                <div style={{ width:`${val===null?0:(val/CRIT_MAX)*100}%`, background: barColor(val), height:'100%', borderRadius:4, transition:'width 0.4s', minWidth: val>0?4:0 }} />
              </div>
              <span style={{ width:32, fontSize:11, fontWeight:700, color: barColor(val), textAlign:'right' }}>{val??'—'}</span>
            </div>
          )
          return (
            <div className="space-y-5">
              {/* IB Distribution */}
              <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
                <CardHeader className="pb-2">
                  <CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>{t('rank.statistics.ibDistTitle')} — {kelasName}</CardTitle>
                  <p style={{ fontSize:12, color: theme.textSecondary, marginTop:2 }}>
                    {belowAvg3.length > 0
                      ? t('rank.statistics.belowAvg3Warning').replace('{count}', belowAvg3.length)
                      : t('rank.statistics.allAbove3')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:120 }}>
                    {[1,2,3,4,5,6,7].map(lv => (
                      <div key={lv} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color: ibColor(lv) }}>{ibDist[lv]||0}</span>
                        <div style={{ width:'100%', background:'#f3f4f6', borderRadius:'4px 4px 0 0', height:90, display:'flex', alignItems:'flex-end' }}>
                          <div style={{ width:'100%', background: ibColor(lv), borderRadius:'4px 4px 0 0', height:`${((ibDist[lv]||0)/maxIBCount)*90}px`, transition:'height 0.4s' }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color: lv<=2?'#ef4444':lv===3?'#f59e0b':theme.textSecondary }}>IB {lv}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize:11, color: theme.textSecondary, marginTop:10 }}>{rankData.length * subjects.length} {t('rank.statistics.ibDistSubtitle').replace('{students}', rankData.length).replace('{subjects}', subjects.length)}</p>
                </CardContent>
              </Card>

              {/* Students below avg 3 */}
              {belowAvg3.length > 0 && (
                <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
                  <CardHeader className="pb-2">
                    <CardTitle style={{ color:'#dc2626', fontSize:15 }}>{t('rank.statistics.needsAttentionTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background: theme.subtleBg, borderBottom:`1px solid ${theme.border}` }}>
                          <th style={{ padding:'8px 14px', textAlign:'left', color: theme.textSecondary, fontWeight:600, fontSize:11 }}>{t('rank.statistics.colStudent')}</th>
                          <th style={{ padding:'8px 14px', textAlign:'center', color: theme.textSecondary, fontWeight:600, fontSize:11 }}>{t('rank.statistics.colAvgIB')}</th>
                          <th style={{ padding:'8px 14px', textAlign:'center', color: theme.textSecondary, fontWeight:600, fontSize:11 }}>{t('rank.statistics.colRank')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {belowAvg3.map((row,i) => (
                          <tr key={row.user_id} style={{ borderBottom:`1px solid ${theme.border}` }}>
                            <td style={{ padding:'8px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <Avatar name={row.nama} photo={row.photo} size={28} />
                                <span style={{ fontWeight:600, color: theme.textPrimary }}>{row.nama}</span>
                              </div>
                            </td>
                            <td style={{ padding:'8px 14px', textAlign:'center' }}>
                              <span style={{ fontWeight:800, color:'#dc2626', fontSize:14 }}>{row.avg?.toFixed(2)}</span>
                            </td>
                            <td style={{ padding:'8px 14px', textAlign:'center' }}><RankBadge rank={row.rank} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Criteria Distribution Charts — 4 charts, one per criterion */}
              {classCritDist && (['A','B','C','D'].some(k => Object.keys(classCritDist[k]).length > 0)) && (() => {
                const critColor = (score) => score <= 2 ? '#ef4444' : score <= 4 ? '#f59e0b' : '#22c55e'
                const CritChart = ({ letter, dist }) => {
                  const scores = [1,2,3,4,5,6,7,8]
                  const counts = scores.map(s => dist[s] || 0)
                  const maxCount = Math.max(...counts, 1)
                  const total = counts.reduce((a,b)=>a+b,0)
                  if (total === 0) return null
                  return (
                    <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
                      <CardHeader className="pb-2">
                        <CardTitle style={{ color: theme.textPrimary, fontSize:14 }}>{t('rank.statistics.criteriaChartTitle').replace('{letter}', letter)}</CardTitle>
                        <p style={{ fontSize:11, color: theme.textSecondary, marginTop:2 }}>{total} {t('rank.statistics.criteriaDataCount')} · {kelasName}</p>
                      </CardHeader>
                      <CardContent>
                        <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:110 }}>
                          {scores.map(sc => {
                            const cnt = dist[sc] || 0
                            const pct = (cnt / maxCount) * 90
                            return (
                              <div key={sc} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                                <span style={{ fontSize:10, fontWeight:700, color: critColor(sc), minHeight:14 }}>{cnt > 0 ? cnt : ''}</span>
                                <div style={{ width:'100%', background: theme.subtleBg, borderRadius:'4px 4px 0 0', height:90, display:'flex', alignItems:'flex-end', border:`1px solid ${theme.border}`, borderBottom:'none' }}>
                                  <div style={{ width:'100%', background: critColor(sc), borderRadius:'4px 4px 0 0', height:`${pct}px`, transition:'height 0.4s', opacity: cnt===0?0:1 }} />
                                </div>
                                <span style={{ fontSize:11, fontWeight:600, color: theme.textSecondary }}>{sc}</span>
                              </div>
                            )
                          })}
                        </div>
                        <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap' }}>
                          {[{label:t('rank.statistics.legendLow'), color:'#ef4444'},{label:t('rank.statistics.legendMid'), color:'#f59e0b'},{label:t('rank.statistics.legendHigh'), color:'#22c55e'}].map(l => (
                            <span key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color: theme.textSecondary }}>
                              <span style={{ width:10, height:10, borderRadius:2, background:l.color, display:'inline-block' }} />{l.label}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
                    {['A','B','C','D'].map(k => <CritChart key={k} letter={k} dist={classCritDist[k]} />)}
                  </div>
                )
              })()}

              {/* School-wide criteria */}
              <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
                <CardHeader className="pb-2">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                    <div>
                      <CardTitle style={{ color: theme.textPrimary, fontSize:15 }}>{t('rank.statistics.schoolTitle').replace('{year}', yearName).replace('{sem}', selSem)}</CardTitle>
                      <p style={{ fontSize:12, color: theme.textSecondary, marginTop:2 }}>{t('rank.statistics.schoolSubtitle')}</p>
                    </div>
                    {schoolLoading && (
                      <span style={{ fontSize:12, color: theme.textSecondary }}>⏳ {t('rank.statistics.schoolLoading')}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {schoolLoading && (
                    <div style={{ display:'flex', gap:8, flexDirection:'column', paddingBottom:8 }}>
                      {[...Array(3)].map((_,i) => <div key={i} style={{ height:18, borderRadius:6, background: theme.subtleBg, opacity:0.7-i*0.15 }} />)}
                    </div>
                  )}
                  {schoolLoaded && schoolEntries.length === 0 && (
                    <p style={{ fontSize:13, color: theme.textSecondary }}>{t('rank.statistics.schoolNoData')}</p>
                  )}
                  {schoolLoaded && schoolEntries.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                      {schoolEntries.map(([sid, c]) => (
                        <div key={sid} style={{ padding:14, borderRadius:8, border:`1px solid ${theme.border}`, background: theme.subtleBg }}>
                          <p style={{ fontWeight:700, fontSize:13, color: theme.textPrimary, marginBottom:10 }}>{c.name}</p>
                          <CritRow label="A" val={c.avgA} show={c.hasA} />
                          <CritRow label="B" val={c.avgB} show={c.hasB} />
                          <CritRow label="C" val={c.avgC} show={c.hasC} />
                          <CritRow label="D" val={c.avgD} show={c.hasD} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {/* Empty state */}
        {!loading && !hasData && (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>
              {canGenerate ? t('rank.empty.titleReady') : t('rank.empty.titleNotReady')}
            </p>
            <p style={{ fontSize: 13, color: theme.textSecondary }}>
              {canGenerate ? t('rank.empty.subtitleReady') : t('rank.empty.subtitleNotReady')}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
