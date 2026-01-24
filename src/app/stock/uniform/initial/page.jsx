"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'

export default function InitialStockPage() {
  const [units, setUnits] = useState([])
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [initialStockItems, setInitialStockItems] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [filterSupplier, setFilterSupplier] = useState('all')
  const [showHistory, setShowHistory] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [itemAddedSuccess, setItemAddedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Summary states
  const [viewMode, setViewMode] = useState('pie')
  const [summaryData, setSummaryData] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [summarySupplierFilter, setSummarySupplierFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  
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
      const { data, error } = await supabase
        .from('uniform_stock_txn')
        .select(`
          txn_id,
          txn_type,
          qty_delta,
          notes,
          created_at,
          uniform:uniform_id(uniform_id, uniform_name, is_universal),
          size:size_id(size_id, size_name),
          supplier:supplier_id(supplier_id, supplier_name, supplier_code)
        `)
        .order('created_at', { ascending: false })
        // Show all transaction types for complete history

      if (error) throw error
      setHistoryData(data || [])
    } catch (e) {
      console.error('Error loading history:', e)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleExportToExcel = () => {
    if (summaryData.length === 0) {
      alert('Tidak ada data stock untuk di-export')
      return
    }

    try {
      const wb = XLSX.utils.book_new()

      // Group data by supplier
      const dataBySupplier = new Map()
      
      // Add "Tanpa Supplier" group
      dataBySupplier.set('Tanpa Supplier', [])
      
      // Group by supplier
      summaryData.forEach(item => {
        if (item.total_qty <= 0) return // Skip zero stock
        
        const supplierKey = item.supplier 
          ? `${item.supplier.supplier_code} - ${item.supplier.supplier_name}`
          : 'Tanpa Supplier'
        
        if (!dataBySupplier.has(supplierKey)) {
          dataBySupplier.set(supplierKey, [])
        }
        
        dataBySupplier.get(supplierKey).push({
          'Seragam': item.uniform.uniform_name,
          'Ukuran': item.size.size_name,
          'Jumlah': item.total_qty,
          'Universal': item.uniform.is_universal ? 'Ya' : 'Tidak'
        })
      })

      // Create sheet for each supplier
      let sheetIndex = 0
      dataBySupplier.forEach((items, supplierName) => {
        if (items.length === 0) return // Skip empty suppliers

        // Sort by uniform name, then size
        items.sort((a, b) => {
          const uniformCompare = a.Seragam.localeCompare(b.Seragam)
          if (uniformCompare !== 0) return uniformCompare
          return a.Ukuran.localeCompare(b.Ukuran)
        })

        // Add summary at the top
        const totalItems = items.reduce((sum, item) => sum + item.Jumlah, 0)
        const sheetData = [
          [supplierName],
          ['Total Stock: ' + totalItems + ' pcs'],
          ['Tanggal: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
          [''],
          // Headers will be added by json_to_sheet
        ]

        const ws = XLSX.utils.aoa_to_sheet(sheetData)
        XLSX.utils.sheet_add_json(ws, items, { origin: 'A5' })

        // Set column widths
        ws['!cols'] = [
          { wch: 30 }, // Seragam
          { wch: 12 }, // Ukuran
          { wch: 10 }, // Jumlah
          { wch: 10 }  // Universal
        ]

        // Sanitize sheet name (max 31 chars, no special chars)
        let sheetName = supplierName
          .replace(/[\\/*\[\]:?]/g, '')
          .substring(0, 31)
        
        // Ensure unique sheet name
        if (sheetIndex > 0 && sheetName.length > 28) {
          sheetName = sheetName.substring(0, 28) + '_' + sheetIndex
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        sheetIndex++
      })

      // Generate filename
      const filename = `Stock_Seragam_${new Date().toISOString().slice(0, 10)}.xlsx`

      // Export
      XLSX.writeFile(wb, filename)
    } catch (e) {
      console.error('Error exporting to Excel:', e)
      alert('Gagal export ke Excel: ' + e.message)
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
        txn_type: 'init',
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
      fetchHistory() // Refresh history data
      fetchSummary() // Refresh summary data
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
          <h1 className="text-xl md:text-2xl font-semibold">Stok Seragam</h1>
          <p className="text-sm text-gray-600 mt-1">Pantau dan kelola stok seragam</p>
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
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold">📊 Ringkasan Stock Seragam</h2>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Export Button */}
            {summaryData.length > 0 && (
              <Button
                onClick={handleExportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
              >
                📥 Export Excel
              </Button>
            )}
            
            {/* View Mode Toggle - Without Cards */}
            <div className="inline-flex rounded-lg border border-gray-300">
              <button
                onClick={() => setViewMode('pie')}
                className={`px-3 py-1.5 text-sm font-medium rounded-l-lg border-r ${
                  viewMode === 'pie'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🥧 Pie
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 text-sm font-medium border-r ${
                  viewMode === 'chart'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📊 Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-lg ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📋 Table
              </button>
            </div>
            
            <Button onClick={fetchSummary} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 text-sm" disabled={loadingSummary}>
              🔄 Refresh
            </Button>
          </div>
        </div>
        
        {loadingSummary ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Memuat data...</p>
          </div>
        ) : summaryData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Belum ada data stok</p>
          </div>
        ) : (
          <>
            {/* Pie Chart View */}
            {viewMode === 'pie' && (() => {
              // Aggregate data by uniform name
              const pieDataMap = new Map()
              
              summaryData.forEach(row => {
                const uniformName = row.uniform?.uniform_name || 'Unknown'
                pieDataMap.set(uniformName, (pieDataMap.get(uniformName) || 0) + row.total_qty)
              })
              
              const pieData = Array.from(pieDataMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
              
              const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']
              
              const totalQty = pieData.reduce((sum, item) => sum + item.value, 0)
              
              return (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row gap-6 items-center">
                    {/* Pie Chart */}
                    <div className="w-full lg:w-1/2">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Legend with details */}
                    <div className="w-full lg:w-1/2">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 text-gray-700">Detail per Jenis Seragam</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {pieData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded" 
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                ></div>
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-blue-600">{item.value} pcs</div>
                                <div className="text-xs text-gray-500">
                                  {((item.value / totalQty) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700">Total Stok</span>
                            <span className="text-lg font-bold text-blue-600">{totalQty} pcs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 text-center">
                    <p>💡 Pie chart menampilkan distribusi stok per jenis seragam. Gunakan toggle untuk switch ke view lain.</p>
                  </div>
                </div>
              )
            })()}

            {/* Bar Chart View */}
            {viewMode === 'chart' && (() => {
              // Transform data for chart: group by uniform, then by size
              const chartDataMap = new Map()
              
              summaryData.forEach(row => {
                const uniformName = row.uniform?.uniform_name || 'Unknown'
                const sizeName = row.size?.size_name || 'Unknown'
                const supplierName = row.supplier ? row.supplier.supplier_name : 'Tanpa Supplier'
                
                if (!chartDataMap.has(uniformName)) {
                  chartDataMap.set(uniformName, { name: uniformName, sizes: new Map() })
                }
                
                const uniformData = chartDataMap.get(uniformName)
                const sizeKey = `${sizeName} - ${supplierName}`
                uniformData.sizes.set(sizeKey, (uniformData.sizes.get(sizeKey) || 0) + row.total_qty)
              })
              
              // Convert to array format for Recharts
              const chartData = Array.from(chartDataMap.values()).map(uniform => {
                const dataPoint = { name: uniform.name }
                uniform.sizes.forEach((qty, sizeSupplier) => {
                  dataPoint[sizeSupplier] = qty
                })
                return dataPoint
              })
              
              // Get all unique size_supplier combinations for bars
              const allKeys = new Set()
              chartData.forEach(item => {
                Object.keys(item).forEach(key => {
                  if (key !== 'name') allKeys.add(key)
                })
              })
              
              // Color palette
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
              
              return (
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis label={{ value: 'Quantity', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      {Array.from(allKeys).map((key, idx) => (
                        <Bar 
                          key={key} 
                          dataKey={key} 
                          fill={colors[idx % colors.length]} 
                          name={key}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-xs text-gray-600 text-center">
                    <p>💡 Chart bisa di-scroll horizontal jika data banyak. Gunakan toggle untuk switch ke Table view.</p>
                  </div>
                </div>
              )
            })()}

            {/* Table View */}
            {viewMode === 'table' && (() => {
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
              ).sort((a, b) => a.supplier_code.localeCompare(b.supplier_code))
              
              return (
                <div className="space-y-3">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari seragam, ukuran, atau supplier..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    {/* Supplier Filter */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Filter:</Label>
                      <select
                        value={summarySupplierFilter}
                        onChange={(e) => setSummarySupplierFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  
                  {sortedData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🔍</div>
                      <p>Tidak ada data yang sesuai dengan filter</p>
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b bg-gray-50">
                            <th 
                              className="py-3 px-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('uniform')}
                            >
                              <div className="flex items-center gap-2">
                                Seragam <SortIcon column="uniform" />
                              </div>
                            </th>
                            <th 
                              className="py-3 px-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('size')}
                            >
                              <div className="flex items-center gap-2">
                                Ukuran <SortIcon column="size" />
                              </div>
                            </th>
                            <th 
                              className="py-3 px-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('qty')}
                            >
                              <div className="flex items-center gap-2">
                                Total Qty <SortIcon column="qty" />
                              </div>
                            </th>
                            <th 
                              className="py-3 px-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('supplier')}
                            >
                              <div className="flex items-center gap-2">
                                Supplier <SortIcon column="supplier" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.map((row, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  {row.uniform?.uniform_name || '-'}
                                  {row.uniform?.is_universal && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      🌐 Universal
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">{row.size?.size_name || '-'}</td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-lg text-blue-600">{row.total_qty}</span>
                              </td>
                              <td className="py-3 px-3">
                                {row.supplier ? (
                                  <span className="text-sm">
                                    {row.supplier.supplier_code} - {row.supplier.supplier_name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">Stock Awal (Tanpa Supplier)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-sm text-gray-600">
                        {(searchQuery || summarySupplierFilter !== 'all') ? (
                          <>
                            Menampilkan: <span className="font-semibold">{sortedData.length} item</span> 
                            <span className="mx-2">•</span>
                            Total Qty: <span className="font-semibold">{sortedData.reduce((sum, row) => sum + row.total_qty, 0)}</span>
                            <span className="mx-2">•</span>
                            Dari total: <span className="font-semibold">{summaryData.length} item</span>
                          </>
                        ) : (
                          <>
                            Total: <span className="font-semibold">{summaryData.length} kombinasi item</span>
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
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">History Stock Awal yang Sudah Diinput</h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-600 hover:text-gray-900 transition-transform duration-200"
              style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ▼
            </button>
          </div>
          
          {showHistory && (
            <div className="flex items-center gap-2">
              <Label htmlFor="filterSupplier" className="text-sm whitespace-nowrap">Filter Supplier:</Label>
              <select
                id="filterSupplier"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Supplier</option>
                <option value="null">Stock Awal (Tanpa Supplier)</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.supplier_code} - {s.supplier_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {showHistory && (loadingHistory ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Memuat data...</p>
          </div>
        ) : (() => {
          // Filter history based on selected supplier
          const filteredHistory = historyData.filter(row => {
            if (filterSupplier === 'all') return true
            if (filterSupplier === 'null') return row.supplier_id === null || row.supplier === null
            return row.supplier_id === Number(filterSupplier)
          })
          
          return filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>Belum ada data history</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="py-2 px-3 font-semibold text-gray-700">Waktu</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Seragam</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Ukuran</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Qty</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Tipe</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Supplier</th>
                    <th className="py-2 px-3 font-semibold text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2 px-3">
                        {row.uniform?.uniform_name || '-'}
                        {row.uniform?.is_universal && (
                          <span className="ml-1 text-xs">🌐</span>
                        )}
                      </td>
                      <td className="py-2 px-3">{row.size?.size_name || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${row.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.qty_delta >= 0 ? '+' : ''}{row.qty_delta}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {row.txn_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {row.supplier ? (
                          <span className="text-xs">{row.supplier.supplier_code} - {row.supplier.supplier_name}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Stock Awal</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600">{row.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-600">
                {filterSupplier !== 'all' ? (
                  <>
                    Menampilkan: <span className="font-semibold">{filteredHistory.length} transaksi</span>
                    <span className="mx-2">•</span>
                    Dari total: <span className="font-semibold">{historyData.length} transaksi</span>
                  </>
                ) : (
                  <>Total: <span className="font-semibold">{historyData.length} transaksi</span></>
                )}
              </div>
            </div>
          )
        })())}
      </Card>

      {/* List of Items */}
      <Card className="p-4">
        <h2 className="font-semibold mb-4">Daftar Item Stock Awal (Pending Input)</h2>
        
        {initialStockItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Belum ada item pending. Klik "+ Input Stock Awal" untuk menambah.</p>
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
                        {item.supplier_name || <span className="text-gray-400 italic">Tanpa Supplier</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">{item.qty}</td>
                      <td className="py-3 px-3 text-gray-600">{item.notes || '-'}</td>
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
                <div key={idx} className="border rounded-lg p-3 bg-white">
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Unit:</span> {item.unit_name}</div>
                    <div><span className="font-medium">Seragam:</span> {item.uniform_name}</div>
                    <div><span className="font-medium">Ukuran:</span> {item.size_name}</div>
                    <div>
                      <span className="font-medium">Supplier:</span>{' '}
                      {item.supplier_name || <span className="text-gray-400 italic">Tanpa Supplier</span>}
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
    </div>
  )
}
