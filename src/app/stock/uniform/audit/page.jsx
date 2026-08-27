'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import NotificationModal from '@/components/ui/notification-modal'
import Modal from '@/components/ui/modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faWrench,
  faCheckCircle,
  faExclamationTriangle,
  faArrowLeft,
  faSpinner,
  faBoxes,
  faHistory,
  faChevronDown,
  faChevronUp,
  faRotateRight,
  faMagic,
  faInfoCircle,
  faExchangeAlt,
  faPlus,
  faCheck,
  faShoppingCart,
  faBuilding
} from '@fortawesome/free-solid-svg-icons'

export default function StockAuditResolutionPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // UI Theme Tokens matching /data/pyp
  const pageBg = theme?.pageBg || (isDark ? '#09090B' : '#FBFBFA')
  const cardBg = theme?.cardBg || (isDark ? '#18181B' : '#FFFFFF')
  const borderColor = theme?.border || (isDark ? '#27272A' : '#EAEAEA')
  const textPrimary = theme?.textPrimary || (isDark ? '#F4F4F5' : '#111111')
  const textSecondary = theme?.textSecondary || (isDark ? '#A1A1AA' : '#787774')
  const inputBg = theme?.inputBg || (isDark ? '#18181B' : '#FFFFFF')

  const [loading, setLoading] = useState(true)
  const [allTxns, setAllTxns] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState({})
  
  const [fixingTxnId, setFixingTxnId] = useState(null)
  const [fixingVariantKey, setFixingVariantKey] = useState(null)
  const [batchFixing, setBatchFixing] = useState(false)
  const [showConfirmBatchModal, setShowConfirmBatchModal] = useState(false)

  // Opname Adjustment Modal state
  const [opnameModal, setOpnameModal] = useState({
    open: false,
    uniform_id: null,
    size_id: null,
    supplier_id: null,
    uniform_name: '',
    size_name: '',
    supplier_name: '',
    deficit_qty: 1,
    saving: false
  })

  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', type: 'success' })

  // Fetch Master Data & All Stock Transactions
  const fetchAuditData = async () => {
    try {
      setLoading(true)

      const [suppRes, unifRes, sizeRes, txnRes] = await Promise.all([
        supabase.from('uniform_supplier').select('*').order('supplier_code'),
        supabase.from('uniform').select('*').order('uniform_name'),
        supabase.from('uniform_size').select('*').order('display_order'),
        supabase
          .from('uniform_stock_txn')
          .select(`
            txn_id,
            uniform_id,
            size_id,
            supplier_id,
            qty_delta,
            txn_type,
            ref_table,
            ref_id,
            notes,
            created_at,
            uniform:uniform_id(uniform_name, is_universal),
            size:size_id(size_name),
            supplier:supplier_id(supplier_name, supplier_code)
          `)
          .order('created_at', { ascending: true })
      ])

      if (suppRes.error) throw suppRes.error
      if (unifRes.error) throw unifRes.error
      if (sizeRes.error) throw sizeRes.error
      if (txnRes.error) throw txnRes.error

      // Fetch buyer names for sale txns
      const saleTxns = (txnRes.data || []).filter(t => t.ref_table === 'uniform_sale' && t.ref_id)
      const saleIds = [...new Set(saleTxns.map(t => Number(t.ref_id)).filter(Boolean))]

      let buyerMap = new Map()

      if (saleIds.length > 0) {
        const { data: salesData } = await supabase
          .from('uniform_sale')
          .select('sale_id, user_id')
          .in('sale_id', saleIds)

        if (salesData && salesData.length > 0) {
          const userIds = [...new Set(salesData.map(s => s.user_id).filter(Boolean))]
          if (userIds.length > 0) {
            const { data: usersData } = await supabase
              .from('users')
              .select('user_id, user_nama_depan, user_nama_belakang')
              .in('user_id', userIds)

            const userMap = new Map(
              (usersData || []).map(u => [
                u.user_id,
                `${u.user_nama_depan || ''} ${u.user_nama_belakang || ''}`.trim()
              ])
            )

            salesData.forEach(s => {
              const name = userMap.get(s.user_id)
              if (name) buyerMap.set(Number(s.sale_id), name)
            })
          }
        }
      }

      const enriched = (txnRes.data || []).map(t => ({
        ...t,
        buyer_name: t.ref_table === 'uniform_sale' && t.ref_id ? buyerMap.get(Number(t.ref_id)) || null : null
      }))

      setSuppliers(suppRes.data || [])
      setUniforms(unifRes.data || [])
      setSizes(sizeRes.data || [])
      setAllTxns(enriched)
    } catch (err) {
      console.error('Audit data fetch error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal memuat data audit stok', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditData()
  }, [])

  // Comprehensive Diagnosis Engine: Detects Named Supplier Deficits, NULL Sales, and Total Deficits
  const auditAnalysis = useMemo(() => {
    const variantMap = new Map()

    allTxns.forEach(t => {
      const key = `${t.uniform_id}_${t.size_id}`
      if (!variantMap.has(key)) {
        const uObj = uniforms.find(u => u.uniform_id === t.uniform_id)
        const sObj = sizes.find(s => s.size_id === t.size_id)

        variantMap.set(key, {
          key,
          uniform_id: t.uniform_id,
          size_id: t.size_id,
          uniform_name: t.uniform?.uniform_name || uObj?.uniform_name || `Seragam #${t.uniform_id}`,
          size_name: t.size?.size_name || sObj?.size_name || `Ukuran #${t.size_id}`,
          is_universal: t.uniform?.is_universal || uObj?.is_universal || false,
          supplierStock: new Map(), // supplier_id (string) -> net qty
          nullSupplierSalesTxns: [], // sale/void txns with supplier_id = null
          allTxns: []
        })
      }

      const v = variantMap.get(key)
      v.allTxns.push(t)

      const suppKey = t.supplier_id ? String(t.supplier_id) : 'null'
      const curQty = v.supplierStock.get(suppKey) || 0
      v.supplierStock.set(suppKey, curQty + (t.qty_delta || 0))

      if (!t.supplier_id && (t.txn_type === 'sale' || t.txn_type === 'void')) {
        v.nullSupplierSalesTxns.push(t)
      }
    })

    const anomaliesList = []
    let totalUnallocatedTxns = 0
    let totalNegativeVariants = 0

    variantMap.forEach((v) => {
      const nullStock = v.supplierStock.get('null') || 0
      const activeSuppliersStock = []
      let totalStockAll = 0
      let hasNegativeSupplier = false
      let surplusSupplier = null
      let maxSurplus = 0
      const negativeSuppliers = []

      v.supplierStock.forEach((qty, suppKey) => {
        totalStockAll += qty
        const suppObj = suppliers.find(s => String(s.supplier_id) === suppKey)
        const name = suppKey === 'null' ? 'Tanpa Supplier (Stock Awal)' : (suppObj ? `${suppObj.supplier_code} - ${suppObj.supplier_name}` : `Supplier #${suppKey}`)
        const suppEntry = { supplier_id: suppKey === 'null' ? null : Number(suppKey), name, qty }
        activeSuppliersStock.push(suppEntry)

        if (qty < 0) {
          hasNegativeSupplier = true
          negativeSuppliers.push(suppEntry)
        }
        if (qty > maxSurplus && suppKey !== 'null') {
          maxSurplus = qty
          surplusSupplier = suppEntry
        }
      })

      // Comprehensive Anomaly Condition:
      // 1. Any supplier has negative stock (e.g. Bandung -1 pcs, Reka Inti -1 pcs)
      // 2. Net stock under Tanpa Supplier is negative (nullStock < 0)
      // 3. Total stock for the variant overall is negative (totalStockAll < 0)
      const isAnomaly = hasNegativeSupplier || nullStock < 0 || totalStockAll < 0

      if (isAnomaly) {
        totalNegativeVariants += 1

        // Determine specific problem type & smart recommendation
        let problemType = 'Stok Supplier Minus'
        let diagnosis = ''
        let fixAction = 'reallocate' // 'reallocate' | 'adjust'

        if (hasNegativeSupplier && surplusSupplier && surplusSupplier.qty > 0) {
          problemType = 'Ketidakseimbangan Antar-Supplier'
          diagnosis = `Stok pada ${negativeSuppliers.map(s => s.name).join(', ')} mengalami minus (${negativeSuppliers.map(s => `${s.qty} pcs`).join(', ')}), sementara ${surplusSupplier.name} memiliki surplus stok (+${surplusSupplier.qty} pcs). Alokasikan transaksi penjualan ke supplier surplus untuk menyeimbangkan stok.`
          fixAction = 'reallocate'
        } else if (nullStock < 0) {
          problemType = 'Penjualan Tanpa Alokasi Supplier'
          diagnosis = `Terdapat ${v.nullSupplierSalesTxns.length} transaksi penjualan yang tercatat tanpa supplier (NULL) sehingga saldo tanpa supplier menjadi minus (${nullStock} pcs).`
          fixAction = 'reallocate'
          totalUnallocatedTxns += v.nullSupplierSalesTxns.length
        } else {
          problemType = 'Stok Fisik Minus (Defisit Penjualan)'
          diagnosis = `Stok pada ${negativeSuppliers.map(s => s.name).join(', ')} tercatat minus (${negativeSuppliers.map(s => `${s.qty} pcs`).join(', ')}). Tidak ada supplier lain dengan stok surplus yang mencukupi. Diperlukan penyesuaian stok opname (+${Math.abs(negativeSuppliers[0]?.qty || 1)} pcs) atau koreksi penerimaan barang.`
          fixAction = 'adjust'
        }

        anomaliesList.push({
          ...v,
          nullStock,
          totalStockAll,
          hasNegativeSupplier,
          negativeSuppliers,
          activeSuppliersStock,
          surplusSupplier,
          problemType,
          diagnosis,
          fixAction,
          salesTxns: v.allTxns.filter(t => t.txn_type === 'sale' || t.txn_type === 'void')
        })
      }
    })

    // Sort alphabetically by uniform_name (A-Z) and then by size
    anomaliesList.sort((a, b) => {
      const nameComp = a.uniform_name.localeCompare(b.uniform_name, 'id', { sensitivity: 'base' })
      if (nameComp !== 0) return nameComp

      const sizeA = parseInt(a.size_name, 10)
      const sizeB = parseInt(b.size_name, 10)
      if (!isNaN(sizeA) && !isNaN(sizeB)) return sizeA - sizeB
      return a.size_name.localeCompare(b.size_name, 'id', { numeric: true })
    })

    return {
      anomaliesList,
      totalAnomalousVariants: anomaliesList.length,
      totalNegativeVariants,
      totalUnallocatedTxns
    }
  }, [allTxns, suppliers, uniforms, sizes])

  // Filtered Anomalies List
  const filteredAnomalies = useMemo(() => {
    if (!searchQuery.trim()) return auditAnalysis.anomaliesList
    const q = searchQuery.toLowerCase().trim()
    return auditAnalysis.anomaliesList.filter(item =>
      item.uniform_name.toLowerCase().includes(q) ||
      item.size_name.toLowerCase().includes(q) ||
      item.activeSuppliersStock.some(s => s.name.toLowerCase().includes(q))
    )
  }, [auditAnalysis.anomaliesList, searchQuery])

  // Toggle Row Expansion
  const toggleRow = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Fix Single Transaction Supplier
  const handleFixSingleTxn = async (txnId, targetSupplierId) => {
    if (!txnId) return
    try {
      setFixingTxnId(txnId)
      const suppValue = (targetSupplierId === 'null' || targetSupplierId === null || targetSupplierId === '') ? null : Number(targetSupplierId)

      const { error } = await supabase
        .from('uniform_stock_txn')
        .update({ supplier_id: suppValue })
        .eq('txn_id', txnId)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Berhasil', message: `Alokasi supplier untuk transaksi #${txnId} berhasil diperbarui!`, type: 'success' })
      await fetchAuditData()
    } catch (err) {
      console.error('Fix single txn error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal memperbarui transaksi', type: 'error' })
    } finally {
      setFixingTxnId(null)
    }
  }

  // Auto Rebalance Single Variant (Move Sale from Negative Supplier to Surplus Supplier)
  const handleRebalanceVariant = async (variantItem) => {
    if (!variantItem || !variantItem.surplusSupplier) {
      setNotif({ isOpen: true, title: 'Perhatian', message: 'Tidak ada supplier surplus yang tersedia untuk varian ini.', type: 'warning' })
      return
    }

    const targetSuppId = variantItem.surplusSupplier.supplier_id
    // Find sales transactions assigned to negative suppliers or null
    const negSuppIds = new Set(variantItem.negativeSuppliers.map(s => s.supplier_id))
    const txnsToMove = variantItem.salesTxns.filter(t => negSuppIds.has(t.supplier_id) || (t.supplier_id === null && variantItem.nullStock < 0))

    if (txnsToMove.length === 0) {
      // If no direct matching sale, pick the latest sale txn for this variant
      const latestSale = variantItem.salesTxns[variantItem.salesTxns.length - 1]
      if (latestSale) txnsToMove.push(latestSale)
    }

    if (txnsToMove.length === 0) {
      setNotif({ isOpen: true, title: 'Perhatian', message: 'Tidak ditemukan transaksi penjualan untuk dialokasikan.', type: 'warning' })
      return
    }

    try {
      setFixingVariantKey(variantItem.key)

      // We update the necessary number of sales to cover the deficit
      const ids = txnsToMove.slice(0, Math.abs(variantItem.negativeSuppliers[0]?.qty || 1)).map(t => t.txn_id)

      const { error } = await supabase
        .from('uniform_stock_txn')
        .update({ supplier_id: targetSuppId })
        .in('txn_id', ids)

      if (error) throw error

      setNotif({
        isOpen: true,
        title: 'Berhasil Diseimbangkan',
        message: `Transaksi penjualan ${variantItem.uniform_name} (Ukuran ${variantItem.size_name}) berhasil dialokasikan ke ${variantItem.surplusSupplier.name}! Stok kini seimbang.`,
        type: 'success'
      })
      await fetchAuditData()
    } catch (err) {
      console.error('Rebalance error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal menyeimbangkan stok', type: 'error' })
    } finally {
      setFixingVariantKey(null)
    }
  }

  // Open Opname Adjustment Modal
  const openOpnameModal = (variantItem) => {
    const negSupp = variantItem.negativeSuppliers[0] || null
    setOpnameModal({
      open: true,
      uniform_id: variantItem.uniform_id,
      size_id: variantItem.size_id,
      supplier_id: negSupp ? negSupp.supplier_id : null,
      uniform_name: variantItem.uniform_name,
      size_name: variantItem.size_name,
      supplier_name: negSupp ? negSupp.name : 'Tanpa Supplier',
      deficit_qty: Math.abs(negSupp ? negSupp.qty : 1),
      saving: false
    })
  }

  // Save Opname Adjustment
  const handleSaveOpnameAdjustment = async () => {
    try {
      setOpnameModal(prev => ({ ...prev, saving: true }))
      const userId = parseInt(localStorage.getItem('kr_id'), 10) || null

      const newTxn = {
        uniform_id: opnameModal.uniform_id,
        size_id: opnameModal.size_id,
        supplier_id: opnameModal.supplier_id,
        qty_delta: Number(opnameModal.deficit_qty),
        txn_type: 'adjust',
        ref_table: 'audit_resolution',
        ref_id: null,
        notes: `Penyesuaian stok opname audit (+${opnameModal.deficit_qty} pcs)`,
        created_by: userId
      }

      const { error } = await supabase.from('uniform_stock_txn').insert([newTxn])
      if (error) throw error

      setNotif({
        isOpen: true,
        title: 'Penyesuaian Berhasil',
        message: `Stok opname penyesuaian (+${opnameModal.deficit_qty} pcs) berhasil ditambahkan untuk ${opnameModal.uniform_name} (${opnameModal.size_name}).`,
        type: 'success'
      })
      setOpnameModal(prev => ({ ...prev, open: false, saving: false }))
      await fetchAuditData()
    } catch (err) {
      console.error('Opname adjustment error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal menambahkan penyesuaian stok', type: 'error' })
      setOpnameModal(prev => ({ ...prev, saving: false }))
    }
  }

  // Batch Auto-Fix All Reallocatable Anomalies
  const handleExecuteBatchFixAll = async () => {
    setShowConfirmBatchModal(false)

    try {
      setBatchFixing(true)
      let totalUpdated = 0

      for (const item of auditAnalysis.anomaliesList) {
        if (item.surplusSupplier && item.surplusSupplier.qty > 0) {
          const targetSuppId = item.surplusSupplier.supplier_id
          const negSuppIds = new Set(item.negativeSuppliers.map(s => s.supplier_id))
          const txnsToMove = item.salesTxns.filter(t => negSuppIds.has(t.supplier_id) || (t.supplier_id === null && item.nullStock < 0))

          if (txnsToMove.length > 0) {
            const ids = txnsToMove.slice(0, Math.abs(item.negativeSuppliers[0]?.qty || 1)).map(t => t.txn_id)

            const { error } = await supabase
              .from('uniform_stock_txn')
              .update({ supplier_id: targetSuppId })
              .in('txn_id', ids)

            if (!error) {
              totalUpdated += ids.length
            }
          }
        }
      }

      setNotif({
        isOpen: true,
        title: 'Resolusi Selesai!',
        message: `Berhasil mengalokasikan ulang ${totalUpdated} transaksi penjualan pada ${auditAnalysis.totalAnomalousVariants} varian seragam! Seluruh stok kini seimbang.`,
        type: 'success'
      })
      await fetchAuditData()
    } catch (err) {
      console.error('Batch fix error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Proses perbaikan massal gagal', type: 'error' })
    } finally {
      setBatchFixing(false)
    }
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '24px 32px', color: textPrimary, fontFamily: "'Geist Sans', 'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

      {/* ── HEADER & BREADCRUMBS (MATCHING /data/pyp LAYOUT) ─────────────── */}
      <div className="pb-5 border-b flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6" style={{ borderColor }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: textSecondary }}>
            <span>[INVENTORY]</span>
            <span>/</span>
            <span>[UNIFORM MASTER DATA]</span>
            <span>/</span>
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[STOCK AUDIT &amp; RESOLUTION]</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded flex items-center justify-center border"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                borderColor: isDark ? '#2563EB' : '#BAE6FD',
                color: isDark ? '#60A5FA' : '#0284C7'
              }}
            >
              <FontAwesomeIcon icon={faWrench} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Audit &amp; Resolusi Data Stok Seragam
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Mendeteksi ketidaksesuaian stok secara otomatis (stok minus antar-supplier atau penjualan tanpa alokasi) dan menyelesaikannya langsung dalam 1 klik.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => router.push('/stock/uniform/initial')}
            style={{
              background: isDark ? '#27272A' : '#F3F4F6',
              color: textPrimary,
              fontSize: '12px',
              border: `1px solid ${borderColor}`,
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Kembali ke Stok</span>
          </Button>

          <Button
            onClick={fetchAuditData}
            disabled={loading || batchFixing}
            style={{
              background: isDark ? '#27272A' : '#FFFFFF',
              color: textPrimary,
              fontSize: '12px',
              border: `1px solid ${borderColor}`,
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faRotateRight} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Audit</span>
          </Button>

          {auditAnalysis.totalAnomalousVariants > 0 && (
            <Button
              onClick={() => setShowConfirmBatchModal(true)}
              disabled={loading || batchFixing}
              style={{
                background: '#16A34A',
                border: '1px solid #15803D',
                color: '#FFFFFF',
                fontSize: '12px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {batchFixing ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faMagic} />
              )}
              <span>⚡ Seimbangkan Semua ({auditAnalysis.totalAnomalousVariants} Varian)</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── METADATA BENTO SUMMARY CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Varian Anomali</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-xl font-bold font-mono"
              style={{ color: auditAnalysis.totalAnomalousVariants > 0 ? (isDark ? '#DC8585' : '#9F2F2D') : (isDark ? '#7BAF7B' : '#346538') }}
            >
              {auditAnalysis.totalAnomalousVariants}
            </span>
            <span className="text-xs font-medium" style={{ color: textSecondary }}>varian perlu tindakan</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Stok Supplier Minus</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-xl font-bold font-mono"
              style={{ color: auditAnalysis.totalNegativeVariants > 0 ? (isDark ? '#FB923C' : '#EA580C') : textPrimary }}
            >
              {auditAnalysis.totalNegativeVariants}
            </span>
            <span className="text-xs font-medium" style={{ color: textSecondary }}>kombinasi supplier</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Status Integritas Stok</span>
          <div className="flex items-baseline gap-2 mt-1">
            {auditAnalysis.totalAnomalousVariants > 0 ? (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1.5"
                style={{
                  background: isDark ? '#3A1E1E' : '#FDEBEC',
                  color: isDark ? '#DC8585' : '#9F2F2D',
                  border: `1px solid ${isDark ? '#542626' : '#F8C9CC'}`
                }}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>Perlu Tindakan ({auditAnalysis.totalAnomalousVariants})</span>
              </span>
            ) : (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1.5"
                style={{
                  background: isDark ? '#1E2E1E' : '#EDF3EC',
                  color: isDark ? '#7BAF7B' : '#346538',
                  border: `1px solid ${isDark ? '#2B422B' : '#D5E6D3'}`
                }}
              >
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>100% Rapi &amp; Sesuai</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN AUDIT RESOLUTION CARD ─────────────────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Card Header & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                Hasil Pemeriksaan Audit
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: auditAnalysis.totalAnomalousVariants > 0
                    ? (isDark ? '#3A1E1E' : '#FDEBEC')
                    : (isDark ? '#1E2E1E' : '#EDF3EC'),
                  color: auditAnalysis.totalAnomalousVariants > 0
                    ? (isDark ? '#DC8585' : '#9F2F2D')
                    : (isDark ? '#7BAF7B' : '#346538'),
                  fontFamily: 'monospace'
                }}
              >
                {filteredAnomalies.length} Anomali Ditemukan
              </span>
            </div>
            <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0 0' }}>
              Daftar varian seragam yang memiliki saldo minus pada supplier tertentu atau ketidaksesuaian alokasi penjualan.
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative" style={{ width: '260px' }}>
            <input
              type="text"
              placeholder="Cari seragam atau ukuran..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
              style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
          </div>
        </div>

        {/* Loading / Empty / Anomaly Cards */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
            <span style={{ fontSize: '13px' }}>Mendiagnosis seluruh transaksi stok...</span>
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              borderRadius: '6px',
              background: isDark ? '#151419' : '#FBFBFA',
              border: `1px dashed ${borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '28px', color: isDark ? '#7BAF7B' : '#346538' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, margin: 0 }}>
              Tidak Ada Anomali Stok!
            </h3>
            <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>
              {searchQuery
                ? 'Tidak ada anomali yang cocok dengan filter pencarian.'
                : 'Seluruh transaksi stok seragam telah teralokasi dengan rapi ke supplier dan tidak ada saldo minus.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnomalies.map((item, idx) => {
              const isExpanded = expandedRows[item.key]
              const isFixingThis = fixingVariantKey === item.key

              return (
                <div
                  key={item.key}
                  style={{
                    background: isDark ? '#1F1E24' : '#FFFFFF',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Item Header & Diagnosis Summary */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b" style={{ borderColor }}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold" style={{ color: textSecondary }}>#{idx + 1}</span>
                        <span className="font-bold text-sm" style={{ color: textPrimary }}>{item.uniform_name}</span>
                        <span
                          className="px-2 py-0.5 rounded font-mono text-[11px] font-bold"
                          style={{
                            background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                            color: isDark ? '#60A5FA' : '#1F6C9F',
                            border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`
                          }}
                        >
                          Ukuran: {item.size_name}
                        </span>
                        {item.is_universal && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                            style={{
                              background: isDark ? '#27272A' : '#F3F4F6',
                              color: textSecondary,
                              border: `1px solid ${borderColor}`
                            }}
                          >
                            Universal
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                          style={{
                            background: isDark ? '#3A1E1E' : '#FDEBEC',
                            color: isDark ? '#DC8585' : '#9F2F2D',
                            border: `1px solid ${isDark ? '#542626' : '#F8C9CC'}`
                          }}
                        >
                          {item.problemType}
                        </span>
                      </div>

                      {/* Smart Diagnosis Text */}
                      <p className="text-xs mt-2" style={{ color: textSecondary }}>
                        <strong style={{ color: isDark ? '#FBBF24' : '#B45309' }}>Diagnosa:</strong> {item.diagnosis}
                      </p>
                    </div>

                    {/* Quick Resolution Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.surplusSupplier && item.surplusSupplier.qty > 0 && (
                        <button
                          onClick={() => handleRebalanceVariant(item)}
                          disabled={isFixingThis || batchFixing}
                          className="px-3.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-2 text-white shadow-xs"
                          style={{
                            background: '#16A34A',
                            border: '1px solid #15803D',
                            opacity: (isFixingThis || batchFixing) ? 0.6 : 1
                          }}
                        >
                          {isFixingThis ? (
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                          ) : (
                            <FontAwesomeIcon icon={faExchangeAlt} />
                          )}
                          <span>⚡ Alokasikan ke {item.surplusSupplier.name.split(' - ')[0]}</span>
                        </button>
                      )}

                      <button
                        onClick={() => openOpnameModal(item)}
                        className="px-3.5 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-2"
                        style={{
                          background: isDark ? '#27272A' : '#F3F4F6',
                          borderColor,
                          color: textPrimary
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                        <span>Penyesuaian Opname</span>
                      </button>

                      <button
                        onClick={() => toggleRow(item.key)}
                        className="px-3 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-1.5"
                        style={{
                          background: inputBg,
                          borderColor,
                          color: textSecondary
                        }}
                      >
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                        <span>{isExpanded ? 'Tutup Log' : 'Rincian Log'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Supplier Stock Breakdown Bar */}
                  <div className="p-3.5 flex items-center gap-2 flex-wrap text-xs font-mono" style={{ background: isDark ? '#18171C' : '#FBFBFA' }}>
                    <span style={{ color: textSecondary }}>Posisi Stok:</span>
                    {item.activeSuppliersStock.map((supp, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1"
                        style={{
                          background: supp.qty < 0
                            ? (isDark ? '#3A1E1E' : '#FDEBEC')
                            : (isDark ? '#1E2E1E' : '#EDF3EC'),
                          color: supp.qty < 0
                            ? (isDark ? '#DC8585' : '#9F2F2D')
                            : (isDark ? '#7BAF7B' : '#346538'),
                          border: `1px solid ${supp.qty < 0 ? (isDark ? '#542626' : '#F8C9CC') : (isDark ? '#2B422B' : '#D5E6D3')}`
                        }}
                      >
                        <span>{supp.name}:</span>
                        <strong>{supp.qty > 0 ? `+${supp.qty}` : supp.qty} pcs</strong>
                      </span>
                    ))}
                    <span className="ml-auto font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                      Net Total Varian: {item.totalStockAll} pcs
                    </span>
                  </div>

                  {/* Expanded Transaction Log Sub-Table */}
                  {isExpanded && (
                    <div className="p-4 border-t" style={{ borderColor, background: cardBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono uppercase" style={{ color: textSecondary }}>
                          Log Transaksi Penjualan &amp; Mutasi Terkait ({item.salesTxns.length} Transaksi)
                        </span>
                        <span className="text-[11px]" style={{ color: textSecondary }}>
                          Pilih supplier pada dropdown untuk mengalokasikan transaksi secara manual.
                        </span>
                      </div>

                      <div className="border rounded overflow-hidden" style={{ borderColor }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: isDark ? '#27272A' : '#F1F5F9', borderBottom: `1px solid ${borderColor}`, color: textSecondary }}>
                              <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Waktu</th>
                              <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Tipe Mutasi</th>
                              <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Qty</th>
                              <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Pembeli / Keterangan</th>
                              <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Alokasi Supplier Saat Ini</th>
                              <th className="text-right px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Ganti Supplier</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ divideColor: borderColor }}>
                            {item.salesTxns.map((st) => (
                              <tr key={st.txn_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: textSecondary, whiteSpace: 'nowrap' }}>
                                  {new Date(st.created_at).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>

                                <td className="px-3 py-2 font-semibold" style={{ color: textPrimary }}>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono" style={{ background: isDark ? '#27272A' : '#F3F4F6' }}>
                                    {st.txn_type}
                                  </span>
                                </td>

                                <td className="px-3 py-2 text-center font-mono font-bold" style={{ color: st.qty_delta >= 0 ? '#16A34A' : '#DC2626' }}>
                                  {st.qty_delta >= 0 ? `+${st.qty_delta}` : st.qty_delta}
                                </td>

                                <td className="px-3 py-2 text-xs" style={{ color: textSecondary }}>
                                  {st.buyer_name ? (
                                    <div className="flex items-center gap-1 font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                                      <FontAwesomeIcon icon={faShoppingCart} className="text-[10px]" />
                                      <span>{st.buyer_name}</span>
                                    </div>
                                  ) : (
                                    <span>{st.notes || '—'}</span>
                                  )}
                                </td>

                                <td className="px-3 py-2 font-mono text-[11px]" style={{ color: textPrimary }}>
                                  {st.supplier ? (
                                    <span className="font-semibold">{st.supplier.supplier_code} - {st.supplier.supplier_name}</span>
                                  ) : (
                                    <span className="italic" style={{ color: textSecondary }}>Tanpa Supplier (NULL)</span>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  <select
                                    disabled={fixingTxnId === st.txn_id}
                                    value={st.supplier_id ? String(st.supplier_id) : 'null'}
                                    onChange={(e) => handleFixSingleTxn(st.txn_id, e.target.value)}
                                    className="px-2 py-1 text-xs font-mono rounded border outline-none cursor-pointer"
                                    style={{ background: inputBg, borderColor, color: textPrimary }}
                                  >
                                    <option value="null">Tanpa Supplier (NULL)</option>
                                    {suppliers.map(s => (
                                      <option key={s.supplier_id} value={s.supplier_id}>
                                        {s.supplier_code} - {s.supplier_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL PENYESUAIAN STOK OPNAME ──────────────────────────────────── */}
      <Modal
        isOpen={opnameModal.open}
        onClose={() => setOpnameModal(prev => ({ ...prev, open: false }))}
        title="➕ Tambah Penyesuaian Stok Opname"
        size="sm"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="rounded p-3 text-xs space-y-1.5 border" style={{ background: isDark ? '#1F2937' : '#F8FAFC', borderColor }}>
            <div style={{ color: textSecondary }}>Seragam: <strong style={{ color: textPrimary }}>{opnameModal.uniform_name}</strong></div>
            <div style={{ color: textSecondary }}>Ukuran: <strong style={{ color: textPrimary }}>{opnameModal.size_name}</strong></div>
            <div style={{ color: textSecondary }}>Supplier: <strong style={{ color: textPrimary }}>{opnameModal.supplier_name}</strong></div>
          </div>

          <p style={{ color: textSecondary }}>
            Menambahkan transaksi mutasi penyesuaian stok opname secara otomatis untuk mengembalikan saldo supplier menjadi seimbang (netral $\ge 0$).
          </p>

          <div>
            <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
              Jumlah Penambahan Stok (Pcs) *
            </label>
            <input
              type="number"
              min="1"
              value={opnameModal.deficit_qty}
              onChange={e => setOpnameModal(prev => ({ ...prev, deficit_qty: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border outline-none"
              style={{ background: inputBg, borderColor, color: textPrimary }}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor }}>
            <Button
              onClick={() => setOpnameModal(prev => ({ ...prev, open: false }))}
              disabled={opnameModal.saving}
              style={{
                background: isDark ? '#27272A' : '#F3F4F6',
                color: textPrimary,
                fontSize: '12px',
                flex: 1,
                border: `1px solid ${borderColor}`
              }}
            >
              Batal
            </Button>
            <button
              onClick={handleSaveOpnameAdjustment}
              disabled={opnameModal.saving || !opnameModal.deficit_qty}
              className="flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 text-white shadow-xs"
              style={{
                background: '#16A34A',
                border: '1px solid #15803D'
              }}
            >
              {opnameModal.saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
              <span>{opnameModal.saving ? 'Menyimpan...' : 'Simpan Penyesuaian'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL KONFIRMASI BATCH FIX ALL ─────────────────────────────────── */}
      <Modal
        isOpen={showConfirmBatchModal}
        onClose={() => setShowConfirmBatchModal(false)}
        title="⚡ Konfirmasi Penyeimbangan Massal"
        size="sm"
      >
        <div className="space-y-4 text-xs font-sans">
          <p style={{ color: textPrimary }}>
            Apakah Anda yakin ingin menyeimbangkan seluruh anomali stok secara otomatis?
          </p>
          <p style={{ color: textSecondary }}>
            Sistem akan mengalokasikan ulang transaksi penjualan yang menyebabkan stok minus ke supplier yang memiliki surplus stok aktif.
          </p>

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor }}>
            <Button
              onClick={() => setShowConfirmBatchModal(false)}
              style={{
                background: isDark ? '#27272A' : '#F3F4F6',
                color: textPrimary,
                fontSize: '12px',
                flex: 1,
                border: `1px solid ${borderColor}`
              }}
            >
              Batal
            </Button>
            <button
              onClick={handleExecuteBatchFixAll}
              className="flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 text-white shadow-xs"
              style={{
                background: '#16A34A',
                border: '1px solid #15803D'
              }}
            >
              <FontAwesomeIcon icon={faMagic} />
              <span>Ya, Seimbangkan Semua</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── NOTIFICATION MODAL ─────────────────────────────────────────────── */}
      <NotificationModal
        isOpen={notif.isOpen}
        onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))}
        title={notif.title}
        message={notif.message}
        type={notif.type}
      />
    </div>
  )
}
