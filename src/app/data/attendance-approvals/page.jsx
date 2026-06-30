'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'

const CATEGORY_LABEL = {
  // Late / Leave Early
  woke_up_late:          'Woke Up Late',
  traffic_jam:           'Traffic Jam / Transportation Issue',
  sick:                  'Sick / Unwell',
  family_personal:       'Family / Personal Matter',
  // Absent — Sakit
  sick_no_letter:        'Sick without letter (unpaid)',
  sick_with_letter:      'Sick with letter & diagnosis from doctor',
  // Absent — Cuti keluarga
  marriage_employee:     "Employee's marriage leave (max 3 days)",
  marriage_child:        "Employee's child(ren) marriage (max 2 days)",
  bereavement_core:      'Bereavement — immediate family (max 2 days)',
  bereavement_sibling:   'Bereavement — sibling by blood, same house (max 1 day)',
  childbirth:            "Wife gives birth or miscarriage (max 2 days)",
  circumcision_child:    "Circumcise employee's child (max 2 days)",
  baptism_child:         "Baptize employee's child (max 2 days)",
  // Absent — Tugas / diklat
  ib_trainer:            'Official IB Trainer / Examiner',
  school_duty:           'School Duty — Training / Workshop',
  // Absent — Cuti
  annual_leave:          'Annual Leave (12 days)',
  unpaid_leave:          'Unpaid Personal Leave',
  // No scan
  forgot_scan:           'Forgot to check in/out',
  scanned_not_recorded:  'Already scanned but not recorded',
  // Common
  other:                 'Other',
}

const TYPE_LABEL = {
  late:        'Terlambat',
  leave_early: 'Pulang Awal',
  absent:      'Tidak Masuk',
  no_checkin:  'Tidak Check-In',
  no_checkout: 'Tidak Check-Out',
}

function fmtMins(m) {
  if (!m) return null
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}j ${min}m` : `${min} menit`
}

export default function AttendanceApprovalsPage() {
  const { theme } = useTheme()
  const router = useRouter()

  const [userId, setUserId]         = useState(null)
  const [tab, setTab]               = useState('pending') // pending | done
  const [excuses, setExcuses]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState(null)  // excuse id being acted on
  const [noteMap, setNoteMap]       = useState({})    // id → note text
  const [msg, setMsg]               = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const id = localStorage.getItem('kr_id')
    if (!id) { router.replace('/login'); return }
    setUserId(parseInt(id, 10))
  }, [router])

  useEffect(() => {
    if (!userId) return
    fetchExcuses()
  }, [userId])

  const fetchExcuses = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/excuses?approver_id=${userId}`)
      const json = await res.json()
      if (json.success) setExcuses(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  // Determine which excuses need MY action vs already processed
  const pendingItems = excuses.filter(e => {
    if (e.approver1_id === userId && e.status === 'pending') return true
    if (e.approver2_id === userId && e.status === 'approved_1') return true
    return false
  })

  const doneItems = excuses.filter(e => {
    if (e.approver1_id === userId && e.approver1_action !== null) return true
    if (e.approver2_id === userId && e.approver2_action !== null) return true
    return false
  })

  const displayed = tab === 'pending' ? pendingItems : doneItems

  const handleAction = async (excuseId, action) => {
    setActionId(excuseId)
    setMsg('')
    try {
      const res = await fetch(`/api/attendance/excuses/${excuseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: noteMap[excuseId] || '',
          approver_user_id: userId,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setMsg(`✅ Berhasil ${action === 'approved' ? 'menyetujui' : 'menolak'} pengajuan`)
      fetchExcuses()
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('❌ ' + err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (excuseId) => {
    if (!confirm('Hapus pengajuan ini? Tindakan ini tidak bisa dibatalkan.')) return
    setDeletingId(excuseId); setMsg('')
    try {
      const res = await fetch(`/api/attendance/excuses/${excuseId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.message)
      setMsg('✅ Pengajuan berhasil dihapus')
      fetchExcuses()
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('❌ ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const tabStyle = (t) => ({
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: tab === t ? 600 : 400,
    borderBottom: tab === t ? `2px solid ${theme.blueText || '#2563eb'}` : '2px solid transparent',
    color: tab === t ? (theme.blueText || '#2563eb') : theme.textSecondary,
    background: 'transparent',
  })

  const inputStyle = {
    width: '100%',
    background: theme.inputBg || theme.subtleBg,
    border: `1px solid ${theme.border}`,
    color: theme.textBody,
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
  }

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: theme.textBody }}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
          ✅ Approval Surat Keterangan
        </h1>
        <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
          Pengajuan surat keterangan dari karyawan di unit Anda
        </p>
      </div>

      {/* Msg */}
      {msg && (
        <div className="p-3 rounded-lg text-sm" style={{
          background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          color: msg.startsWith('✅') ? '#166534' : '#991b1b',
        }}>{msg}</div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${theme.border}`, display: 'flex' }}>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
          ⏳ Menunggu Saya
          {pendingItems.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
              style={{ background: '#ef4444', color: '#fff' }}>
              {pendingItems.length}
            </span>
          )}
        </button>
        <button style={tabStyle('done')} onClick={() => setTab('done')}>
          📋 Sudah Diproses
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: theme.textSecondary }}>Memuat...</div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center" style={{ color: theme.textSecondary }}>
          <div className="text-4xl mb-3">{tab === 'pending' ? '🎉' : '📭'}</div>
          <p className="text-sm">
            {tab === 'pending' ? 'Tidak ada pengajuan yang perlu diproses' : 'Belum ada riwayat approval'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(e => {
            const isMyApprover1 = e.approver1_id === userId
            const isMyApprover2 = e.approver2_id === userId
            const myStep = isMyApprover1 ? 1 : 2
            const myAction = myStep === 1 ? e.approver1_action : e.approver2_action
            const myNote   = myStep === 1 ? e.approver1_note : e.approver2_note
            const isPending = (myStep === 1 && e.status === 'pending') || (myStep === 2 && e.status === 'approved_1')

            const submitterName = `${e.submitter?.user_nama_depan || ''} ${e.submitter?.user_nama_belakang || ''}`.trim()
            const unitId        = e.submitter?.user_unit_id || '—'

            return (
              <div key={e.id} className="rounded-xl p-5 space-y-3"
                style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>

                {/* Top: submitter info */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: theme.textPrimary }}>
                      {submitterName}
                    </div>
                    <div className="text-xs mt-0.5 flex gap-2" style={{ color: theme.textSecondary }}>
                      <span>Unit {unitId}</span>
                      <span>·</span>
                      <span>{TYPE_LABEL[e.excuse_type] || e.excuse_type}</span>
                      <span>·</span>
                      <span>{e.attendance_date}</span>
                      {e.late_minutes > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-medium" style={{ color: '#92400e' }}>
                            +{fmtMins(e.late_minutes)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Step badge */}
                  <div className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: isPending ? '#dbeafe' : myAction === 'approved' ? '#dcfce7' : '#fee2e2',
                      color:      isPending ? '#1e40af' : myAction === 'approved' ? '#166534' : '#991b1b',
                    }}>
                    {isPending
                      ? `Approver ${myStep} — Menunggu Anda`
                      : myAction === 'approved'
                        ? `Approver ${myStep} — Disetujui`
                        : `Approver ${myStep} — Ditolak`}
                  </div>
                </div>

                {/* Alasan */}
                <div className="text-sm p-3 rounded-lg" style={{ background: theme.subtleBg }}>
                  <div className="text-xs mb-1" style={{ color: theme.textSecondary }}>Alasan:</div>
                  <div style={{ color: theme.textBody }}>
                    {CATEGORY_LABEL[e.category] || e.category}
                    {e.other_reason && <span className="ml-1" style={{ color: theme.textSecondary }}>— {e.other_reason}</span>}
                  </div>
                </div>

                {/* Approval trail */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <span style={{ color: theme.textSecondary }}>A1:</span>
                    <span style={{ color: e.approver1_action === 'approved' ? '#166534' : e.approver1_action === 'rejected' ? '#991b1b' : theme.textSecondary }}>
                      {e.approver1?.user_nama_depan || '—'}
                      {e.approver1_action === 'approved' && ' ✓'}
                      {e.approver1_action === 'rejected' && ' ✗'}
                    </span>
                  </div>
                  {e.approver2_id && (
                    <>
                      <span style={{ color: theme.border }}>→</span>
                      <div className="flex items-center gap-1">
                        <span style={{ color: theme.textSecondary }}>A2:</span>
                        <span style={{ color: e.approver2_action === 'approved' ? '#166534' : e.approver2_action === 'rejected' ? '#991b1b' : theme.textSecondary }}>
                          {e.approver2?.user_nama_depan || '—'}
                          {e.approver2_action === 'approved' && ' ✓'}
                          {e.approver2_action === 'rejected' && ' ✗'}
                        </span>
                      </div>
                    </>
                  )}
                  {!e.approver2_id && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                      1 Approver
                    </span>
                  )}
                </div>

                {/* Action panel (only if pending for me) */}
                {isPending && (
                  <div className="space-y-2 pt-1 border-t" style={{ borderColor: theme.border }}>
                    <label className="text-xs font-medium" style={{ color: theme.textSecondary }}>
                      Catatan (opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tambahkan catatan jika perlu..."
                      value={noteMap[e.id] || ''}
                      onChange={ev => setNoteMap(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      style={{ ...inputStyle, resize: 'none' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(e.id, 'approved')}
                        disabled={actionId === e.id || deletingId === e.id}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: '#16a34a', color: '#fff', opacity: actionId === e.id ? 0.6 : 1 }}
                      >
                        ✅ Setujui
                      </button>
                      <button
                        onClick={() => handleAction(e.id, 'rejected')}
                        disabled={actionId === e.id || deletingId === e.id}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: '#dc2626', color: '#fff', opacity: actionId === e.id ? 0.6 : 1 }}
                      >
                        ❌ Tolak
                      </button>
                      {/* Hapus — hanya tersedia jika masih pending (belum ada approver yang bertindak) */}
                      {e.status === 'pending' && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={actionId === e.id || deletingId === e.id}
                          className="px-3 py-2 rounded-lg text-sm font-semibold"
                          style={{
                            background: theme.subtleBg,
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            opacity: deletingId === e.id ? 0.6 : 1,
                          }}
                          title="Hapus pengajuan"
                        >
                          {deletingId === e.id ? '...' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* If already processed — show my note */}
                {!isPending && myNote && (
                  <div className="text-xs p-2 rounded-lg" style={{ background: theme.subtleBg, color: theme.textSecondary }}>
                    Catatan Anda: {myNote}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
