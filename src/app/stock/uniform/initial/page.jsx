"use client"

import React, { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import ExcelJS from 'exceljs'

export default function InitialStockPage() {
  const [units, setUnits] = useState([])
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [initialStockItems, setInitialStockItems] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [filterSupplier, setFilterSupplier] = useState('all')
  const [filterUniform, setFilterUniform] = useState('all')
  const [filterSize, setFilterSize] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [itemAddedSuccess, setItemAddedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const { theme } = useTheme()

  // Helpers for sorting dropdowns and tables
  const getSupplierLabel = (s) => s ? (s.supplier_code ? `${s.supplier_code} - ${s.supplier_name}` : s.supplier_name) : ''

  const sortSizesHelper = (aName, bName) => {
    const strA = String(aName || '').trim()
    const strB = String(bName || '').trim()
    const numA = parseFloat(strA)
    const numB = parseFloat(strB)
    
    if (!isNaN(numA) && !isNaN(numB) && String(numA) === strA && String(numB) === strB) {
      return numA - numB
    }
    
    const letterOrder = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, '2XL': 6, '3XL': 7, '4XL': 8 }
    const orderA = letterOrder[strA.toUpperCase()]
    const orderB = letterOrder[strB.toUpperCase()]
    if (orderA && orderB) return orderA - orderB
    if (orderA) return -1
    if (orderB) return 1
    
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
  }

  // Adjust init stock
  const [adjustModal, setAdjustModal] = useState({ open: false, txn_id: null, uniform_name: '', size_name: '', supplier_name: '', current_qty: 0, notes: '' })
  const [adjustNewQty, setAdjustNewQty] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  // Summary states
  const [summaryData, setSummaryData] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [summarySupplierFilter, setSummarySupplierFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [expandedUniforms, setExpandedUniforms] = useState({})
  
  // Export report states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportYears, setExportYears] = useState([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportNotification, setExportNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' })

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
        supabase.from('uniform').select('uniform_id, uniform_name, is_universal, uniform_unit(unit_id)').eq('is_active', true).order('uniform_name'),
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
    fetchHistory()
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const { data, error } = await supabase
        .from('uniform_stock_txn')
        .select(`
          uniform_id,
          size_id,
          supplier_id,
          qty_delta,
          uniform:uniform_id(uniform_id, uniform_name, is_universal),
          size:size_id(size_id, size_name),
          supplier:supplier_id(supplier_id, supplier_name, supplier_code)
        `)

      if (error) throw error

      // Aggregate qty by uniform_id + size_id + supplier_id
      const aggregated = []
      const map = new Map()

      data.forEach(row => {
        const key = `${row.uniform_id}|${row.size_id}|${row.supplier_id || 'null'}`
        if (!map.has(key)) {
          map.set(key, {
            uniform: row.uniform,
            size: row.size,
            supplier: row.supplier,
            total_qty: 0
          })
        }
        map.get(key).total_qty += row.qty_delta
      })

      map.forEach(val => aggregated.push(val))
      setSummaryData(aggregated.filter(item => item.total_qty > 0))
    } catch (e) {
      console.error('Error loading summary:', e)
    } finally {
      setLoadingSummary(false)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data: txns, error } = await supabase
        .from('uniform_stock_txn')
        .select(`
          txn_id,
          txn_type,
          qty_delta,
          ref_table,
          ref_id,
          notes,
          created_at,
          uniform_id,
          size_id,
          supplier_id,
          uniform:uniform_id(uniform_id, uniform_name, is_universal),
          size:size_id(size_id, size_name, display_order),
          supplier:supplier_id(supplier_id, supplier_name, supplier_code)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get all sale_ids referenced by uniform_sale stock txns
      const saleTxns = (txns || []).filter(t => t.ref_table === 'uniform_sale' && t.ref_id)
      const saleIds = [...new Set(saleTxns.map(t => Number(t.ref_id)).filter(Boolean))]

      let buyerMap = new Map()

      if (saleIds.length > 0) {
        // Fetch uniform_sale records to get user_id (buyer)
        const { data: salesData } = await supabase
          .from('uniform_sale')
          .select('sale_id, user_id')
          .in('sale_id', saleIds)

        if (salesData && salesData.length > 0) {
          const userIds = [...new Set(salesData.map(s => s.user_id).filter(Boolean))]
          if (userIds.length > 0) {
            // Fetch student/buyer names from users
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
              if (name) {
                buyerMap.set(Number(s.sale_id), name)
              }
            })
          }
        }
      }

      const enrichedHistory = (txns || []).map(row => ({
        ...row,
        buyer_name: row.ref_table === 'uniform_sale' && row.ref_id ? buyerMap.get(Number(row.ref_id)) || null : null
      }))

      setHistoryData(enrichedHistory)
    } catch (e) {
      console.error('Error loading history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Fetch years for export modal
  const fetchExportYears = async () => {
    try {
      const { data, error } = await supabase
        .from('year')
        .select('year_id, year_name, start_date, end_date')
        .not('start_date', 'is', null)
        .not('end_date', 'is', null)
        .order('year_name', { ascending: false })
      if (!error) setExportYears(data || [])
    } catch (e) {
      console.error('Error fetching years:', e)
    }
  }

  const openExportModal = () => {
    fetchExportYears()
    setSelectedYearId('')
    setShowExportModal(true)
  }

  const handleExportToExcel = async () => {
    if (!selectedYearId) {
      setExportNotification({ isOpen: true, title: 'Error', message: 'Pilih tahun ajaran terlebih dahulu', type: 'error' })
      return
    }

    const selectedYear = exportYears.find(y => y.year_id === Number(selectedYearId))
    if (!selectedYear) return

    setExporting(true)
    try {
      const { start_date, end_date, year_name } = selectedYear

      // 1. Fetch all suppliers
      const { data: allSuppliers } = await supabase
        .from('uniform_supplier')
        .select('supplier_id, supplier_name, supplier_code')
        .eq('is_active', true)
        .order('supplier_code')

      // 2. Fetch all uniforms
      const { data: allUniforms } = await supabase
        .from('uniform')
        .select('uniform_id, uniform_name, is_universal')
        .eq('is_active', true)
        .order('uniform_name')

      // 3. Fetch all uniform variants (for HPP and price)
      const { data: allVariants } = await supabase
        .from('uniform_variant')
        .select('uniform_id, size_id, hpp, price')

      // 4. Fetch ALL stock transactions (for current stock + HPP calculation)
      const { data: allStockTxns } = await supabase
        .from('uniform_stock_txn')
        .select('uniform_id, size_id, supplier_id, qty_delta, txn_type')

      // 5. Fetch purchase orders within the year period
      const { data: purchases } = await supabase
        .from('uniform_purchase')
        .select('purchase_id, supplier_id, po_number, purchase_date, status, is_voided')
        .gte('purchase_date', start_date)
        .lte('purchase_date', end_date)
        .eq('is_voided', false)
        .order('purchase_date')

      const purchaseIds = (purchases || []).map(p => p.purchase_id)

      // 6. Fetch purchase items for those POs
      let purchaseItems = []
      if (purchaseIds.length > 0) {
        const { data } = await supabase
          .from('uniform_purchase_item')
          .select('item_id, purchase_id, uniform_id, size_id, qty, unit_cost')
          .in('purchase_id', purchaseIds)
        purchaseItems = data || []
      }

      // 7. Fetch receipt items for those POs (realized purchases)
      let receiptData = []
      if (purchaseIds.length > 0) {
        const { data: receipts } = await supabase
          .from('uniform_purchase_receipt')
          .select('receipt_id, purchase_id, receipt_date')
          .in('purchase_id', purchaseIds)
          .order('receipt_date')

        const receiptIds = (receipts || []).map(r => r.receipt_id)
        if (receiptIds.length > 0) {
          const { data: rItems } = await supabase
            .from('uniform_purchase_receipt_item')
            .select('receipt_item_id, receipt_id, purchase_item_id, qty_received, unit_cost')
            .in('receipt_id', receiptIds)
          
          receiptData = (rItems || []).map(ri => {
            const receipt = receipts.find(r => r.receipt_id === ri.receipt_id)
            const pItem = purchaseItems.find(pi => pi.item_id === ri.purchase_item_id)
            return {
              ...ri,
              purchase_id: receipt?.purchase_id,
              receipt_date: receipt?.receipt_date,
              uniform_id: pItem?.uniform_id,
              size_id: pItem?.size_id
            }
          })
        }
      }

      // 8. Fetch sales within the year period (not voided, paid)
      const { data: sales } = await supabase
        .from('uniform_sale')
        .select('sale_id, total_amount, total_cost, is_voided, status')
        .gte('sale_date', start_date + 'T00:00:00')
        .lte('sale_date', end_date + 'T23:59:59')
        .eq('is_voided', false)
        .eq('status', 'paid')

      const saleIds = (sales || []).map(s => s.sale_id)
      let saleItems = []
      if (saleIds.length > 0) {
        const { data } = await supabase
          .from('uniform_sale_item')
          .select('sale_id, uniform_id, size_id, qty, unit_price, unit_hpp, subtotal')
          .in('sale_id', saleIds)
        saleItems = data || []
      }

      // 9. Fetch sale stock transactions within the year period (for per-supplier stock akhir)
      const { data: saleTxnsInPeriod } = await supabase
        .from('uniform_stock_txn')
        .select('uniform_id, size_id, supplier_id, qty_delta')
        .eq('txn_type', 'sale')
        .gte('created_at', start_date + 'T00:00:00')
        .lte('created_at', end_date + 'T23:59:59')

      // ============ BUILD REPORT DATA ============
      const supplierList = allSuppliers || []
      const uniformList = allUniforms || []

      // Number the POs: PO 1, PO 2, ...
      const poList = (purchases || []).map((po, idx) => ({
        ...po,
        poLabel: `PO ${idx + 1}`
      }))

      const reportRows = uniformList.map(uniform => {
        const uId = uniform.uniform_id
        const variants = (allVariants || []).filter(v => v.uniform_id === uId)

        // -- CURRENT STOCK = sum of ALL transactions for this uniform --
        const currentStockBySupplier = {}
        supplierList.forEach(s => {
          currentStockBySupplier[s.supplier_id] = (allStockTxns || [])
            .filter(t => t.uniform_id === uId && t.supplier_id === s.supplier_id)
            .reduce((sum, t) => sum + t.qty_delta, 0)
        })
        const currentStockInv = (allStockTxns || [])
          .filter(t => t.uniform_id === uId && !t.supplier_id)
          .reduce((sum, t) => sum + t.qty_delta, 0)
        // Catch txns with supplier_id not in active supplierList
        const currentStockUnmatched = (allStockTxns || [])
          .filter(t => t.uniform_id === uId && t.supplier_id && !supplierList.some(s => s.supplier_id === t.supplier_id))
          .reduce((sum, t) => sum + t.qty_delta, 0)
        const totalCurrentStock = currentStockInv + currentStockUnmatched + Object.values(currentStockBySupplier).reduce((a, b) => a + b, 0)

        // -- HPP (weighted average from init txns + variant HPP) --
        let totalHppQty = 0
        let totalHppValue = 0
        ;(allStockTxns || []).filter(t => t.uniform_id === uId && t.txn_type === 'init' && t.qty_delta > 0).forEach(t => {
          const variant = variants.find(v => v.size_id === t.size_id)
          if (variant && variant.hpp) {
            totalHppQty += t.qty_delta
            totalHppValue += t.qty_delta * Number(variant.hpp)
          }
        })
        const weightedAvgHpp = totalHppQty > 0
          ? Math.round(totalHppValue / totalHppQty)
          : (variants.length > 0
            ? Math.round(variants.reduce((sum, v) => sum + Number(v.hpp || 0), 0) / variants.length)
            : 0)

        // -- REALISASI PEMBELIAN per PO --
        const purchaseByPo = {}
        poList.forEach(po => {
          const qtyForPo = receiptData
            .filter(ri => ri.purchase_id === po.purchase_id && ri.uniform_id === uId)
            .reduce((sum, ri) => sum + ri.qty_received, 0)
          const costForPo = receiptData
            .filter(ri => ri.purchase_id === po.purchase_id && ri.uniform_id === uId)
            .reduce((sum, ri) => sum + (ri.qty_received * Number(ri.unit_cost || 0)), 0)
          purchaseByPo[po.purchase_id] = { qty: qtyForPo, cost: costForPo }
        })
        const totalPurchaseQty = Object.values(purchaseByPo).reduce((a, b) => a + b.qty, 0)
        const totalPurchaseCost = Object.values(purchaseByPo).reduce((a, b) => a + b.cost, 0)
        const avgPurchasePrice = totalPurchaseQty > 0 ? Math.round(totalPurchaseCost / totalPurchaseQty) : 0

        // -- HASIL PENJUALAN --
        const salesForUniform = saleItems.filter(si => si.uniform_id === uId)
        const totalSoldQty = salesForUniform.reduce((sum, si) => sum + si.qty, 0)
        const totalSaleRevenue = salesForUniform.reduce((sum, si) => sum + Number(si.subtotal || 0), 0)
        const avgSellPrice = totalSoldQty > 0 ? Math.round(totalSaleRevenue / totalSoldQty) : (variants.length > 0 ? Number(variants[0]?.price || 0) : 0)
        const totalSaleCost = salesForUniform.reduce((sum, si) => sum + (si.qty * Number(si.unit_hpp || weightedAvgHpp || 0)), 0)
        const profit = totalSaleRevenue - totalSaleCost

        // -- STOCK AWAL = Current Stock - Purchases in Period + Sales in Period --
        // (back-calculated so it always balances: Awal + Beli - Jual = Akhir)
        const purchaseQtyBySupplier = {}
        supplierList.forEach(s => {
          const posForSupplier = poList.filter(p => p.supplier_id === s.supplier_id)
          const pIdsForSupplier = posForSupplier.map(p => p.purchase_id)
          purchaseQtyBySupplier[s.supplier_id] = receiptData
            .filter(ri => pIdsForSupplier.includes(ri.purchase_id) && ri.uniform_id === uId)
            .reduce((sum, ri) => sum + ri.qty_received, 0)
        })
        const saleQtyBySupplier = {}
        supplierList.forEach(s => {
          saleQtyBySupplier[s.supplier_id] = (saleTxnsInPeriod || [])
            .filter(t => t.uniform_id === uId && t.supplier_id === s.supplier_id)
            .reduce((sum, t) => sum + Math.abs(t.qty_delta), 0)
        })
        const saleQtyInv = (saleTxnsInPeriod || [])
          .filter(t => t.uniform_id === uId && !t.supplier_id)
          .reduce((sum, t) => sum + Math.abs(t.qty_delta), 0)

        const rawStockAwalBySupplier = {}
        supplierList.forEach(s => {
          rawStockAwalBySupplier[s.supplier_id] = 
            (currentStockBySupplier[s.supplier_id] || 0) - 
            (purchaseQtyBySupplier[s.supplier_id] || 0) + 
            (saleQtyBySupplier[s.supplier_id] || 0)
        })
        const rawStockAwalInv = (currentStockInv + currentStockUnmatched) + saleQtyInv

        // Helper to allocate negative unallocated stock (POS sales without supplier_id) to supplier balances
        const allocateUnallocated = (invQty, suppMap) => {
          const resSuppMap = { ...suppMap }
          let remInv = invQty
          if (remInv < 0) {
            let needed = Math.abs(remInv)
            for (const s of supplierList) {
              if (needed <= 0) break
              const qty = resSuppMap[s.supplier_id] || 0
              if (qty > 0) {
                const deduct = Math.min(qty, needed)
                resSuppMap[s.supplier_id] -= deduct
                needed -= deduct
              }
            }
            remInv = -needed
          }
          return { invQty: remInv, suppMap: resSuppMap }
        }

        const { invQty: stockAwalInv, suppMap: stockAwalBySupplier } = allocateUnallocated(rawStockAwalInv, rawStockAwalBySupplier)
        const totalStockAwal = stockAwalInv + Object.values(stockAwalBySupplier).reduce((a, b) => a + b, 0)

        // -- STOCK AKHIR = Current Stock (equals Awal + Beli - Jual) --
        const rawStockAkhirInv = currentStockInv + currentStockUnmatched
        const rawStockAkhirBySupplier = {}
        supplierList.forEach(s => {
          rawStockAkhirBySupplier[s.supplier_id] = currentStockBySupplier[s.supplier_id] || 0
        })

        const { invQty: stockAkhirInv, suppMap: stockAkhirBySupplier } = allocateUnallocated(rawStockAkhirInv, rawStockAkhirBySupplier)
        const totalStockAkhir = totalCurrentStock

        return {
          uniform_name: uniform.uniform_name,
          stockAwalInv, stockAwalBySupplier, totalStockAwal, weightedAvgHpp,
          purchaseByPo, totalPurchaseQty, avgPurchasePrice, totalPurchaseCost,
          totalSoldQty, avgSellPrice, totalSaleRevenue, profit,
          stockAkhirInv, stockAkhirBySupplier, totalStockAkhir
        }
      }).filter(row => {
        return row.totalStockAwal > 0 || row.totalPurchaseQty > 0 || row.totalSoldQty > 0 || row.totalStockAkhir !== 0
      })

      // ============ BUILD EXCEL with ExcelJS ============
      const wb = new ExcelJS.Workbook()
      wb.creator = 'School Admin'
      wb.created = new Date()

      // --- Helper: thin border style ---
      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E8D2' } } // light green
      const groupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } // blue
      const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } } // light yellow

      // ---- Sheet 1: Comprehensive Report ----
      const ws = wb.addWorksheet('Laporan Stok')

      const supplierCount = supplierList.length
      const poCount = Math.max(poList.length, 1)

      // Column positions (1-based for ExcelJS)
      const C = {
        jenisSeragam: 1,
        inv: 2,
        suppAwalStart: 3,
        hpp: 3 + supplierCount,
        nilai: 4 + supplierCount,
        totalStokAwal: 5 + supplierCount,
        poStart: 6 + supplierCount,
        hargaBeli: 6 + supplierCount + poCount,
        totalPembelian: 7 + supplierCount + poCount,
        jmlTerjual: 8 + supplierCount + poCount,
        hargaJual: 9 + supplierCount + poCount,
        totalPenjualan: 10 + supplierCount + poCount,
        keuntungan: 11 + supplierCount + poCount,
        akhirJenis: 12 + supplierCount + poCount,
        akhirInv: 13 + supplierCount + poCount,
        suppAkhirStart: 14 + supplierCount + poCount,
        totalStokAkhir: 14 + (supplierCount * 2) + poCount,
      }
      const totalCols = C.totalStokAkhir

      // Set column widths
      for (let i = 1; i <= totalCols; i++) ws.getColumn(i).width = 14
      ws.getColumn(C.jenisSeragam).width = 26
      ws.getColumn(C.akhirJenis).width = 26
      ws.getColumn(C.totalPembelian).width = 22
      ws.getColumn(C.jmlTerjual).width = 22
      ws.getColumn(C.keuntungan).width = 26

      // Row 1: Title
      const startFormatted = new Date(start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      const endFormatted = new Date(end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

      const titleRow = ws.addRow([`LAPORAN STOK SERAGAM - ${year_name}`])
      titleRow.getCell(1).font = { bold: true, size: 14 }
      ws.mergeCells(1, 1, 1, totalCols)

      // Row 2: Period
      const periodRow = ws.addRow([`Periode: ${startFormatted} - ${endFormatted}`])
      periodRow.getCell(1).font = { italic: true, size: 11 }
      ws.mergeCells(2, 1, 2, totalCols)

      // Row 3: Empty
      ws.addRow([])

      // Row 4: Group headers
      const groupHeaderRow = ws.addRow([])
      const groupHeaders = [
        { col: C.jenisSeragam, end: C.totalStokAwal, label: 'STOCK AWAL' },
        { col: C.poStart, end: C.totalPembelian, label: 'REALISASI PEMBELIAN SERAGAM' },
        { col: C.jmlTerjual, end: C.keuntungan, label: 'HASIL PENJUALAN SERAGAM' },
        { col: C.akhirJenis, end: totalCols, label: 'STOCK AKHIR' },
      ]
      groupHeaders.forEach(g => {
        const cell = groupHeaderRow.getCell(g.col)
        cell.value = g.label
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        cell.fill = groupFill
        cell.alignment = { horizontal: 'center' }
        cell.border = thinBorder
        ws.mergeCells(4, g.col, 4, g.end)
        // Fill all merged cells with border
        for (let c = g.col + 1; c <= g.end; c++) {
          groupHeaderRow.getCell(c).border = thinBorder
          groupHeaderRow.getCell(c).fill = groupFill
        }
      })

      // Row 5: Sub-headers
      const subHeaders = new Array(totalCols).fill('')
      subHeaders[C.jenisSeragam - 1] = 'Jenis Seragam'
      subHeaders[C.inv - 1] = 'Inv'
      supplierList.forEach((s, i) => { subHeaders[C.suppAwalStart + i - 1] = s.supplier_name })
      subHeaders[C.hpp - 1] = 'HPP'
      subHeaders[C.nilai - 1] = 'Nilai'
      subHeaders[C.totalStokAwal - 1] = 'Total Stok'
      if (poList.length > 0) {
        poList.forEach((po, i) => { subHeaders[C.poStart + i - 1] = po.poLabel })
      } else {
        subHeaders[C.poStart - 1] = 'PO 1'
      }
      subHeaders[C.hargaBeli - 1] = 'Harga'
      subHeaders[C.totalPembelian - 1] = 'Total Pembelian Seragam'
      subHeaders[C.jmlTerjual - 1] = 'Jumlah Seragam Terjual'
      subHeaders[C.hargaJual - 1] = 'Harga Jual Seragam'
      subHeaders[C.totalPenjualan - 1] = 'Total Penjualan'
      subHeaders[C.keuntungan - 1] = 'Keuntungan Penjualan Seragam'
      subHeaders[C.akhirJenis - 1] = 'Jenis Seragam'
      subHeaders[C.akhirInv - 1] = 'Inv'
      supplierList.forEach((s, i) => { subHeaders[C.suppAkhirStart + i - 1] = s.supplier_name })
      subHeaders[C.totalStokAkhir - 1] = 'Total Stok'

      const subHeaderRow = ws.addRow(subHeaders)
      subHeaderRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= totalCols) {
          cell.font = { bold: true, size: 10 }
          cell.fill = headerFill
          cell.border = thinBorder
          cell.alignment = { horizontal: 'center', wrapText: true }
        }
      })

      // Data rows
      const totals = {
        inv: 0, suppAwal: {}, hppNilai: 0, totalStokAwal: 0,
        poQty: {}, totalPoQty: 0, totalPembelian: 0,
        jmlTerjual: 0, totalPenjualan: 0, keuntungan: 0,
        akhirInv: 0, suppAkhir: {}, totalStokAkhir: 0
      }
      supplierList.forEach(s => { totals.suppAwal[s.supplier_id] = 0; totals.suppAkhir[s.supplier_id] = 0 })
      poList.forEach(po => { totals.poQty[po.purchase_id] = 0 })

      const fmtNum = (v) => (v === 0 || v === null || v === undefined) ? '' : v

      reportRows.forEach(row => {
        const vals = new Array(totalCols).fill('')
        vals[C.jenisSeragam - 1] = row.uniform_name
        vals[C.inv - 1] = fmtNum(row.stockAwalInv)
        supplierList.forEach((s, i) => {
          const v = row.stockAwalBySupplier[s.supplier_id] || 0
          vals[C.suppAwalStart + i - 1] = fmtNum(v)
          totals.suppAwal[s.supplier_id] += v
        })
        vals[C.hpp - 1] = fmtNum(row.weightedAvgHpp)
        const nilai = row.totalStockAwal * row.weightedAvgHpp
        vals[C.nilai - 1] = fmtNum(nilai)
        vals[C.totalStokAwal - 1] = fmtNum(row.totalStockAwal)

        if (poList.length > 0) {
          poList.forEach((po, i) => {
            const pd = row.purchaseByPo[po.purchase_id]
            vals[C.poStart + i - 1] = fmtNum(pd?.qty)
            totals.poQty[po.purchase_id] = (totals.poQty[po.purchase_id] || 0) + (pd?.qty || 0)
          })
        }
        vals[C.hargaBeli - 1] = fmtNum(row.avgPurchasePrice)
        vals[C.totalPembelian - 1] = fmtNum(row.totalPurchaseCost)
        vals[C.jmlTerjual - 1] = fmtNum(row.totalSoldQty)
        vals[C.hargaJual - 1] = fmtNum(row.avgSellPrice)
        vals[C.totalPenjualan - 1] = fmtNum(row.totalSaleRevenue)
        vals[C.keuntungan - 1] = fmtNum(row.profit)
        vals[C.akhirJenis - 1] = row.uniform_name
        vals[C.akhirInv - 1] = fmtNum(row.stockAkhirInv)
        supplierList.forEach((s, i) => {
          const v = row.stockAkhirBySupplier[s.supplier_id] || 0
          vals[C.suppAkhirStart + i - 1] = fmtNum(v)
          totals.suppAkhir[s.supplier_id] += v
        })
        vals[C.totalStokAkhir - 1] = fmtNum(row.totalStockAkhir)

        totals.inv += row.stockAwalInv || 0
        totals.hppNilai += nilai || 0
        totals.totalStokAwal += row.totalStockAwal || 0
        totals.totalPoQty += row.totalPurchaseQty || 0
        totals.totalPembelian += row.totalPurchaseCost || 0
        totals.jmlTerjual += row.totalSoldQty || 0
        totals.totalPenjualan += row.totalSaleRevenue || 0
        totals.keuntungan += row.profit || 0
        totals.akhirInv += row.stockAkhirInv || 0
        totals.totalStokAkhir += row.totalStockAkhir || 0

        const dataRow = ws.addRow(vals)
        dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
          if (colNum <= totalCols) {
            cell.border = thinBorder
            cell.alignment = { vertical: 'middle' }
            // Number formatting for currency columns
            if (typeof cell.value === 'number' && [C.hpp, C.nilai, C.hargaBeli, C.totalPembelian, C.hargaJual, C.totalPenjualan, C.keuntungan].includes(colNum)) {
              cell.numFmt = '#,##0'
            }
          }
        })
      })

      // TOTAL row
      const totalVals = new Array(totalCols).fill('')
      totalVals[C.jenisSeragam - 1] = 'TOTAL'
      totalVals[C.inv - 1] = fmtNum(totals.inv)
      supplierList.forEach((s, i) => { totalVals[C.suppAwalStart + i - 1] = fmtNum(totals.suppAwal[s.supplier_id]) })
      totalVals[C.nilai - 1] = fmtNum(totals.hppNilai)
      totalVals[C.totalStokAwal - 1] = fmtNum(totals.totalStokAwal)
      if (poList.length > 0) {
        poList.forEach((po, i) => { totalVals[C.poStart + i - 1] = fmtNum(totals.poQty[po.purchase_id]) })
      }
      totalVals[C.hargaBeli - 1] = totals.totalPoQty > 0 ? fmtNum(Math.round(totals.totalPembelian / totals.totalPoQty)) : ''
      totalVals[C.totalPembelian - 1] = fmtNum(totals.totalPembelian)
      totalVals[C.jmlTerjual - 1] = fmtNum(totals.jmlTerjual)
      totalVals[C.hargaJual - 1] = totals.jmlTerjual > 0 ? fmtNum(Math.round(totals.totalPenjualan / totals.jmlTerjual)) : ''
      totalVals[C.totalPenjualan - 1] = fmtNum(totals.totalPenjualan)
      totalVals[C.keuntungan - 1] = fmtNum(totals.keuntungan)
      totalVals[C.akhirJenis - 1] = 'TOTAL'
      totalVals[C.akhirInv - 1] = fmtNum(totals.akhirInv)
      supplierList.forEach((s, i) => { totalVals[C.suppAkhirStart + i - 1] = fmtNum(totals.suppAkhir[s.supplier_id]) })
      totalVals[C.totalStokAkhir - 1] = fmtNum(totals.totalStokAkhir)

      const totalRow = ws.addRow(totalVals)
      totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= totalCols) {
          cell.font = { bold: true }
          cell.fill = totalFill
          cell.border = thinBorder
          if (typeof cell.value === 'number') cell.numFmt = '#,##0'
        }
      })

      // ---- Sheet 2+: Per-supplier summary (current stock matching Sheet 1) ----
      const dataBySupplier = new Map()
      dataBySupplier.set('Tanpa Supplier', [])

      // Group allStockTxns directly by (uniform_id, size_id, supplier_id)
      const variantStockMap = new Map()
      ;(allStockTxns || []).forEach(t => {
        const uId = t.uniform_id
        const sId = t.size_id
        const suppId = t.supplier_id || 'null'
        const key = `${uId}|${sId}|${suppId}`

        if (!variantStockMap.has(key)) {
          const uniform = (allUniforms || []).find(u => u.uniform_id === uId)
          const sizeObj = (sizes || []).find(s => s.size_id === sId)
          const suppObj = (allSuppliers || []).find(s => s.supplier_id === t.supplier_id)

          variantStockMap.set(key, {
            uniform_id: uId,
            size_id: sId,
            supplier_id: t.supplier_id,
            uniform_name: uniform?.uniform_name || '',
            size_name: sizeObj?.size_name || '',
            supplier_name: suppObj ? `${suppObj.supplier_code} - ${suppObj.supplier_name}` : 'Tanpa Supplier',
            is_universal: uniform?.is_universal || false,
            net_qty: 0
          })
        }
        variantStockMap.get(key).net_qty += t.qty_delta
      })

      // Group variant items by uniform_id
      const variantByUniform = new Map()
      variantStockMap.forEach(item => {
        if (!variantByUniform.has(item.uniform_id)) variantByUniform.set(item.uniform_id, [])
        variantByUniform.get(item.uniform_id).push(item)
      })

      // For each uniform, allocate negative unallocated stock (POS sales without supplier_id) across positive unallocated variant sizes
      variantByUniform.forEach((items) => {
        const unallocItems = items.filter(i => !i.supplier_id)
        const totalNegativeUnalloc = unallocItems.filter(i => i.net_qty < 0).reduce((sum, i) => sum + Math.abs(i.net_qty), 0)

        if (totalNegativeUnalloc > 0) {
          let needed = totalNegativeUnalloc
          unallocItems.forEach(i => {
            if (i.net_qty > 0 && needed > 0) {
              const deduct = Math.min(i.net_qty, needed)
              i.net_qty -= deduct
              needed -= deduct
            }
          })
        }

        items.forEach(item => {
          if (item.net_qty <= 0) return
          const key = item.supplier_name
          if (!dataBySupplier.has(key)) dataBySupplier.set(key, [])
          dataBySupplier.get(key).push({
            seragam: item.uniform_name,
            ukuran: item.size_name,
            jumlah: item.net_qty,
            universal: item.is_universal ? 'Ya' : 'Tidak'
          })
        })
      })

      dataBySupplier.forEach((items, supplierName) => {
        if (items.length === 0) return
        items.sort((a, b) => a.seragam.localeCompare(b.seragam) || a.ukuran.localeCompare(b.ukuran))

        let sheetName = supplierName.replace(/[\\/*\[\]:?]/g, '').substring(0, 31)
        const ssWs = wb.addWorksheet(sheetName)

        const totalPcs = items.reduce((sum, i) => sum + i.jumlah, 0)
        // Title rows
        const r1 = ssWs.addRow([supplierName])
        r1.getCell(1).font = { bold: true, size: 13 }
        ssWs.mergeCells(1, 1, 1, 4)
        const r2 = ssWs.addRow([`Total Stock: ${totalPcs} pcs`])
        r2.getCell(1).font = { italic: true }
        ssWs.addRow([`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`])
        ssWs.addRow([])

        // Header
        const hdr = ssWs.addRow(['Seragam', 'Ukuran', 'Jumlah', 'Universal'])
        hdr.eachCell((cell) => {
          cell.font = { bold: true }
          cell.fill = headerFill
          cell.border = thinBorder
          cell.alignment = { horizontal: 'center' }
        })

        items.forEach(item => {
          const row = ssWs.addRow([item.seragam, item.ukuran, item.jumlah, item.universal])
          row.eachCell((cell) => { cell.border = thinBorder })
        })

        ssWs.getColumn(1).width = 30
        ssWs.getColumn(2).width = 12
        ssWs.getColumn(3).width = 10
        ssWs.getColumn(4).width = 10
      })

      // Download
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_Stok_Seragam_${year_name.replace(/[\/\\]/g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      setShowExportModal(false)
      setExportNotification({ isOpen: true, title: 'Berhasil', message: `Laporan berhasil di-export`, type: 'success' })

    } catch (e) {
      console.error('Error exporting report:', e)
      setExportNotification({ isOpen: true, title: 'Error', message: 'Gagal export laporan: ' + e.message, type: 'error' })
    } finally {
      setExporting(false)
    }
  }

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
    
    // Show success message
    setItemAddedSuccess(true)
    setTimeout(() => setItemAddedSuccess(false), 2000)
    
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

  const saveAdjustInit = async () => {
    const newQty = parseInt(adjustNewQty, 10)
    if (isNaN(newQty) || newQty < 0) {
      setAdjustError('Masukkan jumlah yang valid (angka >= 0)')
      return
    }
    setAdjustSaving(true)
    setAdjustError('')
    try {
      const { error } = await supabase
        .from('uniform_stock_txn')
        .update({ qty_delta: newQty })
        .eq('txn_id', adjustModal.txn_id)
      if (error) throw error
      setAdjustModal({ open: false, txn_id: null, uniform_name: '', size_name: '', supplier_name: '', current_qty: 0, notes: '' })
      setAdjustNewQty('')
      fetchHistory()
      fetchSummary()
    } catch (e) {
      setAdjustError(e.message)
    } finally {
      setAdjustSaving(false)
    }
  }

  const submitInitialStock = async () => {
    if (initialStockItems.length === 0) {
      setError('Tambahkan minimal satu item')
      return
    }

    setSaving(true)
    setError('')
    try {
      // Get user ID for created_by tracking
      const userId = parseInt(localStorage.getItem('kr_id'), 10) || null
      
      // Create stock transactions for initial stock
      const transactions = initialStockItems.map(item => ({
        uniform_id: Number(item.uniform_id),
        size_id: Number(item.size_id),
        supplier_id: item.supplier_id ? Number(item.supplier_id) : null,
        qty_delta: Number(item.qty),
        txn_type: 'init',
        ref_table: 'manual',
        ref_id: null,
        notes: item.notes || 'Stock awal sistem',
        created_by: userId
      }))

      const { error } = await supabase
        .from('uniform_stock_txn')
        .insert(transactions)

      if (error) throw error

      setSuccess(`Berhasil menginput ${initialStockItems.length} item stock awal`)
      setTimeout(() => setSuccess(''), 3000)
      setInitialStockItems([])
      fetchHistory() // Refresh history data
      fetchSummary() // Refresh summary data
      closeModal()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Filter uniforms: universal OR assigned to selected unit via junction table
  const uniformsFiltered = uniforms.filter(u => u.is_universal || (u.uniform_unit || []).some(uu => String(uu.unit_id) === String(formData.unit_id)))
  const totalItems = initialStockItems.reduce((sum, item) => sum + Number(item.qty), 0)

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6" style={{ background: theme.pageBg, minHeight: '100%' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme.textPrimary }}>Stok Seragam</h1>
          <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>Pantau dan kelola stok seragam</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold w-full sm:w-auto"
        >
          + Input Stock Awal
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

      {/* Ringkasan Stock */}
      <Card className="p-4" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textBody }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold" style={{ color: theme.textPrimary }}>📊 Ringkasan Stock Seragam</h2>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Export Button */}
            {summaryData.length > 0 && (
              <Button
                onClick={openExportModal}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
              >
                📥 Export Laporan
              </Button>
            )}
            
            <Button onClick={fetchSummary} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 text-sm" disabled={loadingSummary}>
              🔄 Refresh
            </Button>
          </div>
        </div>
        
        {loadingSummary ? (
          <div className="text-center py-8" style={{ color: theme.textSecondary }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Memuat data...</p>
          </div>
        ) : summaryData.length === 0 ? (
          <div className="text-center py-8" style={{ color: theme.textSecondary }}>
            <div className="text-4xl mb-2">📦</div>
            <p>Belum ada data stok</p>
          </div>
        ) : (
          <>
            {/* Table View */}
            {(() => {
              // Apply supplier filter first
              let filteredBySupplier = summaryData
              if (summarySupplierFilter !== 'all') {
                if (summarySupplierFilter === 'null') {
                  filteredBySupplier = summaryData.filter(row => !row.supplier)
                } else {
                  filteredBySupplier = summaryData.filter(row => row.supplier?.supplier_id === Number(summarySupplierFilter))
                }
              }
              
              // Then apply search filter
              const filteredData = filteredBySupplier.filter(row => {
                if (!searchQuery.trim()) return true
                const query = searchQuery.toLowerCase()
                const uniformName = (row.uniform?.uniform_name || '').toLowerCase()
                const sizeName = (row.size?.size_name || '').toLowerCase()
                const supplierName = (row.supplier?.supplier_name || '').toLowerCase()
                return uniformName.includes(query) || sizeName.includes(query) || supplierName.includes(query)
              })
              
              // Apply sorting
              const sortedData = [...filteredData]
              if (sortConfig.key) {
                sortedData.sort((a, b) => {
                  let aVal, bVal
                  
                  switch(sortConfig.key) {
                    case 'uniform':
                      aVal = a.uniform?.uniform_name || ''
                      bVal = b.uniform?.uniform_name || ''
                      break
                    case 'size':
                      aVal = a.size?.size_name || ''
                      bVal = b.size?.size_name || ''
                      break
                    case 'qty':
                      aVal = a.total_qty
                      bVal = b.total_qty
                      break
                    case 'supplier':
                      aVal = a.supplier?.supplier_name || ''
                      bVal = b.supplier?.supplier_name || ''
                      break
                    default:
                      return 0
                  }
                  
                  if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
                  if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
                  return 0
                })
              }
              
              const handleSort = (key) => {
                setSortConfig(prev => ({
                  key,
                  direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
                }))
              }
              
              const SortIcon = ({ column }) => {
                if (sortConfig.key !== column) {
                  return <span className="text-gray-400">⇅</span>
                }
                return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
              }
              
              // Extract unique suppliers from summaryData
              const uniqueSuppliers = Array.from(
                new Set(
                  summaryData
                    .filter(row => row.supplier)
                    .map(row => row.supplier.supplier_id)
                )
              ).map(supplierId => 
                summaryData.find(row => row.supplier?.supplier_id === supplierId).supplier
              ).sort((a, b) => getSupplierLabel(a).localeCompare(getSupplierLabel(b), 'id', { sensitivity: 'base', numeric: true }))

              // Group sortedData by uniform_id so identical uniforms collapse into a dropdown list
              const groupedUniformsMap = new Map()

              sortedData.forEach(row => {
                const uId = row.uniform?.uniform_id || row.uniform?.uniform_name || 'unknown'
                if (!groupedUniformsMap.has(uId)) {
                  groupedUniformsMap.set(uId, {
                    uniform_id: uId,
                    uniform_name: row.uniform?.uniform_name || 'Tanpa Nama',
                    is_universal: row.uniform?.is_universal || false,
                    total_qty: 0,
                    items: []
                  })
                }
                const group = groupedUniformsMap.get(uId)
                group.total_qty += row.total_qty
                group.items.push(row)
              })

              const groupedUniforms = Array.from(groupedUniformsMap.values()).map(group => {
                // Sort child items by size numerically (smallest to largest)
                group.items.sort((a, b) => sortSizesHelper(a.size?.size_name, b.size?.size_name))
                return group
              })

              const toggleExpand = (uId) => {
                setExpandedUniforms(prev => ({
                  ...prev,
                  [uId]: !prev[uId]
                }))
              }

              return (
                <div className="space-y-3">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari seragam, ukuran, atau supplier..."
                        className="w-full pl-10 pr-4 py-1.5 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                      />
                      <svg className="absolute left-3 top-2 h-4 w-4" style={{ color: theme.textSecondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    {/* Supplier Filter */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap" style={{ color: theme.textSecondary }}>Filter:</Label>
                      <select
                        value={summarySupplierFilter}
                        onChange={(e) => setSummarySupplierFilter(e.target.value)}
                        className="rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                      >
                        <option value="all">Semua Supplier</option>
                        <option value="null">Tanpa Supplier</option>
                        {uniqueSuppliers.map(s => (
                          <option key={s.supplier_id} value={s.supplier_id}>
                            {s.supplier_code} - {s.supplier_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {(searchQuery || summarySupplierFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setSummarySupplierFilter('all')
                        }}
                        className="px-3 py-1.5 text-sm rounded font-medium"
                        style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  
                  {groupedUniforms.length === 0 ? (
                    <div className="text-center py-8" style={{ color: theme.textSecondary }}>
                      <div className="text-4xl mb-2">🔍</div>
                      <p>Tidak ada data yang sesuai dengan filter</p>
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                            <th 
                              className="py-2 px-3 font-semibold cursor-pointer select-none"
                              style={{ color: theme.textSecondary }}
                              onClick={() => handleSort('uniform')}
                            >
                              <div className="flex items-center gap-2">
                                Seragam <SortIcon column="uniform" />
                              </div>
                            </th>
                            <th 
                              className="py-2 px-3 font-semibold cursor-pointer select-none"
                              style={{ color: theme.textSecondary }}
                              onClick={() => handleSort('size')}
                            >
                              <div className="flex items-center gap-2">
                                Ukuran <SortIcon column="size" />
                              </div>
                            </th>
                            <th 
                              className="py-2 px-3 font-semibold cursor-pointer select-none"
                              style={{ color: theme.textSecondary }}
                              onClick={() => handleSort('qty')}
                            >
                              <div className="flex items-center gap-2">
                                Total Qty <SortIcon column="qty" />
                              </div>
                            </th>
                            <th 
                              className="py-2 px-3 font-semibold cursor-pointer select-none"
                              style={{ color: theme.textSecondary }}
                              onClick={() => handleSort('supplier')}
                            >
                              <div className="flex items-center gap-2">
                                Supplier <SortIcon column="supplier" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedUniforms.map((group) => {
                            const isMultiple = group.items.length > 1
                            const isExpanded = !!expandedUniforms[group.uniform_id] || Boolean(searchQuery.trim()) || summarySupplierFilter !== 'all'

                            if (!isMultiple) {
                              const item = group.items[0]
                              return (
                                <tr key={group.uniform_id} className="border-b hover:opacity-90" style={{ borderColor: theme.border }}>
                                  <td className="py-2 px-3" style={{ color: theme.textBody }}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{group.uniform_name}</span>
                                      {group.is_universal && <span className="text-xs">🌐</span>}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3" style={{ color: theme.textBody }}>
                                    {item.size?.size_name || '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-semibold text-blue-600">{group.total_qty}</span>
                                  </td>
                                  <td className="py-2 px-3">
                                    {item.supplier ? (
                                      <span style={{ color: theme.textBody }}>
                                        {item.supplier.supplier_code} - {item.supplier.supplier_name}
                                      </span>
                                    ) : (
                                      <span className="italic text-xs" style={{ color: theme.textSecondary }}>Stock Awal</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            }

                            // Multiple items for same uniform -> Accordion Parent + Child Rows
                            const uniqueSizeNames = Array.from(new Set(group.items.map(i => i.size?.size_name).filter(Boolean))).sort(sortSizesHelper)
                            const sizesList = uniqueSizeNames.join(', ')
                            const uniqueSuppliersInGroup = Array.from(new Set(group.items.map(i => i.supplier ? `${i.supplier.supplier_code} - ${i.supplier.supplier_name}` : 'Stock Awal')))
                            const supplierSummaryText = uniqueSuppliersInGroup.length === 1 ? uniqueSuppliersInGroup[0] : `${uniqueSuppliersInGroup.length} Supplier`

                            return (
                              <Fragment key={`group-frag-${group.uniform_id}`}>
                                {/* Accordion Parent Row */}
                                <tr
                                  className="border-b cursor-pointer hover:bg-opacity-80 transition-colors"
                                  style={{ borderColor: theme.border, background: theme.cardBg }}
                                  onClick={() => toggleExpand(group.uniform_id)}
                                >
                                  <td className="py-2.5 px-3" style={{ color: theme.textBody }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-blue-600 font-bold transition-transform duration-200" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                        ▶
                                      </span>
                                      <span className="font-semibold" style={{ color: theme.textPrimary }}>{group.uniform_name}</span>
                                      {group.is_universal && <span className="text-xs">🌐</span>}
                                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: theme.subtleBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                                        {group.items.length} varian
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-xs font-medium" style={{ color: theme.textSecondary }}>
                                    {sizesList || '-'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="font-bold text-blue-600 text-base">{group.total_qty}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-xs" style={{ color: theme.textSecondary }}>
                                    {supplierSummaryText}
                                  </td>
                                </tr>

                                {/* Expanded Child Rows */}
                                {isExpanded && group.items.map((item, iIdx) => (
                                  <tr
                                    key={`child-${group.uniform_id}-${iIdx}`}
                                    className="border-b transition-colors"
                                    style={{ borderColor: theme.border, background: theme.subtleBg }}
                                  >
                                    <td className="py-2 px-3 pl-8">
                                      <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textSecondary }}>
                                        <span className="text-blue-500 font-bold">↳</span>
                                        <span>Rincian Varian</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-xs font-medium" style={{ color: theme.textBody }}>
                                      {item.size?.size_name || '-'}
                                    </td>
                                    <td className="py-2 px-3 text-xs">
                                      <span className="font-semibold text-blue-600">{item.total_qty}</span>
                                    </td>
                                    <td className="py-2 px-3 text-xs">
                                      {item.supplier ? (
                                        <span style={{ color: theme.textBody }}>
                                          {item.supplier.supplier_code} - {item.supplier.supplier_name}
                                        </span>
                                      ) : (
                                        <span className="italic" style={{ color: theme.textSecondary }}>Stock Awal</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                      <div className="mt-4 text-xs" style={{ color: theme.textSecondary }}>
                        {(searchQuery || summarySupplierFilter !== 'all') ? (
                          <>
                            Menampilkan: <span className="font-semibold">{groupedUniforms.length} jenis seragam</span> ({sortedData.length} varian)
                            <span className="mx-2">•</span>
                            Total Qty: <span className="font-semibold">{sortedData.reduce((sum, row) => sum + row.total_qty, 0)}</span>
                          </>
                        ) : (
                          <>
                            Total: <span className="font-semibold">{groupedUniforms.length} jenis seragam</span> ({summaryData.length} varian)
                            <span className="mx-2">•</span>
                            Total Qty: <span className="font-semibold">{summaryData.reduce((sum, row) => sum + row.total_qty, 0)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </Card>

      {/* History Table */}
      <Card className="p-4" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textBody }}>
        <h2 className="font-semibold mb-4" style={{ color: theme.textPrimary }}>Riwayat Transaksi Stock Seragam</h2>
        
        {loadingHistory ? (
          <div className="text-center py-8" style={{ color: theme.textSecondary }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Memuat data...</p>
          </div>
        ) : (() => {
          // Get unique values from historyData for filters
          const uniqueSuppliers = Array.from(
            new Map(
              historyData
                .filter(row => row.supplier)
                .map(row => [row.supplier.supplier_id, row.supplier])
            ).values()
          ).sort((a, b) => getSupplierLabel(a).localeCompare(getSupplierLabel(b), 'id', { sensitivity: 'base', numeric: true }))
          
          const hasNoSupplier = historyData.some(row => !row.supplier)
          
          const uniqueUniforms = Array.from(
            new Map(
              historyData
                .filter(row => row.uniform)
                .map(row => [row.uniform.uniform_id, row.uniform])
            ).values()
          ).sort((a, b) => (a.uniform_name || '').localeCompare(b.uniform_name || '', 'id', { sensitivity: 'base', numeric: true }))
          
          const uniqueSizes = Array.from(
            new Map(
              historyData
                .filter(row => row.size)
                .map(row => [row.size.size_id, row.size])
            ).values()
          ).sort((a, b) => {
            if (a.display_order !== undefined && b.display_order !== undefined && a.display_order !== b.display_order) {
              return (a.display_order || 0) - (b.display_order || 0)
            }
            return sortSizesHelper(a.size_name, b.size_name)
          })
          
          return (
            <>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filterSupplier" className="text-sm" style={{ color: theme.textSecondary }}>Supplier:</Label>
                  <select
                    id="filterSupplier"
                    value={filterSupplier}
                    onChange={(e) => { setFilterSupplier(e.target.value); setCurrentPage(1) }}
                    className="rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                  >
                    <option value="all">Semua Supplier</option>
                    {hasNoSupplier && <option value="null">Stock Awal (Tanpa Supplier)</option>}
                    {uniqueSuppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_code} - {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filterUniform" className="text-sm" style={{ color: theme.textSecondary }}>Seragam:</Label>
                  <select
                    id="filterUniform"
                    value={filterUniform}
                    onChange={(e) => { setFilterUniform(e.target.value); setCurrentPage(1) }}
                    className="rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                  >
                    <option value="all">Semua Seragam</option>
                    {uniqueUniforms.map(u => (
                      <option key={u.uniform_id} value={u.uniform_id}>
                        {u.uniform_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label htmlFor="filterSize" className="text-sm" style={{ color: theme.textSecondary }}>Ukuran:</Label>
                  <select
                    id="filterSize"
                    value={filterSize}
                    onChange={(e) => { setFilterSize(e.target.value); setCurrentPage(1) }}
                    className="rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
                  >
                    <option value="all">Semua Ukuran</option>
                    {uniqueSizes.map(s => (
                      <option key={s.size_id} value={s.size_id}>
                        {s.size_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Table and Pagination */}
              {(() => {
                // Filter history based on selected filters
                const filteredHistory = historyData.filter(row => {
                  // Supplier filter
                  if (filterSupplier !== 'all') {
                    if (filterSupplier === 'null') {
                      if (row.supplier_id !== null && row.supplier !== null) return false
                    } else {
                      if (row.supplier_id !== Number(filterSupplier)) return false
                    }
                  }
                  
                  // Uniform filter
                  if (filterUniform !== 'all' && row.uniform_id !== Number(filterUniform)) {
                    return false
                  }
                  
                  // Size filter
                  if (filterSize !== 'all' && row.size_id !== Number(filterSize)) {
                    return false
                  }
                  
                  return true
                })
                
                // Pagination
                const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedHistory = filteredHistory.slice(startIndex, endIndex)
                
                return filteredHistory.length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.textSecondary }}>
              <div className="text-4xl mb-2">📋</div>
              <p>Belum ada data history</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Waktu</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Seragam</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Ukuran</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Qty</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Tipe</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Supplier</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Notes</th>
                    <th className="py-2 px-3 font-semibold" style={{ color: theme.textSecondary }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((row, idx) => (
                    <tr key={idx} className="border-b" style={{ borderColor: theme.border }}>
                      <td className="py-2 px-3 whitespace-nowrap" style={{ color: theme.textBody }}>
                        {new Date(row.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2 px-3" style={{ color: theme.textBody }}>
                        {row.uniform?.uniform_name || '-'}
                        {row.uniform?.is_universal && (
                          <span className="ml-1 text-xs">🌐</span>
                        )}
                      </td>
                      <td className="py-2 px-3" style={{ color: theme.textBody }}>{row.size?.size_name || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${row.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.qty_delta >= 0 ? '+' : ''}{row.qty_delta}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: theme.subtleBg, color: theme.textBody }}>
                          {row.txn_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {row.supplier ? (
                          <span className="text-xs" style={{ color: theme.textBody }}>{row.supplier.supplier_code} - {row.supplier.supplier_name}</span>
                        ) : (
                          <span className="italic text-xs" style={{ color: theme.textSecondary }}>Stock Awal</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs" style={{ color: theme.textSecondary }}>
                        <div>{row.notes || '-'}</div>
                        {row.buyer_name && (
                          <div className="font-semibold text-blue-600 flex items-center gap-1 mt-0.5" title={`Terjual ke ${row.buyer_name}`}>
                            <span>🛒</span>
                            <span>Terjual ke: {row.buyer_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {row.txn_type === 'init' && (
                          <button
                            onClick={() => {
                              setAdjustModal({
                                open: true,
                                txn_id: row.txn_id,
                                uniform_name: row.uniform?.uniform_name || '-',
                                size_name: row.size?.size_name || '-',
                                supplier_name: row.supplier ? `${row.supplier.supplier_code} - ${row.supplier.supplier_name}` : 'Tanpa Supplier',
                                current_qty: row.qty_delta,
                                notes: row.notes || ''
                              })
                              setAdjustNewQty(String(row.qty_delta))
                              setAdjustError('')
                            }}
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ background: theme.yellowBg, color: theme.yellowText, border: `1px solid ${theme.border}` }}
                          >
                            ✏️ Edit Qty
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm" style={{ color: theme.textSecondary }}>
                    Halaman {currentPage} dari {totalPages}
                    <span className="mx-2">•</span>
                    Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} dari {filteredHistory.length} transaksi
                    {(filterSupplier !== 'all' || filterUniform !== 'all' || filterSize !== 'all') && (
                      <>
                        <span className="mx-2">•</span>
                        Total: {historyData.length} transaksi
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
              
              {totalPages <= 1 && (
                <div className="mt-4 text-sm" style={{ color: theme.textSecondary }}>
                  {(filterSupplier !== 'all' || filterUniform !== 'all' || filterSize !== 'all') ? (
                    <>
                      Menampilkan: <span className="font-semibold">{filteredHistory.length} transaksi</span>
                      <span className="mx-2">•</span>
                      Dari total: <span className="font-semibold">{historyData.length} transaksi</span>
                    </>
                  ) : (
                    <>Total: <span className="font-semibold">{historyData.length} transaksi</span></>
                  )}
                </div>
              )}
            </div>
          )
        })()}
            </>
          )
        })()}
      </Card>

      {/* List of Items */}
      <Card className="p-4" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textBody }}>
        <h2 className="font-semibold mb-4" style={{ color: theme.textPrimary }}>Daftar Item Stock Awal (Pending Input)</h2>
        
        {initialStockItems.length === 0 ? (
          <div className="text-center py-12" style={{ color: theme.textSecondary }}>
            <div className="text-4xl mb-2">📦</div>
            <p>Belum ada item pending. Klik "+ Input Stock Awal" untuk menambah.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ background: theme.subtleBg, borderColor: theme.border }}>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Unit</th>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Seragam</th>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Ukuran</th>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Supplier</th>
                    <th className="py-3 px-3 font-semibold text-right" style={{ color: theme.textSecondary }}>Qty</th>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Keterangan</th>
                    <th className="py-3 px-3 font-semibold" style={{ color: theme.textSecondary }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {initialStockItems.map((item, idx) => (
                    <tr key={idx} className="border-b" style={{ borderColor: theme.border }}>
                      <td className="py-3 px-3" style={{ color: theme.textBody }}>{item.unit_name}</td>
                      <td className="py-3 px-3" style={{ color: theme.textBody }}>{item.uniform_name}</td>
                      <td className="py-3 px-3" style={{ color: theme.textBody }}>{item.size_name}</td>
                      <td className="py-3 px-3">
                        {item.supplier_name || <span className="italic" style={{ color: theme.textSecondary }}>Tanpa Supplier</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium" style={{ color: theme.textBody }}>{item.qty}</td>
                      <td className="py-3 px-3" style={{ color: theme.textSecondary }}>{item.notes || '-'}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {initialStockItems.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3" style={{ background: theme.cardBg, borderColor: theme.border, color: theme.textBody }}>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Unit:</span> {item.unit_name}</div>
                    <div><span className="font-medium">Seragam:</span> {item.uniform_name}</div>
                    <div><span className="font-medium">Ukuran:</span> {item.size_name}</div>
                    <div>
                      <span className="font-medium">Supplier:</span>{' '}
                      {item.supplier_name || <span className="italic" style={{ color: theme.textSecondary }}>Tanpa Supplier</span>}
                    </div>
                    <div><span className="font-medium">Qty:</span> {item.qty}</div>
                    <div><span className="font-medium">Keterangan:</span> {item.notes || '-'}</div>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="mt-3 text-red-600 hover:text-red-800 text-sm w-full text-center py-2 border border-red-300 rounded"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={submitInitialStock} className="bg-green-600 hover:bg-green-700">
                ✅ Submit Semua ({initialStockItems.length} item)
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
          {/* Success Message */}
          {itemAddedSuccess && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="font-medium">Item berhasil ditambahkan!</span>
            </div>
          )}
          
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

      {/* Export Report Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="📥 Export Laporan Stok Seragam"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Pilih tahun ajaran untuk menghasilkan laporan komprehensif yang mencakup: Stock Awal, Realisasi Pembelian (per PO), Hasil Penjualan, dan Stock Akhir.
          </p>

          <div>
            <Label>Tahun Ajaran *</Label>
            <select
              className="w-full border rounded px-3 py-2 mt-1"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {exportYears.map(y => (
                <option key={y.year_id} value={y.year_id}>
                  {y.year_name} ({new Date(y.start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(y.end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>

          {exportYears.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded text-sm">
              ⚠️ Tidak ada tahun ajaran dengan tanggal mulai dan berakhir. Silakan atur di menu <strong>Data → Tahun</strong>.
            </div>
          )}

          {selectedYearId && (() => {
            const y = exportYears.find(yr => yr.year_id === Number(selectedYearId))
            if (!y) return null
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
                <strong>Periode:</strong> {new Date(y.start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(y.end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )
          })()}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => setShowExportModal(false)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
              disabled={exporting}
            >
              Batal
            </Button>
            <Button
              onClick={handleExportToExcel}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-semibold"
              disabled={!selectedYearId || exporting}
            >
              {exporting ? '⏳ Mengekspor...' : '📥 Export Laporan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Notification */}
      <NotificationModal
        isOpen={exportNotification.isOpen}
        onClose={() => setExportNotification(prev => ({ ...prev, isOpen: false }))}
        title={exportNotification.title}
        message={exportNotification.message}
        type={exportNotification.type}
      />

      {/* Adjust Init Stock Modal */}
      <Modal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal(prev => ({ ...prev, open: false }))}
        title="✏️ Sesuaikan Stok Awal"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: theme.subtleBg, border: `1px solid ${theme.border}` }}>
            <div style={{ color: theme.textSecondary }}>Seragam: <span className="font-medium" style={{ color: theme.textBody }}>{adjustModal.uniform_name}</span></div>
            <div style={{ color: theme.textSecondary }}>Ukuran: <span className="font-medium" style={{ color: theme.textBody }}>{adjustModal.size_name}</span></div>
            <div style={{ color: theme.textSecondary }}>Supplier: <span className="font-medium" style={{ color: theme.textBody }}>{adjustModal.supplier_name}</span></div>
            <div style={{ color: theme.textSecondary }}>Qty saat ini: <span className="font-bold text-blue-600">{adjustModal.current_qty}</span></div>
          </div>

          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: theme.yellowBg, color: theme.yellowText, border: `1px solid ${theme.border}` }}>
            ⚠️ Fitur ini hanya untuk penyesuaian data selama masa trial. Riwayat transaksi akan langsung diperbarui.
          </div>

          <div>
            <Label style={{ color: theme.textSecondary }}>Qty Baru *</Label>
            <input
              type="number"
              min="0"
              value={adjustNewQty}
              onChange={e => setAdjustNewQty(e.target.value)}
              className="w-full rounded px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ border: `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textBody }}
              placeholder="Masukkan jumlah baru"
            />
          </div>

          {adjustError && (
            <div className="text-sm px-3 py-2 rounded" style={{ background: theme.redBg, color: theme.redText, border: `1px solid ${theme.border}` }}>
              {adjustError}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: theme.border }}>
            <Button
              onClick={() => setAdjustModal(prev => ({ ...prev, open: false }))}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
              disabled={adjustSaving}
            >
              Batal
            </Button>
            <Button
              onClick={saveAdjustInit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold"
              disabled={adjustSaving || adjustNewQty === ''}
            >
              {adjustSaving ? '⏳ Menyimpan...' : '✓ Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
