'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
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

  const [years, setYears]           = useState([])
  const [kelasOptions, setKelasOptions] = useState([])
  const [selYear, setSelYear]       = useState('')
  const [selSem, setSelSem]         = useState('')
  const [selKelas, setSelKelas]     = useState('')
  const [rankData, setRankData]     = useState([])
  const [subjects, setSubjects]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')

  useEffect(() => {
    supabase.from('year').select('year_id, year_name').order('year_name', { ascending: false })
      .then(({ data }) => setYears(data || []))
  }, [])

  useEffect(() => {
    if (!selYear) { setKelasOptions([]); setSelKelas(''); return }
    supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', selYear).order('kelas_nama')
      .then(({ data }) => { setKelasOptions(data || []); setSelKelas('') })
  }, [selYear])

  useEffect(() => { setRankData([]); setSubjects([]); setErrorMsg('') }, [selYear, selSem, selKelas])

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
      if (!siswaData?.length) { setErrorMsg('Tidak ada siswa di kelas ini.'); return }

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
      if (!printable.length) { setErrorMsg('Tidak ada mata pelajaran yang aktif.'); return }

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
      for (const g of gradeRows) {
        const dkId = assDkMap[g.assessment_id]
        if (!studentGrades[g.detail_siswa_id]) studentGrades[g.detail_siswa_id] = {}
        if (!studentGrades[g.detail_siswa_id][dkId]) studentGrades[g.detail_siswa_id][dkId] = []
        studentGrades[g.detail_siswa_id][dkId].push(g)
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
    } catch (e) {
      console.error(e)
      setErrorMsg('Gagal memuat data: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  const [viewMode, setViewMode] = useState('overall') // 'overall' | 'subject'

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
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>🏆 Student Ranking</h1>
            <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 3 }}>Peringkat siswa berdasarkan rata-rata IB Score seluruh mata pelajaran</p>
          </div>
          {hasData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: theme.subtleBg, border: `1px solid ${theme.border}`, fontSize: 12, color: theme.textSecondary }}>
              {kelasName} · {yearName} · Semester {selSem}
            </div>
          )}
        </div>

        {/* Filter Card */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="pt-5 pb-5">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
              <FilterSelect label="Academic Year" value={selYear} onChange={setSelYear} theme={theme}>
                <option value="">— Select Year —</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </FilterSelect>
              <FilterSelect label="Semester" value={selSem} onChange={setSelSem} theme={theme}>
                <option value="">— Select Semester —</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </FilterSelect>
              <FilterSelect label="Class" value={selKelas} onChange={setSelKelas} disabled={!selYear} theme={theme}>
                <option value="">— Select Class —</option>
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
                {loading ? '⏳ Loading…' : '📊 Generate Ranking'}
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
            <StatCard label="Total Students" value={rankData.length} icon="👥" color="#6366f1" theme={theme} />
            <StatCard label="Top Score"      value={topAvg}          icon="🥇" color="#f59e0b" theme={theme} />
            <StatCard label="Class Average"  value={avgAll}          icon="📈" color="#10b981" theme={theme} />
            <StatCard label="Subjects"       value={subjects.length} icon="📚" color="#0ea5e9" theme={theme} />
          </div>
        )}

        {/* View Mode Tabs */}
        {hasData && !loading && (
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: theme.subtleBg, border: `1px solid ${theme.border}`, width: 'fit-content' }}>
            {[{ key: 'overall', label: '📊 Overall Ranking' }, { key: 'subject', label: '📚 Per Subject' }].map(tab => (
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
                  <p style={{ fontSize: 10, fontWeight: 700, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Top 3 Podium</p>
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
                <CardTitle style={{ color: theme.textPrimary, fontSize: 15 }}>Full Rankings — {kelasName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: theme.subtleBg, borderBottom: `2px solid ${theme.border}` }}>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 11, width: 56 }}>Rank</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11, minWidth: 170 }}>Student</th>
                        {subjects.map(s => (
                          <th key={s.id} title={s.name} style={{ padding: '10px 6px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, maxWidth: 72 }}>
                            {s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name}
                          </th>
                        ))}
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: '#6366f1', fontWeight: 700, fontSize: 11, background: 'rgba(99,102,241,0.07)', minWidth: 60 }}>Avg</th>
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
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: '#fef9c3', color: '#a16207', fontWeight: 700 }}>Top: {topScore ?? '—'}</span>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: theme.subtleBg, color: theme.textSecondary, fontWeight: 600 }}>Avg: {avg}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <p style={{ padding: '14px 16px', fontSize: 12, color: theme.textSecondary }}>Belum ada nilai untuk mata pelajaran ini.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: theme.subtleBg, borderBottom: `1px solid ${theme.border}` }}>
                          <th style={{ padding: '7px 10px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, width: 44 }}>Rank</th>
                          <th style={{ padding: '7px 10px', textAlign: 'left',   color: theme.textSecondary, fontWeight: 600, fontSize: 10 }}>Student</th>
                          <th style={{ padding: '7px 10px', textAlign: 'center', color: theme.textSecondary, fontWeight: 600, fontSize: 10, width: 60 }}>Score</th>
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

        {/* Empty state */}
        {!loading && !hasData && (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>
              {canGenerate ? 'Klik "Generate Ranking" untuk memulai' : 'Lengkapi semua filter di atas'}
            </p>
            <p style={{ fontSize: 13, color: theme.textSecondary }}>
              {canGenerate
                ? 'Ranking berdasarkan rata-rata IB Score semua mata pelajaran yang aktif'
                : 'Pilih Tahun Ajaran, Semester, dan Kelas terlebih dahulu'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
