'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  faSyncAlt,
  faMagic,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons'

export default function StockAuditResolutionPage() {
  const router = useRouter()
  const { theme } = useTheme()

  const inputStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }
  const selectStyle = { background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textBody }

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

  // Diagnosis Engine: Identify Anomalies per Variant
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

    variantMap.forEach((v) => {
      const nullStock = v.supplierStock.get('null') || 0
      const hasNullSales = v.nullSupplierSalesTxns.length > 0

      // Compute stock available under named suppliers
      const activeSuppliersStock = []
      let totalOtherStock = 0
      let recommendedSupplier = null
      let maxQty = -9999

      v.supplierStock.forEach((qty, suppKey) => {
        if (suppKey !== 'null') {
          totalOtherStock += qty
          const suppObj = suppliers.find(s => String(s.supplier_id) === suppKey)
          const name = suppObj ? `${suppObj.supplier_code} - ${suppObj.supplier_name}` : `Supplier #${suppKey}`
          activeSuppliersStock.push({ supplier_id: Number(suppKey), name, qty })

          if (qty > maxQty) {
            maxQty = qty
            recommendedSupplier = { supplier_id: Number(suppKey), name, qty }
          }
        }
      })

      // Anomaly criteria: ONLY when nullStock < 0 (Net stock under Tanpa Supplier is MINUS)
      // This respects valid default initial stock without supplier (nullStock >= 0)
      if (nullStock < 0) {
        const totalNullQtyDelta = v.nullSupplierSalesTxns.reduce((sum, t) => sum + t.qty_delta, 0)
        
        anomaliesList.push({
          ...v,
          nullStock,
          totalNullQtyDelta,
          totalOtherStock,
          activeSuppliersStock,
          recommendedSupplier,
          fixableCount: v.nullSupplierSalesTxns.length
        })
        totalUnallocatedTxns += v.nullSupplierSalesTxns.length
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
      const suppValue = (targetSupplierId === 'null' || targetSupplierId === null) ? null : Number(targetSupplierId)

      const { error } = await supabase
        .from('uniform_stock_txn')
        .update({ supplier_id: suppValue })
        .eq('txn_id', txnId)

      if (error) throw error

      setNotif({ isOpen: true, title: 'Berhasil', message: `Transaksi #${txnId} berhasil dialokasikan ulang!`, type: 'success' })
      await fetchAuditData()
    } catch (err) {
      console.error('Fix single txn error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal memperbarui transaksi', type: 'error' })
    } finally {
      setFixingTxnId(null)
    }
  }

  // Fix Single Variant All Null Transactions
  const handleFixVariantAnomalies = async (variantItem) => {
    if (!variantItem || !variantItem.recommendedSupplier) {
      setNotif({ isOpen: true, title: 'Perhatian', message: 'Tidak ada stok supplier aktif yang tersedia untuk varian ini.', type: 'warning' })
      return
    }

    const targetSuppId = variantItem.recommendedSupplier.supplier_id
    const txnIdsToUpdate = variantItem.nullSupplierSalesTxns.map(t => t.txn_id)

    try {
      setFixingVariantKey(variantItem.key)

      const { error } = await supabase
        .from('uniform_stock_txn')
        .update({ supplier_id: targetSuppId })
        .in('txn_id', txnIdsToUpdate)

      if (error) throw error

      setNotif({
        isOpen: true,
        title: 'Berhasil',
        message: `Berhasil mengalokasikan ${txnIdsToUpdate.length} transaksi penjualan ${variantItem.uniform_name} (Ukuran ${variantItem.size_name}) ke ${variantItem.recommendedSupplier.name}!`,
        type: 'success'
      })
      await fetchAuditData()
    } catch (err) {
      console.error('Fix variant error:', err)
      setNotif({ isOpen: true, title: 'Gagal', message: err.message || 'Gagal memperbaiki anomali varian seragam', type: 'error' })
    } finally {
      setFixingVariantKey(null)
    }
  }

  // Batch Auto-Fix All Anomalies
  const handleExecuteBatchFixAll = async () => {
    setShowConfirmBatchModal(false)

    try {
      setBatchFixing(true)
      let totalUpdated = 0

      for (const item of auditAnalysis.anomaliesList) {
        if (item.recommendedSupplier && item.nullSupplierSalesTxns.length > 0) {
          const targetSuppId = item.recommendedSupplier.supplier_id
          const ids = item.nullSupplierSalesTxns.map(t => t.txn_id)

          const { error } = await supabase
            .from('uniform_stock_txn')
            .update({ supplier_id: targetSuppId })
            .in('txn_id', ids)

          if (!error) {
            totalUpdated += ids.length
          }
        }
      }

      setNotif({
        isOpen: true,
        title: 'Resolusi Selesai!',
        message: `Berhasil mengalokasikan ulang ${totalUpdated} transaksi penjualan di ${auditAnalysis.totalAnomalousVariants} varian seragam! Seluruh stok kini 100% konsisten dan sesuai.`,
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
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/stock/uniform/initial')}
            className="mb-2 text-xs font-semibold flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Kembali ke Kelola Stok</span>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: theme.textPrimary }}>
            <FontAwesomeIcon icon={faWrench} className="text-indigo-500" />
            <span>Audit & Resolusi Data Stok Seragam</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            Mendeteksi ketidaksesuaian stok secara otomatis (seperti penjualan tanpa alokasi supplier) dan menyelesaikannya langsung dengan 1 klik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchAuditData}
            disabled={loading || batchFixing}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
            <span>Refresh Audit</span>
          </Button>

          {auditAnalysis.totalAnomalousVariants > 0 && (
            <Button
              onClick={() => setShowConfirmBatchModal(true)}
              disabled={loading || batchFixing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2"
            >
              {batchFixing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Memperbaiki...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faMagic} />
                  <span>⚡ Perbaiki Semua ({auditAnalysis.totalUnallocatedTxns} Transaksi)</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Diagnosis Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Anomalous Variants */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                Varian Anomali
              </div>
              <div className="text-2xl font-extrabold mt-1" style={{ color: auditAnalysis.totalAnomalousVariants > 0 ? '#ef4444' : '#10b981' }}>
                {auditAnalysis.totalAnomalousVariants} <span className="text-xs font-normal text-gray-500">varian</span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
                Varian dengan stok minus atau Tanpa Supplier (NULL)
              </p>
            </div>
            <div className={`p-3 rounded-full ${auditAnalysis.totalAnomalousVariants > 0 ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'}`}>
              <FontAwesomeIcon icon={auditAnalysis.totalAnomalousVariants > 0 ? faExclamationTriangle : faCheckCircle} className="text-xl" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Unallocated Transactions */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                Penjualan Tanpa Supplier
              </div>
              <div className="text-2xl font-extrabold text-amber-500 mt-1">
                {auditAnalysis.totalUnallocatedTxns} <span className="text-xs font-normal text-gray-500">transaksi</span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
                Penjualan yang tercatat di bawah NULL supplier
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <FontAwesomeIcon icon={faHistory} className="text-xl" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: System Health Status */}
        <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.textSecondary }}>
                Status Kesesuaian Data
              </div>
              <div className="mt-1">
                {auditAnalysis.totalAnomalousVariants > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> Perlu Tindakan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border border-green-300 dark:border-green-800">
                    <FontAwesomeIcon icon={faCheckCircle} /> 100% Rapi & Sesuai
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-1" style={{ color: theme.textSecondary }}>
                {auditAnalysis.totalAnomalousVariants > 0 ? 'Ditemukan ketidaksesuaian yang siap diperbaiki dalam 1 klik' : 'Seluruh transaksi stok telah teralokasi ke supplier secara pas'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <FontAwesomeIcon icon={faBoxes} className="text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Audit Analysis Card */}
      <Card style={{ background: theme.cardBg, borderColor: theme.border }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: theme.textPrimary }}>
              <FontAwesomeIcon icon={faWrench} className="text-indigo-500" />
              <span>Anomali Stok Terdeteksi ({filteredAnomalies.length})</span>
            </CardTitle>

            {/* Search Input */}
            <div className="w-full sm:w-72 relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <Input
                type="text"
                placeholder="Cari berdasarkan seragam atau ukuran..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
                style={inputStyle}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center text-xs flex items-center justify-center gap-2" style={{ color: theme.textSecondary }}>
              <FontAwesomeIcon icon={faSpinner} spin className="text-base text-indigo-500" />
              <span>Memindai database dan mengaudit stok seragam...</span>
            </div>
          ) : filteredAnomalies.length === 0 ? (
            <div className="py-12 text-center space-y-2" style={{ color: theme.textSecondary }}>
              <div className="text-4xl">🎉</div>
              <h3 className="font-bold text-sm" style={{ color: theme.textPrimary }}>Tidak Ada Anomali Stok!</h3>
              <p className="text-xs">Seluruh transaksi stok seragam telah teralokasi ke supplier dengan rapi dan semua jumlah stok konsisten.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnomalies.map((item) => {
                const isExpanded = !!expandedRows[item.key]
                const isFixingThis = fixingVariantKey === item.key

                return (
                  <div
                    key={item.key}
                    className="border rounded-lg overflow-hidden transition-all"
                    style={{ background: theme.cardBgAlt, borderColor: theme.border }}
                  >
                    {/* Anomaly Row Header */}
                    <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: theme.textPrimary }}>
                            {item.uniform_name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold border bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                            Ukuran {item.size_name}
                          </span>
                          {item.is_universal && (
                            <span className="text-xs" title="Item Universal">🌐</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: theme.textSecondary }}>
                          <div>
                            <span>Tanpa Supplier (NULL): </span>
                            <span className="font-bold text-red-600 dark:text-red-400">
                              {item.nullStock} pcs
                            </span>
                            <span className="text-[11px] ml-1">({item.fixableCount} transaksi)</span>
                          </div>

                          <span className="text-gray-300">•</span>

                          <div>
                            <span>Stok Supplier: </span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              +{item.totalOtherStock} pcs
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {item.recommendedSupplier ? (
                          <Button
                            size="sm"
                            onClick={() => handleFixVariantAnomalies(item)}
                            disabled={isFixingThis || batchFixing}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-8 flex items-center gap-1.5"
                          >
                            {isFixingThis ? (
                              <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Mengarahkan...</span>
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faWrench} />
                                <span>Perbaiki Varian (Alokasikan ke {item.recommendedSupplier.name.split('-')[1]?.trim() || item.recommendedSupplier.name})</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs italic text-gray-400">Tidak ada stok supplier tersedia</span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(item.key)}
                          className="text-xs h-8 flex items-center gap-1 text-gray-500 hover:text-gray-700"
                        >
                          <span>{isExpanded ? 'Sembunyikan Detail' : 'Lihat Transaksi'}</span>
                          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                        </Button>
                      </div>
                    </div>

                    {/* Impact Analysis Banner */}
                    <div className="px-3 py-2 text-xs border-t flex flex-wrap items-center justify-between gap-2" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                      <div className="flex items-center gap-1.5" style={{ color: theme.textSecondary }}>
                        <FontAwesomeIcon icon={faInfoCircle} className="text-indigo-500" />
                        <span><strong>Pratinjau Dampak:</strong> Mengalokasikan penjualan tanpa supplier akan membuat Stok Tanpa Supplier menjadi <strong>0 pcs</strong>.</span>
                      </div>
                      {item.recommendedSupplier && (
                        <div className="font-medium text-indigo-600 dark:text-indigo-400">
                          Target Stok ({item.recommendedSupplier.name}): {item.recommendedSupplier.qty} → <strong>{item.recommendedSupplier.qty + item.totalNullQtyDelta} pcs</strong>
                        </div>
                      )}
                    </div>

                    {/* Expandable Transaction Details Table */}
                    {isExpanded && (
                      <div className="p-3 border-t space-y-2 bg-white dark:bg-slate-900/40" style={{ borderColor: theme.border }}>
                        <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                          <FontAwesomeIcon icon={faHistory} className="text-indigo-500" />
                          <span>Riwayat Transaksi untuk {item.uniform_name} (Ukuran {item.size_name})</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left border-b" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>ID Transaksi</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Waktu</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Tipe</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Jumlah</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Supplier Saat Ini</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Catatan / Pembeli</th>
                                <th className="py-2 px-2 font-semibold" style={{ color: theme.textSecondary }}>Aksi Perbaikan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.allTxns.map((txn) => {
                                const isNull = !txn.supplier_id
                                const isTxnFixing = fixingTxnId === txn.txn_id

                                return (
                                  <tr key={txn.txn_id} className={`border-b ${isNull ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`} style={{ borderColor: theme.border }}>
                                    <td className="py-2 px-2 font-mono font-bold" style={{ color: theme.textPrimary }}>#{txn.txn_id}</td>
                                    <td className="py-2 px-2 whitespace-nowrap" style={{ color: theme.textBody }}>
                                      {txn.created_at ? new Date(txn.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="py-2 px-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: theme.subtleBg, color: theme.textBody }}>
                                        {txn.txn_type}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2 font-bold">
                                      <span className={txn.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {txn.qty_delta >= 0 ? '+' : ''}{txn.qty_delta}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2">
                                      {txn.supplier ? (
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{txn.supplier.supplier_code} - {txn.supplier.supplier_name}</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                          <FontAwesomeIcon icon={faExclamationTriangle} /> NULL (Tanpa Supplier)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 text-[11px]" style={{ color: theme.textSecondary }}>
                                      <div>{txn.notes || '-'}</div>
                                      {txn.buyer_name && (
                                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">🛒 {txn.buyer_name}</div>
                                      )}
                                    </td>
                                    <td className="py-2 px-2">
                                      {isNull ? (
                                        <div className="flex items-center gap-1.5">
                                          <select
                                            defaultValue=""
                                            onChange={(e) => {
                                              if (e.target.value !== '') {
                                                const val = e.target.value === 'null' ? null : Number(e.target.value)
                                                handleFixSingleTxn(txn.txn_id, val)
                                              }
                                            }}
                                            disabled={isTxnFixing || batchFixing}
                                            className="text-xs p-1 rounded border font-semibold focus:outline-none"
                                            style={selectStyle}
                                          >
                                            <option value="" disabled>Pilih Supplier...</option>
                                            
                                            {/* Stock Awal (Tanpa Supplier) Option */}
                                            {(() => {
                                              const nullStock = item.supplierStock.get('null') || 0
                                              const reqQty = Math.abs(txn.qty_delta || 0)
                                              const isSufficient = nullStock >= reqQty
                                              const isZeroOrLess = nullStock <= 0

                                              let labelText = `Stock Awal (Tanpa Supplier)`
                                              if (isZeroOrLess) {
                                                labelText += ` (Stok Habis: ${nullStock} pcs) ❌`
                                              } else if (!isSufficient) {
                                                labelText += ` (Stok Kurang: ${nullStock}/${reqQty} pcs) ⚠️`
                                              } else {
                                                labelText += ` (Stok: ${nullStock} pcs) ✅`
                                              }

                                              return (
                                                <option value="null" disabled={isZeroOrLess}>
                                                  {labelText}
                                                </option>
                                              )
                                            })()}

                                            {/* Registered Suppliers */}
                                            {suppliers.map(s => {
                                              const suppStock = item.supplierStock.get(String(s.supplier_id)) || 0
                                              const reqQty = Math.abs(txn.qty_delta || 0)
                                              const isSufficient = suppStock >= reqQty
                                              const isZeroOrLess = suppStock <= 0

                                              let labelText = `${s.supplier_code} - ${s.supplier_name}`
                                              if (isZeroOrLess) {
                                                labelText += ` (Stok Habis: ${suppStock} pcs) ❌`
                                              } else if (!isSufficient) {
                                                labelText += ` (Stok Kurang: ${suppStock}/${reqQty} pcs) ⚠️`
                                              } else {
                                                labelText += ` (Stok: ${suppStock} pcs) ✅`
                                              }

                                              return (
                                                <option
                                                  key={s.supplier_id}
                                                  value={s.supplier_id}
                                                  disabled={isZeroOrLess}
                                                >
                                                  {labelText}
                                                </option>
                                              )
                                            })}
                                          </select>
                                          {isTxnFixing && <FontAwesomeIcon icon={faSpinner} spin className="text-indigo-500" />}
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">✓ Sudah Teralokasi</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
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
        </CardContent>
      </Card>

      {/* Confirmation Modal for Batch Auto-Fix */}
      <Modal
        isOpen={showConfirmBatchModal}
        onClose={() => setShowConfirmBatchModal(false)}
        title="⚡ Konfirmasi Perbaiki Semua Otomatis"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">
            <h4 className="font-bold flex items-center gap-1.5 text-sm mb-1">
              <FontAwesomeIcon icon={faMagic} className="text-indigo-500" />
              <span>Perbaiki Semua Transaksi Penjualan Tanpa Supplier</span>
            </h4>
            <p className="leading-relaxed">
              Tindakan ini akan secara otomatis mengalokasikan ulang <strong>{auditAnalysis.totalUnallocatedTxns} transaksi penjualan</strong> di <strong>{auditAnalysis.totalAnomalousVariants} varian seragam</strong> ke supplier aktif yang memiliki stok.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold" style={{ color: theme.textPrimary }}>Ringkasan Tindakan:</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
              <li>Semua penjualan tanpa supplier akan diubah mengarah ke supplier aktif.</li>
              <li>Saldo minus Tanpa Supplier akan tereset menjadi 0.</li>
              <li>Stok per supplier di Ringkasan dan Riwayat Transaksi akan 100% cocok.</li>
              <li>Tidak ada transaksi yang dihapus atau dibuat baru.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
            <Button variant="outline" onClick={() => setShowConfirmBatchModal(false)}>
              Batal
            </Button>
            <Button
              onClick={handleExecuteBatchFixAll}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              🚀 Konfirmasi & Perbaiki Semua ({auditAnalysis.totalUnallocatedTxns} Transaksi)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification Modal */}
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
