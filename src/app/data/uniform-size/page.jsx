"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'

export default function UniformSizePage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ size_name: '', display_order: 0, is_active: true })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, active, inactive

  useEffect(() => {
    const loadUnits = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('unit')
          .select('unit_id, unit_name, is_school')
          .order('unit_name')
        if (error) throw error
        const schools = (data || []).filter(u => u.is_school)
        setUnits(schools)
        if (schools.length && !unitId) setUnitId(String(schools[0].unit_id))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadUnits()
  }, [])

  useEffect(() => {
    if (!unitId) return
    const loadSizes = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('uniform_size')
          .select('*')
          .eq('unit_id', Number(unitId))
          .order('display_order')
        if (error) throw error
        setRows(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadSizes()
  }, [unitId])

  // Filtered data
  const filteredRows = useMemo(() => {
    let result = rows

    // Filter by search term
    if (searchTerm) {
      result = result.filter(r =>
        r.size_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter(r => r.is_active)
    } else if (filterStatus === 'inactive') {
      result = result.filter(r => !r.is_active)
    }

    return result
  }, [rows, searchTerm, filterStatus])

  const onSubmit = async () => {
    if (!unitId) return
    const payload = {
      unit_id: Number(unitId),
      size_name: (form.size_name || '').trim(),
      display_order: Number(form.display_order || 0),
      is_active: !!form.is_active,
    }
    if (!payload.size_name) {
      setError('Ukuran wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase
          .from('uniform_size')
          .update(payload)
          .eq('size_id', editing.size_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('uniform_size')
          .insert([payload])
        if (error) throw error
      }
      setForm({ size_name: '', display_order: 0, is_active: true })
      setEditing(null)
      setShowModal(false)
      // reload
      const { data } = await supabase
        .from('uniform_size')
        .select('*')
        .eq('unit_id', Number(unitId))
        .order('display_order')
      setRows(data || [])
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (r) => {
    setEditing(r)
    setForm({ size_name: r.size_name, display_order: r.display_order ?? 0, is_active: !!r.is_active })
    setShowModal(true)
  }

  const onAdd = () => {
    setEditing(null)
    setForm({ size_name: '', display_order: 0, is_active: true })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm({ size_name: '', display_order: 0, is_active: true })
    setError('')
  }

  const onDelete = async (r) => {
    if (!confirm('Hapus ukuran ini?')) return
    try {
      const { error } = await supabase
        .from('uniform_size')
        .delete()
        .eq('size_id', r.size_id)
      if (error) throw error
      setRows(rows.filter(x => x.size_id !== r.size_id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold">Master Ukuran Seragam</h1>
        <Button 
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold w-full sm:w-auto"
        >
          + Tambah Ukuran
        </Button>
      </div>

      {/* Unit Selection - Tab Sidebar Style */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar - Desktop */}
        <Card className="hidden md:block p-4 md:w-64 h-fit">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Pilih Unit</h3>
          <div className="space-y-1">
            {units.map(u => (
              <button
                key={u.unit_id}
                onClick={() => setUnitId(String(u.unit_id))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  String(unitId) === String(u.unit_id)
                    ? 'bg-blue-600 text-white font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {u.unit_name}
              </button>
            ))}
          </div>
        </Card>

        {/* Horizontal Scroll Tabs - Mobile */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {units.map(u => (
              <button
                key={u.unit_id}
                onClick={() => setUnitId(String(u.unit_id))}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  String(unitId) === String(u.unit_id)
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {u.unit_name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Search and Filter */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="🔍 Cari ukuran..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="sm:w-48">
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif Saja</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Data Table */}
          <Card className="p-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p>Memuat data...</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-4xl mb-3">📏</div>
                <p className="text-gray-600 font-medium mb-1">
                  {rows.length === 0 ? 'Belum ada data ukuran seragam' : 'Tidak ada data yang sesuai filter'}
                </p>
                <p className="text-sm text-gray-500">
                  {rows.length === 0 ? 'Klik tombol "Tambah Ukuran" untuk memulai' : 'Coba ubah kriteria pencarian atau filter'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b bg-gray-50">
                        <th className="py-3 px-3 font-semibold text-gray-700">Nama Ukuran</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Urutan</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Status</th>
                        <th className="py-3 px-3 font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, idx) => (
                        <tr key={r.size_id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-3 px-3 font-medium text-gray-900">{r.size_name}</td>
                          <td className="py-3 px-3 text-gray-600">{r.display_order}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              r.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {r.is_active ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => onEdit(r)} 
                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs"
                              >
                                Edit
                              </Button>
                              <Button 
                                onClick={() => onDelete(r)} 
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs"
                              >
                                Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-3">
                  {filteredRows.map(r => (
                    <Card key={r.size_id} className="p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 mb-1">{r.size_name}</div>
                          <div className="text-xs text-gray-500">Urutan: {r.display_order}</div>
                        </div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          r.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => onEdit(r)} 
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-sm"
                        >
                          Edit
                        </Button>
                        <Button 
                          onClick={() => onDelete(r)} 
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm"
                        >
                          Hapus
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  Menampilkan {filteredRows.length} dari {rows.length} ukuran
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={editing ? '✏️ Edit Ukuran Seragam' : '➕ Tambah Ukuran Seragam'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 font-medium">Nama Ukuran <span className="text-red-500">*</span></Label>
            <Input 
              value={form.size_name} 
              onChange={e => setForm({ ...form, size_name: e.target.value })} 
              placeholder="Contoh: S, M, L, XL, 28, 30, 32"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Masukkan kode atau nama ukuran</p>
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Urutan Tampilan</Label>
            <Input 
              type="number" 
              value={form.display_order}
              onChange={e => setForm({ ...form, display_order: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Angka lebih kecil akan muncul lebih dulu</p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            <input 
              id="modal-active" 
              type="checkbox" 
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="modal-active" className="cursor-pointer text-sm">
              Ukuran ini aktif dan dapat digunakan
            </Label>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={closeModal}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={saving || !form.size_name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {saving ? '⏳ Menyimpan...' : (editing ? '✓ Simpan Perubahan' : '✓ Tambah Ukuran')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
