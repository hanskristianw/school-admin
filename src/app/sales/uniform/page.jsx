"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import { formatCurrency, toNumber } from '@/lib/utils'

export default function UniformSalesPage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [detailSiswaId, setDetailSiswaId] = useState('')
  const [uniforms, setUniforms] = useState([]) // { uniform_id, uniform_name }
  const [sizes, setSizes] = useState([]) // by unit
  const [variants, setVariants] = useState([]) // uniform_variant with size
  const [stockMap, setStockMap] = useState(new Map()) // key `${u}_${s}` -> qty
  const [items, setItems] = useState([]) // {uniform_id, size_id, qty, unit_price, unit_hpp}
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Load units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data, error } = await supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name')
        if (error) throw error
        const schools = (data || []).filter(u => u.is_school)
        setUnits(schools)
        if (schools.length && !unitId) setUnitId(String(schools[0].unit_id))
      } catch (e) { setError(e.message) }
    }
    fetchUnits()
  }, [])

  // Resolve logged-in student's detail_siswa_id, then load uniforms, sizes, variants, stock for unit
  useEffect(() => {
    if (!unitId) return
    const load = async () => {
      setLoading(true)
      try {
        // Get current user id from localStorage
        const kr_id = typeof window !== 'undefined' ? Number(localStorage.getItem('kr_id')) : null
        if (!kr_id) throw new Error('Unauthorized')
        // Find the student's active detail_siswa row for this user (latest by id)
        const { data: dsRows, error: dsErr } = await supabase
          .from('detail_siswa')
          .select('detail_siswa_id, detail_siswa_user_id')
          .eq('detail_siswa_user_id', kr_id)
          .order('detail_siswa_id', { ascending: false })
          .limit(1)
        if (dsErr) throw dsErr
        const dsRow = (dsRows || [])[0]
        if (!dsRow) throw new Error('Profil siswa tidak ditemukan')
        setDetailSiswaId(String(dsRow.detail_siswa_id))

        const [uRes, sRes, vRes, stRes] = await Promise.all([
          supabase.from('uniform').select('uniform_id, uniform_name').eq('unit_id', Number(unitId)).eq('is_active', true).order('uniform_name'),
          supabase.from('uniform_size').select('*').eq('unit_id', Number(unitId)).eq('is_active', true).order('display_order'),
          supabase.from('uniform_variant').select('uniform_id, size_id, hpp, price'),
          supabase.from('v_uniform_stock').select('uniform_id, size_id, qty')
        ])
        if (uRes.error) throw uRes.error
        if (sRes.error) throw sRes.error
        if (vRes.error) throw vRes.error
        if (stRes.error) throw stRes.error
        setUniforms(uRes.data || [])
        setSizes(sRes.data || [])
        setVariants(vRes.data || [])
        const sm = new Map()
        ;(stRes.data || []).forEach(r => sm.set(`${r.uniform_id}_${r.size_id}`, r.qty || 0))
        setStockMap(sm)
        setItems([])
        setReceiptFile(null)
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    load()
  }, [unitId])

  const addItem = () => {
    if (!uniforms.length || !sizes.length) return
    setItems(prev => [...prev, { uniform_id: uniforms[0].uniform_id, size_id: sizes[0].size_id, qty: 1, unit_price: getPrice(uniforms[0].uniform_id, sizes[0].size_id), unit_hpp: getHpp(uniforms[0].uniform_id, sizes[0].size_id) }])
  }

  const getPrice = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.price || 0
  const getHpp = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.hpp || 0
  const stockOf = (uid, sid) => stockMap.get(`${uid}_${sid}`) || 0

  const updateItem = (idx, patch) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const totals = useMemo(() => {
    const tAmt = items.reduce((sum, it) => sum += Number(it.qty || 0) * Number(it.unit_price || 0), 0)
    const tCost = items.reduce((sum, it) => sum += Number(it.qty || 0) * Number(it.unit_hpp || 0), 0)
    return { amount: tAmt, cost: tCost }
  }, [items])

  const validate = () => {
    if (!unitId) return 'Pilih unit'
  if (!detailSiswaId) return 'Siswa tidak terdeteksi'
    if (!items.length) return 'Tambahkan item'
    for (const it of items) {
      if (!it.uniform_id || !it.size_id || !Number(it.qty)) return 'Item tidak valid'
      const available = stockOf(it.uniform_id, it.size_id)
      if (Number(it.qty) > available) return `Stok tidak cukup untuk ${uniforms.find(u=>u.uniform_id===it.uniform_id)?.uniform_name || ''} - ${sizes.find(s=>s.size_id===it.size_id)?.size_name || ''}`
    }
    return ''
  }

  const uploadReceipt = async (saleId) => {
    if (!receiptFile) return null
    const file = receiptFile
    const ext = file.name.split('.').pop()
    const path = `${saleId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('uniform-receipts').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data: pub } = await supabase.storage.from('uniform-receipts').getPublicUrl(path)
    return pub?.publicUrl || null
  }

  const createSale = async () => {
    const msg = validate()
    if (msg) { setError(msg); return }
    setSaving(true)
    setError('')
    try {
      // 1) Insert sale pending
      const { data: sale, error: saleErr } = await supabase.from('uniform_sale').insert([{ detail_siswa_id: Number(detailSiswaId), unit_id: Number(unitId), status: 'pending', payment_method: 'transfer', total_amount: totals.amount, total_cost: totals.cost }]).select('sale_id').single()
      if (saleErr) throw saleErr
      const saleId = sale.sale_id

      // 2) Upload receipt (optional)
      let receiptUrl = null
      if (receiptFile) {
        receiptUrl = await uploadReceipt(saleId)
        await supabase.from('uniform_sale').update({ receipt_url: receiptUrl }).eq('sale_id', saleId)
      }

      // 3) Insert items
      const payloadItems = items.map(it => ({ sale_id: saleId, uniform_id: it.uniform_id, size_id: it.size_id, qty: Number(it.qty), unit_price: Number(it.unit_price || getPrice(it.uniform_id, it.size_id)), unit_hpp: Number(it.unit_hpp || getHpp(it.uniform_id, it.size_id)), subtotal: Number(it.qty) * Number(it.unit_price || getPrice(it.uniform_id, it.size_id)) }))
      const { error: itemErr } = await supabase.from('uniform_sale_item').insert(payloadItems)
      if (itemErr) throw itemErr

      setShowConfirm(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const markPaid = async () => {
    // Reduce stock by posting stock_txn, then set sale.status = paid
    setSaving(true)
    try {
      // Find latest sale pending for this student and totals
      const { data: sale, error: selErr } = await supabase.from('uniform_sale').select('*').eq('detail_siswa_id', Number(detailSiswaId)).eq('status', 'pending').order('sale_id', { ascending: false }).limit(1).single()
      if (selErr || !sale) throw new Error(selErr?.message || 'Transaksi tidak ditemukan')
      // Load its items
      const { data: saleItems, error: itemsErr } = await supabase.from('uniform_sale_item').select('*').eq('sale_id', sale.sale_id)
      if (itemsErr) throw itemsErr
      // Post stock txn
      const stockRows = (saleItems || []).map(it => ({ uniform_id: it.uniform_id, size_id: it.size_id, qty_delta: -Number(it.qty), txn_type: 'sale', ref_table: 'uniform_sale', ref_id: sale.sale_id, notes: 'mark paid' }))
      if (stockRows.length) {
        const { error: stErr } = await supabase.from('uniform_stock_txn').insert(stockRows)
        if (stErr) throw stErr
      }
      // Update sale to paid
      const { error: updErr } = await supabase.from('uniform_sale').update({ status: 'paid' }).eq('sale_id', sale.sale_id)
      if (updErr) throw updErr
      setShowConfirm(false)
      // Refresh stock
      const { data: st } = await supabase.from('v_uniform_stock').select('uniform_id, size_id, qty')
      const sm = new Map(); (st || []).forEach(r => sm.set(`${r.uniform_id}_${r.size_id}`, r.qty || 0)); setStockMap(sm)
      // Clear cart
      setItems([])
      setReceiptFile(null)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Penjualan Seragam</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <div>
            <Label>Unit</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={unitId} onChange={e=>setUnitId(e.target.value)}>
              {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
          </div>
          {/* Siswa diambil otomatis dari user yang login */}
          <div className="flex items-end">
            <Button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white">Tambah Item</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Seragam</th>
                <th className="py-2 pr-4">Ukuran</th>
                <th className="py-2 pr-4">Stok</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Harga</th>
                <th className="py-2 pr-4">Subtotal</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const stok = stockOf(it.uniform_id, it.size_id)
                const subtotal = Number(it.qty || 0) * Number(it.unit_price || 0)
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2 pr-4">
                      <select className="border rounded px-2 py-1" value={it.uniform_id} onChange={e=>{
                        const uid = Number(e.target.value)
                        const sid = sizes[0]?.size_id
                        updateItem(idx, { uniform_id: uid, size_id: sid, unit_price: getPrice(uid, sid), unit_hpp: getHpp(uid, sid), qty: 1 })
                      }}>
                        {uniforms.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <select className="border rounded px-2 py-1" value={it.size_id} onChange={e=>{
                        const sid = Number(e.target.value)
                        updateItem(idx, { size_id: sid, unit_price: getPrice(it.uniform_id, sid), unit_hpp: getHpp(it.uniform_id, sid), qty: 1 })
                      }}>
                        {sizes.map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-4">{stok}</td>
                    <td className="py-2 pr-4">
                      <Input inputMode="numeric" value={it.qty} onChange={e=>{
                        const q = Math.max(0, toNumber(e.target.value))
                        updateItem(idx, { qty: q })
                      }} />
                    </td>
                    <td className="py-2 pr-4">
                      <Input inputMode="numeric" value={it.unit_price} onChange={e=>{
                        updateItem(idx, { unit_price: toNumber(e.target.value) })
                      }} />
                    </td>
                    <td className="py-2 pr-4">{formatCurrency(subtotal)}</td>
                    <td className="py-2 pr-4">
                      <Button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1" onClick={()=>removeItem(idx)}>Hapus</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
          <div className="md:col-span-2">
            <Label>Bukti Transfer (opsional)</Label>
            <input type="file" accept="image/*" onChange={e=> setReceiptFile(e.target.files?.[0] || null)} />
          </div>
          <div className="text-right">
            <div className="text-sm">Total Harga: <strong>{formatCurrency(totals.amount)}</strong></div>
            <div className="text-xs text-gray-500">Perkiraan HPP: {formatCurrency(totals.cost)}</div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={createSale} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">Simpan (Pending)</Button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </Card>

      {/* Confirm modal to mark as paid */}
      <Modal isOpen={showConfirm} onClose={()=>setShowConfirm(false)} title="Tandai Lunas" size="sm">
        <p className="text-sm">Setelah ditandai Lunas, stok akan berkurang sesuai jumlah penjualan. Lanjutkan?</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={markPaid} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">Tandai Lunas</Button>
        </div>
      </Modal>
    </div>
  )
}
