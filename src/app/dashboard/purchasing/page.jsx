"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBox, faClipboardList, faShoppingCart, faExclamationTriangle, faArrowUp, faArrowDown, faTruck, faChartLine, faTrophy, faUser, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import GlobalActionCards from '@/components/GlobalActionCards'
import { useTheme } from '@/lib/theme'

export default function PurchasingDashboard() {
  const router = useRouter()
  const { theme } = useTheme()
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
    <div className="min-h-screen" style={{ background: theme.pageBg }}>
      {/* Header */}
      <div className="px-6 py-7" style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {userData?.user_profile_picture ? (
              <img
                src={userData.user_profile_picture}
                alt="Foto profil"
                className="w-11 h-11 object-cover"
                style={{ borderRadius: '8px', border: `1px solid ${theme.border}` }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-11 h-11 flex items-center justify-center"
                style={{ borderRadius: '8px', background: theme.subtleBg, border: `1px solid ${theme.border}` }}
              >
                <FontAwesomeIcon icon={faUser} style={{ fontSize: '20px', color: theme.textSecondary }} />
              </div>
            )}
            <div>
              <p
                className="text-[11px] mb-0.5"
                style={{ color: theme.textSecondary, letterSpacing: '0.07em', textTransform: 'uppercase' }}
              >
                Purchasing Overview
              </p>
              <h1
                className="text-lg font-semibold"
                style={{ color: theme.textPrimary, letterSpacing: '-0.02em' }}
              >
                {`${userData?.user_nama_depan || ''} ${userData?.user_nama_belakang || ''}`.trim() || '—'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p
              className="hidden sm:block text-[11px]"
              style={{ color: theme.textSecondary, fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Action Cards — FPB pending & keterlambatan belum diisi */}
      <GlobalActionCards />



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
