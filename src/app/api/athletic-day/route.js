import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SETTINGS_KEY = 'athletic_day_data'

// Helper to check if dedicated tables exist
async function checkTablesExist() {
  try {
    const { error } = await supabaseAdmin.from('athletic_events').select('id').limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('relation "athletic_events" does not exist'))) {
      return false
    }
    return !error
  } catch {
    return false
  }
}

// Fallback: Read from settings
async function readFromSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single()

  if (error || !data?.value) {
    return { events: [], teams: [], scores: [] }
  }

  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch {
    return { events: [], teams: [], scores: [] }
  }
}

// Fallback: Write to settings
async function writeToSettings(storeData) {
  const payload = {
    key: SETTINGS_KEY,
    value: JSON.stringify(storeData),
    description: 'Data Athletic Day (events, master teams, and score logs)'
  }

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(payload, { onConflict: 'key' })

  if (error) throw error
}

// Leaderboard calculation
function calculateLeaderboard(teams, scores) {
  const scoreMap = {}
  const countMap = {}
  const historyMap = {}

  teams.forEach(t => {
    scoreMap[t.id] = 0
    countMap[t.id] = 0
    historyMap[t.id] = []
  })

  scores.forEach(s => {
    const teamId = Number(s.team_id)
    const pts = Number(s.points) || 0
    if (scoreMap[teamId] !== undefined) {
      scoreMap[teamId] += pts
      countMap[teamId] += 1
      historyMap[teamId].push(s)
    }
  })

  const leaderboard = teams.map(team => ({
    ...team,
    total_points: scoreMap[team.id] || 0,
    activity_count: countMap[team.id] || 0,
    history: historyMap[team.id] || []
  }))

  leaderboard.sort((a, b) => b.total_points - a.total_points || a.sort_order - b.sort_order)

  const leaderPoints = leaderboard[0]?.total_points || 0
  return leaderboard.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    gap_to_leader: idx === 0 ? 0 : leaderPoints - item.total_points
  }))
}

// GET /api/athletic-day
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearIdParam = searchParams.get('year_id')
    const eventIdParam = searchParams.get('event_id')

    // 1. Fetch available Academic Years
    const { data: yearsData, error: yearsError } = await supabaseAdmin
      .from('year')
      .select('year_id, year_name, start_date, end_date')
      .order('year_name', { ascending: false })

    if (yearsError) {
      console.error('Error fetching academic years:', yearsError)
    }

    const years = yearsData || []
    let selectedYearId = yearIdParam ? Number(yearIdParam) : null
    if (!selectedYearId && years.length > 0) {
      // Find 2026/2027 or first year
      const currentYearObj = years.find(y => y.year_name?.includes('2026') || y.year_id === 3) || years[0]
      selectedYearId = currentYearObj.year_id
    }

    const tablesExist = await checkTablesExist()

    if (tablesExist) {
      // READ FROM POSTGRES TABLES
      let eventsQuery = supabaseAdmin
        .from('athletic_events')
        .select('*')
        .order('id', { ascending: true })

      if (selectedYearId) {
        eventsQuery = eventsQuery.eq('year_id', selectedYearId)
      }

      const { data: events, error: evError } = await eventsQuery
      if (evError) throw evError

      const currentEvents = events || []
      const activeEvent = eventIdParam
        ? currentEvents.find(e => e.id === Number(eventIdParam)) || currentEvents[0]
        : currentEvents[0]

      const selectedEventId = activeEvent?.id || null

      let teams = []
      let scores = []

      if (selectedEventId) {
        const { data: teamsData, error: tmError } = await supabaseAdmin
          .from('athletic_teams')
          .select('*')
          .eq('event_id', selectedEventId)
          .order('sort_order', { ascending: true })

        if (tmError) throw tmError
        teams = teamsData || []

        const { data: scoresData, error: scError } = await supabaseAdmin
          .from('athletic_scores')
          .select('*, athletic_teams(name, color, icon)')
          .eq('event_id', selectedEventId)
          .order('created_at', { ascending: false })

        if (scError) throw scError
        scores = (scoresData || []).map(s => ({
          ...s,
          team_name: s.athletic_teams?.name || 'Unknown Team',
          team_color: s.athletic_teams?.color || '#3b82f6',
          team_icon: s.athletic_teams?.icon || 'shield'
        }))
      }

      const leaderboard = calculateLeaderboard(teams, scores)

      return NextResponse.json({
        success: true,
        storage_mode: 'database_tables',
        years,
        selected_year_id: selectedYearId,
        events: currentEvents,
        selected_event: activeEvent || null,
        teams,
        scores,
        leaderboard
      })
    } else {
      // FALLBACK TO SETTINGS STORE
      const store = await readFromSettings()
      const allEvents = store.events || []
      const filteredEvents = selectedYearId
        ? allEvents.filter(e => Number(e.year_id) === Number(selectedYearId))
        : allEvents

      const activeEvent = eventIdParam
        ? filteredEvents.find(e => Number(e.id) === Number(eventIdParam)) || filteredEvents[0]
        : filteredEvents[0]

      const selectedEventId = activeEvent?.id || null

      const allTeams = store.teams || []
      const teams = selectedEventId
        ? allTeams.filter(t => Number(t.event_id) === Number(selectedEventId))
        : []

      const allScores = store.scores || []
      const scores = selectedEventId
        ? allScores
            .filter(s => Number(s.event_id) === Number(selectedEventId))
            .map(s => {
              const tm = allTeams.find(t => Number(t.id) === Number(s.team_id))
              return {
                ...s,
                team_name: tm?.name || 'Unknown Team',
                team_color: tm?.color || '#3b82f6',
                team_icon: tm?.icon || 'shield'
              }
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : []

      const leaderboard = calculateLeaderboard(teams, scores)

      return NextResponse.json({
        success: true,
        storage_mode: 'settings_fallback',
        years,
        selected_year_id: selectedYearId,
        events: filteredEvents,
        selected_event: activeEvent || null,
        teams,
        scores,
        leaderboard
      })
    }
  } catch (error) {
    console.error('Athletic Day GET error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST /api/athletic-day (Unified actions: score, team, event management)
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    const tablesExist = await checkTablesExist()

    // ==========================================
    // ACTION 1: ADD SCORE
    // ==========================================
    if (action === 'add_score') {
      const { event_id, team_id, activity_name, points, notes, recorded_by } = body

      if (!event_id || !team_id || !activity_name || points === undefined || points === null) {
        return NextResponse.json(
          { success: false, message: 'Missing required score fields: event_id, team_id, activity_name, points' },
          { status: 400 }
        )
      }

      const numPoints = parseInt(points, 10)
      if (isNaN(numPoints) || numPoints < 1 || numPoints > 5) {
        return NextResponse.json({ success: false, message: 'Nilai poin harus antara 1 sampai 5 (1, 2, 3, 4, 5)' }, { status: 400 })
      }

      if (tablesExist) {
        const { data, error } = await supabaseAdmin
          .from('athletic_scores')
          .insert({
            event_id: Number(event_id),
            team_id: Number(team_id),
            activity_name: activity_name.trim(),
            points: numPoints,
            notes: notes ? notes.trim() : null,
            recorded_by: recorded_by || 'Admin'
          })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Score recorded successfully', data })
      } else {
        const store = await readFromSettings()
        const newScore = {
          id: Date.now(),
          event_id: Number(event_id),
          team_id: Number(team_id),
          activity_name: activity_name.trim(),
          points: numPoints,
          notes: notes ? notes.trim() : null,
          recorded_by: recorded_by || 'Admin',
          created_at: new Date().toISOString()
        }
        store.scores = [newScore, ...(store.scores || [])]
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Score recorded successfully', data: newScore })
      }
    }

    // ==========================================
    // ACTION 2: DELETE SCORE
    // ==========================================
    if (action === 'delete_score') {
      const { score_id } = body
      if (!score_id) {
        return NextResponse.json({ success: false, message: 'Missing score_id' }, { status: 400 })
      }

      if (tablesExist) {
        const { error } = await supabaseAdmin
          .from('athletic_scores')
          .delete()
          .eq('id', Number(score_id))

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Score log deleted' })
      } else {
        const store = await readFromSettings()
        store.scores = (store.scores || []).filter(s => Number(s.id) !== Number(score_id))
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Score log deleted' })
      }
    }

    // ==========================================
    // ACTION 3: CREATE MASTER TEAM
    // ==========================================
    if (action === 'create_team') {
      const { event_id, year_id, name, color, secondary_color, icon, motto } = body
      if (!event_id || !name) {
        return NextResponse.json({ success: false, message: 'Event ID and team name are required' }, { status: 400 })
      }

      if (tablesExist) {
        const { data, error } = await supabaseAdmin
          .from('athletic_teams')
          .insert({
            event_id: Number(event_id),
            year_id: Number(year_id) || 3,
            name: name.trim(),
            color: color || '#3b82f6',
            secondary_color: secondary_color || color || '#1d4ed8',
            icon: icon || 'shield',
            motto: motto ? motto.trim() : null
          })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Team created', data })
      } else {
        const store = await readFromSettings()
        const newTeam = {
          id: Date.now(),
          event_id: Number(event_id),
          year_id: Number(year_id) || 3,
          name: name.trim(),
          color: color || '#3b82f6',
          secondary_color: secondary_color || color || '#1d4ed8',
          icon: icon || 'shield',
          motto: motto ? motto.trim() : null,
          sort_order: (store.teams || []).length + 1,
          created_at: new Date().toISOString()
        }
        store.teams = [...(store.teams || []), newTeam]
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Team created', data: newTeam })
      }
    }

    // ==========================================
    // ACTION 4: UPDATE MASTER TEAM
    // ==========================================
    if (action === 'update_team') {
      const { team_id, name, color, secondary_color, icon, motto } = body
      if (!team_id || !name) {
        return NextResponse.json({ success: false, message: 'Team ID and name are required' }, { status: 400 })
      }

      if (tablesExist) {
        const { data, error } = await supabaseAdmin
          .from('athletic_teams')
          .update({
            name: name.trim(),
            color: color || '#3b82f6',
            secondary_color: secondary_color || color || '#1d4ed8',
            icon: icon || 'shield',
            motto: motto ? motto.trim() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', Number(team_id))
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Team updated', data })
      } else {
        const store = await readFromSettings()
        store.teams = (store.teams || []).map(t => {
          if (Number(t.id) === Number(team_id)) {
            return {
              ...t,
              name: name.trim(),
              color: color || t.color,
              secondary_color: secondary_color || t.secondary_color,
              icon: icon || t.icon,
              motto: motto !== undefined ? motto : t.motto,
              updated_at: new Date().toISOString()
            }
          }
          return t
        })
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Team updated' })
      }
    }

    // ==========================================
    // ACTION 5: DELETE MASTER TEAM
    // ==========================================
    if (action === 'delete_team') {
      const { team_id } = body
      if (!team_id) {
        return NextResponse.json({ success: false, message: 'Missing team_id' }, { status: 400 })
      }

      if (tablesExist) {
        const { error } = await supabaseAdmin
          .from('athletic_teams')
          .delete()
          .eq('id', Number(team_id))

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Team deleted' })
      } else {
        const store = await readFromSettings()
        store.teams = (store.teams || []).filter(t => Number(t.id) !== Number(team_id))
        store.scores = (store.scores || []).filter(s => Number(s.team_id) !== Number(team_id))
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Team deleted' })
      }
    }

    // ==========================================
    // ACTION 6: CREATE EVENT
    // ==========================================
    if (action === 'create_event') {
      const { year_id, name, code, banner_color, description } = body
      if (!name) {
        return NextResponse.json({ success: false, message: 'Event name is required' }, { status: 400 })
      }

      if (tablesExist) {
        const { data, error } = await supabaseAdmin
          .from('athletic_events')
          .insert({
            year_id: Number(year_id) || 3,
            name: name.trim(),
            code: (code || name.substring(0, 4)).toUpperCase().trim(),
            banner_color: banner_color || '#2563eb',
            description: description ? description.trim() : null
          })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Event created', data })
      } else {
        const store = await readFromSettings()
        const newEvent = {
          id: Date.now(),
          year_id: Number(year_id) || 3,
          name: name.trim(),
          code: (code || name.substring(0, 4)).toUpperCase().trim(),
          banner_color: banner_color || '#2563eb',
          description: description ? description.trim() : null,
          created_at: new Date().toISOString()
        }
        store.events = [...(store.events || []), newEvent]
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Event created', data: newEvent })
      }
    }

    // ==========================================
    // ACTION 7: RESET EVENT SCORES
    // ==========================================
    if (action === 'reset_scores') {
      const { event_id } = body
      if (!event_id) {
        return NextResponse.json({ success: false, message: 'Missing event_id' }, { status: 400 })
      }

      if (tablesExist) {
        const { error } = await supabaseAdmin
          .from('athletic_scores')
          .delete()
          .eq('event_id', Number(event_id))

        if (error) throw error
        return NextResponse.json({ success: true, message: 'All scores reset for this event' })
      } else {
        const store = await readFromSettings()
        store.scores = (store.scores || []).filter(s => Number(s.event_id) !== Number(event_id))
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'All scores reset for this event' })
      }
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Athletic Day POST error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
