"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import KwitansiModal from '@/components/KwitansiModal'
import { formatCurrency, toNumber } from '@/lib/utils'
import { canVoidTransactions, getUserData } from '@/lib/permissions'


export default function UniformSalesPage() {
  const [allStudents, setAllStudents] = useState([]) // All students loaded once
  const [searchStudent, setSearchStudent] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [userId, setUserId] = useState('') // Changed from detailSiswaId to userId
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [uniforms, setUniforms] = useState([]) // All uniforms (universal + unit-specific)
  const [sizes, setSizes] = useState([])
  const [suppliers, setSuppliers] = useState([]) // All active suppliers
  const [variants, setVariants] = useState([]) // uniform_variant with size
  const [stockMap, setStockMap] = useState(new Map()) // key `${u}_${s}` -> qty
  const [stockBySupplier, setStockBySupplier] = useState(new Map()) // key `${u}_${s}_${supp}` -> qty
  const [items, setItems] = useState([]) // {uniform_id, size_id, qty, unit_price, unit_hpp, supplier_id}
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [showConfirm, setShowConfirm] = useState(false)
  
  // Tab and history states
  const [activeTab, setActiveTab] = useState('penjualan') // 'penjualan', 'history', or 'laporan'
  const [salesHistory, setSalesHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all') // 'all', 'pending', 'paid', 'voided'
  const [historySearch, setHistorySearch] = useState('') // Search query for history
  const [showKwitansi, setShowKwitansi] = useState(false)
  const [selectedSaleForKwitansi, setSelectedSaleForKwitansi] = useState(null)
  const [kwitansiItems, setKwitansiItems] = useState([])
  
  // Void states
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [selectedSaleForVoid, setSelectedSaleForVoid] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  // Pickup date states
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [selectedSaleForPickup, setSelectedSaleForPickup] = useState(null)
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().slice(0, 10))
  const [markingPickup, setMarkingPickup] = useState(false)
  
  // Edit pickup date states
  const [showEditPickupModal, setShowEditPickupModal] = useState(false)
  const [selectedSaleForEditPickup, setSelectedSaleForEditPickup] = useState(null)
  const [editPickupDate, setEditPickupDate] = useState('')
  const [updatingPickup, setUpdatingPickup] = useState(false)
  
  // Edit receipt states
  const [showEditReceiptModal, setShowEditReceiptModal] = useState(false)
  const [selectedSaleForEditReceipt, setSelectedSaleForEditReceipt] = useState(null)
  const [newReceiptFile, setNewReceiptFile] = useState(null)
  const [updatingReceipt, setUpdatingReceipt] = useState(false)
  
  // Check void permission
  const userData = useMemo(() => getUserData(), [])
  const hasVoidPermission = useMemo(() => canVoidTransactions(userData), [userData])


  // Laporan states
  const [reportPeriod, setReportPeriod] = useState('month') // 'month' or 'custom'
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')
  const [reportData, setReportData] = useState([])
  const [reportSummary, setReportSummary] = useState({ total_sales: 0, total_amount: 0, total_cost: 0, total_profit: 0, total_items: 0 })
  const [loadingReport, setLoadingReport] = useState(false)

  // Load initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      try {
        // Get student role ID first
        const { data: roleData, error: roleErr } = await supabase
          .from('role')
          .select('role_id')
          .eq('role_name', 'Student')
          .single()
        
        if (roleErr) throw roleErr
        const studentRoleId = roleData?.role_id

        const [studentsRes, unitsRes, uniformsRes, sizesRes, variantsRes, stockRes, suppRes] = await Promise.all([
          // Load all users with student role - include manual photos
          supabase
            .from('users')
            .select('user_id, user_nama_depan, user_nama_belakang, user_unit_id, user_manual_picture')
            .eq('user_role_id', studentRoleId)
            .eq('is_active', true)
            .order('user_nama_depan'),
          // Load units for mapping
          supabase.from('unit').select('unit_id, unit_name'),
          // Get all active uniforms (universal + unit-specific)
          supabase.from('uniform').select('uniform_id, uniform_name, unit_id, is_universal').eq('is_active', true).order('uniform_name'),
          supabase.from('uniform_size').select('*').eq('is_active', true).order('display_order'),
          supabase.from('uniform_variant').select('uniform_id, size_id, hpp, price'),
          supabase.from('uniform_stock_txn').select('uniform_id, size_id, supplier_id, qty_delta'),
          supabase.from('uniform_supplier').select('*').eq('is_active', true).order('supplier_name')
        ])

        if (studentsRes.error) throw studentsRes.error
        if (unitsRes.error) throw unitsRes.error
        if (uniformsRes.error) throw uniformsRes.error
        if (sizesRes.error) throw sizesRes.error
        if (variantsRes.error) throw variantsRes.error
        if (stockRes.error) throw stockRes.error

        // Create unit map for quick lookup
        const unitMap = new Map((unitsRes.data || []).map(u => [u.unit_id, u.unit_name]))

        // Format students data with photos
        const students = (studentsRes.data || []).map(u => ({
          user_id: u.user_id,
          user_name: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim(),
          user_nama_depan: u.user_nama_depan,
          user_nama_belakang: u.user_nama_belakang,
          user_unit_id: u.user_unit_id,
          user_unit_name: unitMap.get(u.user_unit_id) || '-',
          user_photo: u.user_manual_picture || null
        }))

        setAllStudents(students)
        setUniforms(uniformsRes.data || [])
        setSizes(sizesRes.data || [])
        setVariants(variantsRes.data || [])
        if (!suppRes.error) setSuppliers(suppRes.data || [])

        // Calculate total stock and stock by supplier
        const sm = new Map()
        const sbs = new Map()
        for (const row of (stockRes.data || [])) {
          const key = `${row.uniform_id}_${row.size_id}`
          const suppKey = `${row.uniform_id}_${row.size_id}_${row.supplier_id || 'null'}`
          sm.set(key, (sm.get(key) || 0) + Number(row.qty_delta))
          sbs.set(suppKey, (sbs.get(suppKey) || 0) + Number(row.qty_delta))
        }
        setStockMap(sm)
        setStockBySupplier(sbs)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return []
    const query = searchStudent.toLowerCase()
    return allStudents.filter(s => 
      s.user_name.toLowerCase().includes(query)
    ).slice(0, 20) // Limit to 20 results
  }, [allStudents, searchStudent])

  // Get available uniforms based on selected student's unit
  const availableUniforms = useMemo(() => {
    if (!selectedStudent) return []
    // Show universal uniforms + uniforms specific to student's unit
    return uniforms.filter(u => 
      u.is_universal || u.unit_id === selectedStudent.user_unit_id
    )
  }, [uniforms, selectedStudent])

  const getPrice = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.price || 0
  const getHpp = (uid, sid) => variants.find(v => v.uniform_id === uid && v.size_id === sid)?.hpp || 0
  const stockOf = (uid, sid) => stockMap.get(`${uid}_${sid}`) || 0
  const stockOfSupplier = (uid, sid, suppId) => stockBySupplier.get(`${uid}_${sid}_${suppId || 'null'}`) || 0

  // Get uniforms that have stock available
  const uniformsWithStock = useMemo(() => {
    return availableUniforms.filter(u => {
      // Check if this uniform has any stock across all sizes
      for (const size of sizes) {
        const stock = stockOf(u.uniform_id, size.size_id)
        if (stock > 0) return true
      }
      return false
    })
  }, [availableUniforms, sizes, stockMap])

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
    if (!userId) return 'Pilih siswa'
    if (!selectedStudent) return 'Pilih siswa'
    if (!items.length) return 'Tambahkan item'
    for (const it of items) {
      if (!it.uniform_id || !it.size_id || !Number(it.qty)) return 'Item tidak valid'
      const available = it.supplier_id !== undefined 
        ? stockOfSupplier(it.uniform_id, it.size_id, it.supplier_id)
        : stockOf(it.uniform_id, it.size_id)
      if (Number(it.qty) > available) {
        const uName = availableUniforms.find(u=>u.uniform_id===it.uniform_id)?.uniform_name || ''
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
      // Get user ID for processed_by tracking
      const processedBy = parseInt(localStorage.getItem('kr_id'), 10) || null
      
      // 1) Insert sale pending with user_id and their unit_id
      const { data: sale, error: saleErr } = await supabase.from('uniform_sale').insert([{ 
        user_id: Number(userId), 
        unit_id: Number(selectedStudent.user_unit_id), 
        status: 'pending', 
        payment_method: paymentMethod, 
        total_amount: totals.amount, 
        total_cost: totals.cost,
        processed_by: processedBy
      }]).select('sale_id').single()
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
      // Find latest sale pending for this user
      const { data: sale, error: selErr } = await supabase.from('uniform_sale').select('*').eq('user_id', Number(userId)).eq('status', 'pending').order('sale_id', { ascending: false }).limit(1).single()
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
      // Update sale to paid with pickup_date
      const { error: updErr } = await supabase
        .from('uniform_sale')
        .update({ 
          status: 'paid',
          pickup_date: pickupDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('sale_id', sale.sale_id)
      if (updErr) throw updErr
      
      // Fetch updated sale with pickup_date
      const { data: updatedSale, error: fetchErr } = await supabase
        .from('uniform_sale')
        .select('*')
        .eq('sale_id', sale.sale_id)
        .single()
      if (fetchErr) throw fetchErr
      
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
      
      // Prepare sale data with enriched info for kwitansi
      const saleForKwitansi = {
        ...updatedSale,
        status: 'paid',
        user_name: selectedStudent?.user_name || 'Unknown',
        unit_name: selectedStudent?.user_unit_name || '-'
      }
      
      // Set kwitansi data and open modal
      setKwitansiItems(saleItems || [])
      setSelectedSaleForKwitansi(saleForKwitansi)
      setShowKwitansi(true)
      
      // Clear cart and close confirm modal
      setItems([])
      setReceiptFile(null)
      setPickupDate(new Date().toISOString().slice(0, 10))
      setShowConfirm(false)
    } catch (e) { 
      setError(e.message) 
    } finally { 
      setSaving(false) 
    }
  }

  const fetchSalesHistory = async () => {
    setLoadingHistory(true)
    try {
      // Fetch sales with user info (including void columns, pickup_date, and processed_by)
      const { data: sales, error: salesErr } = await supabase
        .from('uniform_sale')
        .select('sale_id, user_id, unit_id, sale_date, status, payment_method, receipt_url, total_amount, total_cost, created_at, is_voided, voided_at, voided_by, void_reason, pickup_date, processed_by')
        .order('sale_id', { ascending: false })
        .limit(100)

      if (salesErr) throw salesErr

      // Get unique user IDs (buyers), unit IDs, and processed_by IDs (staff)
      const userIds = [...new Set(sales.map(s => s.user_id))]
      const processedByIds = [...new Set(sales.map(s => s.processed_by).filter(Boolean))]
      const allUserIds = [...new Set([...userIds, ...processedByIds])]
      const unitIds = [...new Set(sales.map(s => s.unit_id))]

      // Fetch users and units info
      const [usersRes, unitsRes] = await Promise.all([
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang, user_manual_picture').in('user_id', allUserIds),
        supabase.from('unit').select('unit_id, unit_name').in('unit_id', unitIds)
      ])

      const userMap = new Map((usersRes.data || []).map(u => [
        u.user_id,
        {
          name: `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim(),
          photo: u.user_manual_picture
        }
      ]))
      const unitMap = new Map((unitsRes.data || []).map(u => [u.unit_id, u.unit_name]))

      // Get sale items for each sale
      const saleIds = sales.map(s => s.sale_id)
      const { data: items } = await supabase
        .from('uniform_sale_item')
        .select('sale_id, uniform_id, size_id, qty, unit_price, subtotal')
        .in('sale_id', saleIds)

      // Group items by sale_id
      const itemsBySale = new Map()
      for (const item of (items || [])) {
        if (!itemsBySale.has(item.sale_id)) {
          itemsBySale.set(item.sale_id, [])
        }
        itemsBySale.get(item.sale_id).push(item)
      }

      // Merge data
      const enrichedSales = sales.map(s => ({
        ...s,
        user_name: userMap.get(s.user_id)?.name || 'Unknown',
        user_photo: userMap.get(s.user_id)?.photo || null,
        unit_name: unitMap.get(s.unit_id) || '-',
        processed_by_name: s.processed_by ? (userMap.get(s.processed_by)?.name || 'Unknown') : null,
        items: itemsBySale.get(s.sale_id) || [],
        item_count: (itemsBySale.get(s.sale_id) || []).reduce((sum, i) => sum + i.qty, 0)
      }))

      setSalesHistory(enrichedSales)
    } catch (e) {
      console.error('Error fetching sales history:', e)
      setError(e.message)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchSalesHistory()
    }
  }, [activeTab])

  const handlePrintKwitansi = async (sale) => {
    try {
      // Fetch detailed items for this sale
      const { data: items, error } = await supabase
        .from('uniform_sale_item')
        .select('*')
        .eq('sale_id', sale.sale_id)
      
      if (error) throw error
      
      setKwitansiItems(items || [])
      setSelectedSaleForKwitansi(sale)
      setShowKwitansi(true)
    } catch (e) {
      console.error('Error fetching sale items:', e)
      setError('Gagal memuat detail penjualan')
    }
  }

  const handleMarkPaidFromHistory = async (sale) => {
    if (!confirm('Tandai transaksi ini sebagai LUNAS?')) return

    setSaving(true)
    setError('')

    try {
      // Load sale items
      const { data: saleItems, error: itemsErr } = await supabase
        .from('uniform_sale_item')
        .select('*')
        .eq('sale_id', sale.sale_id)
      
      if (itemsErr) throw itemsErr

      // Post stock transactions
      const stockRows = (saleItems || []).map(it => ({
        uniform_id: it.uniform_id, 
        size_id: it.size_id, 
        supplier_id: null, // No supplier info in items, set null
        qty_delta: -Number(it.qty), 
        txn_type: 'sale', 
        ref_table: 'uniform_sale', 
        ref_id: sale.sale_id, 
        notes: 'penjualan seragam'
      }))

      if (stockRows.length) {
        const { error: stErr } = await supabase
          .from('uniform_stock_txn')
          .insert(stockRows)
        if (stErr) throw stErr
      }

      // Update sale to paid
      const { error: updErr } = await supabase
        .from('uniform_sale')
        .update({ status: 'paid' })
        .eq('sale_id', sale.sale_id)
      
      if (updErr) throw updErr

      // Refresh history
      await fetchSalesHistory()

      // Open kwitansi
      setKwitansiItems(saleItems || [])
      setSelectedSaleForKwitansi({ ...sale, status: 'paid' })
      setShowKwitansi(true)

      alert('✅ Transaksi berhasil ditandai lunas!')
    } catch (e) {
      console.error('Error marking paid:', e)
      setError('Gagal menandai lunas: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAsPickedUp = async () => {
    if (!selectedSaleForPickup || !pickupDate) return

    setMarkingPickup(true)
    setError('')

    try {
      const { error: updateErr } = await supabase
        .from('uniform_sale')
        .update({ 
          pickup_date: pickupDate,
          updated_at: new Date().toISOString() 
        })
        .eq('sale_id', selectedSaleForPickup.sale_id)

      if (updateErr) throw updateErr

      setShowPickupModal(false)
      setSelectedSaleForPickup(null)
      setPickupDate(new Date().toISOString().slice(0, 10))
      await fetchSalesHistory()
      alert('✅ Seragam berhasil ditandai sudah diambil!')
    } catch (e) {
      console.error('Error marking pickup:', e)
      setError('Gagal menandai pengambilan: ' + e.message)
    } finally {
      setMarkingPickup(false)
    }
  }
  
  const handleUpdatePickupDate = async () => {
    if (!selectedSaleForEditPickup || !editPickupDate) return

    setUpdatingPickup(true)
    setError('')

    try {
      const { error: updateErr } = await supabase
        .from('uniform_sale')
        .update({ 
          pickup_date: editPickupDate,
          updated_at: new Date().toISOString() 
        })
        .eq('sale_id', selectedSaleForEditPickup.sale_id)

      if (updateErr) throw updateErr

      setShowEditPickupModal(false)
      setSelectedSaleForEditPickup(null)
      setEditPickupDate('')
      await fetchSalesHistory()
      alert('✅ Tanggal pengambilan berhasil diupdate!')
    } catch (e) {
      console.error('Error updating pickup date:', e)
      setError('Gagal update tanggal pengambilan: ' + e.message)
    } finally {
      setUpdatingPickup(false)
    }
  }
  
  const handleUpdateReceipt = async () => {
    if (!selectedSaleForEditReceipt || !newReceiptFile) return

    setUpdatingReceipt(true)
    setError('')

    try {
      // Upload new receipt
      const file = newReceiptFile
      const ext = file.name.split('.').pop()
      const path = `${selectedSaleForEditReceipt.sale_id}/${Date.now()}.${ext}`
      
      const { error: uploadErr } = await supabase.storage
        .from('uniform-receipts')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      
      if (uploadErr) throw uploadErr

      const { data: pub } = await supabase.storage
        .from('uniform-receipts')
        .getPublicUrl(path)
      
      const receiptUrl = pub?.publicUrl || null

      // Update sale with new receipt URL
      const { error: updateErr } = await supabase
        .from('uniform_sale')
        .update({ 
          receipt_url: receiptUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('sale_id', selectedSaleForEditReceipt.sale_id)

      if (updateErr) throw updateErr

      setShowEditReceiptModal(false)
      setSelectedSaleForEditReceipt(null)
      setNewReceiptFile(null)
      await fetchSalesHistory()
      alert('✅ Bukti transfer berhasil diupdate!')
    } catch (e) {
      console.error('Error updating receipt:', e)
      setError('Gagal update bukti transfer: ' + e.message)
    } finally {
      setUpdatingReceipt(false)
    }
  }

  const handleVoidSale = async () => {
    if (!selectedSaleForVoid || !voidReason.trim()) {
      setError('Alasan pembatalan harus diisi')
      return
    }

    setVoiding(true)
    setError('')

    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}')
      const userName = `${currentUser.user_nama_depan || ''} ${currentUser.user_nama_belakang || ''}`.trim()

      // 1. Get all items from this sale
      const { data: saleItems, error: itemsError } = await supabase
        .from('uniform_sale_item')
        .select('*')
        .eq('sale_id', selectedSaleForVoid.sale_id)

      if (itemsError) throw itemsError

      // 2. Get original stock transactions to find supplier_id
      const { data: originalTxns, error: txnError } = await supabase
        .from('uniform_stock_txn')
        .select('uniform_id, size_id, supplier_id')
        .eq('txn_type', 'sale')
        .eq('ref_table', 'uniform_sale')
        .eq('ref_id', selectedSaleForVoid.sale_id)

      if (txnError) throw txnError

      // Create map for supplier lookup
      const supplierMap = new Map()
      for (const txn of (originalTxns || [])) {
        const key = `${txn.uniform_id}_${txn.size_id}`
        supplierMap.set(key, txn.supplier_id)
      }

      // 3. Create reverse stock transactions (return stock)
      const reverseTransactions = saleItems.map(item => {
        const key = `${item.uniform_id}_${item.size_id}`
        return {
          uniform_id: item.uniform_id,
          size_id: item.size_id,
          qty_delta: item.qty, // POSITIVE - return stock
          txn_type: 'void',
          ref_table: 'uniform_sale',
          ref_id: selectedSaleForVoid.sale_id,
          supplier_id: supplierMap.get(key) || null,
          notes: `Void sale #${selectedSaleForVoid.sale_id}: ${voidReason}`,
          created_at: new Date().toISOString()
        }
      })

      const { error: insertTxnError } = await supabase
        .from('uniform_stock_txn')
        .insert(reverseTransactions)

      if (insertTxnError) throw insertTxnError

      // 4. Update sale as voided
      const { error: updateError } = await supabase
        .from('uniform_sale')
        .update({
          is_voided: true,
          voided_at: new Date().toISOString(),
          voided_by: userName,
          void_reason: voidReason
        })
        .eq('sale_id', selectedSaleForVoid.sale_id)

      if (updateError) throw updateError

      // Success - refresh history
      setShowVoidModal(false)
      setSelectedSaleForVoid(null)
      setVoidReason('')
      await fetchSalesHistory()
      
      // Show success message
      setError('')
      alert('Transaksi berhasil dibatalkan dan stock telah dikembalikan')
    } catch (e) {
      console.error('Error voiding sale:', e)
      setError('Gagal membatalkan transaksi: ' + e.message)
    } finally {
      setVoiding(false)
    }
  }

  const fetchSalesReport = async () => {
    setLoadingReport(true)
    setError('')
    
    try {
      let startDate, endDate
      
      if (reportPeriod === 'month') {
        // Use selected month
        startDate = `${reportMonth}-01`
        const nextMonth = new Date(reportMonth + '-01')
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        endDate = nextMonth.toISOString().slice(0, 10)
      } else {
        // Use custom range
        if (!reportStartDate || !reportEndDate) {
          setError('Pilih tanggal mulai dan tanggal akhir')
          setLoadingReport(false)
          return
        }
        startDate = reportStartDate
        endDate = reportEndDate
      }

      // Fetch sales in date range (exclude voided)
      const { data: sales, error: salesErr } = await supabase
        .from('uniform_sale')
        .select('sale_id, user_id, unit_id, sale_date, status, total_amount, total_cost, is_voided, pickup_date, processed_by')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .eq('is_voided', false)
        .order('sale_date', { ascending: false })

      if (salesErr) throw salesErr

      // Get unique user IDs (buyers), unit IDs, and processed_by IDs (staff)
      const userIds = [...new Set(sales.map(s => s.user_id))]
      const processedByIds = [...new Set(sales.map(s => s.processed_by).filter(Boolean))]
      const allUserIds = [...new Set([...userIds, ...processedByIds])]
      const unitIds = [...new Set(sales.map(s => s.unit_id))]

      // Fetch users and units info
      const [usersRes, unitsRes] = await Promise.all([
        supabase.from('users').select('user_id, user_nama_depan, user_nama_belakang').in('user_id', allUserIds),
        supabase.from('unit').select('unit_id, unit_name').in('unit_id', unitIds)
      ])

      const userMap = new Map((usersRes.data || []).map(u => [
        u.user_id,
        `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
      ]))
      const unitMap = new Map((unitsRes.data || []).map(u => [u.unit_id, u.unit_name]))

      // Get sale items with details (uniform name, size)
      const saleIds = sales.map(s => s.sale_id)
      const { data: items } = await supabase
        .from('uniform_sale_item')
        .select('sale_id, uniform_id, size_id, qty, unit_price')
        .in('sale_id', saleIds)

      // Get uniform and size info
      const uniformIds = [...new Set((items || []).map(i => i.uniform_id))]
      const sizeIds = [...new Set((items || []).map(i => i.size_id))]

      const [uniformsRes, sizesRes] = await Promise.all([
        supabase.from('uniform').select('uniform_id, uniform_name').in('uniform_id', uniformIds),
        supabase.from('uniform_size').select('size_id, size_name').in('size_id', sizeIds)
      ])

      const uniformMap = new Map((uniformsRes.data || []).map(u => [u.uniform_id, u.uniform_name]))
      const sizeMap = new Map((sizesRes.data || []).map(s => [s.size_id, s.size_name]))

      // Group items by sale_id with details
      const itemsBySale = new Map()
      const itemDetailsBySale = new Map()
      
      for (const item of (items || [])) {
        // Count total qty
        if (!itemsBySale.has(item.sale_id)) {
          itemsBySale.set(item.sale_id, 0)
        }
        itemsBySale.set(item.sale_id, itemsBySale.get(item.sale_id) + item.qty)

        // Store item details
        if (!itemDetailsBySale.has(item.sale_id)) {
          itemDetailsBySale.set(item.sale_id, [])
        }
        itemDetailsBySale.get(item.sale_id).push({
          uniform_name: uniformMap.get(item.uniform_id) || 'Unknown',
          size_name: sizeMap.get(item.size_id) || '-',
          qty: item.qty,
          unit_price: item.unit_price
        })
      }

      // Enrich sales data
      const enrichedSales = sales.map(s => ({
        ...s,
        user_name: userMap.get(s.user_id) || 'Unknown',
        unit_name: unitMap.get(s.unit_id) || '-',
        processed_by_name: s.processed_by ? (userMap.get(s.processed_by) || 'Unknown') : null,
        item_count: itemsBySale.get(s.sale_id) || 0,
        item_details: itemDetailsBySale.get(s.sale_id) || []
      }))

      // Calculate summary
      const summary = {
        total_sales: enrichedSales.length,
        total_amount: enrichedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
        total_cost: enrichedSales.reduce((sum, s) => sum + Number(s.total_cost || 0), 0),
        total_items: enrichedSales.reduce((sum, s) => sum + s.item_count, 0),
        pending_count: enrichedSales.filter(s => s.status === 'pending').length,
        paid_count: enrichedSales.filter(s => s.status === 'paid').length,
      }
      summary.total_profit = summary.total_amount - summary.total_cost

      setReportData(enrichedSales)
      setReportSummary(summary)
    } catch (e) {
      console.error('Error fetching sales report:', e)
      setError('Gagal memuat laporan: ' + e.message)
    } finally {
      setLoadingReport(false)
    }
  }

  const handleExportToExcel = async () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk di-export')
      return
    }

    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()

      // Prepare period info
      let periodText = ''
      if (reportPeriod === 'month') {
        const date = new Date(reportMonth + '-01')
        periodText = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      } else {
        const start = new Date(reportStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        const end = new Date(reportEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        periodText = `${start} - ${end}`
      }

      // Sheet 1: Summary
      const wsSummary = wb.addWorksheet('Ringkasan')
      wsSummary.columns = [{ width: 25 }, { width: 20 }]
      const summaryData = [
        ['LAPORAN PENJUALAN SERAGAM'],
        ['Chung Chung Christian School'],
        ['Periode: ' + periodText],
        [''],
        ['RINGKASAN'],
        ['Total Penjualan', reportSummary.total_sales + ' transaksi'],
        ['Penjualan Lunas', reportSummary.paid_count + ' transaksi'],
        ['Penjualan Pending', reportSummary.pending_count + ' transaksi'],
        ['Total Item Terjual', reportSummary.total_items + ' pcs'],
        [''],
        ['Total Pendapatan', reportSummary.total_amount],
        ['Total HPP', reportSummary.total_cost],
        ['Total Profit', reportSummary.total_profit],
        ['Margin', reportSummary.total_amount > 0 ? ((reportSummary.total_profit / reportSummary.total_amount) * 100).toFixed(2) + '%' : '0%'],
      ]
      summaryData.forEach(row => wsSummary.addRow(row))

      // Sheet 2: Detail Transactions
      const wsDetail = wb.addWorksheet('Detail Penjualan')
      wsDetail.columns = [
        { header: 'ID', key: 'ID', width: 8 },
        { header: 'Tanggal', key: 'Tanggal', width: 12 },
        { header: 'Siswa', key: 'Siswa', width: 25 },
        { header: 'Unit', key: 'Unit', width: 15 },
        { header: 'Staff', key: 'Staff', width: 20 },
        { header: 'Detail Seragam', key: 'Detail Seragam', width: 50 },
        { header: 'Jumlah Item', key: 'Jumlah Item', width: 12 },
        { header: 'Total Harga', key: 'Total Harga', width: 15 },
        { header: 'HPP', key: 'HPP', width: 15 },
        { header: 'Profit', key: 'Profit', width: 15 },
        { header: 'Margin %', key: 'Margin %', width: 10 },
        { header: 'Status', key: 'Status', width: 10 },
        { header: 'Tgl Diambil', key: 'Tgl Diambil', width: 12 },
      ]
      reportData.forEach(sale => {
        const itemsText = sale.item_details
          .map(item => `${item.uniform_name} (${item.size_name}) x${item.qty}`)
          .join(', ')
        wsDetail.addRow({
          'ID': sale.sale_id,
          'Tanggal': new Date(sale.sale_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          'Siswa': sale.user_name,
          'Unit': sale.unit_name,
          'Staff': sale.processed_by_name || '-',
          'Detail Seragam': itemsText,
          'Jumlah Item': sale.item_count,
          'Total Harga': sale.total_amount,
          'HPP': sale.total_cost,
          'Profit': sale.total_amount - sale.total_cost,
          'Margin %': sale.total_amount > 0 ? (((sale.total_amount - sale.total_cost) / sale.total_amount) * 100).toFixed(2) : 0,
          'Status': sale.status === 'paid' ? 'Lunas' : 'Pending',
          'Tgl Diambil': sale.pickup_date ? new Date(sale.pickup_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
        })
      })

      // Generate filename and download
      const filename = `Laporan_Penjualan_${reportPeriod === 'month' ? reportMonth : reportStartDate + '_' + reportEndDate}.xlsx`
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      console.error('Error exporting to Excel:', e)
      alert('Gagal export ke Excel: ' + e.message)
    }
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('penjualan')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'penjualan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Penjualan</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('laporan')
              if (reportData.length === 0) {
                fetchSalesReport()
              }
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'laporan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Laporan Penjualan</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'penjualan' ? (
        // Existing sales form
        <>
        <Card className="p-4">
        <div>
          <Label>Cari Siswa *</Label>
          <div className="relative mt-1">
            <Input
              placeholder="🔍 Ketik nama siswa untuk mencari..."
              value={searchStudent}
              onChange={e => {
                setSearchStudent(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && searchStudent && filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredStudents.map(s => (
                  <button
                    key={s.user_id}
                    onClick={() => {
                      setUserId(String(s.user_id))
                      setSelectedStudent(s)
                      setSearchStudent(s.user_name)
                      setShowDropdown(false)
                      setItems([]) // Clear items when changing student
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{s.user_name}</div>
                    <div className="text-xs text-gray-500">ID: {s.user_id}</div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchStudent && filteredStudents.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
                Tidak ditemukan siswa
              </div>
            )}
          </div>
          {selectedStudent && (
            <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-4">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  {selectedStudent.user_photo ? (
                    <img 
                      src={selectedStudent.user_photo} 
                      alt={selectedStudent.user_name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236B7280"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md border-4 border-white">
                      {selectedStudent.user_nama_depan?.charAt(0) || 'S'}
                    </div>
                  )}
                </div>
                
                {/* Student Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {selectedStudent.user_name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                          ID: {selectedStudent.user_id}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                          </svg>
                          {selectedStudent.user_unit_name}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUserId('')
                        setSelectedStudent(null)
                        setSearchStudent('')
                        setItems([])
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Ganti siswa"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    ✓ Siswa terpilih untuk transaksi penjualan
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Items Card */}
      {userId && selectedStudent && (
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
                  <Label>Metode Pembayaran <span className="text-red-500">*</span></Label>
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Cash/Tunai</option>
                    <option value="credit_card">Kartu Kredit</option>
                    <option value="debit_card">Kartu Debit</option>
                  </select>
                </div>

                {paymentMethod === 'transfer' && (
                  <div>
                    <Label>Bukti Transfer (Opsional)</Label>
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-500 transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {receiptFile ? 'Ganti File' : 'Pilih File'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e=> setReceiptFile(e.target.files?.[0] || null)} 
                        className="hidden"
                      />
                    </label>
                    {receiptFile && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 text-sm text-gray-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                          ✓ {receiptFile.name}
                        </div>
                        <button
                          onClick={() => setReceiptFile(null)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}

                <div>
                  <Label>Tanggal Pengambilan</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPickupDate(new Date().toISOString().slice(0, 10))}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        📅 Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const date = new Date()
                          date.setDate(date.getDate() + 3)
                          setPickupDate(date.toISOString().slice(0, 10))
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                      >
                        +3 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const date = new Date()
                          date.setDate(date.getDate() + 7)
                          setPickupDate(date.toISOString().slice(0, 10))
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                      >
                        +7 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const date = new Date()
                          date.setDate(date.getDate() + 14)
                          setPickupDate(date.toISOString().slice(0, 10))
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
                      >
                        +14 Hari
                      </button>
                    </div>
                    <Input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Tanggal seragam akan diambil (default: hari ini)</p>
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
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-gray-700">
              <strong>Perhatian:</strong> Setelah ditandai Lunas, stok akan berkurang sesuai jumlah penjualan. Transaksi yang sudah lunas masih dapat dibatalkan (void) jika diperlukan.
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
      </>
      ) : activeTab === 'history' ? (
        // History Tab
        <div className="space-y-4">
          {/* Search and Filter */}
          <Card className="p-4">
            {/* Search Box */}
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Cari siswa, ID transaksi, atau unit..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </div>
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              {historySearch && (
                <p className="text-xs text-gray-500 mt-1">
                  Hasil pencarian untuk: <span className="font-medium">"{historySearch}"</span>
                </p>
              )}
            </div>
            
            {/* Filter Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    historyFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setHistoryFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    historyFilter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setHistoryFilter('paid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    historyFilter === 'paid'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setHistoryFilter('voided')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    historyFilter === 'voided'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dibatalkan (Void)
                </button>
              </div>
              <Button
                onClick={fetchSalesHistory}
                disabled={loadingHistory}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingHistory ? 'Loading...' : '🔄 Refresh'}
              </Button>
            </div>
          </Card>

          {/* History List */}
          {loadingHistory ? (
            <Card className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">⏳</div>
              <p>Memuat history...</p>
            </Card>
          ) : salesHistory.filter(s => {
            // Filter by status
            if (historyFilter === 'voided' && !s.is_voided) return false
            if (historyFilter !== 'all' && historyFilter !== 'voided' && (s.status !== historyFilter || s.is_voided)) return false
            
            // Filter by search query
            if (historySearch) {
              const search = historySearch.toLowerCase()
              const matchName = s.user_name?.toLowerCase().includes(search)
              const matchId = s.sale_id?.toString().includes(search)
              const matchUnit = s.unit_name?.toLowerCase().includes(search)
              const matchStaff = s.processed_by_name?.toLowerCase().includes(search)
              return matchName || matchId || matchUnit || matchStaff
            }
            
            return true
          }).length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>Tidak ada data penjualan</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {salesHistory
                .filter(s => {
                  // Filter by status
                  if (historyFilter === 'voided' && !s.is_voided) return false
                  if (historyFilter !== 'all' && historyFilter !== 'voided' && (s.status !== historyFilter || s.is_voided)) return false
                  
                  // Filter by search query
                  if (historySearch) {
                    const search = historySearch.toLowerCase()
                    const matchName = s.user_name?.toLowerCase().includes(search)
                    const matchId = s.sale_id?.toString().includes(search)
                    const matchUnit = s.unit_name?.toLowerCase().includes(search)
                    const matchStaff = s.processed_by_name?.toLowerCase().includes(search)
                    if (!matchName && !matchId && !matchUnit && !matchStaff) return false
                  }
                  
                  return true
                })
                .filter(s => {
                  if (historyFilter === 'all') return true
                  if (historyFilter === 'voided') return s.is_voided
                  return s.status === historyFilter && !s.is_voided
                })
                .map(sale => (
                  <Card key={sale.sale_id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Student Photo */}
                      <div className="flex-shrink-0">
                        {sale.user_photo ? (
                          <img
                            src={sale.user_photo}
                            alt={sale.user_name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236B7280"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                            {sale.user_name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Sale Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{sale.user_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                #{sale.sale_id}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {new Date(sale.sale_date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {sale.unit_name}
                              </span>
                            </div>
                            {sale.processed_by_name && (
                              <div className="mt-1 text-xs text-gray-500">
                                Staff: <span className="font-medium text-gray-700">{sale.processed_by_name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                sale.is_voided
                                  ? 'bg-gray-800 text-white'
                                  : sale.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : sale.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sale.is_voided
                                ? '🚫 VOID'
                                : sale.status === 'paid'
                                ? 'Lunas'
                                : sale.status === 'pending'
                                ? 'Pending'
                                : 'Batal'}
                            </span>
                            {sale.is_voided && (
                              <span className="text-xs text-gray-500">
                                {new Date(sale.voided_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>
                              <span className="font-medium">{sale.item_count} item</span>
                              <span className="mx-2">•</span>
                              <span className="inline-flex items-center gap-1">
                                {sale.payment_method === 'transfer' && '💳 Transfer Bank'}
                                {sale.payment_method === 'cash' && '💵 Cash'}
                                {sale.payment_method === 'credit_card' && '💳 Kartu Kredit'}
                                {sale.payment_method === 'debit_card' && '💳 Kartu Debit'}
                              </span>
                              {sale.payment_method === 'transfer' && sale.receipt_url && (
                                <>
                                  <span className="mx-2">•</span>
                                  <a
                                    href={sale.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    📄 Bukti Transfer
                                  </a>
                                  {!sale.is_voided && (
                                    <button
                                      onClick={() => {
                                        setSelectedSaleForEditReceipt(sale)
                                        setNewReceiptFile(null)
                                        setShowEditReceiptModal(true)
                                      }}
                                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                      title="Edit bukti transfer"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </>
                              )}
                              {sale.payment_method === 'transfer' && !sale.receipt_url && !sale.is_voided && (
                                <>
                                  <span className="mx-2">•</span>
                                  <button
                                    onClick={() => {
                                      setSelectedSaleForEditReceipt(sale)
                                      setNewReceiptFile(null)
                                      setShowEditReceiptModal(true)
                                    }}
                                    className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                                  >
                                    📤 Upload Bukti
                                  </button>
                                </>
                              )}
                            </div>
                            {sale.pickup_date && (
                              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-1 rounded">
                                <span>✅</span>
                                <span>Diambil: {new Date(sale.pickup_date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}</span>
                                {!sale.is_voided && (
                                  <button
                                    onClick={() => {
                                      setSelectedSaleForEditPickup(sale)
                                      setEditPickupDate(sale.pickup_date)
                                      setShowEditPickupModal(true)
                                    }}
                                    className="ml-2 text-xs text-green-600 hover:text-green-800 hover:underline"
                                    title="Edit tanggal pengambilan"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Total</div>
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(sale.total_amount)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* Tombol Tandai Lunas untuk Pending */}
                              {sale.status === 'pending' && !sale.is_voided && (
                                <Button
                                  onClick={() => handleMarkPaidFromHistory(sale)}
                                  disabled={saving}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                                >
                                  💰 Tandai Lunas
                                </Button>
                              )}
                              
                              {/* Tombol Cetak Kwitansi untuk Paid */}
                              {sale.status === 'paid' && !sale.is_voided && (
                                <Button
                                  onClick={() => handlePrintKwitansi(sale)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                                >
                                  🖨️ Cetak Kwitansi
                                </Button>
                              )}
                              
                              {/* Tombol Tandai Diambil untuk Paid tanpa pickup_date */}
                              {sale.status === 'paid' && !sale.is_voided && !sale.pickup_date && (
                                <Button
                                  onClick={() => {
                                    setSelectedSaleForPickup(sale)
                                    setPickupDate(new Date().toISOString().slice(0, 10))
                                    setShowPickupModal(true)
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                                >
                                  📦 Tandai Diambil
                                </Button>
                              )}
                              
                              {/* Tombol Kwitansi Void */}
                              {sale.is_voided && (
                                <Button
                                  onClick={() => handlePrintKwitansi(sale)}
                                  className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                                >
                                  🖨️ Kwitansi (VOID)
                                </Button>
                              )}
                              
                              {/* Tombol Batalkan */}
                              {!sale.is_voided && (sale.status === 'pending' || sale.status === 'paid') && (
                                hasVoidPermission ? (
                                  <Button
                                    onClick={() => {
                                      setSelectedSaleForVoid(sale)
                                      setShowVoidModal(true)
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 whitespace-nowrap"
                                  >
                                    🚫 Batalkan
                                  </Button>
                                ) : (
                                  <span className="text-gray-400 text-xs italic px-3 py-2" title="Anda tidak memiliki izin untuk membatalkan penjualan">
                                    Tidak ada akses
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      ) : activeTab === 'laporan' ? (
        // Laporan Tab
        <div className="space-y-4">
          {/* Period Filter */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Filter Periode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Period Type */}
              <div>
                <Label>Tipe Periode</Label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="month">Bulanan</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {reportPeriod === 'month' ? (
                <div>
                  <Label>Pilih Bulan</Label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label>Tanggal Mulai</Label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <Label>Tanggal Akhir</Label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <Button
                onClick={fetchSalesReport}
                disabled={loadingReport}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingReport ? '⏳ Loading...' : '📊 Tampilkan Laporan'}
              </Button>
              {reportData.length > 0 && (
                <Button
                  onClick={handleExportToExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  📥 Export Excel
                </Button>
              )}
            </div>
          </Card>

          {/* Summary Cards */}
          {reportData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-sm text-blue-600 font-medium mb-1">Total Penjualan</div>
                <div className="text-2xl font-bold text-blue-900">{reportSummary.total_sales}</div>
                <div className="text-xs text-blue-600 mt-1">
                  {reportSummary.paid_count} lunas, {reportSummary.pending_count} pending
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="text-sm text-green-600 font-medium mb-1">Total Pendapatan</div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(reportSummary.total_amount)}</div>
                <div className="text-xs text-green-600 mt-1">{reportSummary.total_items} item terjual</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <div className="text-sm text-orange-600 font-medium mb-1">Total HPP</div>
                <div className="text-2xl font-bold text-orange-900">{formatCurrency(reportSummary.total_cost)}</div>
                <div className="text-xs text-orange-600 mt-1">Harga Pokok Penjualan</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="text-sm text-purple-600 font-medium mb-1">Total Profit</div>
                <div className="text-2xl font-bold text-purple-900">{formatCurrency(reportSummary.total_profit)}</div>
                <div className="text-xs text-purple-600 mt-1">
                  Margin: {reportSummary.total_amount > 0 ? ((reportSummary.total_profit / reportSummary.total_amount) * 100).toFixed(1) : 0}%
                </div>
              </Card>
            </div>
          )}

          {/* Sales List */}
          {loadingReport ? (
            <Card className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">⏳</div>
              <p>Memuat laporan...</p>
            </Card>
          ) : reportData.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>Tidak ada data penjualan pada periode ini</p>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Detail Penjualan</h3>
                <span className="text-sm text-gray-600">{reportData.length} transaksi</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-3 text-left font-semibold">ID</th>
                      <th className="py-3 px-3 text-left font-semibold">Tanggal</th>
                      <th className="py-3 px-3 text-left font-semibold">Siswa</th>
                      <th className="py-3 px-3 text-left font-semibold">Unit</th>
                      <th className="py-3 px-3 text-left font-semibold">Staff</th>
                      <th className="py-3 px-3 text-center font-semibold">Items</th>
                      <th className="py-3 px-3 text-right font-semibold">Total</th>
                      <th className="py-3 px-3 text-right font-semibold">HPP</th>
                      <th className="py-3 px-3 text-right font-semibold">Profit</th>
                      <th className="py-3 px-3 text-center font-semibold">Status</th>
                      <th className="py-3 px-3 text-center font-semibold">Diambil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(sale => (
                      <tr key={sale.sale_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3 text-gray-900">#{sale.sale_id}</td>
                        <td className="py-3 px-3 text-gray-700">
                          {new Date(sale.sale_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-3 text-gray-900">{sale.user_name}</td>
                        <td className="py-3 px-3 text-gray-600">{sale.unit_name}</td>
                        <td className="py-3 px-3 text-gray-600 text-sm">
                          {sale.processed_by_name || '-'}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-700">{sale.item_count}</td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-900">
                          {formatCurrency(sale.total_amount)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-700">
                          {formatCurrency(sale.total_cost)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-green-700">
                          {formatCurrency(sale.total_amount - sale.total_cost)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {sale.status === 'paid' ? 'Lunas' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {sale.pickup_date ? (
                            <span className="text-xs text-green-700 font-medium">
                              ✓ {new Date(sale.pickup_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-gray-50 font-bold">
                      <td colSpan="6" className="py-3 px-3 text-right">TOTAL:</td>
                      <td className="py-3 px-3 text-right text-gray-900">
                        {formatCurrency(reportSummary.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900">
                        {formatCurrency(reportSummary.total_cost)}
                      </td>
                      <td className="py-3 px-3 text-right text-green-700">
                        {formatCurrency(reportSummary.total_profit)}
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : null}

      {/* Kwitansi Modal */}
      <KwitansiModal
        isOpen={showKwitansi}
        onClose={() => {
          setShowKwitansi(false)
          setSelectedSaleForKwitansi(null)
          setKwitansiItems([])
          
          // Reset form untuk transaksi baru (jika dari flow mark paid di tab penjualan)
          if (activeTab === 'penjualan' && selectedSaleForKwitansi) {
            setUserId('')
            setSelectedStudent(null)
            setSearchStudent('')
            setItems([])
            setReceiptFile(null)
            setPickupDate(new Date().toISOString().slice(0, 10))
          }
        }}
        sale={selectedSaleForKwitansi}
        items={kwitansiItems}
        uniforms={uniforms}
        sizes={sizes}
      />

      {/* Void Modal */}
      <Modal
        isOpen={showVoidModal}
        onClose={() => {
          if (!voiding) {
            setShowVoidModal(false)
            setSelectedSaleForVoid(null)
            setVoidReason('')
          }
        }}
        title="🚫 Batalkan Transaksi"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-sm text-red-800">
              <strong>Perhatian:</strong> Pembatalan transaksi akan mengembalikan stock ke supplier yang sama. Transaksi yang sudah dibatalkan tidak dapat dikembalikan.
            </p>
          </div>

          {selectedSaleForVoid && (
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Transaksi:</span>
                <span className="font-semibold">#{selectedSaleForVoid.sale_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Siswa:</span>
                <span className="font-semibold">{selectedSaleForVoid.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${selectedSaleForVoid.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {selectedSaleForVoid.status === 'paid' ? 'Lunas' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-700 font-medium">Total:</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(selectedSaleForVoid.total_amount)}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-red-700 font-medium">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Masukkan alasan pembatalan transaksi..."
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows={4}
              disabled={voiding}
            />
            {!voidReason.trim() && (
              <p className="text-xs text-red-600 mt-1">* Alasan harus diisi</p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setShowVoidModal(false)
                setSelectedSaleForVoid(null)
                setVoidReason('')
              }}
              disabled={voiding}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button
              onClick={handleVoidSale}
              disabled={voiding || !voidReason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {voiding ? '⏳ Membatalkan...' : '🚫 Batalkan Transaksi'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pickup Date Modal */}
      <Modal
        isOpen={showPickupModal}
        onClose={() => {
          if (!markingPickup) {
            setShowPickupModal(false)
            setSelectedSaleForPickup(null)
            setPickupDate(new Date().toISOString().slice(0, 10))
          }
        }}
        title="📦 Tandai Seragam Diambil"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <p className="text-sm text-purple-800">
              Catat tanggal seragam diambil oleh siswa/orang tua
            </p>
          </div>

          {selectedSaleForPickup && (
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Transaksi:</span>
                <span className="font-semibold">#{selectedSaleForPickup.sale_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Siswa:</span>
                <span className="font-semibold">{selectedSaleForPickup.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Item:</span>
                <span className="font-semibold">{selectedSaleForPickup.item_count} item</span>
              </div>
            </div>
          )}

          <div>
            <Label className="font-medium">
              Tanggal Pengambilan <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPickupDate(new Date().toISOString().slice(0, 10))}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  📅 Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = new Date()
                    date.setDate(date.getDate() + 3)
                    setPickupDate(date.toISOString().slice(0, 10))
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                >
                  +3 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = new Date()
                    date.setDate(date.getDate() + 7)
                    setPickupDate(date.toISOString().slice(0, 10))
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                >
                  +7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = new Date()
                    date.setDate(date.getDate() + 14)
                    setPickupDate(date.toISOString().slice(0, 10))
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors"
                >
                  +14 Hari
                </button>
              </div>
              <Input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full"
                disabled={markingPickup}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Pilih tanggal seragam diambil</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setShowPickupModal(false)
                setSelectedSaleForPickup(null)
                setPickupDate(new Date().toISOString().slice(0, 10))
              }}
              disabled={markingPickup}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button
              onClick={handleMarkAsPickedUp}
              disabled={markingPickup || !pickupDate}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {markingPickup ? '⏳ Menyimpan...' : '✅ Tandai Sudah Diambil'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Pickup Date Modal */}
      <Modal
        isOpen={showEditPickupModal}
        onClose={() => {
          if (!updatingPickup) {
            setShowEditPickupModal(false)
            setSelectedSaleForEditPickup(null)
            setEditPickupDate('')
          }
        }}
        title="✏️ Edit Tanggal Pengambilan"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              Update tanggal pengambilan seragam
            </p>
          </div>

          {selectedSaleForEditPickup && (
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Transaksi:</span>
                <span className="font-semibold">#{selectedSaleForEditPickup.sale_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Siswa:</span>
                <span className="font-semibold">{selectedSaleForEditPickup.user_name}</span>
              </div>
              {selectedSaleForEditPickup.pickup_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal Saat Ini:</span>
                  <span className="font-semibold">
                    {new Date(selectedSaleForEditPickup.pickup_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="font-medium">
              Tanggal Pengambilan Baru <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEditPickupDate(new Date().toISOString().slice(0, 10))}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  📅 Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const date = new Date()
                    date.setDate(date.getDate() - 1)
                    setEditPickupDate(date.toISOString().slice(0, 10))
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  ⏮️ Kemarin
                </button>
              </div>
              <Input
                type="date"
                value={editPickupDate}
                onChange={(e) => setEditPickupDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full"
                disabled={updatingPickup}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Pilih tanggal seragam diambil yang baru</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setShowEditPickupModal(false)
                setSelectedSaleForEditPickup(null)
                setEditPickupDate('')
              }}
              disabled={updatingPickup}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdatePickupDate}
              disabled={updatingPickup || !editPickupDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {updatingPickup ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Receipt Modal */}
      <Modal
        isOpen={showEditReceiptModal}
        onClose={() => {
          if (!updatingReceipt) {
            setShowEditReceiptModal(false)
            setSelectedSaleForEditReceipt(null)
            setNewReceiptFile(null)
          }
        }}
        title="📤 Upload/Edit Bukti Transfer"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              Upload bukti transfer pembayaran baru untuk mengganti yang lama
            </p>
          </div>

          {selectedSaleForEditReceipt && (
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID Transaksi:</span>
                <span className="font-semibold">#{selectedSaleForEditReceipt.sale_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Siswa:</span>
                <span className="font-semibold">{selectedSaleForEditReceipt.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{formatCurrency(selectedSaleForEditReceipt.total_amount)}</span>
              </div>
              {selectedSaleForEditReceipt.receipt_url && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bukti Saat Ini:</span>
                  <a
                    href={selectedSaleForEditReceipt.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    📄 Lihat File
                  </a>
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="font-medium">
              Bukti Transfer Baru <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert('File terlalu besar! Maksimal 5MB')
                      e.target.value = ''
                      return
                    }
                    setNewReceiptFile(file)
                  }
                }}
                disabled={updatingReceipt}
                className="w-full"
              />
              {newReceiptFile && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 text-sm text-gray-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    ✓ {newReceiptFile.name}
                  </div>
                  <button
                    onClick={() => setNewReceiptFile(null)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                    disabled={updatingReceipt}
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max 5MB)</p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => {
                setShowEditReceiptModal(false)
                setSelectedSaleForEditReceipt(null)
                setNewReceiptFile(null)
              }}
              disabled={updatingReceipt}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateReceipt}
              disabled={updatingReceipt || !newReceiptFile}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold disabled:opacity-50"
            >
              {updatingReceipt ? '⏳ Mengupload...' : '📤 Upload Bukti'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
