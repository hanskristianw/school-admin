"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'

export default function UniformSupplierPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [edit, setEdit] = useState(null)

  const emptyForm = { supplier_code: '', supplier_name: '', contact_person: '', phone: '', email: '', address: '', notes: '', is_active: true }
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.from('uniform_supplier').select('*').order('supplier_name')
      if (error) throw error
      setRows(data || [])
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEdit(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (row) => { setEdit(row); setForm({ ...row }); setShowModal(true) }

  const save = async () => {
    try {
      const payload = { ...form, supplier_code: form.supplier_code?.trim() || null }
      if (edit) {
        const { error } = await supabase.from('uniform_supplier').update(payload).eq('supplier_id', edit.supplier_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('uniform_supplier').insert([payload])
        if (error) throw error
      }
      setShowModal(false)
      await load()
    } catch (e) { setError(e.message) }
  }

  const remove = async (row) => {
    if (!confirm('Hapus supplier ini?')) return
    try {
      const { error } = await supabase.from('uniform_supplier').delete().eq('supplier_id', row.supplier_id)
      if (error) throw error
      await load()
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Supplier Seragam</h1>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">Kelola daftar supplier seragam.</div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>Tambah Supplier</Button>
        </div>

        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Kode</th>
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Kontak</th>
                <th className="py-2 pr-4">Telepon</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Aktif</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.supplier_id} className="border-b">
                  <td className="py-2 pr-4">{r.supplier_code || '-'}</td>
                  <td className="py-2 pr-4">{r.supplier_name}</td>
                  <td className="py-2 pr-4">{r.contact_person || '-'}</td>
                  <td className="py-2 pr-4">{r.phone || '-'}</td>
                  <td className="py-2 pr-4">{r.email || '-'}</td>
                  <td className="py-2 pr-4">
                    <input type="checkbox" checked={!!r.is_active} onChange={async e=>{
                      await supabase.from('uniform_supplier').update({ is_active: e.target.checked }).eq('supplier_id', r.supplier_id)
                      await load()
                    }} />
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1" onClick={()=>openEdit(r)}>Ubah</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1" onClick={()=>remove(r)}>Hapus</Button>
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-500">Belum ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title={edit ? 'Ubah Supplier' : 'Tambah Supplier'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Kode</Label>
            <Input value={form.supplier_code} onChange={e=>setForm(f=>({...f, supplier_code: e.target.value}))} />
          </div>
          <div>
            <Label>Nama</Label>
            <Input value={form.supplier_name} onChange={e=>setForm(f=>({...f, supplier_name: e.target.value}))} />
          </div>
          <div>
            <Label>Kontak</Label>
            <Input value={form.contact_person} onChange={e=>setForm(f=>({...f, contact_person: e.target.value}))} />
          </div>
          <div>
            <Label>Telepon</Label>
            <Input value={form.phone} onChange={e=>setForm(f=>({...f, phone: e.target.value}))} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))} />
          </div>
          <div className="md:col-span-2">
            <Label>Alamat</Label>
            <Input value={form.address} onChange={e=>setForm(f=>({...f, address: e.target.value}))} />
          </div>
          <div className="md:col-span-2">
            <Label>Catatan</Label>
            <Input value={form.notes} onChange={e=>setForm(f=>({...f, notes: e.target.value}))} />
          </div>
          <div>
            <label className="inline-flex items-center gap-2 mt-2">
              <input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f, is_active: e.target.checked}))} /> Aktif
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={()=>setShowModal(false)}>Batal</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  )
}
