"use client";

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Modal from '@/components/ui/modal'
import supabase from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

const MAX_CALENDAR_DAYS = 42

function parseRange(range) {
  if (!range) return [null, null]
  const clean = range.replace(/[\[\)\]]/g, '')
  const [start, end] = clean.split(',')
  return [start?.trim() || null, end?.trim() || null]
}

export default function RoomBookingPage() {
  const { t, lang } = useI18n()
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [showModal, setShowModal] = useState(false)
  const [draft, setDraft] = useState({ roomId: '', date: '', start: '08:00', end: '09:00', purpose: '' })

  const resolveText = (key, fallback) => {
    const value = t(key)
    return value === key ? fallback : value
  }

  const friendlyError = (err) => {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('room_booking_no_overlap_approved') || msg.includes('exclusion') || msg.includes('&&')) {
      return resolveText('roomBooking.errors.overlap', 'This time slot overlaps an approved booking.')
    }
    if (msg.includes('room_booking_nonempty')) {
      return resolveText('roomBooking.errors.invalidTime', 'Please choose a valid start and end time.')
    }
    return err?.message || resolveText('roomBooking.errors.generic', 'Something went wrong. Please try again.')
  }

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user_data') || 'null') } catch { return null }
  }, [])

  useEffect(() => {
    const u = user
    if (!u) { router.replace('/login'); return }
    if (u.isAdmin || u.isTeacher) {
      setChecked(true)
    } else {
      router.replace('/dashboard?forbidden=1')
    }
  }, [router, user])

  const loadRooms = async () => {
    const { data } = await supabase.from('room').select('*').order('room_name')
    setRooms(data || [])
  }

  const loadBookings = async () => {
    setError('')
    const { data, error: fetchError } = await supabase
      .from('room_booking')
      .select('*, room:room_id(room_name), user:requested_by_user_id(user_nama_depan, user_nama_belakang)')
      .order('booking_time', { ascending: true })
      .limit(200)

    if (fetchError) {
      setError(friendlyError(fetchError))
      return
    }

    const normalized = (data || []).map(bk => {
      const [startIso, endIso] = parseRange(bk.booking_time)
      const startDate = startIso ? new Date(startIso) : null
      const endDate = endIso ? new Date(endIso) : null
      const dateKey = startDate ? startDate.toISOString().slice(0, 10) : null
      return {
        ...bk,
        startDate,
        endDate,
        dateKey
      }
    })
    setBookings(normalized)
  }

  useEffect(() => {
    if (checked) {
      loadRooms()
      loadBookings()
    }
  }, [checked])

  useEffect(() => {
    if (rooms.length && !roomId) {
      setRoomId(String(rooms[0].room_id))
    }
  }, [rooms, roomId])

  const filteredBookings = useMemo(() => {
    if (!roomId) return bookings
    return bookings.filter(bk => bk.room_id === Number(roomId))
  }, [bookings, roomId])

  const bookingsByDate = useMemo(() => {
    const map = new Map()
    filteredBookings.forEach(bk => {
      if (!bk.dateKey) return
      if (!map.has(bk.dateKey)) map.set(bk.dateKey, [])
      map.get(bk.dateKey).push(bk)
    })
    map.forEach(list => list.sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0)))
    return map
  }, [filteredBookings])

  const upcomingBookings = useMemo(() => {
    return [...filteredBookings]
      .filter(bk => bk.startDate)
      .sort((a, b) => (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0))
      .slice(0, 10)
  }, [filteredBookings])

  const weekDayLabels = useMemo(() => {
    const locale = lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID'
    const base = new Date(Date.UTC(2021, 0, 3)) // Sunday
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(base)
      d.setDate(base.getDate() + idx)
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [lang])

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const startOffset = startOfMonth.getDay()
    const firstVisible = new Date(startOfMonth)
    firstVisible.setDate(startOfMonth.getDate() - startOffset)
    return Array.from({ length: MAX_CALENDAR_DAYS }, (_, idx) => {
      const day = new Date(firstVisible)
      day.setDate(firstVisible.getDate() + idx)
      return day
    })
  }, [currentMonth])

  const todayKey = new Date().toISOString().slice(0, 10)

  const toRange = (dateStr, startTime, endTime) => {
    const startIso = new Date(`${dateStr}T${startTime}:00`).toISOString()
    const endIso = new Date(`${dateStr}T${endTime}:00`).toISOString()
    return `[${startIso},${endIso})`
  }

  const overlapsApproved = (room, dateStr, startTime, endTime) => {
    const selStart = new Date(`${dateStr}T${startTime}:00`).getTime()
    const selEnd = new Date(`${dateStr}T${endTime}:00`).getTime()
    if (!(selStart < selEnd)) {
      return resolveText('roomBooking.errors.invalidTime', 'Please choose a valid start and end time.')
    }
    return filteredBookings.some(bk => {
      if (bk.room_id !== room || bk.status !== 'approved' || !bk.startDate || !bk.endDate) return false
      const a = bk.startDate.getTime()
      const b = bk.endDate.getTime()
      return a < selEnd && selStart < b
    })
  }

  const openModalForDate = (dateKey) => {
    const defaultRoom = roomId || (rooms[0]?.room_id ? String(rooms[0].room_id) : '')
    setDraft(prev => ({
      roomId: defaultRoom,
      date: dateKey,
      start: prev.start || '08:00',
      end: prev.end || '09:00',
      purpose: ''
    }))
    setFormError('')
    setShowModal(true)
  }

  const handleCreateBooking = async () => {
    const targetRoom = draft.roomId ? Number(draft.roomId) : roomId ? Number(roomId) : null
    if (!targetRoom) {
      setFormError(resolveText('roomBooking.errors.roomRequired', 'Please select a room.'))
      return
    }
    if (!draft.date) {
      setFormError(resolveText('roomBooking.errors.dateRequired', 'Please choose a date.'))
      return
    }
    const conflict = overlapsApproved(targetRoom, draft.date, draft.start, draft.end)
    if (conflict) {
      setFormError(typeof conflict === 'string' ? conflict : resolveText('roomBooking.errors.overlap', 'This time slot overlaps an approved booking.'))
      return
    }

    setLoading(true)
    setFormError('')
    try {
      const range = toRange(draft.date, draft.start, draft.end)
      const { error: insertError } = await supabase
        .from('room_booking')
        .insert([{ room_id: targetRoom, requested_by_user_id: user.userID, booking_time: range, purpose: draft.purpose, status: 'approved' }])
      if (insertError) throw insertError
      await loadBookings()
      setShowModal(false)
      setDraft(prev => ({ ...prev, purpose: '' }))
      setError('')
    } catch (e) {
      setFormError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  const cancel = async (bk) => {
    if (!user || bk.requested_by_user_id !== user.userID) {
      setError(resolveText('roomBooking.errors.cancelNotOwner', 'You can only cancel your own booking.'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('room_booking')
        .update({ status: 'cancelled' })
        .eq('booking_id', bk.booking_id)
      if (updateError) throw updateError
      await loadBookings()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  if (!checked) return null

  const monthLabel = currentMonth.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'id-ID', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="space-y-6 pb-8">
      <div className="px-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('roomBooking.title')}</h1>
        <p className="text-gray-600 text-sm">{t('roomBooking.subtitle')}</p>
      </div>

      {error && (
        <div className="px-4 py-2 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
            {'<'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
            {'>'}
          </Button>
          <span className="text-lg font-semibold text-gray-800">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="roomFilter">{t('roomBooking.fields.room')}</label>
          <select
            id="roomFilter"
            className="border rounded px-3 py-2 text-sm"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {rooms.map(r => (
              <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
            {weekDayLabels.map(label => (
              <div key={label} className="px-3 py-2 text-center">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {calendarDays.map(day => {
              const dateKey = day.toISOString().slice(0, 10)
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
              const isToday = dateKey === todayKey
              const dayBookings = bookingsByDate.get(dateKey) || []
              return (
                <button
                  key={dateKey + day.getTime()}
                  type="button"
                  onClick={() => openModalForDate(dateKey)}
                  className={`min-h-[110px] bg-white p-2 text-left transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 hover:bg-gray-100' : ''}`}
                >
                  <div className={`flex items-center justify-between text-xs font-medium ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                    <span>{day.getDate()}</span>
                    {isToday && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{resolveText('roomBooking.todayBadge', 'Today')}</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayBookings.slice(0, 3).map(bk => (
                      <div
                        key={bk.booking_id}
                        className={`rounded border px-2 py-1 text-[11px] leading-tight ${bk.status === 'approved' ? 'border-green-200 bg-green-50 text-green-700' : bk.status === 'pending' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                      >
                        <div className="font-semibold">{bk.startDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {bk.endDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="truncate">{bk.purpose || resolveText('roomBooking.fields.purposePlaceholder', 'Meeting / Activity')}</div>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <div className="text-[11px] text-gray-500">+{dayBookings.length - 3} {resolveText('roomBooking.moreLabel', 'more')}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('roomBooking.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingBookings.length === 0 && (
              <div className="text-sm text-gray-500">{t('roomBooking.empty')}</div>
            )}
            {upcomingBookings.map(bk => (
              <div key={bk.booking_id} className="rounded border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{bk.room?.room_name || '-'}</div>
                    <div className="text-sm text-gray-600">
                      {bk.startDate?.toLocaleDateString()} · {bk.startDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {bk.endDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {bk.purpose && <div className="text-sm text-gray-600">{bk.purpose}</div>}
                    <div className="text-xs text-gray-500">{bk.user ? `${bk.user.user_nama_depan || ''} ${bk.user.user_nama_belakang || ''}`.trim() : '-'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${bk.status === 'approved' ? 'bg-green-100 text-green-700' : bk.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {t(`roomBooking.status.${bk.status}`)}
                    </span>
                    {bk.status !== 'cancelled' && user && bk.requested_by_user_id === user.userID && (
                      <Button variant="ghost" size="sm" onClick={() => cancel(bk)} disabled={loading}>
                        {t('roomBooking.cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={resolveText('roomBooking.modalTitle', 'New Room Booking')}
        size="md"
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600" htmlFor="modalRoom">{t('roomBooking.fields.room')}</label>
            <select
              id="modalRoom"
              className="mt-1 w-full rounded border px-3 py-2"
              value={draft.roomId}
              onChange={(e) => setDraft(prev => ({ ...prev, roomId: e.target.value }))}
            >
              <option value="">{t('roomBooking.fields.roomPlaceholder')}</option>
              {rooms.map(r => (
                <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600" htmlFor="modalDate">{t('roomBooking.fields.date')}</label>
            <Input
              id="modalDate"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-600" htmlFor="modalStart">{t('roomBooking.fields.start')}</label>
              <Input
                id="modalStart"
                type="time"
                value={draft.start}
                onChange={(e) => setDraft(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600" htmlFor="modalEnd">{t('roomBooking.fields.end')}</label>
              <Input
                id="modalEnd"
                type="time"
                value={draft.end}
                onChange={(e) => setDraft(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600" htmlFor="modalPurpose">{t('roomBooking.fields.purpose')}</label>
            <Input
              id="modalPurpose"
              value={draft.purpose}
              onChange={(e) => setDraft(prev => ({ ...prev, purpose: e.target.value }))}
              placeholder={t('roomBooking.fields.purposePlaceholder')}
            />
          </div>
          {formError && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>{resolveText('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleCreateBooking} disabled={loading}>{t('roomBooking.submit')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
