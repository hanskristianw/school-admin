"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'

export default function InitialStockPage() {
  const [units, setUnits] = useState([])
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [initialStockItems, setInitialStockItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    unit_id: '',
    uniform_id: '',
    size_id: '',
    supplier_id: '', // null = initial stock tanpa supplier
    qty: 0,
    notes: ''
  })

  useEffect(() => {
    const fetchMasterData = async () => {
      const [uRes, unifRes, sizeRes, suppRes] = await Promise.all([
        supabase.from('unit').select('unit_id, unit_name').eq('is_school', true).order('unit_name'),
        supabase.from('uniform').select('uniform_id, uniform_name, unit_id, is_universal').eq('is_active', true).order('uniform_name'),
        supabase.from('uniform_size').select('*').eq('is_active', true).order('display_order'),
        supabase.from('uniform_supplier').select('*').eq('is_active', true).order('supplier_code')
      ])
      if (!uRes.error) {
        setUnits(uRes.data || [])
        if (uRes.data?.length) setFormData(prev => ({ ...prev, unit_id: String(uRes.data[0].unit_id) }))
      }
      if (!unifRes.error) setUniforms(unifRes.data || [])
      if (!sizeRes.error) setSizes(sizeRes.data || [])
      if (!suppRes.error) setSuppliers(suppRes.data || [])
    }
    fetchMasterData()
  }, [])

  const openAddModal = () => {
    setFormData({
      unit_id: units.length ? String(units[0].unit_id) : '',
      uniform_id: '',
      size_id: '',
      supplier_id: '',
      qty: 0,
      notes: ''
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setError('')
  }

  const addToList = () => {
    if (!formData.unit_id || !formData.uniform_id || !formData.size_id) {
      setError('Pilih unit, seragam, dan ukuran')
      return
    }
    if (!Number(formData.qty) || Number(formData.qty) <= 0) {
      setError('Qty harus lebih dari 0')
      return
    }

    const unit = units.find(u => u.unit_id === Number(formData.unit_id))
    const uniform = uniforms.find(u => u.uniform_id === Number(formData.uniform_id))
    const size = sizes.find(s => s.size_id === Number(formData.size_id))
    const supplier = formData.supplier_id ? suppliers.find(s => s.supplier_id === Number(formData.supplier_id)) : null

    const newItem = {
      ...formData,
      unit_name: unit?.unit_name || '',
      uniform_name: uniform?.uniform_name || '',
      size_name: size?.size_name || '',
      supplier_name: supplier?.supplier_name || 'Tanpa Supplier (Stock Awal)'
    }

    setInitialStockItems(prev => [...prev, newItem])
    
    // Reset form but keep unit
    setFormData(prev => ({
      unit_id: prev.unit_id,
      uniform_id: '',
      size_id: '',
      supplier_id: '',
      qty: 0,
      notes: ''
    }))
    setError('')
  }

  const removeItem = (idx) => {
    setInitialStockItems(prev => prev.filter((_, i) => i !== idx))
  }

  const submitInitialStock = async () => {
    if (initialStockItems.length === 0) {
      setError('Tambahkan minimal satu item')
      return
    }

    setSaving(true)
    setError('')
    try {
      // Create stock transactions for initial stock
      const transactions = initialStockItems.map(item => ({
        uniform_id: Number(item.uniform_id),
        size_id: Number(item.size_id),
        supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
        qty_delta: Number(item.qty),
        txn_type: 'initial',
        ref_table: 'manual',
        ref_id: null,
        notes: item.notes || 'Stock awal sistem'
      }))

      const { error } = await supabase
        .from('uniform_stock_txn')
        .insert(transactions)

      if (error) throw error

      setSuccess(`Berhasil menginput ${initialStockItems.length} item stock awal`)
      setTimeout(() => setSuccess(''), 3000)
      setInitialStockItems([])
      closeModal()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Filter uniforms: unit-specific OR universal (unit_id = NULL)
  const uniformsFiltered = uniforms.filter(u => u.unit_id === Number(formData.unit_id) || u.is_universal)
  const totalItems = initialStockItems.reduce((sum, item) => sum + Number(item.qty), 0)

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Input Stock Awal Seragam</h1>
          <p className="text-sm text-gray-600 mt-1">Input stock awal/lama yang sudah ada di gudang</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold w-full sm:w-auto"
        >
          + Tambah Item
        </Button>
      </div>

      {error && !showModal && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* List of Items */}
      <Card className="p-4">
        <h2 className="font-semibold mb-4">Daftar Stock yang Akan Di-input</h2>
        
        {initialStockItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Belum ada item. Klik "Tambah Item" untuk mulai.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="py-3 px-3 font-semibold text-gray-700">Unit</th>
                    <th className="py-3 px-3 font-semibold text-gray-700">Seragam</th>
                    <th className="py-3 px-3 font-semibold text-gray-700">Ukuran</th>
                    <th className="py-3 px-3 font-semibold text-gray-700">Supplier</th>
                    <th className="py-3 px-3 font-semibold text-gray-700 text-right">Qty</th>
                    <th className="py-3 px-3 font-semibold text-gray-700">Keterangan</th>
                    <th className="py-3 px-3 font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {initialStockItems.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">{item.unit_name}</td>
                      <td className="py-3 px-3">{item.uniform_name}</td>
                      <td className="py-3 px-3">{item.size_name}</td>
                      <td className="py-3 px-3">
                        {item.supplier_id ? (
                          item.supplier_name
                        ) : (
                          <span className="text-gray-500 italic">{item.supplier_name}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-600">{item.qty} pcs</td>
                      <td className="py-3 px-3 text-sm text-gray-600">{item.notes || '-'}</td>
                      <td className="py-3 px-3">
                        <Button
                          onClick={() => removeItem(idx)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs"
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan="4" className="py-3 px-3">Total</td>
                    <td className="py-3 px-3 text-right text-blue-700">{totalItems} pcs</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {initialStockItems.map((item, idx) => (
                <Card key={idx} className="p-4 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-medium">{item.unit_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seragam:</span>
                      <span className="font-medium">{item.uniform_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ukuran:</span>
                      <span className="font-medium">{item.size_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Supplier:</span>
                      <span className={item.supplier_id ? "font-medium" : "italic text-gray-500"}>
                        {item.supplier_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Qty:</span>
                      <span className="font-semibold text-blue-600">{item.qty} pcs</span>
                    </div>
                    {item.notes && (
                      <div className="text-gray-600 text-xs pt-2 border-t">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => removeItem(idx)}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm"
                  >
                    Hapus Item
                  </Button>
                </Card>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={submitInitialStock}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold disabled:opacity-50"
              >
                {saving ? '⏳ Menyimpan...' : `✓ Simpan ${initialStockItems.length} Item Stock Awal`}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Modal Add Item */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="➕ Tambah Stock Awal"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label>Unit *</Label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={formData.unit_id}
              onChange={e => setFormData(prev => ({ ...prev, unit_id: e.target.value, uniform_id: '', size_id: '' }))}
            >
              <option value="">-- Pilih Unit --</option>
              {units.map(u => (
                <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Seragam *</Label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={formData.uniform_id}
              onChange={e => setFormData(prev => ({ ...prev, uniform_id: e.target.value }))}
              disabled={!formData.unit_id}
            >
              <option value="">-- Pilih Seragam --</option>
              {uniformsFiltered.map(u => (
                <option key={u.uniform_id} value={u.uniform_id}>
                  {u.uniform_name}{u.is_universal ? ' 🌐' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Ukuran *</Label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={formData.size_id}
              onChange={e => setFormData(prev => ({ ...prev, size_id: e.target.value }))}
              disabled={!formData.uniform_id}
            >
              <option value="">-- Pilih Ukuran --</option>
              {sizes.map(s => (
                <option key={s.size_id} value={s.size_id}>{s.size_name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Supplier (Optional)</Label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={formData.supplier_id}
              onChange={e => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
            >
              <option value="">Tanpa Supplier (Stock Awal/Lama)</option>
              {suppliers.map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Kosongkan jika tidak tau dari supplier mana, atau memang stock lama tanpa supplier
            </p>
          </div>

          <div>
            <Label>Jumlah (Qty) *</Label>
            <Input
              type="number"
              min="0"
              value={formData.qty}
              onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))}
              className="mt-1"
              placeholder="0"
            />
          </div>

          <div>
            <Label>Keterangan</Label>
            <Input
              placeholder="Opsional: catatan tambahan"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
            />
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
              Tutup
            </Button>
            <Button
              onClick={addToList}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold"
            >
              ✓ Tambahkan ke Daftar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
