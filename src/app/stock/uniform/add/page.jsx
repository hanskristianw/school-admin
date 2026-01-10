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
  const [activeTab, setActiveTab] = useState('order') // 'order', 'receive', 'history'
  const [currentStep, setCurrentStep] = useState(1) // Wizard step: 1, 2, or 3
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [uniforms, setUniforms] = useState([]) // All uniforms (for displaying in table)
  const [sizes, setSizes] = useState([]) // All sizes (for displaying in table)
  const [uniformsByUnit, setUniformsByUnit] = useState({}) // Cache: unit_id -> uniforms[]
  const [sizesByUnit, setSizesByUnit] = useState({}) // Cache: unit_id -> sizes[]
  const [variants, setVariants] = useState([])
  const [items, setItems] = useState([]) // {unit_id, uniform_id, size_id, qty, unit_cost, update_hpp:boolean}
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

  // Modal add item state
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItem, setNewItem] = useState({ unit_id: '', uniform_id: '', size_id: '', qty: 1, unit_cost: 0, update_hpp: false })
  const [itemAddedSuccess, setItemAddedSuccess] = useState(false)

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
    const fetchAllUniforms = async () => {
      const [uRes, sRes, vRes] = await Promise.all([
        supabase.from('uniform').select('uniform_id, uniform_name, unit_id').eq('is_active', true).order('uniform_name'),
        supabase.from('uniform_size').select('*').eq('is_active', true).order('display_order'),
        supabase.from('uniform_variant').select('uniform_id, size_id, hpp, price')
      ])
      if (!uRes.error) setUniforms(uRes.data || [])
      if (!sRes.error) setSizes(sRes.data || [])
      if (!vRes.error) setVariants(vRes.data || [])
    }
    fetchUnits(); fetchSuppliers(); fetchAllUniforms()
  }, [])

  // Load uniforms and sizes for selected unit in modal
  useEffect(() => {
    if (!newItem.unit_id) return
    // Check cache first
    if (uniformsByUnit[newItem.unit_id] && sizesByUnit[newItem.unit_id]) return
    
    const load = async () => {
      const uid = Number(newItem.unit_id)
      const [uRes, sRes] = await Promise.all([
        supabase.from('uniform').select('uniform_id, uniform_name, unit_id').eq('unit_id', uid).eq('is_active', true).order('uniform_name'),
        supabase.from('uniform_size').select('*').eq('unit_id', uid).eq('is_active', true).order('display_order'),
      ])
      if (uRes.error || sRes.error) { setError(uRes.error?.message || sRes.error?.message); return }
      setUniformsByUnit(prev => ({ ...prev, [newItem.unit_id]: uRes.data || [] }))
      setSizesByUnit(prev => ({ ...prev, [newItem.unit_id]: sRes.data || [] }))
    }
    load();
  }, [newItem.unit_id, uniformsByUnit, sizesByUnit])

  // Auto-load data when switching tabs
  useEffect(() => {
    if (activeTab === 'receive') {
      loadPending()
    } else if (activeTab === 'history') {
      loadCompleted()
    }
  }, [activeTab])

  const loadPending = async () => {
    setLoadingPending(true)
    const { data, error } = await supabase
      .from('uniform_purchase')
      .select(`
        purchase_id, 
        purchase_date, 
        invoice_no, 
        status, 
        supplier:uniform_supplier(supplier_name),
        items:uniform_purchase_item(unit_id, unit:unit(unit_name))
      `)
      .eq('status', 'draft')
      .order('purchase_id', { ascending: false })
    if (!error) setPending(data || [])
    setLoadingPending(false)
  }

  const loadCompleted = async () => {
    setLoadingCompleted(true)
    const { data, error } = await supabase
      .from('uniform_purchase')
      .select(`
        purchase_id, 
        purchase_date, 
        invoice_no, 
        status, 
        supplier:uniform_supplier(supplier_name),
        items:uniform_purchase_item(unit_id, unit:unit(unit_name))
      `)
      .eq('status', 'posted')
      .order('purchase_id', { ascending: false })
    if (!error) setCompleted(data || [])
    setLoadingCompleted(false)
  }

  const addItem = () => {
    if (items.length >= 100) return
    setNewItem({ unit_id: '', uniform_id: '', size_id: '', qty: 1, unit_cost: 0, update_hpp: false })
    setShowAddItemModal(true)
  }

  const confirmAddItem = () => {
    if (!newItem.unit_id || !newItem.uniform_id || !newItem.size_id || !Number(newItem.qty)) {
      setError('Lengkapi semua field item')
      return
    }
    setItems(prev => [...prev, { ...newItem }])
    
    // Show success message
    setItemAddedSuccess(true)
    setTimeout(() => setItemAddedSuccess(false), 2000)
    
    // Reset form for next item (keep unit_id for convenience)
    const currentUnit = newItem.unit_id
    setNewItem({ unit_id: currentUnit, uniform_id: '', size_id: '', qty: 1, unit_cost: 0, update_hpp: false })
    setError('')
    // Keep modal open for quick add more items
  }

  const closeAddItemModal = () => {
    setShowAddItemModal(false)
    setNewItem({ unit_id: '', uniform_id: '', size_id: '', qty: 1, unit_cost: 0, update_hpp: false })
    setError('')
    setItemAddedSuccess(false)
  }

  const getHpp = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.hpp || 0

  const totals = useMemo(() => items.reduce((s,it)=> s + Number(it.qty||0)*Number(it.unit_cost||0), 0), [items])

  const validateStep = (step) => {
    const missing = []
    if (step === 1) {
      if (!supplierId) missing.push('Supplier belum dipilih')
      if (!purchaseDate) missing.push('Tanggal order belum dipilih')
      return missing
    }
    if (step === 2) {
      if (!items.length) missing.push('Belum ada item yang ditambahkan')
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (!it.unit_id) missing.push(`Item #${i+1}: Unit belum dipilih`)
        if (!it.uniform_id) missing.push(`Item #${i+1}: Seragam belum dipilih`)
        if (!it.size_id) missing.push(`Item #${i+1}: Ukuran belum dipilih`)
        if (!Number(it.qty) || Number(it.qty) <= 0) missing.push(`Item #${i+1}: Qty harus lebih dari 0`)
      }
      return missing
    }
    return missing
  }

  const nextStep = () => {
    const missing = validateStep(currentStep)
    if (missing.length > 0) {
      setError(missing.join(', '))
      return
    }
    setError('')
    setCurrentStep(prev => Math.min(3, prev + 1))
  }

  const prevStep = () => {
    setError('')
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

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
      // Get first unit_id from items for header (for backward compatibility)
      const firstUnitId = items[0]?.unit_id || unitId
      
      // 1) create purchase header as pending
      const { data: header, error: herr } = await supabase.from('uniform_purchase').insert([{ unit_id: Number(firstUnitId), supplier_id: Number(supplierId), purchase_date: purchaseDate, invoice_no: invoiceNo || null, notes: notes || null, status: 'draft' }]).select('purchase_id').single()
      if (herr) throw herr
      const pid = header.purchase_id; setPurchaseId(pid)
      // 2) attachment upload (header-level)
      if (attachment) {
        const url = await uploadAttachment(pid)
        await supabase.from('uniform_purchase').update({ attachment_url: url }).eq('purchase_id', pid)
      }
      // 3) insert items (ordered) with unit_id per item
      const payload = items.map(it => ({ 
        purchase_id: pid, 
        unit_id: Number(it.unit_id),
        uniform_id: it.uniform_id, 
        size_id: it.size_id, 
        qty: Number(it.qty), 
        unit_cost: Number(it.unit_cost || 0) 
      }))
      const { error: ierr } = await supabase.from('uniform_purchase_item').insert(payload)
      if (ierr) throw ierr

      // Prepare receive sheet from ordered quantities
      const { data: pi } = await supabase.from('uniform_purchase_item').select('item_id, unit_id, uniform_id, size_id, qty, unit_cost').eq('purchase_id', pid)
      const rows = (pi || []).map(r => ({ purchase_item_id: r.item_id, unit_id: r.unit_id, uniform_id: r.uniform_id, size_id: r.size_id, qty_remaining: r.qty, qty_receive: 0, unit_cost: r.unit_cost, update_hpp: false }))
      setReceiveRows(rows)
      setReceipts([])
      // clear form for next order
      setItems([]); setAttachment(null); setInvoiceNo(''); setNotes('')
      setCurrentStep(1)
      // refresh pending list and switch to receive tab
      loadPending()
      setActiveTab('receive')
      setShowConfirm(true)
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
      loadPending()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold">Manajemen Stok Seragam</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 -mb-px">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'order'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📦 Buat Order Baru
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
              activeTab === 'receive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📥 Terima Barang
            {pending.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Riwayat Transaksi
          </button>
        </div>
      </div>

      {/* Tab Content: Buat Order Baru */}
      {activeTab === 'order' && (
        <div className="space-y-4 md:space-y-6">
          {/* Wizard Progress Indicator */}
          <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => {
                const isActive = currentStep === step
                const isCompleted = currentStep > step
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                        isCompleted ? 'bg-green-500 text-white' :
                        isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? '✓' : step}
                      </div>
                      <div className={`mt-2 text-xs md:text-sm font-medium text-center ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step === 1 && 'Info Pembelian'}
                        {step === 2 && 'Pilih Item'}
                        {step === 3 && 'Review & Simpan'}
                      </div>
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 mx-2 md:mx-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 1: Informasi Pembelian */}
          {currentStep === 1 && (
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">1</div>
              <h2 className="text-lg font-semibold text-gray-800">Informasi Pembelian</h2>
            </div>
            
            {/* Missing Requirements Alert */}
            {(() => {
              const missing = validateStep(1)
              return missing.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Lengkapi informasi berikut untuk melanjutkan:</h3>
                      <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
                        {missing.map((msg, idx) => <li key={idx}>{msg}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })()}
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label>Supplier <span className="text-red-500">*</span></Label>
                <select 
                  className={`mt-1 w-full border rounded px-3 py-2 ${
                    !supplierId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  value={supplierId} 
                  onChange={e=>setSupplierId(e.target.value)}
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
                </select>
                {!supplierId && <p className="text-xs text-red-600 mt-1">Pilih supplier terlebih dahulu</p>}
              </div>
              <div>
                <Label>Tanggal Order <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={purchaseDate} 
                  onChange={e=>setPurchaseDate(e.target.value)}
                  className={!purchaseDate ? 'border-red-300 bg-red-50' : ''}
                />
                {!purchaseDate && <p className="text-xs text-red-600 mt-1">Pilih tanggal order</p>}
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-4">
              <div>
                <Label>No. Invoice</Label>
                <Input 
                  value={invoiceNo} 
                  onChange={e=>setInvoiceNo(e.target.value)} 
                  placeholder="Opsional"
                />
              </div>
              <div>
                <Label>Lampiran</Label>
                <input 
                  type="file" 
                  onChange={e=>setAttachment(e.target.files?.[0]||null)}
                  className="mt-1 w-full text-sm"
                />
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              {(() => {
                const missing = validateStep(1)
                return (
                  <Button 
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-semibold relative"
                  >
                    {missing.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {missing.length}
                      </span>
                    )}
                    Lanjut ke Item →
                  </Button>
                )
              })()}
            </div>
          </Card>
          )}

          {/* Step 2: Item yang Dipesan */}
          {currentStep === 2 && (
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">2</div>
                <h2 className="text-lg font-semibold text-gray-800">Item yang Dipesan</h2>
                {items.length > 0 && (
                  <span className="text-xs text-gray-500">({items.length}/100)</span>
                )}
              </div>
              <Button 
                onClick={addItem} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={items.length >= 100}
                title={items.length >= 100 ? 'Maksimal 100 item' : 'Tambah item baru'}
              >
                + Tambah Item
              </Button>
            </div>

            {/* Missing Requirements Alert */}
            {(() => {
              const missing = validateStep(2)
              return missing.length > 0 && items.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800">Perbaiki item berikut untuk melanjutkan:</h3>
                      <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
                        {missing.map((msg, idx) => <li key={idx}>{msg}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Info: Multi-Unit Support */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Multi-Unit Purchase Order</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Setiap item bisa untuk unit berbeda. Pilih unit saat menambahkan item di modal.
                  </p>
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-gray-600 font-medium mb-1">Belum ada item</p>
                <p className="text-sm text-gray-500">Klik tombol "Tambah Item" untuk memulai</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-gray-50">
                      <th className="py-3 px-3 font-semibold text-gray-700">No</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Unit</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Seragam</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Ukuran</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Qty</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Harga/Unit</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Subtotal</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Update HPP?</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const subtotal = Number(it.qty || 0) * Number(it.unit_cost || 0)
                      const unit = units.find(u => u.unit_id === it.unit_id)
                      // Find uniform from all units (may be different from current selection)
                      const uniform = (it.uniform_id && uniforms.find(u => u.uniform_id === it.uniform_id)) || null
                      const size = (it.size_id && sizes.find(s => s.size_id === it.size_id)) || null
                      return (
                        <tr key={idx} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-3 px-3 text-gray-600">{idx + 1}</td>
                          <td className="py-3 px-3">
                            {unit ? (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                                {unit.unit_name}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-3">{uniform?.uniform_name || '-'}</td>
                          <td className="py-3 px-3">{size?.size_name || '-'}</td>
                          <td className="py-3 px-3">{it.qty}</td>
                          <td className="py-3 px-3">{formatCurrency(it.unit_cost)}</td>
                          <td className="py-3 px-3 font-semibold text-gray-700">{formatCurrency(subtotal)}</td>
                          <td className="py-3 px-3 text-center">
                            {it.update_hpp ? '✓' : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <Button 
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 text-xs" 
                              onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==idx))}
                            >
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 mt-6 pt-4 border-t">
              <Button 
                onClick={prevStep}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5"
              >
                ← Kembali
              </Button>
              {(() => {
                const missing = validateStep(2)
                return (
                  <Button 
                    onClick={nextStep}
                    disabled={items.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-semibold relative"
                  >
                    {missing.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {missing.length}
                      </span>
                    )}
                    Lanjut ke Review →
                  </Button>
                )
              })()}
            </div>
          </Card>
          )}

          {/* Step 3: Review & Simpan */}
          {currentStep === 3 && (
          <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">3</div>
              <h2 className="text-lg font-semibold text-gray-800">Review & Konfirmasi Order</h2>
            </div>

            {/* Review Informasi Pembelian */}
            <div className="bg-white rounded-lg p-4 mb-4 border">
              <h3 className="font-semibold text-gray-700 mb-3">📋 Informasi Pembelian</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Supplier:</span>
                  <p className="font-medium">{suppliers.find(s => String(s.supplier_id) === supplierId)?.supplier_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tanggal:</span>
                  <p className="font-medium">{purchaseDate}</p>
                </div>
                <div>
                  <span className="text-gray-500">Invoice:</span>
                  <p className="font-medium">{invoiceNo || '-'}</p>
                </div>
              </div>
              <button 
                onClick={() => setCurrentStep(1)}
                className="text-xs text-blue-600 hover:underline mt-2"
              >
                ✏️ Edit
              </button>
            </div>

            {/* Review Items */}
            <div className="bg-white rounded-lg p-4 mb-4 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">📦 Item yang Dipesan ({items.length} item)</h3>
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ✏️ Edit
                </button>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Unit</th>
                      <th className="py-2 pr-3">Seragam</th>
                      <th className="py-2 pr-3">Ukuran</th>
                      <th className="py-2 pr-3 text-right">Qty</th>
                      <th className="py-2 pr-3 text-right">Harga</th>
                      <th className="py-2 pr-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const unit = units.find(u => u.unit_id === it.unit_id)
                      const uniform = uniforms.find(u => u.uniform_id === it.uniform_id)
                      const size = sizes.find(s => s.size_id === it.size_id)
                      const subtotal = Number(it.qty || 0) * Number(it.unit_cost || 0)
                      return (
                        <tr key={idx} className="border-b">
                          <td className="py-2 pr-3">
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                              {unit?.unit_name || '-'}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{uniform?.uniform_name}</td>
                          <td className="py-2 pr-3">{size?.size_name}</td>
                          <td className="py-2 pr-3 text-right">{it.qty}</td>
                          <td className="py-2 pr-3 text-right">{formatCurrency(it.unit_cost)}</td>
                          <td className="py-2 pr-3 text-right font-medium">{formatCurrency(subtotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-4">
              <div>
                <Label>Catatan Tambahan</Label>
                <Input 
                  value={notes} 
                  onChange={e=>setNotes(e.target.value)} 
                  placeholder="Catatan opsional untuk order ini..."
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Items:</span>
                    <span className="font-semibold">{items.length} item</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Total Qty:</span>
                    <span className="font-semibold">{items.reduce((sum, it) => sum + Number(it.qty || 0), 0)} pcs</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="font-semibold text-gray-700">Total Nilai:</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(totals)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-100 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                ℹ️ Order akan disimpan sebagai <strong>draft (pending)</strong>. Stok akan bertambah setelah proses penerimaan barang di tab "Terima Barang".
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button 
                onClick={prevStep}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5"
              >
                ← Kembali ke Item
              </Button>
              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setItems([])
                    setInvoiceNo('')
                    setNotes('')
                    setAttachment(null)
                    setError('')
                    setCurrentStep(1)
                  }} 
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2.5"
                >
                  🔄 Reset
                </Button>
                <Button 
                  onClick={save} 
                  disabled={saving || items.length === 0 || !supplierId} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 font-semibold"
                >
                  {saving ? '⏳ Menyimpan...' : '✓ Simpan Order'}
                </Button>
              </div>
            </div>
          </Card>
          )}
        </div>
      )}

      {/* Modal: Add Item */}
      <Modal isOpen={showAddItemModal} onClose={closeAddItemModal} title="📦 Tambah Item Baru" size="md">
        {(() => {
          const currentUniforms = uniformsByUnit[newItem.unit_id] || []
          const currentSizes = sizesByUnit[newItem.unit_id] || []
          
          return (
            <div className="space-y-4">
              {/* Success Message */}
              {itemAddedSuccess && (
                <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded flex items-center gap-2">
                  <span className="text-lg">✓</span>
                  <span className="font-medium">Item berhasil ditambahkan!</span>
                </div>
              )}

              {/* Unit Selection */}
              <div>
                <Label>Unit <span className="text-red-500">*</span></Label>
                <select 
                  className={`mt-1 w-full border rounded px-3 py-2 ${!newItem.unit_id ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  value={newItem.unit_id}
                  onChange={e => setNewItem({ ...newItem, unit_id: e.target.value, uniform_id: '', size_id: '', unit_cost: 0 })}
                >
                  <option value="">-- Pilih Unit --</option>
                  {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
                </select>
                {!newItem.unit_id && <p className="text-xs text-red-600 mt-1">Pilih unit terlebih dahulu</p>}
              </div>

              <div>
                <Label>Seragam <span className="text-red-500">*</span></Label>
                <select 
                  className={`mt-1 w-full border rounded px-3 py-2 ${!newItem.uniform_id ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  value={newItem.uniform_id}
                  disabled={!newItem.unit_id}
                  onChange={e => {
                    const uid = Number(e.target.value)
                    const sid = currentSizes[0]?.size_id || ''
                    setNewItem({ ...newItem, uniform_id: uid, size_id: sid, unit_cost: getHpp(uid, sid) })
                  }}
                >
                  <option value="">-- Pilih Seragam --</option>
                  {currentUniforms.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
                </select>
                {!newItem.uniform_id && newItem.unit_id && <p className="text-xs text-red-600 mt-1">Pilih seragam terlebih dahulu</p>}
              </div>

              <div>
                <Label>Ukuran <span className="text-red-500">*</span></Label>
                <select 
                  className={`mt-1 w-full border rounded px-3 py-2 ${!newItem.size_id ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  value={newItem.size_id}
                  onChange={e => {
                    const sid = Number(e.target.value)
                    setNewItem({ ...newItem, size_id: sid, unit_cost: getHpp(newItem.uniform_id, sid) })
                  }}
                  disabled={!newItem.uniform_id}
                >
                  <option value="">-- Pilih Ukuran --</option>
                  {currentSizes.map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
                </select>
                {!newItem.size_id && newItem.uniform_id && <p className="text-xs text-red-600 mt-1">Pilih ukuran</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    min="1"
                    value={newItem.qty}
                    onChange={e => setNewItem({ ...newItem, qty: Math.max(1, toNumber(e.target.value)) })}
                    className={Number(newItem.qty) <= 0 ? 'border-red-300 bg-red-50' : ''}
                  />
                </div>
                <div>
                  <Label>Harga/Unit (HPP)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={newItem.unit_cost}
                    onChange={e => setNewItem({ ...newItem, unit_cost: toNumber(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                <input 
                  type="checkbox"
                  id="update-hpp-modal"
                  checked={newItem.update_hpp}
                  onChange={e => setNewItem({ ...newItem, update_hpp: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="update-hpp-modal" className="cursor-pointer text-sm">
                  Update HPP di master data seragam
                </Label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(Number(newItem.qty || 0) * Number(newItem.unit_cost || 0))}</span>
                </div>
              </div>

              {itemAddedSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded flex items-center gap-2 animate-pulse">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">✓ Item berhasil ditambahkan! Total: {items.length + 1} item</span>
                </div>
              )}

              {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button 
                  onClick={closeAddItemModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
                >
                  {items.length > 0 ? 'Selesai' : 'Batal'}
                </Button>
                <Button 
                  onClick={confirmAddItem}
                  disabled={!newItem.unit_id || !newItem.uniform_id || !newItem.size_id || !Number(newItem.qty) || itemAddedSuccess}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
                >
                  {itemAddedSuccess ? '✓ Ditambahkan!' : '+ Tambahkan'}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Tab Content: Terima Barang */}
      {activeTab === 'receive' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Pending Order (Menunggu Penerimaan)</h2>
            <Button onClick={loadPending} className="bg-gray-600 hover:bg-gray-700 text-white" disabled={loadingPending}>🔄 Refresh</Button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Supplier</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(p => {
                  // Get unique units from items
                  const uniqueUnits = [...new Set((p.items || []).map(i => i.unit?.unit_name).filter(Boolean))]
                  return (
                    <tr key={p.purchase_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4">#{p.purchase_id}</td>
                      <td className="py-2 pr-4">{p.purchase_date}</td>
                      <td className="py-2 pr-4">{p.supplier?.supplier_name || '-'}</td>
                      <td className="py-2 pr-4">
                        {uniqueUnits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {uniqueUnits.map((unit, idx) => (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                {unit}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-2 pr-4">{p.invoice_no || '-'}</td>
                      <td className="py-2 pr-4">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs" onClick={()=>openReceive(p.purchase_id)}>Terima Barang</Button>
                      </td>
                    </tr>
                  )
                })}
                {!pending.length && (
                  <tr>
                    <td className="py-8 text-gray-500 text-center" colSpan={6}>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">✅</span>
                        <span>Tidak ada order pending.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab Content: Riwayat Transaksi */}
      {activeTab === 'history' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Transaksi Selesai</h2>
            <Button onClick={loadCompleted} className="bg-gray-600 hover:bg-gray-700 text-white" disabled={loadingCompleted}>🔄 Refresh</Button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Supplier</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Invoice</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(p => {
                  // Get unique units from items
                  const uniqueUnits = [...new Set((p.items || []).map(i => i.unit?.unit_name).filter(Boolean))]
                  return (
                    <tr key={p.purchase_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4">#{p.purchase_id}</td>
                      <td className="py-2 pr-4">{p.purchase_date}</td>
                      <td className="py-2 pr-4">{p.supplier?.supplier_name || '-'}</td>
                      <td className="py-2 pr-4">
                        {uniqueUnits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {uniqueUnits.map((unit, idx) => (
                              <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                {unit}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-2 pr-4">{p.invoice_no || '-'}</td>
                      <td className="py-2 pr-4">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs" onClick={()=>openHistory(p.purchase_id)}>Lihat Detail</Button>
                      </td>
                    </tr>
                  )
                })}
                {!completed.length && (
                  <tr>
                    <td className="py-8 text-gray-500 text-center" colSpan={6}>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📭</span>
                        <span>Belum ada transaksi selesai.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showConfirm} onClose={()=>setShowConfirm(false)} title="✅ Order Berhasil Disimpan" size="sm">
        <p className="text-sm mb-2">Order telah disimpan sebagai draft (pending).</p>
        <p className="text-sm text-gray-600">Silakan kunjungi tab <strong>"Terima Barang"</strong> untuk melakukan proses penerimaan barang.</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button onClick={()=> { setShowConfirm(false); setActiveTab('receive'); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">Ke Tab Terima Barang</Button>
          <Button onClick={()=> setShowConfirm(false)} className="bg-gray-600 hover:bg-gray-700 text-white">Tutup</Button>
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

      <Modal isOpen={showHistory} onClose={()=>setShowHistory(false)} title="📋 Detail Riwayat Transaksi" size="lg">
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
