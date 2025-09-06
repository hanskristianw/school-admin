"use client";

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import supabase from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function RoomBookingPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [checked, setChecked] = useState(false)
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('09:00')
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const friendlyError = (err) => {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('room_booking_no_overlap_approved') || msg.includes('exclusion') || msg.includes('&&')) {
      return t('roomBooking.errors.overlap')
    }
    if (msg.includes('room_booking_nonempty')) {
      return t('roomBooking.errors.invalidTime')
    }
    return err?.message || t('roomBooking.errors.generic')
  }

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user_data') || 'null') } catch { return null }
  }, [])

  useEffect(() => {
    const u = user
    if (!u) { router.replace('/login'); return }
    if (u.isAdmin || u.isTeacher) {
      setIsAdmin(!!u.isAdmin)
      setIsTeacher(!!u.isTeacher)
      setChecked(true)
    } else {
      router.replace('/dashboard?forbidden=1')
    }
  }, [router, user])

  const loadRooms = async () => {
    const { data } = await supabase.from('room').select('*').order('room_name')
    setRooms(data || [])
  }

  const loadItems = async () => {
    setError('')
    const { data, error } = await supabase
      .from('room_booking')
      .select('*, room:room_id(room_name), user:requested_by_user_id(user_nama_depan, user_nama_belakang)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) setItems(data || [])
  }

  useEffect(() => { if (checked) { loadRooms(); loadItems(); } }, [checked])

  const toRange = (d, s, e) => {
    // Build [start,end) in local timezone; let Supabase/DB store as timestamptz
    const startIso = new Date(`${d}T${s}:00`).toISOString()
    const endIso = new Date(`${d}T${e}:00`).toISOString()
    return `[${startIso},${endIso})`
  }

  const overlapsApproved = (r) => {
    // Client-side check only against approved items for same room, treat pending as non-blocking as requested
    const selStart = new Date(`${date}T${start}:00`).getTime()
    const selEnd = new Date(`${date}T${end}:00`).getTime()
  if (!(selStart < selEnd)) return t('roomBooking.errors.invalidTime')
    return items.some(it => it.room_id === r && it.status === 'approved' && (() => {
      const [l, u] = (it.booking_time || '').replace(/[\[\)\]]/g,'').split(',')
      const a = new Date(l).getTime(); const b = new Date(u).getTime()
      // half-open: [a,b) overlaps [selStart,selEnd) if a < selEnd && selStart < b
      return a < selEnd && selStart < b
    })())
  }

  const createBooking = async () => {
    if (!roomId || !date || !start || !end) return
    const err = overlapsApproved(Number(roomId))
  if (err) { setError(typeof err === 'string' ? err : t('roomBooking.errors.overlap')); return }
    setLoading(true); setError('')
    try {
      const range = toRange(date, start, end)
      const { error } = await supabase.from('room_booking').insert([{ room_id: Number(roomId), requested_by_user_id: user.userID, booking_time: range, purpose }])
      if (error) throw error
      setPurpose('')
      await loadItems()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  const approve = async (bk) => {
    if (!isAdmin) return
    // Approve: DB exclusion constraint will enforce no-overlap among approved
    setLoading(true); setError('')
    try {
      const { error } = await supabase.from('room_booking').update({ status: 'approved' }).eq('booking_id', bk.booking_id)
      if (error) throw error
      await loadItems()
    } catch (e) { setError(friendlyError(e)) } finally { setLoading(false) }
  }

  const cancel = async (bk) => {
    // Only the creator can cancel their own booking
    if (!user || bk.requested_by_user_id !== user.userID) {
      setError(t('roomBooking.errors.cancelNotOwner'))
      return
    }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.from('room_booking').update({ status: 'cancelled' }).eq('booking_id', bk.booking_id)
      if (error) throw error
      await loadItems()
  } catch (e) { setError(friendlyError(e)) } finally { setLoading(false) }
  }

  if (!checked) return null

  return (
    <div className="space-y-6 pb-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('roomBooking.title')}</h1>
        <p className="text-gray-600 text-sm">{t('roomBooking.subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('roomBooking.formTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-600">{t('roomBooking.fields.room')}</label>
              <select className="w-full border rounded px-3 py-2" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">{t('roomBooking.fields.roomPlaceholder')}</option>
                {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.room_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('roomBooking.fields.date')}</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('roomBooking.fields.start')}</label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t('roomBooking.fields.end')}</label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="text-sm text-gray-600">{t('roomBooking.fields.purpose')}</label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t('roomBooking.fields.purposePlaceholder')} />
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" onClick={createBooking} disabled={loading || !roomId || !date}>{t('roomBooking.submit')}</Button>
            {error && <div className="mt-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{error}</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('roomBooking.listTitle')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-2 py-2">{t('roomBooking.table.room')}</th>
                  <th className="px-2 py-2">{t('roomBooking.table.time')}</th>
                  <th className="px-2 py-2">{t('roomBooking.table.status')}</th>
                  <th className="px-2 py-2">{t('roomBooking.table.requester')}</th>
                  <th className="px-2 py-2 w-40">{t('roomBooking.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(bk => (
                  <tr key={bk.booking_id} className="border-t">
                    <td className="px-2 py-2">{bk.room?.room_name || '-'}</td>
                    <td className="px-2 py-2">
                      {(() => { const [l,u] = (bk.booking_time||'').replace(/[\[\)\]]/g,'').split(','); const sd=new Date(l); const ed=new Date(u); return `${sd.toLocaleDateString()} ${sd.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${ed.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` })()}
                    </td>
                    <td className="px-2 py-2">
                      <span className={
                        bk.status==='approved' ? 'text-green-700' : bk.status==='pending' ? 'text-amber-700' : 'text-gray-600'
                      }>{t(`roomBooking.status.${bk.status}`)}</span>
                    </td>
                    <td className="px-2 py-2">{bk.user ? `${bk.user.user_nama_depan||''} ${bk.user.user_nama_belakang||''}`.trim() : '-'}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        {isAdmin && bk.status==='pending' && (
                          <Button type="button" onClick={() => approve(bk)} className="bg-emerald-600 hover:bg-emerald-700 text-xs">{t('roomBooking.approve')}</Button>
                        )}
                        {bk.status!=='cancelled' && user && bk.requested_by_user_id === user.userID && (
                          <Button type="button" onClick={() => cancel(bk)} className="bg-gray-600 hover:bg-gray-700 text-xs">{t('roomBooking.cancel')}</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className="px-2 py-3 text-gray-500" colSpan={5}>{t('roomBooking.empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
