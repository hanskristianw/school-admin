"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Modal from '@/components/ui/modal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function InitialStockPage() {
  const [units, setUnits] = useState([])
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [initialStockItems, setInitialStockItems] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [summaryData, setSummaryData] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [filterSupplier, setFilterSupplier] = useState('all')
  const [viewMode, setViewMode] = useState('chart') // 'chart', 'table', 'cards'
  const [showHistory, setShowHistory] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [itemAddedSuccess, setItemAddedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  
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
      // Get all init transactions and group by uniform, size, supplier
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
        // Include all transaction types to get accurate total stock

      if (error) throw error
      
      // Group and sum quantities
      const grouped = new Map()
      for (const row of (data || [])) {
        const key = `${row.uniform_id}|${row.size_id}|${row.supplier_id || 'null'}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            uniform_id: row.uniform_id,
            size_id: row.size_id,
            supplier_id: row.supplier_id,
            uniform: row.uniform,
            size: row.size,
            supplier: row.supplier,
            total_qty: 0
          })
        }
        grouped.get(key).total_qty += row.qty_delta
      }
      
      setSummaryData(Array.from(grouped.values()).sort((a, b) => {
        // Sort by uniform name, then size
        const nameCompare = (a.uniform?.uniform_name || '').localeCompare(b.uniform?.uniform_name || '')
        if (nameCompare !== 0) return nameCompare
        return (a.size?.size_name || '').localeCompare(b.size?.size_name || '')
      }))
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

      {/* Summary Section dengan Multiple Views */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold">Ringkasan Stok per Jenis & Supplier</h2>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1.5 text-sm font-medium rounded-l-lg border ${
                  viewMode === 'chart'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📊 Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium border-t border-b ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-lg border ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🎴 Cards
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
            <div className="text-4xl mb-2">�</div>
            <p>Belum ada data stok</p>
          </div>
        ) : (
          <>
            {/* Chart View */}
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
                <p>💡 Chart bisa di-scroll horizontal jika data banyak. Gunakan toggle untuk switch ke Table atau Cards view.</p>
              </div>
            </div>
          )
        })()}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b bg-gray-50">
                      <th className="py-3 px-3 font-semibold text-gray-700">Seragam</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Ukuran</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Total Qty</th>
                      <th className="py-3 px-3 font-semibold text-gray-700">Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((row, idx) => (
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
                  Total: <span className="font-semibold">{summaryData.length} kombinasi item</span>
                  <span className="mx-2">•</span>
                  Total Qty: <span className="font-semibold">{summaryData.reduce((sum, row) => sum + row.total_qty, 0)}</span>
                </div>
              </div>
            )}

            {/* Cards View */}
            {viewMode === 'cards' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {summaryData.map((row, idx) => {
                    const supplierColors = [
                      'border-blue-300 bg-blue-50',
                      'border-green-300 bg-green-50',
                      'border-orange-300 bg-orange-50',
                      'border-purple-300 bg-purple-50',
                      'border-pink-300 bg-pink-50',
                      'border-teal-300 bg-teal-50'
                    ]
                    const colorClass = supplierColors[idx % supplierColors.length]
                    
                    return (
                      <div key={idx} className={`border-2 rounded-lg p-4 ${colorClass} hover:shadow-md transition-shadow`}>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">
                            {row.uniform?.uniform_name || '-'}
                          </h3>
                          {row.uniform?.is_universal && (
                            <span className="text-xs">🌐</span>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-gray-900">{row.total_qty}</span>
                          <span className="text-sm text-gray-600">pcs</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Ukuran:</span>
                            <span className="font-medium">{row.size?.size_name || '-'}</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="text-gray-500 whitespace-nowrap">Supplier:</span>
                            <span className="font-medium text-gray-700 leading-tight">
                              {row.supplier ? row.supplier.supplier_name : 'Tanpa Supplier'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 text-sm text-gray-600 text-center">
                  Total: <span className="font-semibold">{summaryData.length} kombinasi item</span>
                  <span className="mx-2">•</span>
                  Total Qty: <span className="font-semibold">{summaryData.reduce((sum, row) => sum + row.total_qty, 0)}</span>
                </div>
              </>
            )}
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
          // Apply filter
          const filteredData = historyData.filter(row => {
            if (filterSupplier === 'all') return true
            if (filterSupplier === 'null') return !row.supplier
            return row.supplier?.supplier_id === Number(filterSupplier)
          })
          
          return filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>{historyData.length === 0 ? 'Belum ada stock awal yang diinput' : 'Tidak ada data sesuai filter'}</p>
            </div>
          ) : (
            <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="py-3 px-3 font-semibold text-gray-700">Tanggal</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Jenis</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Seragam</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Ukuran</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Qty</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Supplier</th>
                  <th className="py-3 px-3 font-semibold text-gray-700">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row) => {
                  // Transaction type badges
                  const txnTypeMap = {
                    'init': { label: 'Stock Awal', color: 'bg-gray-100 text-gray-800' },
                    'purchase': { label: 'Purchase', color: 'bg-blue-100 text-blue-800' },
                    'adjust': { label: 'Adjustment', color: 'bg-orange-100 text-orange-800' },
                    'sale': { label: 'Penjualan', color: 'bg-green-100 text-green-800' },
                    'return_in': { label: 'Return In', color: 'bg-purple-100 text-purple-800' },
                    'return_out': { label: 'Return Out', color: 'bg-red-100 text-red-800' }
                  }
                  const txnInfo = txnTypeMap[row.txn_type] || { label: row.txn_type, color: 'bg-gray-100 text-gray-600' }
                  
                  return (
                  <tr key={row.txn_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      {new Date(row.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${txnInfo.color}`}>
                        {txnInfo.label}
                      </span>
                    </td>
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
                      <span className={`font-semibold ${row.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {row.qty_delta >= 0 ? '+' : ''}{row.qty_delta}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {row.supplier ? (
                        <span className="text-sm">
                          {row.supplier.supplier_code} - {row.supplier.supplier_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{row.notes || '-'}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-gray-600">
              Total: <span className="font-semibold">{filteredData.length} transaksi</span>
              {filterSupplier !== 'all' && (
                <span className="ml-2 text-gray-500">(dari {historyData.length} total)</span>
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
                        {item.supplier_id ? (
                          item.supplier_name
                        ) : (
                          <span className="text-gray-500 italic">{item.supplier_name}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-600">{item.qty} pcs</td>
                      <td className="py-3 px-3 text-sm text-gray-600">{item.notes || '-'}</td>
                      <td className="py-3 px-3">
                        <Button
                          onClick={() => removeItem(idx)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs"
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan="4" className="py-3 px-3">Total</td>
                    <td className="py-3 px-3 text-right text-blue-700">{totalItems} pcs</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {initialStockItems.map((item, idx) => (
                <Card key={idx} className="p-4 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-medium">{item.unit_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seragam:</span>
                      <span className="font-medium">{item.uniform_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ukuran:</span>
                      <span className="font-medium">{item.size_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Supplier:</span>
                      <span className={item.supplier_id ? "font-medium" : "italic text-gray-500"}>
                        {item.supplier_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Qty:</span>
                      <span className="font-semibold text-blue-600">{item.qty} pcs</span>
                    </div>
                    {item.notes && (
                      <div className="text-gray-600 text-xs pt-2 border-t">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => removeItem(idx)}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm"
                  >
                    Hapus Item
                  </Button>
                </Card>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={submitInitialStock}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-semibold disabled:opacity-50"
              >
                {saving ? '⏳ Menyimpan...' : `✓ Simpan ${initialStockItems.length} Item Stock Awal`}
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
