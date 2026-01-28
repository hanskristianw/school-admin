"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faClipboardList, faShoppingCart, faExclamationTriangle, faArrowUp, faArrowDown, faTruck, faChartLine, faTrophy, faUser, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PurchasingDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  
  // Metrics
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    stockValueChange: 0,
    pendingPOCount: 0,
    pendingPOValue: 0,
    thisMonthPurchases: 0,
    thisMonthPOCount: 0,
    lowStockCount: 0
  })
  
  // Charts & Lists
  const [recentMovements, setRecentMovements] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [topSuppliers, setTopSuppliers] = useState([])
  const [purchaseTrend, setPurchaseTrend] = useState([])
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    const id = localStorage.getItem("kr_id")
    const role = localStorage.getItem("user_role")

    if (!id || !role) {
      localStorage.clear()
      router.replace("/login")
    } else {
      setLoading(true)
      Promise.all([
        fetchUserInfo(id),
        fetchMetrics(),
        fetchRecentMovements(),
        fetchBestSellers(),
        fetchTopSuppliers(),
        fetchPurchaseTrend()
      ])
        .catch((e) => {
          console.error('Dashboard load error:', e)
        })
        .finally(() => setLoading(false))
    }
  }, [router, selectedMonth])

  const fetchUserInfo = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('user_nama_depan, user_nama_belakang, user_profile_picture')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    setUserData(data)
  }

  const fetchMetrics = async () => {
    try {
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      const firstDayStr = firstDay.toISOString().split('T')[0]
      
      // Calculate last month for comparison
      const lastMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
      const lastMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0)
      
      // Use optimized view for stock value
      const { data: stockData } = await supabase
        .from('v_current_stock')
        .select('stock_value')
      
      const totalStockValue = (stockData || []).reduce((sum, item) => sum + parseFloat(item.stock_value || 0), 0)
      
      // Calculate last month stock value by getting all transactions up to end of last month
      const { data: lastMonthTxns } = await supabase
        .from('uniform_stock_txn')
        .select('uniform_id, size_id, qty_delta')
        .lte('created_at', lastMonthEnd.toISOString())
      
      // Get variant HPP for calculation
      const { data: variants } = await supabase
        .from('uniform_variant')
        .select('uniform_id, size_id, hpp')
      
      // Build map of stock quantities at end of last month
      const lastMonthStock = {}
      for (const txn of (lastMonthTxns || [])) {
        const key = `${txn.uniform_id}-${txn.size_id}`
        if (!lastMonthStock[key]) {
          lastMonthStock[key] = 0
        }
        lastMonthStock[key] += txn.qty_delta
      }
      
      // Calculate last month stock value
      let lastMonthStockValue = 0
      for (const variant of (variants || [])) {
        const key = `${variant.uniform_id}-${variant.size_id}`
        const qty = lastMonthStock[key] || 0
        lastMonthStockValue += qty * parseFloat(variant.hpp || 0)
      }
      
      // Calculate percentage change
      let stockValueChange = 0
      if (lastMonthStockValue > 0) {
        stockValueChange = ((totalStockValue - lastMonthStockValue) / lastMonthStockValue) * 100
      }
      
      // Pending POs (Draft status - belum di-post)
      const { data: pendingPOs } = await supabase
        .from('uniform_purchase')
        .select('purchase_id')
        .eq('status', 'draft')
      
      const trulyPending = pendingPOs?.length || 0
      
      // This month purchases
      const { data: monthPurchases } = await supabase
        .from('uniform_purchase')
        .select('purchase_id, uniform_purchase_item(qty, unit_cost)')
        .gte('purchase_date', firstDayStr)
        .eq('is_voided', false)
      
      const monthValue = (monthPurchases || []).reduce((sum, po) => {
        const poTotal = (po.uniform_purchase_item || []).reduce((itemSum, item) => 
          itemSum + (item.qty * parseFloat(item.unit_cost || 0)), 0)
        return sum + poTotal
      }, 0)

      setMetrics({
        totalStockValue,
        stockValueChange: parseFloat(stockValueChange.toFixed(1)),
        pendingPOCount: trulyPending,
        pendingPOValue: 0,
        thisMonthPurchases: monthValue,
        thisMonthPOCount: (monthPurchases || []).length
      })
    } catch (e) {
      console.error('Metrics fetch error:', e)
    }
  }

  const fetchRecentMovements = async () => {
    try {
      const { data: movements } = await supabase
        .from('uniform_stock_txn')
        .select(`
          txn_id,
          created_at,
          txn_type,
          qty_delta,
          uniform:uniform_id (uniform_name),
          size:size_id (size_name),
          supplier:supplier_id (supplier_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setRecentMovements(movements || [])
    } catch (e) {
      console.error('Recent movements fetch error:', e)
    }
  }

  const fetchBestSellers = async () => {
    try {
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
      const firstDayStr = firstDay.toISOString().split('T')[0]
      const lastDayStr = lastDay.toISOString().split('T')[0]
      
      // Fetch this month sales with server-side date filter
      const { data: salesItems } = await supabase
        .from('uniform_sale_item')
        .select(`
          uniform_id,
          size_id,
          qty,
          subtotal,
          uniform:uniform_id (uniform_name),
          size:size_id (size_name),
          sale:sale_id!inner (sale_date, status, is_voided)
        `)
        .gte('sale.sale_date', firstDayStr)
        .lte('sale.sale_date', lastDayStr)
        .neq('sale.status', 'cancelled')
        .eq('sale.is_voided', false)
      
      // Aggregate on client (already filtered)
      const aggregated = {}
      for (const item of (salesItems || [])) {
        const key = `${item.uniform_id}-${item.size_id}`
        if (!aggregated[key]) {
          aggregated[key] = {
            uniform_name: item.uniform?.uniform_name,
            size_name: item.size?.size_name,
            total_qty: 0,
            total_revenue: 0
          }
        }
        aggregated[key].total_qty += item.qty
        aggregated[key].total_revenue += parseFloat(item.subtotal || 0)
      }
      
      const sorted = Object.values(aggregated)
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 10)
      
      setBestSellers(sorted)
    } catch (e) {
      console.error('Best sellers fetch error:', e)
    }
  }

  const fetchTopSuppliers = async () => {
    try {
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
      const firstDayStr = firstDay.toISOString().split('T')[0]
      const lastDayStr = lastDay.toISOString().split('T')[0]
      
      // Fetch this month purchases with server-side date filter
      const { data: purchases } = await supabase
        .from('uniform_purchase')
        .select(`
          supplier_id,
          supplier:supplier_id (supplier_name),
          uniform_purchase_item (qty, unit_cost)
        `)
        .gte('purchase_date', firstDayStr)
        .lte('purchase_date', lastDayStr)
        .eq('is_voided', false)
      
      // Aggregate by supplier
      const aggregated = {}
      for (const purchase of (purchases || [])) {
        const supplierId = purchase.supplier_id
        const supplierName = purchase.supplier?.supplier_name || 'Unknown'
        
        if (!aggregated[supplierId]) {
          aggregated[supplierId] = {
            supplier_name: supplierName,
            total_value: 0,
            purchase_count: 0
          }
        }
        
        aggregated[supplierId].purchase_count += 1
        
        for (const item of (purchase.uniform_purchase_item || [])) {
          aggregated[supplierId].total_value += item.qty * parseFloat(item.unit_cost || 0)
        }
      }
      
      const sorted = Object.values(aggregated)
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 5)
      
      setTopSuppliers(sorted)
    } catch (e) {
      console.error('Top suppliers fetch error:', e)
    }
  }

  const fetchPurchaseTrend = async () => {
    // Mock data - implement 6 months trend
    setPurchaseTrend([
      { month: 'Aug', purchases: 35000000, sales: 28000000 },
      { month: 'Sep', purchases: 42000000, sales: 35000000 },
      { month: 'Oct', purchases: 38000000, sales: 40000000 },
      { month: 'Nov', purchases: 45000000, sales: 38000000 },
      { month: 'Dec', purchases: 52000000, sales: 48000000 },
      { month: 'Jan', purchases: 45000000, sales: 42000000 },
    ])
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    if (nextMonth <= currentMonth) {
      setSelectedMonth(nextMonth)
    }
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return selectedMonth.getFullYear() === now.getFullYear() && 
           selectedMonth.getMonth() === now.getMonth()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTxnTypeLabel = (type) => {
    const labels = {
      init: 'Inisialisasi',
      adjust: 'Adjustment',
      purchase: 'Pembelian',
      sale: 'Penjualan',
      return_in: 'Return Masuk',
      return_out: 'Return Keluar',
      void: 'Void'
    }
    return labels[type] || type
  }

  const getTxnTypeBadge = (type) => {
    const badges = {
      purchase: 'bg-blue-100 text-blue-800',
      sale: 'bg-green-100 text-green-800',
      adjust: 'bg-yellow-100 text-yellow-800',
      init: 'bg-purple-100 text-purple-800',
      return_in: 'bg-cyan-100 text-cyan-800',
      return_out: 'bg-orange-100 text-orange-800',
      void: 'bg-red-100 text-red-800'
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  const filteredMovements = filterType === 'all' 
    ? recentMovements 
    : recentMovements.filter(m => m.txn_type === filterType)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-sky-500 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {userData?.user_profile_picture ? (
              <div className="relative">
                <img 
                  src={userData.user_profile_picture} 
                  alt="Profile" 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-4 ring-white/30 shadow-xl">
                <FontAwesomeIcon icon={faUser} className="text-2xl text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                📦 Purchasing Dashboard
              </h1>
              <p className="text-sky-100">Selamat datang, {userData?.user_nama_depan} {userData?.user_nama_belakang} - Monitor stok, pembelian, dan supplier</p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <button
              onClick={goToPreviousMonth}
              className="px-3 py-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Previous Month"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-white" />
            </button>
            <div className="px-4 py-2 bg-white/20 rounded-lg min-w-[160px] text-center">
              <div className="text-white font-semibold">{formatMonthYear(selectedMonth)}</div>
              <div className="text-sky-100 text-xs mt-0.5">
                {isCurrentMonth() ? 'Current Month' : 'Historical Data'}
              </div>
            </div>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth()}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isCurrentMonth() 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-white/20'
              }`}
              title="Next Month"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Total Stock Value */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Stock Value</p>
                <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalStockValue)}</h3>
                <div className="flex items-center gap-1 mt-2">
                  <FontAwesomeIcon 
                    icon={metrics.stockValueChange >= 0 ? faArrowUp : faArrowDown} 
                    className={`text-xs ${metrics.stockValueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  />
                  <span className={`text-xs ${metrics.stockValueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.stockValueChange)}% vs last month
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faBox} className="text-blue-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Purchase Orders */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Pending POs</p>
                <h3 className="text-2xl font-bold text-gray-800">{metrics.pendingPOCount}</h3>
                <p className="text-xs text-gray-500 mt-2">Purchase Orders</p>
                {metrics.pendingPOCount > 0 && (
                  <Link href="/stock/uniform/add">
                    <Button variant="outline" size="sm" className="mt-3 text-xs h-7">
                      View Details
                    </Button>
                  </Link>
                )}
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faClipboardList} className="text-amber-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month Purchases */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{formatMonthYear(selectedMonth)}</p>
                <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.thisMonthPurchases)}</h3>
                <p className="text-xs text-gray-500 mt-2">{metrics.thisMonthPOCount} purchase orders</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faShoppingCart} className="text-green-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Suppliers */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FontAwesomeIcon icon={faTruck} className="text-blue-600" />
              Top Suppliers - {formatMonthYear(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {topSuppliers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map((supplier, idx) => {
                  const maxValue = topSuppliers[0]?.total_value || 1
                  const percentage = (supplier.total_value / maxValue) * 100
                  
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{supplier.supplier_name}</span>
                        <span className="text-sm font-semibold text-gray-800">{formatCurrency(supplier.total_value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best Sellers */}
        <Card className="bg-white/70 backdrop-blur-sm border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FontAwesomeIcon icon={faTrophy} className="text-amber-600" />
              Best Sellers - {formatMonthYear(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {bestSellers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No sales data</p>
            ) : (
              <div className="space-y-2">
                {bestSellers.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.uniform_name}</p>
                        <p className="text-xs text-gray-500">{item.size_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{item.total_qty} pcs</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Movements */}
      <Card className="bg-white/70 backdrop-blur-sm border-gray-200 mb-6">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              🔄 Recent Stock Movements
            </CardTitle>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No stock movements found
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((movement) => {
                    const uniformName = movement.uniform?.uniform_name || '-'
                    const sizeName = movement.size?.size_name || '-'
                    const supplierName = movement.supplier?.supplier_name || '-'
                    
                    return (
                      <tr key={movement.txn_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatDate(movement.created_at)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{uniformName}</td>
                        <td className="px-4 py-3 text-gray-600">{sizeName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTxnTypeBadge(movement.txn_type)}`}>
                            {getTxnTypeLabel(movement.txn_type)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${movement.qty_delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.qty_delta >= 0 ? '+' : ''}{movement.qty_delta}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{supplierName}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Floating Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button
          onClick={() => router.push('/stock/uniform/add')}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full w-14 h-14 flex items-center justify-center"
          title="Create Purchase Order"
        >
          <FontAwesomeIcon icon={faShoppingCart} className="text-xl" />
        </Button>
      </div>
    </div>
  )
}
