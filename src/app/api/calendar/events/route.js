import { NextResponse } from 'next/server'

// Fetch events from Google Calendar (all visible calendars)
export async function GET(req) {
  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 401 })
    }
    
    const accessToken = authHeader.replace('Bearer ', '')
    
    // Get query parameters
    const { searchParams } = new URL(req.url)
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const maxResults = searchParams.get('maxResults') || '100'
    
    // First, get list of all calendars
    const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    
    if (!calendarListResponse.ok) {
      const errorData = await calendarListResponse.json().catch(() => ({}))
      console.error('Google Calendar List API error:', errorData)
      
      if (calendarListResponse.status === 401) {
        return NextResponse.json({ error: 'Token expired or invalid', needsReauth: true }, { status: 401 })
      }
      
      return NextResponse.json({ error: errorData.error?.message || 'Failed to fetch calendar list' }, { status: calendarListResponse.status })
    }
    
    const calendarListData = await calendarListResponse.json()
    const calendars = calendarListData.items || []
    
    // Fetch events from all calendars in parallel
    const allEvents = []
    
    const fetchPromises = calendars.map(async (calendar) => {
      try {
        const calendarUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`)
        calendarUrl.searchParams.set('timeMin', timeMin)
        calendarUrl.searchParams.set('timeMax', timeMax)
        calendarUrl.searchParams.set('maxResults', maxResults)
        calendarUrl.searchParams.set('singleEvents', 'true')
        calendarUrl.searchParams.set('orderBy', 'startTime')
        
        const response = await fetch(calendarUrl.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          return (data.items || []).map(event => ({
            id: event.id,
            title: event.summary || '(No title)',
            description: event.description || '',
            location: event.location || '',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            isAllDay: !event.start?.dateTime,
            htmlLink: event.htmlLink,
            colorId: event.colorId || calendar.colorId,
            status: event.status,
            calendarName: calendar.summary,
            calendarColor: calendar.backgroundColor
          }))
        }
        return []
      } catch (e) {
        console.error(`Error fetching calendar ${calendar.id}:`, e)
        return []
      }
    })
    
    const results = await Promise.all(fetchPromises)
    results.forEach(events => allEvents.push(...events))
    
    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aTime = new Date(a.start).getTime()
      const bTime = new Date(b.start).getTime()
      return aTime - bTime
    })
    
    return NextResponse.json({ 
      success: true, 
      events: allEvents,
      calendarCount: calendars.length
    })
    
  } catch (err) {
    console.error('Calendar events error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
