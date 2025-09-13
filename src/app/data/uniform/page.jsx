"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'

export default function UniformPage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [sizes, setSizes] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ uniform_code: '', uniform_name: '', gender: 'unisex', image_url: '', notes: '', is_active: true })
  const [variants, setVariants] = useState([]) // {size_id, hpp, price}
  const [editing, setEditing] = useState(null)
  const [showUniformModal, setShowUniformModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)

  // load units
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
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    loadUnits()
  }, [])

  // load sizes and uniforms for unit
  useEffect(() => {
    if (!unitId) return
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: s }, { data: u }] = await Promise.all([
          supabase.from('uniform_size').select('*').eq('unit_id', Number(unitId)).order('display_order'),
          supabase.from('uniform').select('*').eq('unit_id', Number(unitId)).order('uniform_name')
        ])
        setSizes(s || [])
        setRows(u || [])
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    load()
  }, [unitId])

  const startCreate = () => {
    setEditing(null)
    setForm({ uniform_code: '', uniform_name: '', gender: 'unisex', image_url: '', notes: '', is_active: true })
    setVariants((sizes || []).map(sz => ({ size_id: sz.size_id, hpp: '', price: '' })))
    setShowUniformModal(true)
  }

  const loadVariants = async (uniform_id) => {
    const { data, error } = await supabase
      .from('uniform_variant')
      .select('size_id, hpp, price')
      .eq('uniform_id', uniform_id)
    if (error) throw error
    // ensure all sizes present
    const map = new Map((data || []).map(v => [v.size_id, v]))
    return (sizes || []).map(sz => ({ size_id: sz.size_id, hpp: map.get(sz.size_id)?.hpp ?? '', price: map.get(sz.size_id)?.price ?? '' }))
  }

  const openEditUniform = async (row) => {
    setEditing(row)
    setForm({
      uniform_code: row.uniform_code || '',
      uniform_name: row.uniform_name || '',
      gender: row.gender || 'unisex',
      image_url: row.image_url || '',
      notes: row.notes || '',
      is_active: !!row.is_active
    })
    setShowUniformModal(true)
  }

  const openEditVariants = async (row) => {
    setEditing(row)
    try {
      const v = await loadVariants(row.uniform_id)
      setVariants(v)
      setShowVariantModal(true)
    } catch (e) { setError(e.message) }
  }

  const upsertVariants = async (uniform_id) => {
    // delete all then insert non-empty
    const { error: delErr } = await supabase.from('uniform_variant').delete().eq('uniform_id', uniform_id)
    if (delErr) throw delErr
    const rows = variants
      .filter(v => v.hpp !== '' || v.price !== '')
      .map(v => ({ uniform_id, size_id: v.size_id, hpp: Number(v.hpp || 0), price: Number(v.price || 0) }))
    if (rows.length) {
      const { error } = await supabase.from('uniform_variant').insert(rows)
      if (error) throw error
    }
  }

  const onSubmitUniform = async () => {
    if (!unitId) return
    const payload = {
      unit_id: Number(unitId),
      uniform_code: (form.uniform_code || '').trim() || null,
      uniform_name: (form.uniform_name || '').trim(),
      gender: form.gender || null,
      image_url: (form.image_url || '').trim() || null,
      notes: (form.notes || '').trim() || null,
      is_active: !!form.is_active
    }
    if (!payload.uniform_name) { setError('Nama seragam wajib'); return }
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('uniform').update(payload).eq('uniform_id', editing.uniform_id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('uniform').insert([payload]).select('uniform_id').single()
        if (error) throw error
      }
      // reload
      const { data: u2 } = await supabase.from('uniform').select('*').eq('unit_id', Number(unitId)).order('uniform_name')
      setRows(u2 || [])
      setForm({ uniform_code: '', uniform_name: '', gender: 'unisex', image_url: '', notes: '', is_active: true })
      setEditing(null)
      setError('')
      setShowUniformModal(false)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const onSubmitVariants = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await upsertVariants(editing.uniform_id)
      setShowVariantModal(false)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const onDelete = async (row) => {
    if (!confirm('Hapus seragam ini?')) return
    try {
      const { error } = await supabase.from('uniform').delete().eq('uniform_id', row.uniform_id)
      if (error) throw error
      setRows(rows.filter(r => r.uniform_id !== row.uniform_id))
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Master Seragam</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div>
            <Label>Unit</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={unitId} onChange={e => setUnitId(e.target.value)}>
              {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700 text-white">Seragam Baru</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Kode</th>
                <th className="py-2 pr-4">Gender</th>
                <th className="py-2 pr-4">Aktif</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.uniform_id} className="border-b">
                  <td className="py-2 pr-4">{r.uniform_name}</td>
                  <td className="py-2 pr-4">{r.uniform_code || '-'}</td>
                  <td className="py-2 pr-4">{r.gender || '-'}</td>
                  <td className="py-2 pr-4">{r.is_active ? 'Ya' : 'Tidak'}</td>
                  <td className="py-2 pr-4">
                    <Button onClick={() => openEditUniform(r)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1">Edit</Button>
                    <Button onClick={() => openEditVariants(r)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1">Harga/HPP</Button>
                    <Button onClick={() => onDelete(r)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1">Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Uniform Modal */}
      <Modal isOpen={showUniformModal} onClose={() => setShowUniformModal(false)} title={editing ? 'Edit Seragam' : 'Seragam Baru'} size="lg">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div>
            <Label>Nama</Label>
            <Input value={form.uniform_name} onChange={e => setForm({ ...form, uniform_name: e.target.value })} />
          </div>
          <div>
            <Label>Kode (opsional)</Label>
            <Input value={form.uniform_code} onChange={e => setForm({ ...form, uniform_code: e.target.value })} />
          </div>
          <div>
            <Label>Gender</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              <option value="unisex">Unisex</option>
              <option value="boy">Putra</option>
              <option value="girl">Putri</option>
            </select>
          </div>
          <div>
            <Label>Gambar (URL)</Label>
            <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <Label>Catatan</Label>
            <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input id="active2" type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <Label htmlFor="active2">Aktif</Label>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={onSubmitUniform} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">Simpan</Button>
        </div>
      </Modal>

      {/* Variants Modal */}
      <Modal isOpen={showVariantModal} onClose={() => setShowVariantModal(false)} title={`Harga/HPP: ${editing?.uniform_name || ''}`} size="md">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Ukuran</th>
                <th className="py-2 pr-4">HPP</th>
                <th className="py-2 pr-4">Harga</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v, idx) => (
                <tr key={v.size_id} className="border-b">
                  <td className="py-2 pr-4">{sizes.find(s => s.size_id === v.size_id)?.size_name}</td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={v.hpp} onChange={e => {
                      const nv = [...variants]; nv[idx] = { ...nv[idx], hpp: e.target.value }; setVariants(nv)
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={v.price} onChange={e => {
                      const nv = [...variants]; nv[idx] = { ...nv[idx], price: e.target.value }; setVariants(nv)
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={onSubmitVariants} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">Simpan Harga/HPP</Button>
        </div>
      </Modal>
    </div>
  )
}
