'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
// Use native select for reliability here
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'

export default function ConsultationPage() {
  const router = useRouter()
  const [years, setYears] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])

  const [yearId, setYearId] = useState('')
  const [kelasId, setKelasId] = useState('')
  const [detailSiswaId, setDetailSiswaId] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState('private')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  // List state
  const [consultations, setConsultations] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [total, setTotal] = useState(0)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editYearId, setEditYearId] = useState('')
  const [editKelasId, setEditKelasId] = useState('')
  const [editDetailSiswaId, setEditDetailSiswaId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState('private')
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editClasses, setEditClasses] = useState([])
  const [editStudents, setEditStudents] = useState([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    // Access guard: only counselors
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null
      const user = raw ? JSON.parse(raw) : null
      const isAdmin = !!user?.isAdmin
      const isCounselor = !!user?.isCounselor
      let hasMenuAccess = false
      try {
        const roleName = user?.roleName || localStorage.getItem('user_role') || ''
        const cacheKey = roleName ? `allowed_menu_paths:${roleName}` : null
        const cached = cacheKey ? sessionStorage.getItem(cacheKey) : null
        if (cached) {
          const arr = JSON.parse(cached)
          hasMenuAccess = Array.isArray(arr) && arr.some(p => p === '/data/consultation' || p?.startsWith('/data/consultation/'))
        }
      } catch {}
      if (!user || (!isCounselor && !isAdmin && !hasMenuAccess)) {
        router.replace('/dashboard?forbidden=1')
        return
      }
    } catch {}
    loadYears()
  }, [])

  useEffect(() => {
    if (!yearId) { setClasses([]); setKelasId(''); setStudents([]); setDetailSiswaId(''); return }
    loadClasses(yearId)
  }, [yearId])

  useEffect(() => {
    if (!kelasId) { setStudents([]); setDetailSiswaId(''); return }
    loadStudents(kelasId)
  }, [kelasId])

  // Reload list when filters/page change
  useEffect(() => {
    loadConsultations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId, kelasId, detailSiswaId, page])

  async function loadYears() {
    const { data, error } = await supabase.from('year').select('year_id, year_name').order('year_name')
    if (!error) setYears(data || [])
  }

  async function loadClasses(yid) {
    const { data, error } = await supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', yid).order('kelas_nama')
    if (!error) setClasses(data || [])
  }

  async function loadStudents(kid) {
    const { data, error } = await supabase
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_user_id')
      .eq('detail_siswa_kelas_id', kid)
    if (error) return setStudents([])
    const ids = (data || []).map(d => d.detail_siswa_user_id)
    if (ids.length === 0) { setStudents([]); return }
    const { data: users } = await supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').in('user_id', ids)
    const nameMap = new Map((users || []).map(u => [u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()]))
    const merged = (data || []).map(d => ({ detail_siswa_id: d.detail_siswa_id, user_id: d.detail_siswa_user_id, nama: nameMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}` }))
    setStudents(merged)
  }

  async function loadConsultations() {
    setListLoading(true)
    try {
      let query = supabase
        .from('consultation')
        .select('consultation_id, consultation_date, consultation_type, consultation_year_id, consultation_kelas_id, consultation_detail_siswa_id, consultation_title, consultation_notes', { count: 'exact' })

      if (yearId) query = query.eq('consultation_year_id', Number(yearId))
      if (kelasId) query = query.eq('consultation_kelas_id', Number(kelasId))
      if (detailSiswaId) query = query.eq('consultation_detail_siswa_id', Number(detailSiswaId))

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('consultation_date', { ascending: false })
        .range(from, to)

      if (error) throw new Error(error.message)
      setTotal(count || 0)

      const rows = data || []
      if (rows.length === 0) { setConsultations([]); return }

      // Load kelas names
      const kelasIds = [...new Set(rows.map(r => r.consultation_kelas_id).filter(Boolean))]
      let kelasMap = new Map()
      if (kelasIds.length > 0) {
        const { data: kelasRows } = await supabase.from('kelas').select('kelas_id, kelas_nama').in('kelas_id', kelasIds)
        kelasMap = new Map((kelasRows || []).map(k => [k.kelas_id, k.kelas_nama]))
      }

      // Load student names via detail_siswa -> users
      const dsIds = [...new Set(rows.map(r => r.consultation_detail_siswa_id).filter(Boolean))]
      let studentNameMap = new Map()
      if (dsIds.length > 0) {
        const { data: dsRows } = await supabase.from('detail_siswa').select('detail_siswa_id, detail_siswa_user_id').in('detail_siswa_id', dsIds)
        const userIds = [...new Set((dsRows || []).map(d => d.detail_siswa_user_id))]
        let userMap = new Map()
        if (userIds.length > 0) {
          const { data: users } = await supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').in('user_id', userIds)
          userMap = new Map((users || []).map(u => [u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()]))
        }
        studentNameMap = new Map((dsRows || []).map(d => [d.detail_siswa_id, userMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}`]))
      }

      const withNames = rows.map(r => ({
        ...r,
        kelas_nama: kelasMap.get(r.consultation_kelas_id) || `Kelas ${r.consultation_kelas_id}`,
        siswa_nama: studentNameMap.get(r.consultation_detail_siswa_id) || `Siswa ${r.consultation_detail_siswa_id}`,
      }))
      setConsultations(withNames)
    } catch (e) {
      setError(e.message)
    } finally {
      setListLoading(false)
    }
  }

  // Edit helpers
  async function loadEditClasses(yid) {
    const { data } = await supabase.from('kelas').select('kelas_id, kelas_nama').eq('kelas_year_id', yid).order('kelas_nama')
    setEditClasses(data || [])
  }
  async function loadEditStudents(kid) {
    const { data } = await supabase
      .from('detail_siswa')
      .select('detail_siswa_id, detail_siswa_user_id')
      .eq('detail_siswa_kelas_id', kid)
    const ids = (data || []).map(d => d.detail_siswa_user_id)
    if (ids.length === 0) { setEditStudents([]); return }
    const { data: users } = await supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').in('user_id', ids)
    const nameMap = new Map((users || []).map(u => [u.user_id, `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()]))
    const merged = (data || []).map(d => ({ detail_siswa_id: d.detail_siswa_id, user_id: d.detail_siswa_user_id, nama: nameMap.get(d.detail_siswa_user_id) || `User ${d.detail_siswa_user_id}` }))
    setEditStudents(merged)
  }

  function openEdit(row) {
    setEditId(row.consultation_id)
    setEditYearId(String(row.consultation_year_id || ''))
    setEditKelasId(String(row.consultation_kelas_id || ''))
    setEditDetailSiswaId(String(row.consultation_detail_siswa_id || ''))
    setEditDate(row.consultation_date || '')
    setEditType(row.consultation_type || 'private')
    setEditTitle(row.consultation_title || '')
    setEditNotes(row.consultation_notes || '')
    // preload lists
    if (row.consultation_year_id) loadEditClasses(row.consultation_year_id)
    if (row.consultation_kelas_id) loadEditStudents(row.consultation_kelas_id)
    setEditOpen(true)
  }

  async function saveEdit() {
    setEditSaving(true)
    setError(''); setOk('')
    try {
      if (!editYearId || !editKelasId || !editDetailSiswaId || !editDate || !editType) throw new Error('Lengkapi semua field')
      const payload = {
        consultation_date: editDate,
        consultation_type: editType,
        consultation_year_id: Number(editYearId),
        consultation_kelas_id: Number(editKelasId),
        consultation_detail_siswa_id: Number(editDetailSiswaId),
        consultation_title: editTitle || null,
        consultation_notes: editNotes || null,
      }
      const { error } = await supabase.from('consultation').update(payload).eq('consultation_id', editId)
      if (error) throw new Error(error.message)
      setOk('Perubahan disimpan')
      setEditOpen(false)
      loadConsultations()
    } catch (e) {
      setError(e.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function removeRow(row) {
    if (!window.confirm('Hapus konsultasi ini?')) return
    try {
      const { error } = await supabase.from('consultation').delete().eq('consultation_id', row.consultation_id)
      if (error) throw new Error(error.message)
      setOk('Data dihapus')
      // if page becomes empty after delete, go back a page
      const remaining = consultations.length - 1
      if (remaining === 0 && page > 1) setPage(p => p - 1)
      else loadConsultations()
    } catch (e) {
      setError(e.message)
    }
  }

  async function save() {
    setError(''); setOk('')
    if (!yearId || !kelasId || !detailSiswaId || !date || !type) {
      setError('Lengkapi semua field');
      return
    }
    setSaving(true)
    try {
      const payload = {
        consultation_date: date,
        consultation_type: type,
        consultation_year_id: Number(yearId),
        consultation_kelas_id: Number(kelasId),
        consultation_detail_siswa_id: Number(detailSiswaId),
        consultation_title: title || null,
        consultation_notes: notes || null,
      }
      const { error } = await supabase.from('consultation').insert([payload])
      if (error) throw new Error(error.message)
  setOk('Tersimpan')
      setTitle(''); setNotes('')
  // Refresh list
  setPage(1)
  await loadConsultations()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="p-2 rounded bg-red-50 text-red-700">{error}</div>}
          {ok && <div className="p-2 rounded bg-green-50 text-green-700">{ok}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Academic Year</Label>
              <select value={yearId} onChange={e => setYearId(e.target.value)} className="w-full h-10 border rounded-md px-3 text-sm">
                <option value="">- Pilih Tahun -</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Class</Label>
              <select value={kelasId} onChange={e => setKelasId(e.target.value)} disabled={!yearId} className="w-full h-10 border rounded-md px-3 text-sm disabled:bg-gray-100">
                <option value="">- Pilih Kelas -</option>
                {classes.map(k => (
                  <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Student</Label>
              <select value={detailSiswaId} onChange={e => setDetailSiswaId(e.target.value)} disabled={!kelasId} className="w-full h-10 border rounded-md px-3 text-sm disabled:bg-gray-100">
                <option value="">- Pilih Siswa -</option>
                {students.map(s => (
                  <option key={s.detail_siswa_id} value={s.detail_siswa_id}>{s.nama}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tanggal Konsultasi</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Jenis</Label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full h-10 border rounded-md px-3 text-sm">
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <Label>Judul (opsional)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ringkas" />
            </div>
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <textarea className="w-full border rounded p-2" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detail konsultasi"></textarea>
          </div>
          <div>
            <Button disabled={saving} onClick={save}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </CardContent>
      </Card>
      {/* List Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daftar Konsultasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
            <div>
              Filter: {yearId ? `Tahun ${years.find(y=>String(y.year_id)===String(yearId))?.year_name}` : 'Semua Tahun'}
              {kelasId ? `, Kelas ${classes.find(k=>String(k.kelas_id)===String(kelasId))?.kelas_nama}` : ''}
              {detailSiswaId ? `, Siswa ${students.find(s=>String(s.detail_siswa_id)===String(detailSiswaId))?.nama}` : ''}
            </div>
            <div>
              <Button variant="secondary" onClick={() => { setPage(1); loadConsultations() }} disabled={listLoading}>Refresh</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">Jenis</th>
                  <th className="p-2 border">Kelas</th>
                  <th className="p-2 border">Siswa</th>
                  <th className="p-2 border">Judul</th>
                  <th className="p-2 border">Catatan</th>
                  <th className="p-2 border w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {listLoading && (
                  <tr><td colSpan={7} className="p-3 text-center">Memuat...</td></tr>
                )}
                {!listLoading && consultations.length === 0 && (
                  <tr><td colSpan={7} className="p-3 text-center text-gray-500">Tidak ada data</td></tr>
                )}
                {!listLoading && consultations.map(row => (
                  <tr key={row.consultation_id} className="hover:bg-gray-50">
                    <td className="p-2 border">{row.consultation_date}</td>
                    <td className="p-2 border capitalize">{row.consultation_type}</td>
                    <td className="p-2 border">{row.kelas_nama}</td>
                    <td className="p-2 border">{row.siswa_nama}</td>
                    <td className="p-2 border">{row.consultation_title || '-'}</td>
                    <td className="p-2 border">{row.consultation_notes || '-'}</td>
                    <td className="p-2 border">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openEdit(row)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => removeRow(row)}>Hapus</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-sm">
            <div>Total: {total}</div>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <span>Hal {page}</span>
              <Button variant="secondary" disabled={page * pageSize >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Konsultasi" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Academic Year</Label>
              <select value={editYearId} onChange={async e => { const v = e.target.value; setEditYearId(v); setEditKelasId(''); setEditDetailSiswaId(''); setEditStudents([]); if (v) await loadEditClasses(Number(v)); }} className="w-full h-10 border rounded-md px-3 text-sm">
                <option value="">- Pilih Tahun -</option>
                {years.map(y => (
                  <option key={y.year_id} value={y.year_id}>{y.year_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Class</Label>
              <select value={editKelasId} onChange={async e => { const v = e.target.value; setEditKelasId(v); setEditDetailSiswaId(''); if (v) await loadEditStudents(Number(v)); }} disabled={!editYearId} className="w-full h-10 border rounded-md px-3 text-sm disabled:bg-gray-100">
                <option value="">- Pilih Kelas -</option>
                {editClasses.map(k => (
                  <option key={k.kelas_id} value={k.kelas_id}>{k.kelas_nama}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Student</Label>
              <select value={editDetailSiswaId} onChange={e => setEditDetailSiswaId(e.target.value)} disabled={!editKelasId} className="w-full h-10 border rounded-md px-3 text-sm disabled:bg-gray-100">
                <option value="">- Pilih Siswa -</option>
                {editStudents.map(s => (
                  <option key={s.detail_siswa_id} value={s.detail_siswa_id}>{s.nama}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tanggal Konsultasi</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div>
              <Label>Jenis</Label>
              <select value={editType} onChange={e => setEditType(e.target.value)} className="w-full h-10 border rounded-md px-3 text-sm">
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <Label>Judul (opsional)</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Ringkas" />
            </div>
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <textarea className="w-full border rounded p-2" rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Detail konsultasi"></textarea>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
