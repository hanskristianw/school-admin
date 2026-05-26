'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardContent } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faClipboardList, faClock, faCheckCircle, faTimesCircle, faExclamationTriangle, faEye, faSpinner } from '@fortawesome/free-solid-svg-icons'

const STATUS_META = {
  draft:    { label: 'Draft',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  pending:  { label: 'Menunggu',      color: '#d97706', bg: 'rgba(217,119,6,0.12)'   },
  revision: { label: 'Revisi',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  approved: { label: 'Disetujui',     color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  rejected: { label: 'Ditolak',       color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   },
}

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, whiteSpace: 'nowrap' }}>{m.label}</span>
  )
}

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function FpbListPage() {
  const { theme } = useTheme()
  const router    = useRouter()
  const [tab, setTab]         = useState('mine')
  const [myFpbs, setMyFpbs]   = useState([])
  const [pendingFpbs, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState(null)

  useEffect(() => {
    const uid = parseInt(localStorage.getItem('kr_id'))
    if (uid) { setUserId(uid); fetchAll(uid) }
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)
    try {
      // My submissions
      const { data: mine } = await supabase
        .from('fpb')
        .select(`fpb_id, fpb_number, status, grand_total, usage_date, division, revision_count, created_at,
                 fpb_types(type_name, type_code)`)
        .eq('submitted_by', uid)
        .order('created_at', { ascending: false })
      setMyFpbs(mine || [])

      // Pending my approval
      const { data: approvals } = await supabase
        .from('fpb_approvals')
        .select(`fpb_id, step_order, step_name,
                 fpb(fpb_id, fpb_number, status, grand_total, usage_date, division, current_step,
                     fpb_types(type_name), submitted_by,
                     users!fpb_submitted_by_fkey(user_nama_depan, user_nama_belakang))`)
        .eq('approver_user_id', uid)
        .eq('status', 'pending')
      // Filter: only show if it's the current step
      const pending = (approvals || [])
        .filter(a => a.fpb?.current_step === a.step_order && a.fpb?.status === 'pending')
        .map(a => ({ ...a.fpb, my_step: a.step_order, my_step_name: a.step_name }))
      setPending(pending)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const tabs = [
    { key: 'mine',    label: 'Pengajuan Saya',       icon: faClipboardList, count: myFpbs.length },
    { key: 'pending', label: 'Menunggu Approval Saya', icon: faClock,         count: pendingFpbs.length },
  ]

  const FpbRow = ({ f, isPending }) => (
    <tr style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
      onClick={() => router.push(`/data/fpb/${f.fpb_id}`)}
      onMouseEnter={e => e.currentTarget.style.background = theme.subtleBg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 13 }}>{f.fpb_number || '—'}</div>
        <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{f.fpb_types?.type_name}</div>
      </td>
      <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textSecondary }}>{f.division || '—'}</td>
      {isPending && (
        <td style={{ padding: '12px 14px', fontSize: 13 }}>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>Step {f.my_step}</span>
          <div style={{ fontSize: 11, color: theme.textSecondary }}>{f.my_step_name}</div>
        </td>
      )}
      <td style={{ padding: '12px 14px', fontSize: 13, color: theme.textPrimary, fontWeight: 600 }}>{fmt(f.grand_total)}</td>
      <td style={{ padding: '12px 14px', fontSize: 12, color: theme.textSecondary }}>{fmtDate(f.usage_date)}</td>
      <td style={{ padding: '12px 14px' }}><StatusBadge status={f.status} /></td>
      {!isPending && (
        <td style={{ padding: '12px 14px', fontSize: 11, color: theme.textSecondary }}>
          {f.revision_count > 0 ? `Revisi ke-${f.revision_count}` : ''}
        </td>
      )}
      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
        <button onClick={e => { e.stopPropagation(); router.push(`/data/fpb/${f.fpb_id}`) }}
          style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${theme.border}`,
            background: theme.cardBg, color: theme.textSecondary, fontSize: 12, cursor: 'pointer' }}>
          <FontAwesomeIcon icon={faEye} style={{ marginRight: 5 }} />Lihat
        </button>
      </td>
    </tr>
  )

  const currentList = tab === 'mine' ? myFpbs : pendingFpbs

  return (
    <div style={{ padding: '28px 32px', background: theme.pageBg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>
            📋 Formulir Pembelian Barang
          </h1>
          <p style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
            Kelola pengajuan pembelian barang dan approval workflow
          </p>
        </div>
        <button onClick={() => router.push('/data/fpb/create')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
            border: 'none', background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}>
          <FontAwesomeIcon icon={faPlus} />Buat FPB Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Pengajuan', value: myFpbs.length, color: '#6366f1' },
          { label: 'Menunggu Approval', value: myFpbs.filter(f => f.status === 'pending').length, color: '#d97706' },
          { label: 'Perlu Direvisi', value: myFpbs.filter(f => f.status === 'revision').length, color: '#f59e0b' },
          { label: 'Disetujui', value: myFpbs.filter(f => f.status === 'approved').length, color: '#059669' },
          { label: 'Menunggu Saya', value: pendingFpbs.length, color: '#8b5cf6' },
        ].map(c => (
          <Card key={c.label} style={{ background: theme.cardBg, borderColor: theme.border }}>
            <CardContent className="pt-4 pb-3">
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: theme.subtleBg,
        border: `1px solid ${theme.border}`, width: 'fit-content', marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7,
              border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.key ? theme.cardBg : 'transparent',
              color: tab === t.key ? theme.textPrimary : theme.textSecondary,
              boxShadow: tab === t.key ? `0 1px 4px rgba(0,0,0,0.08)` : 'none' }}>
            <FontAwesomeIcon icon={t.icon} />
            {t.label}
            {t.count > 0 && (
              <span style={{ padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 800,
                background: tab === t.key ? '#6366f1' : theme.subtleBg,
                color: tab === t.key ? '#fff' : theme.textSecondary }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardContent className="p-0">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 24 }} />
              <p style={{ marginTop: 10 }}>Memuat data...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 700, color: theme.textPrimary, fontSize: 15, marginBottom: 6 }}>
                {tab === 'mine' ? 'Belum ada FPB yang diajukan' : 'Tidak ada FPB yang menunggu approval Anda'}
              </p>
              <p style={{ color: theme.textSecondary, fontSize: 13 }}>
                {tab === 'mine' ? 'Klik "Buat FPB Baru" untuk membuat pengajuan pertama Anda' : 'Semua sudah diproses!'}
              </p>
              {tab === 'mine' && (
                <button onClick={() => router.push('/data/fpb/create')}
                  style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', color: '#fff',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Buat FPB Baru
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: theme.subtleBg, borderBottom: `2px solid ${theme.border}` }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Nomor FPB</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Divisi</th>
                    {tab === 'pending' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Step Saya</th>}
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Grand Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Tgl Kebutuhan</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}>Status</th>
                    {tab === 'mine' && <th style={{ padding: '10px 14px', textAlign: 'left', color: theme.textSecondary, fontWeight: 600, fontSize: 11 }}></th>}
                    <th style={{ padding: '10px 14px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map(f => <FpbRow key={f.fpb_id} f={f} isPending={tab === 'pending'} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
