'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faTrophy, faMedal, faAward, faUsers, faChartLine, faBook,
  faSlidersH, faFilter, faSearch, faArrowUp, faArrowDown, faCheck,
  faExclamationTriangle, faCalendarAlt, faGraduationCap, faLayerGroup
} from '@fortawesome/free-solid-svg-icons'

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

// ── Minimalist Sub-components ────────────────────────────────────────────────
function RankBadge({ rank, isDark }) {
  if (rank === 1) {
    return (
      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1"
        style={{ background: isDark ? '#2A2618' : '#FBF3DB', color: isDark ? '#C4A24A' : '#956400', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EAEAEA' }}>
        <FontAwesomeIcon icon={faTrophy} className="text-[10px]" />
        <span>1ST</span>
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1"
        style={{ background: isDark ? '#1D1C21' : '#F7F6F3', color: isDark ? '#F0EFE9' : '#2F3437', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EAEAEA' }}>
        <FontAwesomeIcon icon={faMedal} className="text-[10px]" />
        <span>2ND</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1"
        style={{ background: isDark ? '#3A281E' : '#FDF2E9', color: isDark ? '#E59866' : '#B9770E', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EAEAEA' }}>
        <FontAwesomeIcon icon={faAward} className="text-[10px]" />
        <span>3RD</span>
      </span>
    )
  }
  return (
    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border text-zinc-500"
      style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EAEAEA', background: isDark ? 'transparent' : '#FAFAFA' }}>
      #{rank}
    </span>
  )
}

function ScorePill({ score, theme, isDark }) {
  if (score === null || score === undefined) return <span className="font-mono text-xs text-gray-400">—</span>
  
  const getStyle = (s) => {
    if (s >= 6) return { bg: isDark ? '#1E2E1E' : '#EDF3EC', text: isDark ? '#7BAF7B' : '#346538' }
    if (s >= 4) return { bg: isDark ? '#1A2F3D' : '#E1F3FE', text: isDark ? '#7CB8DC' : '#1F6C9F' }
    if (s === 3) return { bg: isDark ? '#2A2618' : '#FBF3DB', text: isDark ? '#C4A24A' : '#956400' }
    return { bg: isDark ? '#3A1E1E' : '#FDEBEC', text: isDark ? '#DC8585' : '#9F2F2D' }
  }

  const c = getStyle(score)
  return (
    <span 
      className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
      style={{ background: c.bg, color: c.text, borderColor: theme.border }}
    >
      {score}
    </span>
  )
}

function Avatar({ name, photo, size = 32, theme }) {
  const [imgError, setImgError] = useState(false)
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
  
  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt={name || ''}
        onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: '4px', objectFit: 'cover', flexShrink: 0, border: `1px solid ${theme.border}` }}
      />
    )
  }
  return (
    <span 
      className="font-mono font-bold flex items-center justify-center rounded border flex-shrink-0"
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '4px', 
        background: theme.subtleBg, 
        color: theme.textPrimary,
        borderColor: theme.border,
        fontSize: size * 0.38 
      }}
    >
      {initials}
    </span>
  )
}

function StatCard({ label, value, icon, theme, isDark }) {
  return (
    <div 
      className="p-4 rounded border flex-1 min-w-[150px] transition-all"
      style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '6px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme.textSecondary }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: theme.textSecondary }}>
          <FontAwesomeIcon icon={icon} />
        </span>
      </div>
      <p className="font-mono text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
        {value}
      </p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, disabled, children, theme }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
        {label}
      </label>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        disabled={disabled}
        className="font-mono text-xs rounded border px-3 py-1.5 outline-none transition-colors"
        style={{ 
          background: theme.inputBg, 
          borderColor: theme.border, 
          color: value ? theme.textPrimary : theme.textSecondary, 
          borderRadius: '4px',
          minWidth: 155, 
          cursor: disabled ? 'not-allowed' : 'pointer', 
          opacity: disabled ? 0.5 : 1 
        }}
      >
        {children}
      </select>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RankPage() {
  const { theme, isDark } = useTheme()
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
  const [criteriaData, setCriteriaData]     = useState({})
  const [classCritDist, setClassCritDist]   = useState(null)
  const [schoolCriteria, setSchoolCriteria] = useState({})
  const [schoolLoading, setSchoolLoading]   = useState(false)
  const [schoolLoaded, setSchoolLoaded]     = useState(false)
  const [viewMode, setViewMode] = useState('overall') // 'overall' | 'subject' | 'stats'

  useEffect(() => {
    supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false })
      .then(({ data }) => setYears(data || []))
  }, [])

  useEffect(() => {
    if (!selYear) { setKelasOptions([]); setSelKelas(''); return }
    supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', selYear).order('kelas_nama')
      .then(({ data }) => { setKelasOptions(data || []); setSelKelas('') })
  }, [selYear])

  useEffect(() => { 
    setRankData([])
    setSubjects([])
    setErrorMsg('')
    setCriteriaData({})
    setClassCritDist(null)
    setSchoolCriteria({})
    setSchoolLoaded(false) 
  }, [selYear, selSem, selKelas])

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
      if (!siswaData?.length) { setErrorMsg('No students registered in this class cohort.'); return }

      const userIds  = siswaData.map(d => d.detail_siswa_user_id).filter(Boolean)
      const siswaIdMap = Object.fromEntries(siswaData.map(d => [d.detail_siswa_user_id, d.detail_siswa_id]))

      // 2. User names
      const { data: usersData } = await supabase
        .from('users').select('user_id, user_nama_depan, user_nama_belakang, user_profile_picture, user_manual_picture').in('user_id', userIds)
      const nameMap  = Object.fromEntries((usersData || []).map(u => [u.user_id, `${u.user_nama_depan} ${u.user_nama_belakang}`.trim()]))
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
      if (!printable.length) { setErrorMsg('No active printable subjects configured.'); return }

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
      setErrorMsg('Computation error: ' + (e.message || e))
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

  // Auto-load school stats on stats tab
  useEffect(() => {
    if (viewMode === 'stats' && rankData.length > 0 && !schoolLoaded && !schoolLoading) {
      loadSchoolStats()
    }
  }, [viewMode, rankData.length])

  const hasData = rankData.length > 0
  const topAvg  = hasData ? (rankData[0]?.avg?.toFixed(2) ?? '—') : '—'
  const avgAll  = hasData ? (rankData.reduce((s, r) => s + (r.avg ?? 0), 0) / rankData.length).toFixed(2) : '—'

  // Per-subject rankings
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
    <div 
      className="min-h-full py-6 px-4 sm:px-8 max-w-7xl mx-auto space-y-6"
      style={{ 
        fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', sans-serif",
        color: theme.textBody 
      }}
    >
      {/* Editorial Document Header */}
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ borderColor: theme.border }}>
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] uppercase tracking-widest" style={{ color: theme.textSecondary }}>
            <span>WORKSPACE</span>
            <span>/</span>
            <span>ACADEMICS</span>
            <span>/</span>
            <span style={{ color: theme.textPrimary }}>COHORT RANKINGS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}>
            Academic Cohort & IB Performance
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Comprehensive IB criterion synthesis, cohort grade averages, and comparative analytics.
          </p>
        </div>

        {hasData && (
          <div 
            className="px-3 py-1.5 rounded border font-mono text-xs flex items-center gap-2"
            style={{ borderColor: theme.border, background: theme.cardBg }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold" style={{ color: theme.textPrimary }}>{kelasName}</span>
            <span style={{ color: theme.textSecondary }}>• {yearName} Sem {selSem}</span>
          </div>
        )}
      </div>

      {/* Filter Parameters Bento Card */}
      <div 
        className="p-5 rounded-lg border space-y-4"
        style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
      >
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect label="Academic Year" value={selYear} onChange={setSelYear} theme={theme}>
            <option value="">Select Year...</option>
            {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
          </FilterSelect>

          <FilterSelect label="Semester" value={selSem} onChange={setSelSem} theme={theme}>
            <option value="">Select Semester...</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </FilterSelect>

          <FilterSelect label="Target Class" value={selKelas} onChange={setSelKelas} disabled={!selYear} theme={theme}>
            <option value="">Select Class...</option>
            {kelasOptions.map(k => <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>)}
          </FilterSelect>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="px-5 py-2 text-xs font-semibold rounded border transition-all active:scale-[0.98] cursor-pointer"
            style={{
              background: canGenerate && !loading ? theme.textPrimary : theme.subtleBg,
              color: canGenerate && !loading ? (isDark ? '#111111' : '#FFFFFF') : theme.textSecondary,
              borderColor: theme.border,
              borderRadius: '4px',
              cursor: canGenerate && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? 'Synthesizing...' : 'Generate Analysis'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded border text-xs font-mono" style={{ background: theme.redBg, color: theme.redText, borderColor: theme.border }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded border" style={{ background: theme.subtleBg, borderColor: theme.border }} />
          ))}
        </div>
      )}

      {/* Key Metric Bento Cards */}
      {hasData && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Cohort Size" value={rankData.length} icon={faUsers} theme={theme} isDark={isDark} />
          <StatCard label="Top IB Average" value={topAvg} icon={faTrophy} theme={theme} isDark={isDark} />
          <StatCard label="Class Mean Average" value={avgAll} icon={faChartLine} theme={theme} isDark={isDark} />
          <StatCard label="Graded Subjects" value={subjects.length} icon={faBook} theme={theme} isDark={isDark} />
        </div>
      )}

      {/* View Mode Switcher */}
      {hasData && !loading && (
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-1 font-mono text-xs">
            {[
              { key: 'overall', label: '01. OVERALL COHORT' },
              { key: 'subject', label: '02. PER-SUBJECT' },
              { key: 'stats', label: '03. IB & CRITERIA METRICS' }
            ].map(tab => (
              <button 
                key={tab.key} 
                onClick={() => setViewMode(tab.key)}
                className="px-3.5 py-1.5 rounded border transition-colors cursor-pointer"
                style={{
                  background: viewMode === tab.key ? theme.textPrimary : 'transparent',
                  color: viewMode === tab.key ? (isDark ? '#111111' : '#FFFFFF') : theme.textSecondary,
                  borderColor: viewMode === tab.key ? theme.textPrimary : theme.border,
                  borderRadius: '4px',
                  fontWeight: viewMode === tab.key ? 700 : 500
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
            COHORT SYNTHESIS
          </span>
        </div>
      )}

      {/* ── 01. OVERALL VIEW ── */}
      {hasData && !loading && viewMode === 'overall' && (
        <div className="space-y-6">
          {/* Minimalist Top 3 Leaderboard Strip */}
          {rankData.length >= 3 && (
            <div 
              className="p-5 rounded-lg border"
              style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
                <span className="font-mono text-[10px] uppercase tracking-wider font-bold" style={{ color: theme.textSecondary }}>
                  TOP ACADEMIC ACHIEVERS
                </span>
                <span className="font-mono text-[10px] text-gray-400">IB SCORE AVERAGE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 0, 2].map((idx, pos) => {
                  const entry = rankData[idx]
                  if (!entry) return null
                  const isFirst = idx === 0
                  return (
                    <div 
                      key={entry.user_id}
                      className="p-4 rounded border flex items-center justify-between transition-all"
                      style={{ 
                        background: isFirst ? (isDark ? '#232228' : '#F7F6F3') : 'transparent',
                        borderColor: isFirst ? theme.textPrimary : theme.border,
                        borderRadius: '6px'
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={entry.nama} photo={entry.photo} size={36} theme={theme} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: theme.textPrimary }}>
                            {entry.nama}
                          </p>
                          <RankBadge rank={idx + 1} isDark={isDark} />
                        </div>
                      </div>

                      <div className="text-right pl-2">
                        <span className="font-mono text-base font-bold" style={{ color: theme.textPrimary }}>
                          {entry.avg?.toFixed(2) ?? '—'}
                        </span>
                        <span className="block font-mono text-[9px] text-gray-400 uppercase">AVG</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full Cohort Matrix Table */}
          <div 
            className="rounded-lg border overflow-hidden"
            style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: theme.textPrimary }}>
                Cohort Register Matrix ({kelasName})
              </span>
              <span className="font-mono text-[10px] text-gray-400">
                TOTAL: {rankData.length} STUDENTS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                    <th className="py-2.5 px-3 text-center w-16 text-[10px] font-semibold text-gray-400 uppercase">Rank</th>
                    <th className="py-2.5 px-4 min-w-[180px] text-[10px] font-semibold text-gray-400 uppercase">Student Name</th>
                    {subjects.map(s => (
                      <th key={s.id} className="py-2.5 px-2 text-center text-[10px] font-semibold text-gray-400 uppercase max-w-[80px] truncate" title={s.name}>
                        {s.name.length > 8 ? s.name.slice(0, 8) + '..' : s.name}
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-center text-[10px] font-bold uppercase" style={{ color: theme.blueText, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(31,108,159,0.05)' }}>
                      Overall Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankData.map((row, i) => (
                    <tr 
                      key={row.user_id}
                      className="border-b transition-colors"
                      style={{ 
                        borderColor: theme.border,
                        background: i < 3 ? (isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA') : 'transparent' 
                      }}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <RankBadge rank={row.rank} isDark={isDark} />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.nama} photo={row.photo} size={24} theme={theme} />
                          <span className="font-sans font-semibold text-xs truncate" style={{ color: theme.textPrimary }}>
                            {row.nama}
                          </span>
                        </div>
                      </td>
                      {subjects.map(s => (
                        <td key={s.id} className="py-2.5 px-2 text-center">
                          <ScorePill score={row.scores?.[s.id] ?? null} theme={theme} isDark={isDark} />
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-center font-bold" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(31,108,159,0.04)' }}>
                        <span style={{ color: theme.textPrimary }}>
                          {row.avg !== null ? row.avg.toFixed(2) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 02. PER SUBJECT BREAKDOWN ── */}
      {hasData && !loading && viewMode === 'subject' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectRankings.map(({ subject, rows, topScore, avg }) => (
            <div 
              key={subject.id}
              className="rounded-lg border overflow-hidden flex flex-col justify-between"
              style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
            >
              <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
                <span className="text-xs font-bold truncate" style={{ color: theme.textPrimary }}>
                  {subject.name}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="px-1.5 py-0.2 rounded border font-semibold" style={{ background: theme.yellowBg, color: theme.yellowText, borderColor: theme.border }}>
                    MAX: {topScore ?? '—'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded border" style={{ borderColor: theme.border, color: theme.textSecondary }}>
                    AVG: {avg}
                  </span>
                </div>
              </div>

              <div className="p-0 max-h-[320px] overflow-y-auto custom-scrollbar">
                {rows.length === 0 ? (
                  <p className="p-4 text-xs font-mono text-gray-400 text-center">No grades logged.</p>
                ) : (
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                        <th className="py-2 px-3 text-center w-12 text-[10px] text-gray-400">#</th>
                        <th className="py-2 px-3 text-[10px] text-gray-400">Student</th>
                        <th className="py-2 px-3 text-center w-16 text-[10px] text-gray-400">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.user_id} className="border-b" style={{ borderColor: theme.border }}>
                          <td className="py-2 px-3 text-center">
                            <span className="font-mono text-[10px] text-gray-400">#{row.rank}</span>
                          </td>
                          <td className="py-2 px-3 truncate">
                            <span className="font-sans font-medium text-xs" style={{ color: theme.textPrimary }}>
                              {row.nama}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <ScorePill score={row.score} theme={theme} isDark={isDark} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 03. STATISTICS & CRITERIA METRICS ── */}
      {hasData && !loading && viewMode === 'stats' && (() => {
        const ibDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
        let totalPairs = 0
        for (const row of rankData) {
          for (const s of subjects) {
            const sc = row.scores?.[s.id]
            if (sc !== null && sc !== undefined) { ibDist[sc] = (ibDist[sc]||0)+1; totalPairs++ }
          }
        }
        const belowAvg3 = rankData.filter(r => r.avg !== null && r.avg < 3)
        const schoolEntries = Object.entries(schoolCriteria)
        const maxIBCount = Math.max(...Object.values(ibDist), 1)

        const barColor = (v) => v === null ? '#EAEAEA' : v < 3 ? '#9F2F2D' : v < 5 ? '#956400' : '#346538'
        const CritBar = ({ label, val, show }) => !show ? null : (
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="w-4 font-bold text-[10px]" style={{ color: theme.textSecondary }}>{label}</span>
            <div className="flex-1 h-3 rounded overflow-hidden" style={{ background: theme.subtleBg }}>
              <div 
                className="h-full rounded transition-all duration-300"
                style={{ 
                  width: `${val === null ? 0 : (val / 8) * 100}%`, 
                  background: isDark ? '#7CB8DC' : '#1F6C9F' 
                }} 
              />
            </div>
            <span className="w-8 font-bold text-[10px] text-right" style={{ color: theme.textPrimary }}>
              {val ?? '—'}
            </span>
          </div>
        )

        return (
          <div className="space-y-6">
            {/* IB Distribution Chart */}
            <div 
              className="p-5 rounded-lg border"
              style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider block" style={{ color: theme.textPrimary }}>
                    IB Final Grade Frequency Distribution
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">
                    Total sample size: {totalPairs} student-subject data points
                  </span>
                </div>
                {belowAvg3.length > 0 && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded border text-red-600 dark:text-red-400" style={{ background: theme.redBg, borderColor: theme.border }}>
                    {belowAvg3.length} students &lt; IB 3.0
                  </span>
                )}
              </div>

              {/* Bar distribution */}
              <div className="flex items-end gap-3 h-28 pt-4">
                {[1, 2, 3, 4, 5, 6, 7].map(lv => {
                  const count = ibDist[lv] || 0
                  const pct = (count / maxIBCount) * 80
                  return (
                    <div key={lv} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{count}</span>
                      <div className="w-full flex items-end justify-center h-20 rounded" style={{ background: theme.subtleBg }}>
                        <div 
                          className="w-full rounded transition-all duration-300" 
                          style={{ 
                            height: `${pct}%`, 
                            background: lv >= 6 ? (isDark ? '#7BAF7B' : '#346538') : lv >= 4 ? (isDark ? '#7CB8DC' : '#1F6C9F') : (isDark ? '#DC8585' : '#9F2F2D')
                          }} 
                        />
                      </div>
                      <span className="font-mono text-[10px] font-bold" style={{ color: theme.textPrimary }}>
                        IB {lv}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* School-Wide Benchmark Comparison */}
            <div 
              className="p-5 rounded-lg border"
              style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: theme.border }}>
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider block" style={{ color: theme.textPrimary }}>
                    School-Wide Subject Criteria Benchmarks ({yearName} Sem {selSem})
                  </span>
                  <span className="font-mono text-[10px] text-gray-400">
                    Averaged across all class sections
                  </span>
                </div>
                {schoolLoading && <span className="font-mono text-[10px] text-gray-400">Synthesizing...</span>}
              </div>

              {schoolLoaded && schoolEntries.length === 0 && (
                <p className="font-mono text-xs text-gray-400 p-4 text-center">No school-wide comparative data available.</p>
              )}

              {schoolLoaded && schoolEntries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolEntries.map(([sid, c]) => (
                    <div 
                      key={sid} 
                      className="p-3.5 rounded border"
                      style={{ borderColor: theme.border, background: theme.subtleBg, borderRadius: '6px' }}
                    >
                      <p className="font-sans font-bold text-xs mb-2.5 truncate" style={{ color: theme.textPrimary }}>
                        {c.name}
                      </p>
                      <CritBar label="A" val={c.avgA} show={c.hasA} />
                      <CritBar label="B" val={c.avgB} show={c.hasB} />
                      <CritBar label="C" val={c.avgC} show={c.hasC} />
                      <CritBar label="D" val={c.avgD} show={c.hasD} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Empty Placeholder */}
      {!loading && !hasData && (
        <div className="p-16 text-center border rounded-lg" style={{ background: theme.cardBg, borderColor: theme.border, borderRadius: '8px' }}>
          <div className="w-10 h-10 mx-auto mb-3 rounded border flex items-center justify-center font-mono" style={{ borderColor: theme.border, background: theme.subtleBg }}>
            <FontAwesomeIcon icon={faTrophy} className="text-gray-400" />
          </div>
          <h3 className="text-sm font-bold tracking-tight mb-1" style={{ color: theme.textPrimary }}>
            {canGenerate ? 'Cohort Parameters Configured' : 'Select Cohort Parameters'}
          </h3>
          <p className="font-mono text-xs max-w-sm mx-auto" style={{ color: theme.textSecondary }}>
            {canGenerate 
              ? 'Click "Generate Analysis" above to calculate IB scores and cohort standings.' 
              : 'Choose Academic Year, Semester, and Target Class to load the cohort matrix.'}
          </p>
        </div>
      )}

    </div>
  )
}
