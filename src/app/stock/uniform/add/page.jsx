"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import { formatCurrency, toNumber } from '@/lib/utils'

export default function AddUniformStockPage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [variants, setVariants] = useState([])
  const [items, setItems] = useState([]) // {uniform_id, size_id, qty, unit_cost, update_hpp:boolean}
  const [purchaseId, setPurchaseId] = useState(null)
  const [receipts, setReceipts] = useState([]) // history
  const [showReceive, setShowReceive] = useState(false)
  const [receiveRows, setReceiveRows] = useState([]) // {purchase_item_id, uniform_id, size_id, qty_remaining, qty_receive, unit_cost, update_hpp}
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0,10))
  const [invoiceNo, setInvoiceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [completed, setCompleted] = useState([])
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyHeader, setHistoryHeader] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [historyReceipts, setHistoryReceipts] = useState([])

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name')
      if (error) { setError(error.message); return }
      const schools = (data || []).filter(u => u.is_school)
      setUnits(schools)
      if (schools.length && !unitId) setUnitId(String(schools[0].unit_id))
    }
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from('uniform_supplier').select('supplier_id, supplier_name, is_active').eq('is_active', true).order('supplier_name')
      if (!error) setSuppliers(data || [])
    }
    fetchUnits(); fetchSuppliers()
  }, [])

  useEffect(() => {
    if (!unitId) return
    const load = async () => {
      const [uRes, sRes, vRes] = await Promise.all([
        supabase.from('uniform').select('uniform_id, uniform_name, unit_id').eq('unit_id', Number(unitId)).eq('is_active', true).order('uniform_name'),
        supabase.from('uniform_size').select('*').eq('unit_id', Number(unitId)).eq('is_active', true).order('display_order'),
        supabase.from('uniform_variant').select('uniform_id, size_id, hpp, price')
      ])
      if (uRes.error || sRes.error || vRes.error) { setError(uRes.error?.message || sRes.error?.message || vRes.error?.message); return }
      setUniforms(uRes.data || []); setSizes(sRes.data || []); setVariants(vRes.data || [])
      setItems([])
    }
    load();
    loadPending(Number(unitId))
    loadCompleted(Number(unitId))
  }, [unitId])

  const loadPending = async (uid) => {
    if (!uid) return
    setLoadingPending(true)
    const { data, error } = await supabase
      .from('uniform_purchase')
      .select('purchase_id, purchase_date, invoice_no, status, supplier:uniform_supplier(supplier_name)')
      .eq('unit_id', uid)
      .eq('status', 'draft')
      .order('purchase_id', { ascending: false })
    if (!error) setPending(data || [])
    setLoadingPending(false)
  }

  const loadCompleted = async (uid) => {
    if (!uid) return
    setLoadingCompleted(true)
    const { data, error } = await supabase
      .from('uniform_purchase')
      .select('purchase_id, purchase_date, invoice_no, status, supplier:uniform_supplier(supplier_name)')
      .eq('unit_id', uid)
      .eq('status', 'posted')
      .order('purchase_id', { ascending: false })
    if (!error) setCompleted(data || [])
    setLoadingCompleted(false)
  }

  const addItem = () => {
    if (!uniforms.length || !sizes.length) return
    setItems(prev => [...prev, { uniform_id: uniforms[0].uniform_id, size_id: sizes[0].size_id, qty: 1, unit_cost: getHpp(uniforms[0].uniform_id, sizes[0].size_id) || 0, update_hpp: false }])
  }
  const getHpp = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.hpp || 0

  const totals = useMemo(() => items.reduce((s,it)=> s + Number(it.qty||0)*Number(it.unit_cost||0), 0), [items])

  const validate = () => {
    if (!unitId) return 'Pilih unit'
    if (!supplierId) return 'Pilih supplier'
    if (!items.length) return 'Tambahkan item'
    for (const it of items) {
      if (!it.uniform_id || !it.size_id || !Number(it.qty)) return 'Item tidak valid'
    }
    return ''
  }

  const uploadAttachment = async (purchaseId) => {
    if (!attachment) return null
    const ext = attachment.name.split('.').pop()
    const path = `${purchaseId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('uniform-purchases').upload(path, attachment, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = await supabase.storage.from('uniform-purchases').getPublicUrl(path)
    return data?.publicUrl || null
  }

  const save = async () => {
    const msg = validate(); if (msg) { setError(msg); return }
    setSaving(true); setError('')
    try {
      // 1) create purchase header as pending
      const { data: header, error: herr } = await supabase.from('uniform_purchase').insert([{ unit_id: Number(unitId), supplier_id: Number(supplierId), purchase_date: purchaseDate, invoice_no: invoiceNo || null, notes: notes || null, status: 'draft' }]).select('purchase_id').single()
      if (herr) throw herr
      const pid = header.purchase_id; setPurchaseId(pid)
      // 2) attachment upload (header-level)
      if (attachment) {
        const url = await uploadAttachment(pid)
        await supabase.from('uniform_purchase').update({ attachment_url: url }).eq('purchase_id', pid)
      }
      // 3) insert items (ordered)
      const payload = items.map(it => ({ purchase_id: pid, uniform_id: it.uniform_id, size_id: it.size_id, qty: Number(it.qty), unit_cost: Number(it.unit_cost || 0) }))
      const { error: ierr } = await supabase.from('uniform_purchase_item').insert(payload)
      if (ierr) throw ierr

      // Prepare receive sheet from ordered quantities
      const { data: pi } = await supabase.from('uniform_purchase_item').select('item_id, uniform_id, size_id, qty, unit_cost').eq('purchase_id', pid)
      const rows = (pi || []).map(r => ({ purchase_item_id: r.item_id, uniform_id: r.uniform_id, size_id: r.size_id, qty_remaining: r.qty, qty_receive: 0, unit_cost: r.unit_cost, update_hpp: false }))
  setReceiveRows(rows)
  setReceipts([])
      setShowConfirm(true)
      // clear form for next order
      setItems([]); setAttachment(null); setInvoiceNo(''); setNotes('')
      // refresh pending list
      loadPending(Number(unitId))
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const loadProgress = async (pid) => {
    const { data: rec, error: re } = await supabase.from('uniform_purchase_receipt').select('receipt_id, receipt_date, notes, attachment_url, created_at').eq('purchase_id', pid).order('receipt_id',{ascending:false})
    if (!re) setReceipts(rec || [])
    const remMap = await getRemainingMap(pid)
    setReceiveRows(prev => prev.map(r => ({ ...r, qty_remaining: remMap.get(r.purchase_item_id) ?? r.qty_remaining })))
  }

  const openReceive = async (pid) => {
    setPurchaseId(pid)
    // build rows based on current remaining per item
    const [piRes] = await Promise.all([
      supabase.from('uniform_purchase_item').select('item_id, uniform_id, size_id, unit_cost').eq('purchase_id', pid)
    ])
    if (piRes.error) { setError(piRes.error?.message); return }
    const progMap = await getRemainingMap(pid)
    const rows = (piRes.data||[]).map(r => ({ purchase_item_id: r.item_id, uniform_id: r.uniform_id, size_id: r.size_id, qty_remaining: progMap.get(r.item_id) ?? 0, qty_receive: 0, unit_cost: r.unit_cost, update_hpp: false }))
    setReceiveRows(rows)
    await loadProgress(pid)
    setShowReceive(true)
  }

  const getRemainingMap = async (pid) => {
    // try via view first
    const view = await supabase.from('v_uniform_purchase_item_progress').select('*').eq('purchase_id', pid)
    if (!view.error && Array.isArray(view.data)) {
      return new Map(view.data.map(x => [x.purchase_item_id, Number(x.qty_remaining||0)]))
    }
    // fallback: compute from items and receipt items
    const [piRes, recRes] = await Promise.all([
      supabase.from('uniform_purchase_item').select('item_id, qty').eq('purchase_id', pid),
      supabase.from('uniform_purchase_receipt').select('receipt_id').eq('purchase_id', pid)
    ])
    const base = new Map((piRes.data||[]).map(x => [x.item_id, Number(x.qty||0)]))
    const ids = (recRes.data||[]).map(r => r.receipt_id)
    if (!ids.length) {
      return base
    }
    const { data: ri } = await supabase.from('uniform_purchase_receipt_item').select('purchase_item_id, qty_received').in('receipt_id', ids)
    const recv = new Map()
    for (const row of (ri||[])) {
      const k = row.purchase_item_id
      recv.set(k, (recv.get(k)||0) + Number(row.qty_received||0))
    }
    const rem = new Map()
    for (const [k, q] of base.entries()) {
      rem.set(k, Math.max(0, q - (recv.get(k)||0)))
    }
    return rem
  }

  const openHistory = async (pid) => {
    // Header
    const { data: hdr } = await supabase
      .from('uniform_purchase')
      .select('purchase_id, purchase_date, invoice_no, notes, status, supplier:uniform_supplier(supplier_name)')
      .eq('purchase_id', pid)
      .single()
    setHistoryHeader(hdr || null)
    // Items summary
    const { data: pi } = await supabase.from('uniform_purchase_item').select('item_id, uniform_id, size_id, qty, unit_cost').eq('purchase_id', pid)
    const remMap = await getRemainingMap(pid)
    const items = (pi||[]).map(x => ({
      purchase_item_id: x.item_id,
      uniform_id: x.uniform_id,
      size_id: x.size_id,
      qty_ordered: Number(x.qty||0),
      qty_remaining: Number(remMap.get(x.item_id) || 0),
      qty_received: Math.max(0, Number(x.qty||0) - Number(remMap.get(x.item_id) || 0)),
      unit_cost: Number(x.unit_cost||0)
    }))
    setHistoryItems(items)
    // Receipts list
    const { data: rec } = await supabase
      .from('uniform_purchase_receipt')
      .select('receipt_id, receipt_date, notes, attachment_url, created_at')
      .eq('purchase_id', pid)
      .order('receipt_id', { ascending: false })
    setHistoryReceipts(rec || [])
    setShowHistory(true)
  }

  const postReceipt = async () => {
    if (!purchaseId) return
    const anyQty = receiveRows.some(r => Number(r.qty_receive) > 0)
    if (!anyQty) { setError('Isi jumlah diterima'); return }
    setSaving(true); setError('')
    try {
      // 1) create receipt header
      const { data: rec, error: rerr } = await supabase.from('uniform_purchase_receipt').insert([{ purchase_id: purchaseId, receipt_date: new Date().toISOString().slice(0,10) }]).select('receipt_id').single()
      if (rerr) throw rerr
      const rid = rec.receipt_id
      // 2) filter positive rows and insert receipt items
      const ritems = receiveRows.filter(r => Number(r.qty_receive) > 0).map(r => ({ receipt_id: rid, purchase_item_id: r.purchase_item_id, qty_received: Number(r.qty_receive), unit_cost: Number(r.unit_cost||0) }))
      const { error: rierr } = await supabase.from('uniform_purchase_receipt_item').insert(ritems)
      if (rierr) throw rierr
      // 3) post stock for each receipt item
      for (const r of ritems) {
        const base = receiveRows.find(x=>x.purchase_item_id===r.purchase_item_id)
        await supabase.from('uniform_stock_txn').insert([{ uniform_id: base.uniform_id, size_id: base.size_id, qty_delta: r.qty_received, txn_type: 'purchase', ref_table: 'uniform_purchase_receipt', ref_id: rid, notes: invoiceNo ? `inv:${invoiceNo}` : 'purchase receipt' }])
        if (base.update_hpp) {
          await supabase.from('uniform_variant').update({ hpp: r.unit_cost }).eq('uniform_id', base.uniform_id).eq('size_id', base.size_id)
        }
      }
      // 4) refresh progress and clear qty_receive
      await loadProgress(purchaseId)
      // auto-complete purchase when fully received
      const remMap = await getRemainingMap(purchaseId)
      const allZero = Array.from(remMap.values()).every(v => Number(v) === 0)
      if (allZero) {
        await supabase.from('uniform_purchase').update({ status: 'posted' }).eq('purchase_id', purchaseId)
      }
      setReceiveRows(prev => prev.map(r => ({ ...r, qty_receive: 0 })))
      // refresh pending list (it may drop if completed)
      loadPending(Number(unitId))
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Tambah Stok Seragam</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <div>
            <Label>Unit</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={unitId} onChange={e=>setUnitId(e.target.value)}>
              {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Supplier</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Tanggal</Label>
            <Input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
          <div>
            <Label>No. Invoice (opsional)</Label>
            <Input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Catatan</Label>
            <Input value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 items-end">
          <div className="md:col-span-2">
            <Label>Lampiran (opsional)</Label>
            <input type="file" onChange={e=>setAttachment(e.target.files?.[0]||null)} />
          </div>
          <div className="text-right">
            <div className="text-sm">Total Nilai: <strong>{formatCurrency(totals)}</strong></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Order disimpan sebagai pending. Stok bertambah saat penerimaan.</div>
          <Button onClick={addItem} className="bg-blue-600 hover:bg-blue-700 text-white">Tambah Item</Button>
        </div>

        <div className="overflow-auto mt-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Seragam</th>
                <th className="py-2 pr-4">Ukuran</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Biaya/Unit (HPP)</th>
                <th className="py-2 pr-4">Update HPP?</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 pr-4">
                    <select className="border rounded px-2 py-1" value={it.uniform_id} onChange={e=>{
                      const uid = Number(e.target.value)
                      const sid = sizes[0]?.size_id
                      setItems(prev => prev.map((x,i)=> i===idx ? { ...x, uniform_id: uid, size_id: sid, unit_cost: getHpp(uid, sid) } : x))
                    }}>
                      {uniforms.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select className="border rounded px-2 py-1" value={it.size_id} onChange={e=>{
                      const sid = Number(e.target.value)
                      setItems(prev => prev.map((x,i)=> i===idx ? { ...x, size_id: sid, unit_cost: getHpp(it.uniform_id, sid) } : x))
                    }}>
                      {sizes.map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={it.qty} onChange={e=>{
                      const q = Math.max(0, toNumber(e.target.value))
                      setItems(prev => prev.map((x,i)=> i===idx ? { ...x, qty: q } : x))
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={it.unit_cost} onChange={e=>{
                      setItems(prev => prev.map((x,i)=> i===idx ? { ...x, unit_cost: toNumber(e.target.value) } : x))
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <input type="checkbox" checked={!!it.update_hpp} onChange={e=>{
                      setItems(prev => prev.map((x,i)=> i===idx ? { ...x, update_hpp: e.target.checked } : x))
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <Button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1" onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==idx))}>Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan (Order - Pending)</Button>
        </div>

        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </Card>

      <Modal isOpen={showConfirm} onClose={()=>setShowConfirm(false)} title="Order Disimpan" size="sm">
        <p className="text-sm">Order disimpan sebagai draft. Lihat tabel pending di bawah untuk proses penerimaan.</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={()=> setShowConfirm(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Tutup</Button>
        </div>
      </Modal>

      <Modal isOpen={showReceive} onClose={()=>setShowReceive(false)} title="Terima Barang (Partial)" size="lg">
        <div className="overflow-auto max-h-[60vh] pr-1">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Seragam</th>
                <th className="py-2 pr-4">Ukuran</th>
                <th className="py-2 pr-4">Sisa</th>
                <th className="py-2 pr-4">Terima</th>
                <th className="py-2 pr-4">Biaya/Unit</th>
                <th className="py-2 pr-4">Update HPP?</th>
              </tr>
            </thead>
            <tbody>
              {receiveRows.map((r, idx) => (
                <tr key={r.purchase_item_id} className="border-b">
                  <td className="py-2 pr-4">{uniforms.find(u=>u.uniform_id===r.uniform_id)?.uniform_name || r.uniform_id}</td>
                  <td className="py-2 pr-4">{sizes.find(s=>s.size_id===r.size_id)?.size_name || r.size_id}</td>
                  <td className="py-2 pr-4">{r.qty_remaining}</td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={r.qty_receive} onChange={e=>{
                      const q = Math.max(0, Math.min(toNumber(e.target.value), Number(r.qty_remaining||0)))
                      setReceiveRows(prev=> prev.map((x,i)=> i===idx ? { ...x, qty_receive: q } : x))
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <Input inputMode="numeric" value={r.unit_cost} onChange={e=>{
                      setReceiveRows(prev=> prev.map((x,i)=> i===idx ? { ...x, unit_cost: toNumber(e.target.value) } : x))
                    }} />
                  </td>
                  <td className="py-2 pr-4">
                    <input type="checkbox" checked={!!r.update_hpp} onChange={e=> setReceiveRows(prev=> prev.map((x,i)=> i===idx ? { ...x, update_hpp: e.target.checked } : x)) } />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2 justify-end">
          <Button onClick={postReceipt} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan Penerimaan</Button>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Riwayat Penerimaan</h3>
          <ul className="list-disc ml-6 text-sm">
            {receipts.map(r => (
              <li key={r.receipt_id}>#{r.receipt_id} • {r.receipt_date} {r.notes ? '• '+r.notes : ''}</li>
            ))}
            {!receipts.length && <li className="text-gray-500">Belum ada penerimaan</li>}
          </ul>
        </div>
      </Modal>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pending Order (Draft)</h2>
          <Button onClick={()=>loadPending(Number(unitId))} className="bg-gray-600 hover:bg-gray-700 text-white" disabled={loadingPending}>Refresh</Button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(p => (
                <tr key={p.purchase_id} className="border-b">
                  <td className="py-2 pr-4">#{p.purchase_id}</td>
                  <td className="py-2 pr-4">{p.purchase_date}</td>
                  <td className="py-2 pr-4">{p.supplier?.supplier_name || '-'}</td>
                  <td className="py-2 pr-4">{p.invoice_no || '-'}</td>
                  <td className="py-2 pr-4">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>openReceive(p.purchase_id)}>Terima</Button>
                  </td>
                </tr>
              ))}
              {!pending.length && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>Tidak ada order pending.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transaksi Selesai</h2>
          <Button onClick={()=>loadCompleted(Number(unitId))} className="bg-gray-600 hover:bg-gray-700 text-white" disabled={loadingCompleted}>Refresh</Button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {completed.map(p => (
                <tr key={p.purchase_id} className="border-b">
                  <td className="py-2 pr-4">#{p.purchase_id}</td>
                  <td className="py-2 pr-4">{p.purchase_date}</td>
                  <td className="py-2 pr-4">{p.supplier?.supplier_name || '-'}</td>
                  <td className="py-2 pr-4">{p.invoice_no || '-'}</td>
                  <td className="py-2 pr-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>openHistory(p.purchase_id)}>Lihat Riwayat</Button>
                  </td>
                </tr>
              ))}
              {!completed.length && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>Belum ada transaksi selesai.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showHistory} onClose={()=>setShowHistory(false)} title="Riwayat Invoice" size="lg">
        {historyHeader && (
          <div className="mb-4 text-sm">
            <div>Invoice: <strong>{historyHeader.invoice_no || '-'}</strong></div>
            <div>Tanggal: {historyHeader.purchase_date}</div>
            <div>Supplier: {historyHeader.supplier?.supplier_name || '-'}</div>
            <div>Status: {historyHeader.status}</div>
            {historyHeader.notes && <div>Catatan: {historyHeader.notes}</div>}
          </div>
        )}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Ringkasan Item</h3>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Seragam</th>
                  <th className="py-2 pr-4">Ukuran</th>
                  <th className="py-2 pr-4">Dipesan</th>
                  <th className="py-2 pr-4">Diterima</th>
                  <th className="py-2 pr-4">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map(it => (
                  <tr key={it.purchase_item_id} className="border-b">
                    <td className="py-2 pr-4">{uniforms.find(u=>u.uniform_id===it.uniform_id)?.uniform_name || it.uniform_id}</td>
                    <td className="py-2 pr-4">{sizes.find(s=>s.size_id===it.size_id)?.size_name || it.size_id}</td>
                    <td className="py-2 pr-4">{it.qty_ordered}</td>
                    <td className="py-2 pr-4">{it.qty_received}</td>
                    <td className="py-2 pr-4">{it.qty_remaining}</td>
                  </tr>
                ))}
                {!historyItems.length && (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={5}>Tidak ada data item.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Riwayat Penerimaan</h3>
          <ul className="list-disc ml-6 text-sm">
            {historyReceipts.map(r => (
              <li key={r.receipt_id}>
                #{r.receipt_id} • {r.receipt_date} {r.notes ? '• '+r.notes : ''}
                {r.attachment_url && (
                  <>
                    {' '}• <a href={r.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lampiran</a>
                  </>
                )}
              </li>
            ))}
            {!historyReceipts.length && <li className="text-gray-500">Belum ada penerimaan</li>}
          </ul>
        </div>
      </Modal>
    </div>
  )
}
