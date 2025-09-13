"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function UniformSizePage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ size_name: '', display_order: 0, is_active: true })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Master Ukuran Seragam</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <div>
            <Label>Unit</Label>
            <select className="mt-1 w-full border rounded px-2 py-2"
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              disabled={loading}
            >
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4 items-end">
          <div>
            <Label>Nama Ukuran</Label>
            <Input value={form.size_name} onChange={e => setForm({ ...form, size_name: e.target.value })} placeholder="S / M / L / 28 / 30" />
          </div>
          <div>
            <Label>Urutan</Label>
            <Input type="number" value={form.display_order}
              onChange={e => setForm({ ...form, display_order: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <Label htmlFor="active">Aktif</Label>
          </div>
          <div>
            <Button onClick={onSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white w-full">{editing ? 'Simpan Perubahan' : 'Tambah'}</Button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Nama Ukuran</th>
                <th className="py-2 pr-4">Urutan</th>
                <th className="py-2 pr-4">Aktif</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.size_id} className="border-b">
                  <td className="py-2 pr-4">{r.size_name}</td>
                  <td className="py-2 pr-4">{r.display_order}</td>
                  <td className="py-2 pr-4">{r.is_active ? 'Ya' : 'Tidak'}</td>
                  <td className="py-2 pr-4 space-x-2">
                    <Button onClick={() => onEdit(r)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1">Edit</Button>
                    <Button onClick={() => onDelete(r)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1">Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
