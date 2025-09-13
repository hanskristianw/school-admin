"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

export default function UniformReportsPage() {
  const [units, setUnits] = useState([])
  const [unitId, setUnitId] = useState('')
  const [uniforms, setUniforms] = useState([])
  const [sizes, setSizes] = useState([])
  const [from, setFrom] = useState(isoDateNDaysAgo(30))
  const [to, setTo] = useState(isoDateNDaysAgo(0))
  const [uniformId, setUniformId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.from('unit').select('unit_id, unit_name, is_school').order('unit_name')
        if (error) throw error
        const schools = (data || []).filter(u => u.is_school)
        setUnits(schools)
        if (schools.length && !unitId) setUnitId(String(schools[0].unit_id))
      } catch (e) { setError(e.message) }
    }
    init()
  }, [])

  useEffect(() => {
    const loadRefs = async () => {
      if (!unitId) return
      const [{ data: u }, { data: s }] = await Promise.all([
        supabase.from('uniform').select('uniform_id, uniform_name').eq('unit_id', Number(unitId)).order('uniform_name'),
        supabase.from('uniform_size').select('*').eq('unit_id', Number(unitId)).order('display_order')
      ])
      setUniforms(u || [])
      setSizes(s || [])
    }
    loadRefs()
  }, [unitId])

  const load = async () => {
    if (!unitId) { setRows([]); return }
    setLoading(true)
    setError('')
    try {
      // Load paid sales within date (filter by sale_date)
      let q = supabase.from('uniform_sale').select('sale_id, sale_date, total_amount, total_cost').eq('unit_id', Number(unitId)).eq('status', 'paid')
      if (from) q = q.gte('sale_date', `${from} 00:00:00+00`)
      if (to) q = q.lte('sale_date', `${to} 23:59:59+00`)
      const { data: sales, error: salesErr } = await q
      if (salesErr) throw salesErr
      const saleIds = (sales || []).map(s => s.sale_id)
      let items = []
      if (saleIds.length) {
        const { data: it, error: itErr } = await supabase.from('uniform_sale_item').select('sale_id, uniform_id, size_id, qty, unit_price, unit_hpp, subtotal').in('sale_id', saleIds)
        if (itErr) throw itErr
        items = it || []
      }
      // Optional filters on items
      if (uniformId) items = items.filter(r => String(r.uniform_id) === String(uniformId))
      if (sizeId) items = items.filter(r => String(r.size_id) === String(sizeId))
      // Join names
      const uMap = new Map((uniforms || []).map(u => [u.uniform_id, u.uniform_name]))
      const sMap = new Map((sizes || []).map(s => [s.size_id, s.size_name]))
      const list = items.map(r => ({
        ...r,
        uniform_name: uMap.get(r.uniform_id) || r.uniform_id,
        size_name: sMap.get(r.size_id) || r.size_id,
        amount: Number(r.subtotal || 0),
        cost: Number(r.qty || 0) * Number(r.unit_hpp || 0),
        profit: (Number(r.subtotal || 0) - (Number(r.qty || 0) * Number(r.unit_hpp || 0)))
      }))
      setRows(list)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [unitId, from, to, uniformId, sizeId])

  const summary = useMemo(() => {
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
    const totalCost = rows.reduce((s, r) => s + r.cost, 0)
    return { totalAmount, totalCost, profit: totalAmount - totalCost }
  }, [rows])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Laporan Penjualan Seragam</h1>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-6">
          <div>
            <Label>Unit</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={unitId} onChange={e=>setUnitId(e.target.value)}>
              {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div>
            <Label>Seragam</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={uniformId} onChange={e=>setUniformId(e.target.value)}>
              <option value="">Semua</option>
              {uniforms.map(u => <option key={u.uniform_id} value={u.uniform_id}>{u.uniform_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Ukuran</Label>
            <select className="mt-1 w-full border rounded px-2 py-2" value={sizeId} onChange={e=>setSizeId(e.target.value)}>
              <option value="">Semua</option>
              {sizes.map(s => <option key={s.size_id} value={s.size_id}>{s.size_name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={load}>Refresh</Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="text-sm">Total: <strong>{formatCurrency(summary.totalAmount)}</strong> · HPP: {formatCurrency(summary.totalCost)} · Laba Kotor: <strong>{formatCurrency(summary.profit)}</strong></div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Seragam</th>
                <th className="py-2 pr-4">Ukuran</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Harga</th>
                <th className="py-2 pr-4">Subtotal</th>
                <th className="py-2 pr-4">HPP</th>
                <th className="py-2 pr-4">Laba</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 pr-4">{r.uniform_name}</td>
                  <td className="py-2 pr-4">{r.size_name}</td>
                  <td className="py-2 pr-4">{r.qty}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.unit_price)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.amount)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.cost)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </Card>
    </div>
  )
}

function isoDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
