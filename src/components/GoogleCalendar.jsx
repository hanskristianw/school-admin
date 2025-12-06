'use client'

import { useEffect, useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faChevronLeft, 
  faChevronRight, 
  faCalendarDay,
  faSync,
  faExternalLinkAlt,
  faMapMarkerAlt,
  faClock,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons'

// Google icon as SVG component
function GoogleIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// Color mapping for Google Calendar event colors
const colorMap = {
  '1': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  '2': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  '3': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  '4': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
  '5': { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  '6': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
  '7': { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800' },
  '8': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800' },
  '9': { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
  '10': { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800' },
  '11': { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800' },
  default: { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-800' }
}

export default function GoogleCalendar({ className = '' }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedDate, setSelectedDate] = useState(null)

  // Fetch calendar events
  const fetchEvents = async () => {
    const googleToken = localStorage.getItem('google_access_token')
    
    if (!googleToken) {
      setNeedsAuth(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Calculate time range for current month view (include prev/next month days visible)
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      // Extend range to show full weeks
      const startDay = startOfMonth.getDay()
      const timeMin = new Date(startOfMonth)
      timeMin.setDate(timeMin.getDate() - (startDay === 0 ? 6 : startDay - 1))
      
      const endDay = endOfMonth.getDay()
      const timeMax = new Date(endOfMonth)
      timeMax.setDate(timeMax.getDate() + (endDay === 0 ? 1 : 8 - endDay))

      const res = await fetch(`/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=100`, {
        headers: {
          'Authorization': `Bearer ${googleToken}`
        }
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (data.needsReauth) {
          setNeedsAuth(true)
          localStorage.removeItem('google_access_token')
        } else {
          setError(data.error || 'Gagal memuat kalender')
        }
        setLoading(false)
        return
      }
      
      setEvents(data.events || [])
      setNeedsAuth(false)
    } catch (err) {
      console.error('Calendar fetch error:', err)
      setError('Gagal memuat kalender')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [currentMonth])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(event => {
      const dateKey = event.start?.split('T')[0] || event.start
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(event)
    })
    return map
  }, [events])

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Start from Monday
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    
    const days = []
    
    // Previous month days
    const prevMonth = new Date(year, month, 0)
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      })
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }
    
    // Next month days to complete the grid
    const remaining = 42 - days.length // 6 weeks * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }
    
    return days
  }, [currentMonth])

  // Format date for comparison
  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0]
  }

  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  // Format time
  const formatTime = (dateString) => {
    if (!dateString || !dateString.includes('T')) return 'All day'
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = formatDateKey(selectedDate)
    return eventsByDate[dateKey] || []
  }, [selectedDate, eventsByDate])

  // Navigation
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    today.setDate(1)
    today.setHours(0, 0, 0, 0)
    setCurrentMonth(today)
    setSelectedDate(new Date())
  }

  // Handle re-auth by triggering Google login
  const handleReAuth = () => {
    if (window.googleTokenClient) {
      window.googleTokenClient.requestAccessToken()
    } else {
      // Fallback: redirect to login
      window.location.href = '/login?reauth=calendar'
    }
  }

  if (needsAuth) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <GoogleIcon className="w-5 h-5" />
          <h3 className="font-semibold text-gray-800">Google Calendar</h3>
        </div>
        <div className="text-center py-8">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-yellow-500 text-3xl mb-3" />
          <p className="text-gray-600 mb-4">Hubungkan Google Calendar untuk melihat jadwal Anda</p>
          <button
            onClick={handleReAuth}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <GoogleIcon className="w-4 h-4" />
            Hubungkan Google Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoogleIcon className="w-5 h-5" />
            <h3 className="font-semibold text-gray-800">Google Calendar</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="font-medium text-gray-800">
            {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}
        
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarGrid.map((day, idx) => {
            const dateKey = formatDateKey(day.date)
            const dayEvents = eventsByDate[dateKey] || []
            const hasEvents = dayEvents.length > 0
            const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey
            
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day.date)}
                className={`
                  relative p-1 min-h-[40px] text-sm rounded transition-colors
                  ${day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                  ${isToday(day.date) ? 'bg-blue-600 text-white font-bold' : ''}
                  ${isSelected && !isToday(day.date) ? 'bg-blue-100 ring-2 ring-blue-400' : ''}
                  ${!isSelected && !isToday(day.date) ? 'hover:bg-gray-100' : ''}
                `}
              >
                <span className="block">{day.date.getDate()}</span>
                {hasEvents && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => {
                      const colors = colorMap[event.colorId] || colorMap.default
                      return (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('100', '500')}`}
                        />
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-gray-500">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faCalendarDay} className="text-blue-600 text-sm" />
            <span className="font-medium text-gray-800">
              {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          
          {selectedDateEvents.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Tidak ada acara</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {selectedDateEvents.map(event => {
                const colors = colorMap[event.colorId] || colorMap.default
                return (
                  <div
                    key={event.id}
                    className={`p-2 rounded-lg border-l-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${colors.text}`}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="text-gray-400" />
                            {event.isAllDay ? 'Sepanjang hari' : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Buka di Google Calendar"
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
