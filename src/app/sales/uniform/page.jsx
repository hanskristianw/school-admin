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
  const [students, setStudents] = useState([])
  const [searchStudent, setSearchStudent] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [detailSiswaId, setDetailSiswaId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [uniforms, setUniforms] = useState([]) // { uniform_id, uniform_name }
  const [sizes, setSizes] = useState([]) // by unit
  const [suppliers, setSuppliers] = useState([]) // All active suppliers
  const [variants, setVariants] = useState([]) // uniform_variant with size
  const [stockMap, setStockMap] = useState(new Map()) // key `${u}_${s}` -> qty
  const [stockBySupplier, setStockBySupplier] = useState(new Map()) // key `${u}_${s}_${supp}` -> qty
  const [items, setItems] = useState([]) // {uniform_id, size_id, qty, unit_price, unit_hpp, supplier_id}
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  // Load units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const [uRes, suppRes] = await Promise.all([
          supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name'),
          supabase.from('uniform_supplier').select('*').eq('is_active', true).order('supplier_name')
        ])
        if (uRes.error) throw uRes.error
        const schools = (uRes.data || []).filter(u => u.is_school)
        setUnits(schools)
        if (schools.length && !unitId) setUnitId(String(schools[0].unit_id))
        if (!suppRes.error) setSuppliers(suppRes.data || [])
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
        // Load kelas for selected unit first
        const { data: kelasData, error: kelasErr } = await supabase
          .from('kelas')
          .select('kelas_id')
          .eq('kelas_unit_id', Number(unitId))
        if (kelasErr) throw kelasErr
        
        const kelasIds = (kelasData || []).map(k => k.kelas_id)
        
        if (kelasIds.length === 0) {
          setStudents([])
        } else {
          // Load students for those kelas with join to users for names
          const { data: studentsData, error: studErr } = await supabase
            .from('detail_siswa')
            .select('detail_siswa_id, detail_siswa_user_id, detail_siswa_kelas_id')
            .in('detail_siswa_kelas_id', kelasIds)
          if (studErr) throw studErr
          
          // Get user names
          const userIds = (studentsData || []).map(s => s.detail_siswa_user_id)
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('user_id, user_nama_depan, user_nama_belakang')
              .in('user_id', userIds)
            
            const nameMap = new Map((usersData || []).map(u => [
              u.user_id, 
              `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
            ]))
            
            const mergedStudents = (studentsData || []).map(s => ({
              detail_siswa_id: s.detail_siswa_id,
              detail_siswa_user_id: s.detail_siswa_user_id,
              detail_siswa_nama: nameMap.get(s.detail_siswa_user_id) || `User ${s.detail_siswa_user_id}`
            }))
            
            setStudents(mergedStudents.sort((a, b) => a.detail_siswa_nama.localeCompare(b.detail_siswa_nama)))
          } else {
            setStudents([])
          }
        }

        const [uRes, sRes, vRes, stRes] = await Promise.all([
          // Get unit-specific items OR universal items (unit_id = NULL)
          supabase.from('uniform').select('uniform_id, uniform_name, is_universal').or(`unit_id.eq.${Number(unitId)},unit_id.is.null`).eq('is_active', true).order('uniform_name'),
          supabase.from('uniform_size').select('*').eq('is_active', true).order('display_order'),
          supabase.from('uniform_variant').select('uniform_id, size_id, hpp, price'),
          supabase.from('uniform_stock_txn').select('uniform_id, size_id, supplier_id, qty_delta')
        ])
        if (uRes.error) throw uRes.error
        if (sRes.error) throw sRes.error
        if (vRes.error) throw vRes.error
        if (stRes.error) throw stRes.error
        setUniforms(uRes.data || [])
        setSizes(sRes.data || [])
        setVariants(vRes.data || [])
        
        // Calculate total stock and stock by supplier
        const sm = new Map()
        const sbs = new Map()
        for (const row of (stRes.data || [])) {
          const key = `${row.uniform_id}_${row.size_id}`
          const suppKey = `${row.uniform_id}_${row.size_id}_${row.supplier_id || 'null'}`
          sm.set(key, (sm.get(key) || 0) + Number(row.qty_delta))
          sbs.set(suppKey, (sbs.get(suppKey) || 0) + Number(row.qty_delta))
        }
        setStockMap(sm)
        setStockBySupplier(sbs)
        setItems([])
        setReceiptFile(null)
      } catch (e) { setError(e.message) } finally { setLoading(false) }
    }
    load()
  }, [unitId])

  const getPrice = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.price || 0
  const getHpp = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.hpp || 0
  const stockOf = (uid, sid) => stockMap.get(`${uid}_${sid}`) || 0
  const stockOfSupplier = (uid, sid, suppId) => stockBySupplier.get(`${uid}_${sid}_${suppId || 'null'}`) || 0

  // Get uniforms that have stock available
  const uniformsWithStock = useMemo(() => {
    return uniforms.filter(u => {
      // Check if this uniform has any stock across all sizes
      for (const size of sizes) {
        const stock = stockOf(u.uniform_id, size.size_id)
        if (stock > 0) return true
      }
      return false
    })
  }, [uniforms, sizes, stockMap])

  const addItem = () => {
    if (!uniformsWithStock.length || !sizes.length) return
    const uid = uniformsWithStock[0].uniform_id
    // Find first size with stock for this uniform
    let sid = sizes[0].size_id
    for (const size of sizes) {
      if (stockOf(uid, size.size_id) > 0) {
        sid = size.size_id
        break
      }
    }
    // Find first supplier with stock, or null
    const suppId = getAvailableSuppliers(uid, sid)[0]?.supplier_id || null
    setItems(prev => [...prev, { 
      uniform_id: uid, 
      size_id: sid, 
      qty: 1, 
      unit_price: getPrice(uid, sid), 
      unit_hpp: getHpp(uid, sid),
      supplier_id: suppId 
    }])
  }
  
  const getSizesWithStock = (uid) => {
    return sizes.filter(s => stockOf(uid, s.size_id) > 0)
  }

  const getAvailableSuppliers = (uid, sid) => {
    const result = []
    // Check stock from each supplier
    for (const [key, qty] of stockBySupplier.entries()) {
      if (qty > 0 && key.startsWith(`${uid}_${sid}_`)) {
        const suppId = key.split('_')[2]
        const actualSuppId = suppId === 'null' ? null : Number(suppId)
        const supplier = actualSuppId ? suppliers.find(s => s.supplier_id === actualSuppId) : null
        result.push({
          supplier_id: actualSuppId,
          supplier_name: supplier ? supplier.supplier_name : 'Stock Awal (Tanpa Supplier)',
          available: qty
        })
      }
    }
    return result.sort((a, b) => {
      if (a.supplier_id === null) return -1
      if (b.supplier_id === null) return 1
      return a.supplier_name.localeCompare(b.supplier_name)
    })
  }

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
    if (!detailSiswaId) return 'Pilih siswa'
    if (!items.length) return 'Tambahkan item'
    for (const it of items) {
      if (!it.uniform_id || !it.size_id || !Number(it.qty)) return 'Item tidak valid'
      const available = it.supplier_id !== undefined 
        ? stockOfSupplier(it.uniform_id, it.size_id, it.supplier_id)
        : stockOf(it.uniform_id, it.size_id)
      if (Number(it.qty) > available) {
        const uName = uniforms.find(u=>u.uniform_id===it.uniform_id)?.uniform_name || ''
        const sName = sizes.find(s=>s.size_id===it.size_id)?.size_name || ''
        return `Stok tidak cukup untuk ${uName} - ${sName}`
      }
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
      
      // Get supplier_id from items state (user's selection)
      // Post stock txn with supplier_id
      const stockRows = (saleItems || []).map(it => {
        const itemInCart = items.find(i => i.uniform_id === it.uniform_id && i.size_id === it.size_id)
        return {
          uniform_id: it.uniform_id, 
          size_id: it.size_id, 
          supplier_id: itemInCart?.supplier_id || null,
          qty_delta: -Number(it.qty), 
          txn_type: 'sale', 
          ref_table: 'uniform_sale', 
          ref_id: sale.sale_id, 
          notes: 'penjualan seragam'
        }
      })
      if (stockRows.length) {
        const { error: stErr } = await supabase.from('uniform_stock_txn').insert(stockRows)
        if (stErr) throw stErr
      }
      // Update sale to paid
      const { error: updErr } = await supabase.from('uniform_sale').update({ status: 'paid' }).eq('sale_id', sale.sale_id)
      if (updErr) throw updErr
      setShowConfirm(false)
      // Refresh stock
      const { data: st } = await supabase.from('uniform_stock_txn').select('uniform_id, size_id, supplier_id, qty_delta')
      const sm = new Map()
      const sbs = new Map()
      for (const row of (st || [])) {
        const key = `${row.uniform_id}_${row.size_id}`
        const suppKey = `${row.uniform_id}_${row.size_id}_${row.supplier_id || 'null'}`
        sm.set(key, (sm.get(key) || 0) + Number(row.qty_delta))
        sbs.set(suppKey, (sbs.get(suppKey) || 0) + Number(row.qty_delta))
      }
      setStockMap(sm)
      setStockBySupplier(sbs)
      // Clear cart
      setItems([])
      setReceiptFile(null)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Penjualan Seragam</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola transaksi penjualan seragam siswa</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Selection Card */}
      <Card className="p-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div>
            <Label>Unit *</Label>
            <select 
              className="mt-1 w-full border rounded px-3 py-2" 
              value={unitId} 
              onChange={e => {
                setUnitId(e.target.value)
                setDetailSiswaId('')
                setSelectedStudent(null)
                setSearchStudent('')
                setShowDropdown(false)
                setItems([])
              }}
            >
              <option value="">-- Pilih Unit --</option>
              {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
          </div>

          <div>
            <Label>Cari Siswa *</Label>
            <div className="relative mt-1">
              <Input
                placeholder="🔍 Ketik nama siswa..."
                value={searchStudent}
                onChange={e => {
                  setSearchStudent(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={!unitId}
              />
              {showDropdown && searchStudent && students.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {students
                    .filter(s => 
                      s.detail_siswa_nama.toLowerCase().includes(searchStudent.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(s => (
                      <button
                        key={s.detail_siswa_id}
                        onClick={() => {
                          setDetailSiswaId(String(s.detail_siswa_id))
                          setSelectedStudent(s)
                          setSearchStudent(s.detail_siswa_nama)
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <div className="font-medium text-sm">{s.detail_siswa_nama}</div>
                        <div className="text-xs text-gray-500">ID: {s.detail_siswa_id}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            {selectedStudent && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm">
                <div className="font-semibold text-blue-900">{selectedStudent.detail_siswa_nama}</div>
                <div className="text-blue-700 text-xs">ID: {selectedStudent.detail_siswa_id}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Items Card */}
      {detailSiswaId && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Daftar Item</h2>
            <Button 
              onClick={addItem} 
              disabled={!uniformsWithStock.length || !sizes.length}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              + Tambah Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🛒</div>
              <p>Belum ada item. Klik "Tambah Item" untuk mulai.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-gray-50">
                      <th className="py-3 px-3 font-semibold text-gray-700">Seragam</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Ukuran</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Supplier</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Stok</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Qty</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Harga</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Subtotal</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
              {items.map((it, idx) => {
                const availableSuppliers = getAvailableSuppliers(it.uniform_id, it.size_id)
                const selectedSupp = it.supplier_id !== undefined 
                  ? availableSuppliers.find(s => s.supplier_id === it.supplier_id)
                  : availableSuppliers[0]
                const stokSupplier = selectedSupp?.available || 0
                const stokTotal = stockOf(it.uniform_id, it.size_id)
                const subtotal = Number(it.qty || 0) * Number(it.unit_price || 0)
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-3">
                      <select className="w-full border rounded px-2 py-1.5 text-sm" value={it.uniform_id} onChange={e=>{
                        const uid = Number(e.target.value)
                        const availSizes = getSizesWithStock(uid)
                        const sid = availSizes[0]?.size_id || sizes[0]?.size_id
                        const suppId = getAvailableSuppliers(uid, sid)[0]?.supplier_id || null
                        updateItem(idx, { uniform_id: uid, size_id: sid, supplier_id: suppId, unit_price: getPrice(uid, sid), unit_hpp: getHpp(uid, sid), qty: 1 })
                      }}>
                        {uniformsWithStock.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <select className="w-full border rounded px-2 py-1.5 text-sm" value={it.size_id} onChange={e=>{
                        const sid = Number(e.target.value)
                        const suppId = getAvailableSuppliers(it.uniform_id, sid)[0]?.supplier_id || null
                        updateItem(idx, { size_id: sid, supplier_id: suppId, unit_price: getPrice(it.uniform_id, sid), unit_hpp: getHpp(it.uniform_id, sid), qty: 1 })
                      }}>
                        {getSizesWithStock(it.uniform_id).map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <select 
                        className="w-full border rounded px-2 py-1.5 text-xs" 
                        value={it.supplier_id === null ? 'null' : (it.supplier_id || 'null')} 
                        onChange={e=>{
                          const val = e.target.value
                          const suppId = val === 'null' ? null : Number(val)
                          updateItem(idx, { supplier_id: suppId })
                        }}
                      >
                        {availableSuppliers.length === 0 && <option value="">Stok Habis</option>}
                        {availableSuppliers.map((s, i) => (
                          <option key={i} value={s.supplier_id === null ? 'null' : s.supplier_id}>
                            {s.supplier_name} ({s.available})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-xs">
                        <div className="font-semibold text-blue-600">{stokSupplier} pcs</div>
                        <div className="text-gray-500">Tot: {stokTotal}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Input 
                        type="number"
                        min="0"
                        max={stokSupplier}
                        inputMode="numeric" 
                        value={it.qty} 
                        onChange={e=>{
                          const q = Math.max(0, Math.min(stokSupplier, toNumber(e.target.value)))
                          updateItem(idx, { qty: q })
                        }} 
                        className="w-20"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <Input 
                        type="number"
                        min="0"
                        inputMode="numeric" 
                        value={it.unit_price} 
                        onChange={e=>{
                          updateItem(idx, { unit_price: toNumber(e.target.value) })
                        }} 
                        className="w-28"
                      />
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{formatCurrency(subtotal)}</td>
                    <td className="py-3 px-3">
                      <Button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs" onClick={()=>removeItem(idx)}>Hapus</Button>
                    </td>
                  </tr>
                )
              })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {items.map((it, idx) => {
                  const availableSuppliers = getAvailableSuppliers(it.uniform_id, it.size_id)
                  const selectedSupp = it.supplier_id !== undefined 
                    ? availableSuppliers.find(s => s.supplier_id === it.supplier_id)
                    : availableSuppliers[0]
                  const stokSupplier = selectedSupp?.available || 0
                  const stokTotal = stockOf(it.uniform_id, it.size_id)
                  const subtotal = Number(it.qty || 0) * Number(it.unit_price || 0)
                  return (
                    <Card key={idx} className="p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Seragam</Label>
                          <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={it.uniform_id} onChange={e=>{
                            const uid = Number(e.target.value)
                            const availSizes = getSizesWithStock(uid)
                            const sid = availSizes[0]?.size_id || sizes[0]?.size_id
                            const suppId = getAvailableSuppliers(uid, sid)[0]?.supplier_id || null
                            updateItem(idx, { uniform_id: uid, size_id: sid, supplier_id: suppId, unit_price: getPrice(uid, sid), unit_hpp: getHpp(uid, sid), qty: 1 })
                          }}>
                            {uniformsWithStock.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Ukuran</Label>
                            <select className="w-full border rounded px-2 py-1.5 text-sm mt-1" value={it.size_id} onChange={e=>{
                              const sid = Number(e.target.value)
                              const suppId = getAvailableSuppliers(it.uniform_id, sid)[0]?.supplier_id || null
                              updateItem(idx, { size_id: sid, supplier_id: suppId, unit_price: getPrice(it.uniform_id, sid), unit_hpp: getHpp(it.uniform_id, sid), qty: 1 })
                            }}>
                              {getSizesWithStock(it.uniform_id).map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <Input 
                              type="number"
                              min="0"
                              max={stokSupplier}
                              value={it.qty} 
                              onChange={e=>{
                                const q = Math.max(0, Math.min(stokSupplier, toNumber(e.target.value)))
                                updateItem(idx, { qty: q })
                              }} 
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Supplier</Label>
                          <select 
                            className="w-full border rounded px-2 py-1.5 text-xs mt-1" 
                            value={it.supplier_id === null ? 'null' : (it.supplier_id || 'null')} 
                            onChange={e=>{
                              const val = e.target.value
                              const suppId = val === 'null' ? null : Number(val)
                              updateItem(idx, { supplier_id: suppId })
                            }}
                          >
                            {availableSuppliers.length === 0 && <option value="">Stok Habis</option>}
                            {availableSuppliers.map((s, i) => (
                              <option key={i} value={s.supplier_id === null ? 'null' : s.supplier_id}>
                                {s.supplier_name} ({s.available})
                              </option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-600 mt-1">
                            Stok: <span className="font-semibold text-blue-600">{stokSupplier}</span> | Total: {stokTotal}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Harga Satuan</Label>
                          <Input 
                            type="number"
                            min="0"
                            value={it.unit_price} 
                            onChange={e=>{
                              updateItem(idx, { unit_price: toNumber(e.target.value) })
                            }} 
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div>
                            <div className="text-xs text-gray-600">Subtotal</div>
                            <div className="font-bold text-lg text-gray-900">{formatCurrency(subtotal)}</div>
                          </div>
                          <Button 
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm" 
                            onClick={()=>removeItem(idx)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Summary and Actions */}
              <div className="mt-6 pt-4 border-t space-y-4">
                <div>
                  <Label>Bukti Transfer (Opsional)</Label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e=> setReceiptFile(e.target.files?.[0] || null)} 
                    className="mt-1 w-full text-sm"
                  />
                  {receiptFile && (
                    <div className="text-xs text-green-600 mt-1">✓ File terpilih: {receiptFile.name}</div>
                  )}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">Total Harga:</span>
                    <span className="text-2xl font-bold text-blue-900">{formatCurrency(totals.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Perkiraan HPP:</span>
                    <span className="text-gray-700">{formatCurrency(totals.cost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-600">Margin:</span>
                    <span className="font-semibold text-green-700">{formatCurrency(totals.amount - totals.cost)}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={createSale} 
                  disabled={saving || items.length === 0} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-semibold text-lg disabled:opacity-50"
                >
                  {saving ? '⏳ Menyimpan...' : '✓ Simpan Transaksi (Pending)'}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {error && !showConfirm && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Confirm modal to mark as paid */}
      <Modal isOpen={showConfirm} onClose={()=>setShowConfirm(false)} title="✅ Konfirmasi Pembayaran" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-gray-700">
              <strong>Perhatian:</strong> Setelah ditandai Lunas, stok akan berkurang sesuai jumlah penjualan dan transaksi tidak dapat dibatalkan.
            </p>
          </div>
          
          <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Siswa:</span>
              <span className="font-semibold">{selectedStudent?.detail_siswa_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Item:</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700 font-medium">Total Bayar:</span>
              <span className="font-bold text-lg text-blue-900">{formatCurrency(totals.amount)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => setShowConfirm(false)} 
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button 
              onClick={markPaid} 
              disabled={saving} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {saving ? '⏳ Memproses...' : '✓ Tandai Lunas'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
