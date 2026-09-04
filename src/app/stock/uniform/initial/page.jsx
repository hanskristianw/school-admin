"use client"

import React, { Fragment, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import NotificationModal from '@/components/ui/notification-modal'
import ExcelJS from 'exceljs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBoxes,
  faTshirt,
  faPlus,
  faRotateRight,
  faSearch,
  faFileExcel,
  faShieldAlt,
  faFilter,
  faChevronDown,
  faChevronUp,
  faTrash,
  faPen,
  faCheck,
  faTimes,
  faSpinner,
  faHistory,
  faLayerGroup,
  faCalendarAlt,
  faBuilding,
  faExclamationTriangle,
  faShoppingCart,
  faArrowRight,
  faTable,
  faListUl,
  faTag
} from '@fortawesome/free-solid-svg-icons'

export default function InitialStockPage() {
  const router = useRouter()
  const { theme, isDark } = useTheme()

  // UI Theme Tokens matching /data/pyp
  const pageBg = theme?.pageBg || (isDark ? '#09090B' : '#FBFBFA')
  const cardBg = theme?.cardBg || (isDark ? '#18181B' : '#FFFFFF')
  const borderColor = theme?.border || (isDark ? '#27272A' : '#EAEAEA')
  const textPrimary = theme?.textPrimary || (isDark ? '#F4F4F5' : '#111111')
  const textSecondary = theme?.textSecondary || (isDark ? '#A1A1AA' : '#787774')
  const inputBg = theme?.inputBg || (isDark ? '#18181B' : '#FFFFFF')

  // Tabs state ('summary' | 'history')
  const [activeTab, setActiveTab] = useState('summary')

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
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
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
      let allRows = []
      let page = 0
      const pageSize = 1000

      while (true) {
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
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        page++
      }

      // Aggregate qty by uniform_id + size_id + supplier_id
      const aggregated = []
      const map = new Map()

      allRows.forEach(row => {
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
      setSummaryData(aggregated.filter(item => item.total_qty !== 0))
    } catch (e) {
      console.error('Error loading summary:', e)
    } finally {
      setLoadingSummary(false)
    }
  }

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      let allTxns = []
      let page = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
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
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        if (!data || data.length === 0) break
        allTxns = allTxns.concat(data)
        if (data.length < pageSize) break
        page++
      }

      const txns = allTxns

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
    setExportStartDate('')
    setExportEndDate('')
    setShowExportModal(true)
  }

  const handleExportYearSelect = (yearId) => {
    setSelectedYearId(yearId)
    const y = exportYears.find(yr => yr.year_id === Number(yearId))
    if (y) {
      // 2026/2027 uniform procurement cycle started in March 2026 (PO 11 & PPDB sales)
      if (y.year_name.includes('2026') || y.year_name.includes('26/27')) {
        setExportStartDate('2026-03-01')
      } else {
        setExportStartDate(y.start_date || '')
      }
      setExportEndDate(y.end_date || '')
    } else {
      setExportStartDate('')
      setExportEndDate('')
    }
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
      const start_date = exportStartDate || selectedYear.start_date
      const end_date = exportEndDate || selectedYear.end_date
      const year_name = selectedYear.year_name

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

      // 4. Fetch ALL stock transactions (for stock awal, stock akhir & HPP calculation)
      let allStockTxns = []
      let stPage = 0
      const stPageSize = 1000
      while (true) {
        const { data: stChunk, error: stErr } = await supabase
          .from('uniform_stock_txn')
          .select('uniform_id, size_id, supplier_id, qty_delta, txn_type, created_at')
          .range(stPage * stPageSize, (stPage + 1) * stPageSize - 1)

        if (stErr) throw stErr
        if (!stChunk || stChunk.length === 0) break
        allStockTxns = allStockTxns.concat(stChunk)
        if (stChunk.length < stPageSize) break
        stPage++
      }

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
            const purchase = purchases.find(p => p.purchase_id === receipt?.purchase_id)
            return {
              ...ri,
              purchase_id: receipt?.purchase_id,
              supplier_id: purchase?.supplier_id,
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

      const isFirstCycle = start_date <= '2026-07-01'

      const reportRows = uniformList.map(uniform => {
        const uId = uniform.uniform_id
        const variants = (allVariants || []).filter(v => v.uniform_id === uId)

        // -- STOCK AWAL --
        // For the baseline 2026/2027 cycle, Stock Awal is baseline initial stock (txn_type === 'init').
        // For future periods, it represents cumulative stock balance before start_date.
        const stockAwalTxns = (allStockTxns || []).filter(t => 
          t.uniform_id === uId && (
            isFirstCycle
              ? t.txn_type === 'init'
              : (t.txn_type === 'init' || (t.created_at && t.created_at < start_date + 'T00:00:00'))
          )
        )
        const rawStockAwalBySupplier = {}
        supplierList.forEach(s => {
          const qty = stockAwalTxns
            .filter(t => t.supplier_id === s.supplier_id)
            .reduce((sum, t) => sum + t.qty_delta, 0)
          rawStockAwalBySupplier[s.supplier_id] = Math.max(0, qty)
        })
        const rawStockAwalInv = Math.max(0, stockAwalTxns
          .filter(t => !t.supplier_id || !supplierList.some(s => s.supplier_id === t.supplier_id))
          .reduce((sum, t) => sum + t.qty_delta, 0))

        const totalStockAwal = rawStockAwalInv + Object.values(rawStockAwalBySupplier).reduce((a, b) => a + b, 0)

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
        const totalPurchaseQty = Object.values(purchaseByPo).reduce((sum, item) => sum + (item?.qty || 0), 0)
        const totalPurchaseCost = Object.values(purchaseByPo).reduce((sum, item) => sum + (item?.cost || 0), 0)
        const avgPurchasePrice = totalPurchaseQty > 0 ? Math.round(totalPurchaseCost / totalPurchaseQty) : 0

        // -- HASIL PENJUALAN --
        const salesForUniform = saleItems.filter(si => si.uniform_id === uId)
        const totalSoldQty = salesForUniform.reduce((sum, si) => sum + si.qty, 0)
        const totalSaleRevenue = salesForUniform.reduce((sum, si) => sum + Number(si.subtotal || 0), 0)
        const avgSellPrice = totalSoldQty > 0 ? Math.round(totalSaleRevenue / totalSoldQty) : (variants.length > 0 ? Number(variants[0]?.price || 0) : 0)
        const totalSaleCost = salesForUniform.reduce((sum, si) => sum + (si.qty * Number(si.unit_hpp || weightedAvgHpp || 0)), 0)
        const profit = totalSaleRevenue - totalSaleCost

        // -- STOCK AKHIR = Sum of transactions created UP TO end_date --
        const stockAkhirTxns = (allStockTxns || []).filter(t => 
          t.uniform_id === uId && (
            !t.created_at || t.created_at <= end_date + 'T23:59:59'
          )
        )
        const rawStockAkhirBySupplier = {}
        supplierList.forEach(s => {
          const qty = stockAkhirTxns
            .filter(t => t.supplier_id === s.supplier_id)
            .reduce((sum, t) => sum + t.qty_delta, 0)
          rawStockAkhirBySupplier[s.supplier_id] = Math.max(0, qty)
        })
        const rawStockAkhirInv = Math.max(0, stockAkhirTxns
          .filter(t => !t.supplier_id || !supplierList.some(s => s.supplier_id === t.supplier_id))
          .reduce((sum, t) => sum + t.qty_delta, 0))

        const totalStockAkhir = rawStockAkhirInv + Object.values(rawStockAkhirBySupplier).reduce((a, b) => a + b, 0)

        return {
          uniform_name: uniform.uniform_name,
          stockAwalInv: rawStockAwalInv,
          stockAwalBySupplier: rawStockAwalBySupplier,
          weightedAvgHpp,
          totalStockAwal,
          purchaseByPo,
          totalPurchaseQty,
          totalPurchaseCost,
          avgPurchasePrice,
          totalSoldQty,
          avgSellPrice,
          totalSaleRevenue,
          profit,
          stockAkhirInv: rawStockAkhirInv,
          stockAkhirBySupplier: rawStockAkhirBySupplier,
          totalStockAkhir
        }
      })

      // ============ GENERATE EXCEL WORKBOOK ============
      const wb = new ExcelJS.Workbook()
      wb.creator = 'School Admin System'
      wb.created = new Date()

      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      }

      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E8D2' } }
      const groupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
      const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }

      // ---- Sheet 1: Comprehensive Report ----
      const ws = wb.addWorksheet('Laporan Stok')

      const supplierCount = supplierList.length
      const poCount = Math.max(poList.length, 1)

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

      for (let i = 1; i <= totalCols; i++) ws.getColumn(i).width = 14
      ws.getColumn(C.jenisSeragam).width = 26
      ws.getColumn(C.akhirJenis).width = 26
      ws.getColumn(C.totalPembelian).width = 22
      ws.getColumn(C.jmlTerjual).width = 22
      ws.getColumn(C.keuntungan).width = 26

      const startFormatted = new Date(start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      const endFormatted = new Date(end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

      const titleRow = ws.addRow([`LAPORAN STOK SERAGAM - ${year_name}`])
      titleRow.getCell(1).font = { bold: true, size: 14 }
      ws.mergeCells(1, 1, 1, totalCols)

      const periodRow = ws.addRow([`Periode: ${startFormatted} - ${endFormatted}`])
      periodRow.getCell(1).font = { italic: true, size: 11 }
      ws.mergeCells(2, 1, 2, totalCols)

      ws.addRow([])

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
        for (let c = g.col + 1; c <= g.end; c++) {
          groupHeaderRow.getCell(c).border = thinBorder
          groupHeaderRow.getCell(c).fill = groupFill
        }
      })

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
          cell.alignment = { vertical: 'middle' }
          if (typeof cell.value === 'number' && [C.nilai, C.hargaBeli, C.totalPembelian, C.hargaJual, C.totalPenjualan, C.keuntungan].includes(colNum)) {
            cell.numFmt = '#,##0'
          }
        }
      })

      // Generate and download
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan_Stok_Seragam_${year_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setShowExportModal(false)
      setExportNotification({ isOpen: true, title: 'Sukses', message: `Laporan stok seragam periode ${year_name} berhasil diekspor.`, type: 'success' })

    } catch (e) {
      console.error('Export error:', e)
      setExportNotification({ isOpen: true, title: 'Error', message: 'Gagal mengekspor laporan: ' + e.message, type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const toggleExpand = (uniformId) => {
    setExpandedUniforms(prev => ({
      ...prev,
      [uniformId]: !prev[uniformId]
    }))
  }

  const openAddModal = () => {
    setFormData({
      unit_id: units.length > 0 ? String(units[0].unit_id) : '',
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
      const userId = parseInt(localStorage.getItem('kr_id'), 10) || null
      
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
      fetchHistory()
      fetchSummary()
      closeModal()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const uniformsFiltered = uniforms.filter(u => u.is_universal || (u.uniform_unit || []).some(uu => String(uu.unit_id) === String(formData.unit_id)))
  const totalItems = initialStockItems.reduce((sum, item) => sum + Number(item.qty), 0)

  // Computed Summary Data
  const { filteredSummaryData, groupedUniforms, totalSummaryStock } = useMemo(() => {
    let filtered = summaryData
    if (summarySupplierFilter !== 'all') {
      if (summarySupplierFilter === 'null') {
        filtered = summaryData.filter(row => !row.supplier)
      } else {
        filtered = summaryData.filter(row => row.supplier?.supplier_id === Number(summarySupplierFilter))
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(row => {
        const uniformName = (row.uniform?.uniform_name || '').toLowerCase()
        const sizeName = (row.size?.size_name || '').toLowerCase()
        const supplierName = (row.supplier?.supplier_name || '').toLowerCase()
        return uniformName.includes(query) || sizeName.includes(query) || supplierName.includes(query)
      })
    }

    // Group by uniform
    const groups = {}
    filtered.forEach(item => {
      const uId = item.uniform?.uniform_id || 0
      if (!groups[uId]) {
        groups[uId] = {
          uniform_id: uId,
          uniform_name: item.uniform?.uniform_name || 'Tanpa Nama',
          is_universal: item.uniform?.is_universal || false,
          total_qty: 0,
          items: []
        }
      }
      groups[uId].total_qty += item.total_qty
      groups[uId].items.push(item)
    })

    const groupList = Object.values(groups).sort((a, b) => a.uniform_name.localeCompare(b.uniform_name))
    const totalStock = filtered.reduce((sum, row) => sum + (row.total_qty || 0), 0)

    return {
      filteredSummaryData: filtered,
      groupedUniforms: groupList,
      totalSummaryStock: totalStock
    }
  }, [summaryData, summarySupplierFilter, searchQuery])

  // Computed History Data
  const { filteredHistory, paginatedHistory, totalPages, uniqueSuppliers, hasNoSupplier, uniqueUniforms, uniqueSizes, historyMetrics } = useMemo(() => {
    const uSuppliers = Array.from(
      new Map(
        historyData
          .filter(row => row.supplier)
          .map(row => [row.supplier.supplier_id, row.supplier])
      ).values()
    ).sort((a, b) => getSupplierLabel(a).localeCompare(getSupplierLabel(b), 'id', { sensitivity: 'base', numeric: true }))
    
    const noSupp = historyData.some(row => !row.supplier)
    
    const uUniforms = Array.from(
      new Map(
        historyData
          .filter(row => row.uniform)
          .map(row => [row.uniform.uniform_id, row.uniform])
      ).values()
    ).sort((a, b) => (a.uniform_name || '').localeCompare(b.uniform_name || '', 'id', { sensitivity: 'base', numeric: true }))
    
    const uSizes = Array.from(
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

    const filtered = historyData.filter(row => {
      if (filterSupplier !== 'all') {
        if (filterSupplier === 'null') {
          if (row.supplier_id !== null && row.supplier !== null) return false
        } else {
          if (row.supplier_id !== Number(filterSupplier)) return false
        }
      }
      if (filterUniform !== 'all' && row.uniform_id !== Number(filterUniform)) return false
      if (filterSize !== 'all' && row.size_id !== Number(filterSize)) return false
      return true
    })

    const pages = Math.ceil(filtered.length / itemsPerPage) || 1
    const startIdx = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage)

    const netQty = filtered.reduce((acc, row) => acc + (row.qty_delta || 0), 0)
    const qtyIn = filtered.reduce((acc, row) => acc + (row.qty_delta > 0 ? row.qty_delta : 0), 0)
    const qtyOut = filtered.reduce((acc, row) => acc + (row.qty_delta < 0 ? Math.abs(row.qty_delta) : 0), 0)

    return {
      filteredHistory: filtered,
      paginatedHistory: paginated,
      totalPages: pages,
      uniqueSuppliers: uSuppliers,
      hasNoSupplier: noSupp,
      uniqueUniforms: uUniforms,
      uniqueSizes: uSizes,
      historyMetrics: { netQty, qtyIn, qtyOut }
    }
  }, [historyData, filterSupplier, filterUniform, filterSize, currentPage, itemsPerPage])

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
            <span className="font-semibold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>[INITIAL STOCK &amp; RECAP]</span>
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
              <FontAwesomeIcon icon={faBoxes} className="text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                Stok Seragam &amp; Saldo Awal
              </h1>
              <p className="text-xs" style={{ color: textSecondary, margin: '2px 0 0 0' }}>
                Pantau ringkasan saldo stok seragam berjalan, input stok awal per unit sekolah, serta audit log mutasi stok.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Audit Shortcut */}
          <button
            onClick={() => router.push('/stock/uniform/audit')}
            className="px-3.5 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-2 hover:brightness-110 active:scale-95"
            style={{
              background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
              borderColor: isDark ? '#6366F1' : '#C7D2FE',
              color: isDark ? '#818CF8' : '#4F46E5'
            }}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="text-xs" />
            <span>Audit &amp; Resolusi</span>
          </button>

          {/* Export Laporan */}
          <button
            onClick={openExportModal}
            className="px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-2 shadow-xs hover:brightness-110 active:scale-95 text-white"
            style={{
              background: '#16A34A',
              border: '1px solid #15803D'
            }}
          >
            <FontAwesomeIcon icon={faFileExcel} />
            <span>Export Laporan</span>
          </button>

          {/* Input Stock Awal Button */}
          <Button
            onClick={openAddModal}
            style={{
              background: textPrimary,
              color: isDark ? '#09090B' : '#FFFFFF',
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Input Stock Awal</span>
          </Button>
        </div>
      </div>

      {/* ── NOTIFICATIONS & ERRORS ─────────────────────────────────────────── */}
      {error && !showModal && (
        <div className="p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 mb-6" style={{ background: '#FDEBEC', borderColor: '#F8C9CC', color: '#9F2F2D' }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="cursor-pointer font-bold">✕</button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 mb-6" style={{ background: '#EDF3EC', borderColor: '#D5E6D3', color: '#346538' }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheck} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* ── PENDING ITEMS TO SUBMIT BANNER (IF ANY) ────────────────────────── */}
      {initialStockItems.length > 0 && (
        <div
          className="p-4 rounded-lg border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            background: isDark ? 'rgba(234, 88, 12, 0.12)' : '#FFF7ED',
            borderColor: isDark ? '#EA580C' : '#FDBA74'
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: isDark ? '#FB923C' : '#EA580C' }}>
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>Ada {initialStockItems.length} item stock awal yang belum di-submit ({totalItems} pcs).</span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: textSecondary }}>
              Periksa daftar item di bagian bawah lalu klik "Submit Semua" untuk mencatatnya secara permanen ke kartu stok.
            </p>
          </div>
          <button
            onClick={submitInitialStock}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-2 text-white shadow-xs"
            style={{
              background: '#16A34A',
              border: '1px solid #15803D',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
            <span>{saving ? 'Menyimpan...' : `Submit Semua (${initialStockItems.length} Item)`}</span>
          </button>
        </div>
      )}

      {/* ── METADATA BENTO SUMMARY CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Jenis Seragam</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: textPrimary }}>{groupedUniforms.length}</span>
            <span className="text-xs font-medium" style={{ color: textSecondary }}>kategori</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Total Kuantitas Fisik</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{totalSummaryStock}</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#93C5FD' : '#0369A1' }}>pcs stok</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Total Varian SKU</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#34D399' : '#059669' }}>{filteredSummaryData.length}</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#6EE7B7' : '#047857' }}>varian aktif</span>
          </div>
        </div>

        <div
          className="p-3.5 rounded-lg border flex flex-col justify-between"
          style={{ background: cardBg, borderColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Total Transaksi Log</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono" style={{ color: isDark ? '#C084FC' : '#7E22CE' }}>{historyData.length}</span>
            <span className="text-xs font-medium" style={{ color: isDark ? '#D8B4FE' : '#6B21A8' }}>mutasi tercatat</span>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL TABS (MATCHING /data/pyp) ────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}`, marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'summary' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'summary' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'summary' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faBoxes} style={{ fontSize: '13px' }} />
          <span>Ringkasan Stok Seragam</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: activeTab === 'summary' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1F2937' : '#F4F4F5'),
              color: textSecondary,
              fontWeight: 700
            }}
          >
            {groupedUniforms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 0',
            fontSize: '14px',
            fontWeight: activeTab === 'history' ? 600 : 400,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'history' ? textPrimary : textSecondary,
            borderBottom: activeTab === 'history' ? `2px solid ${textPrimary}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FontAwesomeIcon icon={faHistory} style={{ fontSize: '13px' }} />
          <span>Riwayat Mutasi &amp; Transaksi</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: activeTab === 'history' ? (isDark ? '#27272A' : '#EAEAEA') : (isDark ? '#1F2937' : '#F4F4F5'),
              color: textSecondary,
              fontWeight: 700
            }}
          >
            {filteredHistory.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: RINGKASAN STOK SERAGAM ──────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Summary Filter Control Bar */}
          <div
            className="p-3.5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center gap-4 flex-wrap flex-1">
              {/* Supplier Filter */}
              <div style={{ minWidth: '220px' }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                  1. Supplier / Vendor
                </label>
                <select
                  value={summarySupplierFilter}
                  onChange={e => setSummarySupplierFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">Semua Supplier &amp; Stok Awal</option>
                  <option value="null">Stok Awal (Tanpa Supplier)</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_code} - {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Query */}
              <div style={{ minWidth: '260px', flex: 1 }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  2. Cari Seragam / Ukuran / Supplier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama seragam, ukuran, atau kode supplier..."
                    className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono rounded border outline-none"
                    style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
                  />
                  <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: textSecondary }} />
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchSummary}
                disabled={loadingSummary}
                style={{
                  background: textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  fontSize: '12px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={loadingSummary ? faSpinner : faRotateRight} className={loadingSummary ? 'animate-spin' : ''} />
                <span>{loadingSummary ? 'Memuat...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* Grouped Uniform Accordion Table */}
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {loadingSummary ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
                <span style={{ fontSize: '13px' }}>Memuat ringkasan stok...</span>
              </div>
            ) : groupedUniforms.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  borderRadius: '6px',
                  background: isDark ? '#151419' : '#FBFBFA',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FontAwesomeIcon icon={faBoxes} style={{ fontSize: '28px', color: textSecondary }} />
                <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                  {searchQuery || summarySupplierFilter !== 'all'
                    ? 'Tidak ada stok seragam yang cocok dengan kriteria filter.'
                    : 'Belum ada data stok seragam di sistem.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      style={{
                        background: isDark ? '#27272A' : '#FBFBFA',
                        borderBottom: `1px solid ${borderColor}`,
                        color: textSecondary
                      }}
                    >
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Nama Seragam &amp; Varian</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Daftar Ukuran</th>
                      <th className="text-center px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Total Stok (Pcs)</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Supplier / Asal</th>
                      <th className="text-right px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: borderColor }}>
                    {groupedUniforms.map((group) => {
                      const isExpanded = expandedUniforms[group.uniform_id]
                      const uniqueSizesInGroup = Array.from(new Set(group.items.map(i => i.size?.size_name).filter(Boolean))).sort(sortSizesHelper)
                      const sizesList = uniqueSizesInGroup.join(', ')
                      const uniqueSuppliersInGroup = Array.from(new Set(group.items.map(i => i.supplier ? (i.supplier.supplier_code ? `${i.supplier.supplier_code} - ${i.supplier.supplier_name}` : i.supplier.supplier_name) : 'Stock Awal').filter(Boolean)))
                      const supplierSummaryText = uniqueSuppliersInGroup.length === 1 ? uniqueSuppliersInGroup[0] : `${uniqueSuppliersInGroup.length} Supplier`

                      return (
                        <Fragment key={`group-${group.uniform_id}`}>
                          {/* Parent Row */}
                          <tr
                            onClick={() => toggleExpand(group.uniform_id)}
                            className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                            style={{
                              background: isExpanded ? (isDark ? '#27272A' : '#F4F4F5') : 'transparent'
                            }}
                          >
                            <td className="px-3.5 py-3 font-semibold" style={{ color: textPrimary }}>
                              <div className="flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={isExpanded ? faChevronUp : faChevronDown}
                                  className="text-[11px] text-neutral-400"
                                />
                                <FontAwesomeIcon icon={faTshirt} style={{ color: isDark ? '#60A5FA' : '#0284C7', fontSize: '12px' }} />
                                <span>{group.uniform_name}</span>
                                {group.is_universal && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                                    style={{
                                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                                      color: isDark ? '#60A5FA' : '#1F6C9F',
                                      border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`
                                    }}
                                  >
                                    Universal
                                  </span>
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold" style={{ background: isDark ? '#1F2937' : '#F3F4F6', color: textSecondary }}>
                                  {group.items.length} varian
                                </span>
                              </div>
                            </td>

                            <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary }}>
                              {sizesList || '—'}
                            </td>

                            <td className="px-3.5 py-3 text-center">
                              <span
                                className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs"
                                style={{
                                  background: group.total_qty < 0
                                    ? (isDark ? '#3A1E1E' : '#FDEBEC')
                                    : (isDark ? '#1E2E1E' : '#EDF3EC'),
                                  color: group.total_qty < 0
                                    ? (isDark ? '#DC8585' : '#9F2F2D')
                                    : (isDark ? '#7BAF7B' : '#346538'),
                                  border: `1px solid ${group.total_qty < 0 ? (isDark ? '#542626' : '#F8C9CC') : (isDark ? '#2B422B' : '#D5E6D3')}`
                                }}
                              >
                                {group.total_qty} pcs
                              </span>
                            </td>

                            <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary }}>
                              {supplierSummaryText}
                            </td>

                            <td className="px-3.5 py-3 text-right">
                              <FontAwesomeIcon
                                icon={isExpanded ? faChevronUp : faChevronDown}
                                className="text-[11px] text-neutral-400"
                              />
                            </td>
                          </tr>

                          {/* Expanded Breakdown Table */}
                          {isExpanded && (
                            <tr key={`child-wrapper-${group.uniform_id}`}>
                              <td colSpan={5} className="p-0">
                                <div
                                  className="p-4 border-t border-b"
                                  style={{
                                    background: isDark ? '#0B0F17' : '#FBFBFA',
                                    borderColor
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: textPrimary }}>
                                      <FontAwesomeIcon icon={faBoxes} style={{ color: isDark ? '#60A5FA' : '#0284C7' }} />
                                      <span>Rincian Varian Ukuran &amp; Supplier — {group.uniform_name}</span>
                                    </div>
                                  </div>

                                  <div className="border rounded overflow-hidden" style={{ borderColor }}>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr style={{ background: isDark ? '#1F2937' : '#F1F5F9', borderBottom: `1px solid ${borderColor}`, color: textSecondary }}>
                                          <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">#</th>
                                          <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Ukuran</th>
                                          <th className="text-center px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Jumlah (Qty)</th>
                                          <th className="text-left px-3 py-2 font-mono uppercase tracking-wider text-[10px] font-bold">Supplier / Asal Mutasi</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y" style={{ divideColor: borderColor, background: cardBg }}>
                                        {group.items.map((item, iIdx) => (
                                          <tr key={`child-row-${group.uniform_id}-${iIdx}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                            <td className="px-3 py-2 font-mono text-[11px]" style={{ color: textSecondary, width: '36px' }}>
                                              {iIdx + 1}
                                            </td>

                                            <td className="px-3 py-2 font-semibold" style={{ color: textPrimary }}>
                                              <span
                                                className="px-2 py-0.5 rounded font-mono text-[11px] font-bold"
                                                style={{
                                                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                                                  color: isDark ? '#60A5FA' : '#1F6C9F',
                                                  border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`
                                                }}
                                              >
                                                {item.size?.size_name || '—'}
                                              </span>
                                            </td>

                                            <td className="px-3 py-2 text-center font-mono font-bold">
                                              {item.total_qty < 0 ? (
                                                <span
                                                  className="px-2 py-0.5 rounded-full font-bold text-[11px]"
                                                  style={{
                                                    background: isDark ? '#3A1E1E' : '#FDEBEC',
                                                    color: isDark ? '#DC8585' : '#9F2F2D',
                                                    border: `1px solid ${isDark ? '#542626' : '#F8C9CC'}`
                                                  }}
                                                >
                                                  ⚠️ {item.total_qty} pcs (Minus)
                                                </span>
                                              ) : (
                                                <span style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                                                  {item.total_qty} pcs
                                                </span>
                                              )}
                                            </td>

                                            <td className="px-3 py-2 font-mono text-[11px]" style={{ color: textSecondary }}>
                                              {item.supplier ? (
                                                <span className="font-semibold" style={{ color: textPrimary }}>
                                                  {item.supplier.supplier_code} - {item.supplier.supplier_name}
                                                </span>
                                              ) : (
                                                <span className="italic" style={{ color: textSecondary }}>Stock Awal (Tanpa Supplier)</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                  {/* Table Footer */}
                  <tfoot>
                    <tr
                      style={{
                        background: isDark ? '#27272A' : '#FBFBFA',
                        borderTop: `2px solid ${borderColor}`,
                        color: textPrimary
                      }}
                    >
                      <td colSpan={2} className="px-3.5 py-3 font-bold font-mono uppercase text-[10px]">
                        TOTAL KESELURUHAN ({groupedUniforms.length} JENIS SERAGAM / {filteredSummaryData.length} VARIAN)
                      </td>
                      <td className="px-3.5 py-3 text-center font-bold font-mono text-xs" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                        {totalSummaryStock} pcs
                      </td>
                      <td colSpan={2} className="px-3.5 py-3 text-right font-mono text-[11px]" style={{ color: textSecondary }}>
                        Saldo Realtime
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: RIWAYAT MUTASI & TRANSAKSI ──────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History Filter Control Bar */}
          <div
            className="p-3.5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ background: cardBg, borderColor, borderRadius: '8px' }}
          >
            <div className="flex items-center gap-4 flex-wrap flex-1">
              {/* Supplier Filter */}
              <div style={{ minWidth: '180px', flex: 1 }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  1. Supplier
                </label>
                <select
                  value={filterSupplier}
                  onChange={e => { setFilterSupplier(e.target.value); setCurrentPage(1) }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
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

              {/* Uniform Filter */}
              <div style={{ minWidth: '180px', flex: 1 }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  2. Seragam
                </label>
                <select
                  value={filterUniform}
                  onChange={e => { setFilterUniform(e.target.value); setCurrentPage(1) }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
                >
                  <option value="all">Semua Seragam</option>
                  {uniqueUniforms.map(u => (
                    <option key={u.uniform_id} value={u.uniform_id}>
                      {u.uniform_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Filter */}
              <div style={{ minWidth: '140px' }}>
                <label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>
                  3. Ukuran
                </label>
                <select
                  value={filterSize}
                  onChange={e => { setFilterSize(e.target.value); setCurrentPage(1) }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none cursor-pointer"
                  style={{ background: inputBg, borderColor, color: textPrimary, borderRadius: '4px' }}
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

            {/* Refresh Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchHistory}
                disabled={loadingHistory}
                style={{
                  background: textPrimary,
                  color: isDark ? '#09090B' : '#FFFFFF',
                  fontSize: '12px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FontAwesomeIcon icon={loadingHistory ? faSpinner : faRotateRight} className={loadingHistory ? 'animate-spin' : ''} />
                <span>{loadingHistory ? 'Memuat...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* History Metrics Mini Bar */}
          <div className="flex items-center gap-4 text-xs font-mono p-3 rounded-lg border flex-wrap" style={{ background: cardBg, borderColor }}>
            <span style={{ color: textSecondary }}>Metrik Filter:</span>
            <span className="font-bold" style={{ color: textPrimary }}>Total Transaksi: {filteredHistory.length}</span>
            <span style={{ color: borderColor }}>|</span>
            <span className="font-bold text-green-600 dark:text-green-400">Total Masuk (+): +{historyMetrics.qtyIn}</span>
            <span style={{ color: borderColor }}>|</span>
            <span className="font-bold text-red-600 dark:text-red-400">Total Keluar (-): -{historyMetrics.qtyOut}</span>
            <span style={{ color: borderColor }}>|</span>
            <span className="font-bold" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>Net Saldo: {historyMetrics.netQty > 0 ? `+${historyMetrics.netQty}` : historyMetrics.netQty}</span>
          </div>

          {/* History Table */}
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {loadingHistory ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
                <span style={{ fontSize: '13px' }}>Memuat riwayat transaksi...</span>
              </div>
            ) : paginatedHistory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  borderRadius: '6px',
                  background: isDark ? '#151419' : '#FBFBFA',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FontAwesomeIcon icon={faHistory} style={{ fontSize: '28px', color: textSecondary }} />
                <p style={{ fontSize: '13px', color: textSecondary, margin: 0 }}>
                  Belum ada data history transaksi sesuai filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      style={{
                        background: isDark ? '#27272A' : '#FBFBFA',
                        borderBottom: `1px solid ${borderColor}`,
                        color: textSecondary
                      }}
                    >
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Waktu Transaksi</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Seragam</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Ukuran</th>
                      <th className="text-center px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Qty (Mutasi)</th>
                      <th className="text-center px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Tipe Mutasi</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Supplier / Asal</th>
                      <th className="text-left px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Catatan / Pembeli</th>
                      <th className="text-right px-3.5 py-3 font-mono uppercase tracking-wider text-[10px] font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: borderColor }}>
                    {paginatedHistory.map((row) => (
                      <tr key={row.txn_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary, whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="px-3.5 py-3 font-semibold" style={{ color: textPrimary }}>
                          <div className="flex items-center gap-1.5">
                            <span>{row.uniform?.uniform_name || '—'}</span>
                            {row.uniform?.is_universal && (
                              <span
                                className="text-[9px] px-1 py-0.2 rounded font-mono font-bold"
                                style={{
                                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                                  color: isDark ? '#60A5FA' : '#1F6C9F',
                                  border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`
                                }}
                              >
                                Universal
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3.5 py-3">
                          <span
                            className="px-2 py-0.5 rounded font-mono text-[11px] font-bold"
                            style={{
                              background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#E1F3FE',
                              color: isDark ? '#60A5FA' : '#1F6C9F',
                              border: `1px solid ${isDark ? '#2563EB' : '#BAE6FD'}`
                            }}
                          >
                            {row.size?.size_name || '—'}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center font-mono font-bold text-xs">
                          <span className={row.qty_delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {row.qty_delta >= 0 ? `+${row.qty_delta}` : row.qty_delta}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold"
                            style={{
                              background: isDark ? '#1F2937' : '#F3F4F6',
                              color: textPrimary,
                              border: `1px solid ${borderColor}`
                            }}
                          >
                            {row.txn_type}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 font-mono text-[11px]" style={{ color: textSecondary }}>
                          {row.supplier ? (
                            <span>{row.supplier.supplier_code} - {row.supplier.supplier_name}</span>
                          ) : (
                            <span className="italic">Stock Awal</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-xs" style={{ color: textSecondary }}>
                          <div>{row.notes || '—'}</div>
                          {row.buyer_name && (
                            <div className="font-semibold flex items-center gap-1 mt-0.5" style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>
                              <FontAwesomeIcon icon={faShoppingCart} className="text-[10px]" />
                              <span>Terjual ke: {row.buyer_name}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-right">
                          {row.txn_type === 'init' && (
                            <button
                              onClick={() => {
                                setAdjustModal({
                                  open: true,
                                  txn_id: row.txn_id,
                                  uniform_name: row.uniform?.uniform_name || '-',
                                  size_name: row.size?.size_name || '-',
                                  supplier_name: row.supplier ? (row.supplier.supplier_code ? `${row.supplier.supplier_code} - ${row.supplier.supplier_name}` : row.supplier.supplier_name) : 'Tanpa Supplier (Stock Awal)',
                                  current_qty: row.qty_delta,
                                  notes: row.notes || ''
                                })
                                setAdjustNewQty(String(row.qty_delta))
                                setAdjustError('')
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                              style={{
                                background: isDark ? '#2A2618' : '#FBF3DB',
                                border: `1px solid ${isDark ? '#3D361F' : '#F2E3B6'}`,
                                color: isDark ? '#C4A24A' : '#956400'
                              }}
                            >
                              <FontAwesomeIcon icon={faPen} style={{ fontSize: '10px' }} />
                              <span>Koreksi</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                className="p-3 border-t flex items-center justify-between gap-3 flex-wrap"
                style={{ borderColor, background: cardBg }}
              >
                <span className="text-xs font-mono" style={{ color: textSecondary }}>
                  Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredHistory.length} total transaksi)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-xs font-mono rounded border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: inputBg, borderColor, color: textPrimary }}
                  >
                    Sebelumnya
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1
                    if (totalPages > 5) {
                      if (currentPage > 3) {
                        pageNum = currentPage - 2 + i
                        if (pageNum > totalPages) pageNum = totalPages - 4 + i
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className="px-2.5 py-1 text-xs font-mono rounded border cursor-pointer font-bold"
                        style={{
                          background: currentPage === pageNum ? textPrimary : inputBg,
                          borderColor,
                          color: currentPage === pageNum ? (isDark ? '#09090B' : '#FFFFFF') : textSecondary
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 text-xs font-mono rounded border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: inputBg, borderColor, color: textPrimary }}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL INPUT STOCK AWAL ─────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="➕ Tambah Stock Awal Seragam"
        size="md"
      >
        <div className="space-y-4 text-xs font-sans">
          {itemAddedSuccess && (
            <div className="p-3 rounded border flex items-center gap-2" style={{ background: '#EDF3EC', borderColor: '#D5E6D3', color: '#346538' }}>
              <FontAwesomeIcon icon={faCheck} />
              <span className="font-semibold">Item berhasil ditambahkan ke daftar pending!</span>
            </div>
          )}

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>1. Unit Sekolah *</Label>
            <select
              className="w-full px-2.5 py-2 text-xs font-mono rounded border outline-none cursor-pointer"
              style={{ background: inputBg, borderColor, color: textPrimary }}
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
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>2. Jenis Seragam *</Label>
            <select
              className="w-full px-2.5 py-2 text-xs font-mono rounded border outline-none cursor-pointer"
              style={{ background: inputBg, borderColor, color: textPrimary }}
              value={formData.uniform_id}
              onChange={e => setFormData(prev => ({ ...prev, uniform_id: e.target.value }))}
              disabled={!formData.unit_id}
            >
              <option value="">-- Pilih Seragam --</option>
              {uniformsFiltered.map(u => (
                <option key={u.uniform_id} value={u.uniform_id}>
                  {u.uniform_name}{u.is_universal ? ' (Universal)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>3. Ukuran *</Label>
            <select
              className="w-full px-2.5 py-2 text-xs font-mono rounded border outline-none cursor-pointer"
              style={{ background: inputBg, borderColor, color: textPrimary }}
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
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>4. Supplier / Vendor (Opsional)</Label>
            <select
              className="w-full px-2.5 py-2 text-xs font-mono rounded border outline-none cursor-pointer"
              style={{ background: inputBg, borderColor, color: textPrimary }}
              value={formData.supplier_id}
              onChange={e => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
            >
              <option value="">Tanpa Supplier (Stock Awal / Stok Lama)</option>
              {suppliers.map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
              ))}
            </select>
            <p className="text-[10px] mt-1 italic" style={{ color: textSecondary }}>
              Kosongkan jika seragam merupakan stok awal lama sebelum integrasi sistem supplier.
            </p>
          </div>

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>5. Kuantitas (Jumlah Fisik) *</Label>
            <Input
              type="number"
              min="1"
              value={formData.qty}
              onChange={e => setFormData(prev => ({ ...prev, qty: e.target.value }))}
              className="mt-1 font-mono font-bold text-xs"
              placeholder="0"
              style={{ background: inputBg, borderColor, color: textPrimary }}
            />
          </div>

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>6. Catatan Tambahan</Label>
            <Input
              placeholder="Contoh: Stok opname per 1 Juli"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 text-xs"
              style={{ background: inputBg, borderColor, color: textPrimary }}
            />
          </div>

          {error && (
            <div className="p-3 rounded border text-xs flex items-center gap-2" style={{ background: '#FDEBEC', borderColor: '#F8C9CC', color: '#9F2F2D' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor }}>
            <Button
              onClick={closeModal}
              style={{
                background: isDark ? '#27272A' : '#F3F4F6',
                color: textPrimary,
                fontSize: '12px',
                flex: 1,
                border: `1px solid ${borderColor}`
              }}
            >
              Tutup
            </Button>
            <Button
              onClick={addToList}
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                flex: 1
              }}
            >
              ✓ Tambahkan ke Daftar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL EXPORT LAPORAN STOK ──────────────────────────────────────── */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="📥 Export Laporan Stok Seragam"
        size="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <p style={{ color: textSecondary }}>
            Pilih tahun ajaran untuk menghasilkan laporan komprehensif Excel yang mencakup: Stock Awal, Realisasi Pembelian (per PO), Hasil Penjualan, dan Stock Akhir.
          </p>

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>Tahun Ajaran *</Label>
            <select
              className="w-full px-2.5 py-2 text-xs font-mono rounded border outline-none cursor-pointer font-bold"
              style={{ background: inputBg, borderColor, color: textPrimary }}
              value={selectedYearId}
              onChange={(e) => handleExportYearSelect(e.target.value)}
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {exportYears.map(y => (
                <option key={y.year_id} value={y.year_id}>
                  {y.year_name} ({new Date(y.start_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(y.end_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                </option>
              ))}
            </select>
          </div>

          {selectedYearId && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>Dari Tanggal</Label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                    style={{ background: inputBg, borderColor, color: textPrimary }}
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>Sampai Tanggal</Label>
                  <input
                    type="date"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border outline-none font-medium"
                    style={{ background: inputBg, borderColor, color: textPrimary }}
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="p-3 rounded border text-xs leading-relaxed"
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                  borderColor: isDark ? '#1D4ED8' : '#BFDBFE',
                  color: isDark ? '#93C5FD' : '#1E40AF'
                }}
              >
                <div className="font-semibold mb-1 flex items-center gap-1.5 text-[11px]">
                  <span>💡 Informasi Periode Laporan</span>
                </div>
                <p className="text-[11px] leading-normal opacity-90">
                  Untuk tahun 2026/2027, periode default dimulai <strong>01 Maret 2026</strong> agar seluruh siklus pengadaan (PO 11 dst.) serta penjualan awal tahun terhitung lengkap dan stok tidak menjadi minus.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor }}>
            <Button
              onClick={() => setShowExportModal(false)}
              disabled={exporting}
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
              onClick={handleExportToExcel}
              disabled={!selectedYearId || exporting}
              className="flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#16A34A',
                border: '1px solid #15803D'
              }}
            >
              {exporting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faFileExcel} />}
              <span>{exporting ? 'Mengekspor...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL KOREKSI / ADJUST INIT STOCK ──────────────────────────────── */}
      <Modal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal(prev => ({ ...prev, open: false }))}
        title="✏️ Sesuaikan Stok Awal"
        size="sm"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="rounded p-3 text-xs space-y-1.5 border" style={{ background: isDark ? '#1F2937' : '#F8FAFC', borderColor }}>
            <div style={{ color: textSecondary }}>Seragam: <strong style={{ color: textPrimary }}>{adjustModal.uniform_name}</strong></div>
            <div style={{ color: textSecondary }}>Ukuran: <strong style={{ color: textPrimary }}>{adjustModal.size_name}</strong></div>
            <div style={{ color: textSecondary }}>Supplier: <strong style={{ color: textPrimary }}>{adjustModal.supplier_name}</strong></div>
            <div style={{ color: textSecondary }}>Qty saat ini: <strong style={{ color: isDark ? '#60A5FA' : '#0284C7' }}>{adjustModal.current_qty} pcs</strong></div>
          </div>

          <div
            className="p-3 rounded border text-xs"
            style={{
              background: isDark ? '#2A2618' : '#FBF3DB',
              borderColor: isDark ? '#3D361F' : '#F2E3B6',
              color: isDark ? '#C4A24A' : '#956400'
            }}
          >
            ⚠️ Koreksi stok awal akan langsung memperbarui mutasi stok transaksi awal secara permanen.
          </div>

          <div>
            <Label className="text-[10px] font-mono uppercase block mb-1 font-bold" style={{ color: textSecondary }}>Kuantitas Baru (Qty) *</Label>
            <input
              type="number"
              min="0"
              value={adjustNewQty}
              onChange={e => setAdjustNewQty(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded border outline-none"
              style={{ background: inputBg, borderColor, color: textPrimary }}
              placeholder="Masukkan jumlah baru"
            />
          </div>

          {adjustError && (
            <div className="p-3 rounded border text-xs flex items-center gap-2" style={{ background: '#FDEBEC', borderColor: '#F8C9CC', color: '#9F2F2D' }}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>{adjustError}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor }}>
            <Button
              onClick={() => setAdjustModal(prev => ({ ...prev, open: false }))}
              disabled={adjustSaving}
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
            <Button
              onClick={saveAdjustInit}
              disabled={adjustSaving || adjustNewQty === ''}
              style={{
                background: textPrimary,
                color: isDark ? '#09090B' : '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                flex: 1
              }}
            >
              {adjustSaving ? 'Menyimpan...' : '✓ Simpan Perubahan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── NOTIFICATION TOAST MODAL ───────────────────────────────────────── */}
      <NotificationModal
        isOpen={exportNotification.isOpen}
        onClose={() => setExportNotification(prev => ({ ...prev, isOpen: false }))}
        title={exportNotification.title}
        message={exportNotification.message}
        type={exportNotification.type}
      />
    </div>
  )
}
