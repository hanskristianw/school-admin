import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_AWARD_CATEGORIES, formatStaffFullName } from '@/lib/staffAwards'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
)

const SETTINGS_KEY = 'staff_awards_data'
const GUEST_ROLE_ID = 22

/**
 * Fetches all rows from a Supabase query using 1,000-row chunked pagination
 * to avoid PostgREST's hard max-rows truncation limit.
 */
async function fetchAllRows(queryFn, chunkSize = 1000) {
  let allRows = []
  let from = 0
  while (true) {
    const { data, error } = await queryFn(from, from + chunkSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    allRows = allRows.concat(data)
    if (data.length < chunkSize) break
    from += chunkSize
  }
  return allRows
}

function getJakartaDateStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

async function checkTablesExist() {
  try {
    const { error } = await supabaseAdmin.from('staff_award_events').select('id').limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('relation "staff_award_events" does not exist'))) {
      return false
    }
    return !error
  } catch {
    return false
  }
}

async function readStore() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()

  if (error || !data?.value) {
    return { events: [], categories: [], submissions: [], votes: [] }
  }
  try {
    const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : []
    }
  } catch {
    return { events: [], categories: [], submissions: [], votes: [] }
  }
}

async function writeStore(storeData) {
  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(
      {
        key: SETTINGS_KEY,
        value: JSON.stringify(storeData),
        description: 'Data Teachers & Staff Recognition / Staff Awards (events, categories, submissions, anonymous votes)'
      },
      { onConflict: 'key' }
    )
  if (error) throw error
}

function nextId(items) {
  return (items || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

/**
 * Loads active academic years, eligible staff directory (active, non-resigned,
 * non-student, non-vendor, non-guest), and server-verified caller permissions.
 */
async function getEligibleStaffAndCaller(callerUserId) {
  const [rolesRes, unitsRes, yearsRes, allUsers] = await Promise.all([
    supabaseAdmin
      .from('role')
      .select('role_id, role_name, is_admin, is_student, is_vendor')
      .order('role_id'),
    supabaseAdmin
      .from('unit')
      .select('unit_id, unit_name')
      .order('unit_id'),
    supabaseAdmin
      .from('year')
      .select('year_id, year_name, start_date, end_date')
      .order('year_id', { ascending: false }),
    fetchAllRows((from, to) =>
      supabaseAdmin
        .from('users')
        .select('user_id, user_nama_depan, user_nama_belakang, user_role_id, user_unit_id, is_active, resign_date, user_profile_picture')
        .order('user_id', { ascending: true })
        .range(from, to)
    )
  ])

  if (rolesRes.error) throw rolesRes.error
  if (unitsRes.error) throw unitsRes.error
  if (yearsRes.error) throw yearsRes.error

  const roleMap = new Map((rolesRes.data || []).map(r => [Number(r.role_id), r]))
  const unitMap = new Map((unitsRes.data || []).map(u => [Number(u.unit_id), u]))
  const years = yearsRes.data || []
  const today = getJakartaDateStr()

  const eligibleStaff = []
  const eligibleIdSet = new Set()
  let callerUser = null

  for (const u of allUsers) {
    if (Number(u.user_id) === Number(callerUserId)) {
      callerUser = u
    }
    if (u.is_active !== true) continue
    if (u.resign_date && String(u.resign_date).slice(0, 10) < today) continue

    const role = roleMap.get(Number(u.user_role_id))
    if (!role) continue
    if (role.is_student === true || role.is_vendor === true) continue
    if (Number(role.role_id) === GUEST_ROLE_ID || String(role.role_name || '').trim().toLowerCase() === 'guest') continue

    const unit = unitMap.get(Number(u.user_unit_id))
    const fullName = formatStaffFullName(u.user_nama_depan, u.user_nama_belakang) || `User #${u.user_id}`

    eligibleIdSet.add(Number(u.user_id))
    eligibleStaff.push({
      user_id: Number(u.user_id),
      full_name: fullName,
      role_id: Number(role.role_id),
      role_name: role.role_name || 'Staff',
      unit_id: u.user_unit_id ? Number(u.user_unit_id) : null,
      unit_name: unit?.unit_name || 'School',
      profile_picture: u.user_profile_picture || null
    })
  }

  eligibleStaff.sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  const callerRole = callerUser ? roleMap.get(Number(callerUser.user_role_id)) : null
  const isAdmin = Boolean(callerUser && callerUser.is_active === true && callerRole?.is_admin === true)
  const isEligibleVoter = eligibleIdSet.has(Number(callerUserId))

  return {
    years,
    eligibleStaff,
    eligibleIdSet,
    isAdmin,
    isEligibleVoter
  }
}

function resolveDefaultYear(years) {
  if (!years || years.length === 0) return null
  const today = getJakartaDateStr()
  return (
    years.find(y => y.start_date && y.end_date && today >= y.start_date && today <= y.end_date) ||
    years.find(y => Number(y.year_id) === 3) ||
    years[0]
  )
}

async function seedDefaultEvent(hasTables, years) {
  const defaultYear = resolveDefaultYear(years)
  const yearLabel = defaultYear?.year_name || '2026/2027'
  const eventPayload = {
    year_id: defaultYear?.year_id || null,
    title: `Teachers & Staff Recognition ${yearLabel}`,
    description:
      'There are 10 awards presented in this year’s CCS Teachers & Staff Recognition. This special recognition aims to celebrate and acknowledge the dedication, hard work, and positive contributions of our teachers and staff. Each award highlights unique qualities that help make our school a warm, joyful, and thriving community.',
    status: 'active'
  }

  if (hasTables) {
    const { data: createdEvent, error: evErr } = await supabaseAdmin
      .from('staff_award_events')
      .insert([eventPayload])
      .select()
      .single()
    if (evErr) throw evErr

    const categoriesPayload = DEFAULT_AWARD_CATEGORIES.map(c => ({
      ...c,
      event_id: createdEvent.id
    }))
    const { error: catErr } = await supabaseAdmin
      .from('staff_award_categories')
      .insert(categoriesPayload)
    if (catErr) throw catErr
    return createdEvent
  }

  const store = await readStore()
  if (store.events.length > 0) return store.events[0]

  const now = new Date().toISOString()
  const newEvent = {
    id: 1,
    ...eventPayload,
    created_at: now,
    updated_at: now
  }
  const newCategories = DEFAULT_AWARD_CATEGORIES.map((c, idx) => ({
    id: idx + 1,
    event_id: newEvent.id,
    ...c,
    created_at: now
  }))
  await writeStore({
    events: [newEvent],
    categories: newCategories,
    submissions: [],
    votes: []
  })
  return newEvent
}

function buildAdminAnalytics(eligibleStaff, categories, submissions, votes) {
  const staffMap = new Map(eligibleStaff.map(s => [s.user_id, s]))
  const submittedMap = new Map()
  for (const sub of submissions) {
    submittedMap.set(Number(sub.voter_user_id), sub.submitted_at)
  }

  const votedUsers = []
  const notVotedUsers = []
  for (const staff of eligibleStaff) {
    const subTime = submittedMap.get(staff.user_id)
    if (subTime) {
      votedUsers.push({
        user_id: staff.user_id,
        full_name: staff.full_name,
        role_name: staff.role_name,
        unit_name: staff.unit_name,
        submitted_at: subTime
      })
    } else {
      notVotedUsers.push({
        user_id: staff.user_id,
        full_name: staff.full_name,
        role_name: staff.role_name,
        unit_name: staff.unit_name
      })
    }
  }

  votedUsers.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  notVotedUsers.sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  const totalEligible = eligibleStaff.length
  const votedCount = votedUsers.length
  const notVotedCount = notVotedUsers.length
  const turnoutPct = totalEligible > 0 ? Number(((votedCount / totalEligible) * 100).toFixed(1)) : 0

  // Tally votes per category -> nominee
  const categoryVoteMap = new Map()
  for (const cat of categories) {
    categoryVoteMap.set(Number(cat.id), new Map())
  }
  for (const v of votes) {
    const catId = Number(v.category_id)
    const nomId = Number(v.nominee_user_id)
    if (!categoryVoteMap.has(catId)) continue
    const nomMap = categoryVoteMap.get(catId)
    nomMap.set(nomId, (nomMap.get(nomId) || 0) + 1)
  }

  const results = categories.map(cat => {
    const nomMap = categoryVoteMap.get(Number(cat.id)) || new Map()
    let totalVotes = 0
    for (const c of nomMap.values()) totalVotes += c

    const rankings = Array.from(nomMap.entries()).map(([nomId, voteCount]) => {
      const staff = staffMap.get(nomId)
      return {
        nominee_user_id: nomId,
        full_name: staff?.full_name || `User #${nomId}`,
        role_name: staff?.role_name || 'Staff',
        unit_name: staff?.unit_name || 'School',
        vote_count: voteCount,
        percentage: totalVotes > 0 ? Number(((voteCount / totalVotes) * 100).toFixed(1)) : 0
      }
    })

    rankings.sort((a, b) => b.vote_count - a.vote_count || a.full_name.localeCompare(b.full_name, 'id'))

    let currentRank = 0
    let prevCount = null
    const rankedList = rankings.map((row, idx) => {
      if (row.vote_count !== prevCount) {
        currentRank = idx + 1
        prevCount = row.vote_count
      }
      return { ...row, rank: currentRank }
    })

    return {
      category_id: Number(cat.id),
      sort_order: cat.sort_order,
      title: cat.title,
      description: cat.description,
      icon: cat.icon,
      color_gradient: cat.color_gradient,
      total_votes: totalVotes,
      rankings: rankedList
    }
  })

  return {
    participation: {
      total_eligible: totalEligible,
      voted_count: votedCount,
      not_voted_count: notVotedCount,
      turnout_percentage: turnoutPct,
      voted_users: votedUsers,
      not_voted_users: notVotedUsers
    },
    results
  }
}

function pickSelectedEvent(events, { isAdmin, eventIdParam, yearIdParam }) {
  if (!events || events.length === 0) return null
  const sorted = [...events].sort((a, b) => Number(b.id) - Number(a.id))

  if (isAdmin && eventIdParam) {
    const found = sorted.find(e => Number(e.id) === Number(eventIdParam))
    if (found) return found
  }

  const scoped = yearIdParam
    ? sorted.filter(e => Number(e.year_id) === Number(yearIdParam))
    : sorted

  if (isAdmin) {
    return scoped.find(e => e.status === 'active') || scoped[0] || sorted[0]
  }

  return scoped.find(e => e.status === 'active') || sorted.find(e => e.status === 'active') || scoped[0] || sorted[0]
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('user_id')
    const eventIdParam = searchParams.get('event_id')
    const yearIdParam = searchParams.get('year_id')

    if (!userIdParam || isNaN(Number(userIdParam))) {
      return NextResponse.json({ success: false, message: 'Parameter user_id is required.' }, { status: 400 })
    }

    const callerUserId = Number(userIdParam)
    const [{ years, eligibleStaff, isAdmin, isEligibleVoter }, hasTables] = await Promise.all([
      getEligibleStaffAndCaller(callerUserId),
      checkTablesExist()
    ])

    let events = []
    let categories = []
    let submissions = []
    let votes = []

    if (hasTables) {
      const { data: evData, error: evErr } = await supabaseAdmin
        .from('staff_award_events')
        .select('*')
        .order('id', { ascending: false })
      if (evErr) throw evErr
      events = evData || []

      if (events.length === 0) {
        const seeded = await seedDefaultEvent(true, years)
        events = [seeded]
      }
    } else {
      let store = await readStore()
      if (!store.events || store.events.length === 0) {
        await seedDefaultEvent(false, years)
        store = await readStore()
      }
      events = store.events
      categories = store.categories
      submissions = store.submissions
      votes = store.votes
    }

    const selectedEvent = pickSelectedEvent(events, { isAdmin, eventIdParam, yearIdParam })

    let selectedCategories = []
    let callerSubmission = null
    let eventSubmissions = []
    let eventVotes = []
    let allEventCounts = {}

    if (selectedEvent) {
      if (hasTables) {
        const { data: catData, error: catErr } = await supabaseAdmin
          .from('staff_award_categories')
          .select('*')
          .eq('event_id', selectedEvent.id)
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true })
        if (catErr) throw catErr
        selectedCategories = catData || []

        if (isAdmin) {
          const [subRows, voteRows, allSubs, allCats] = await Promise.all([
            fetchAllRows((from, to) =>
              supabaseAdmin
                .from('staff_award_submissions')
                .select('*')
                .eq('event_id', selectedEvent.id)
                .order('id', { ascending: true })
                .range(from, to)
            ),
            fetchAllRows((from, to) =>
              supabaseAdmin
                .from('staff_award_votes')
                .select('*')
                .eq('event_id', selectedEvent.id)
                .order('id', { ascending: true })
                .range(from, to)
            ),
            fetchAllRows((from, to) =>
              supabaseAdmin
                .from('staff_award_submissions')
                .select('event_id')
                .order('id', { ascending: true })
                .range(from, to)
            ),
            fetchAllRows((from, to) =>
              supabaseAdmin
                .from('staff_award_categories')
                .select('event_id')
                .order('id', { ascending: true })
                .range(from, to)
            )
          ])
          eventSubmissions = subRows
          eventVotes = voteRows
          callerSubmission = subRows.find(s => Number(s.voter_user_id) === callerUserId) || null
          for (const s of allSubs) {
            const k = Number(s.event_id)
            if (!allEventCounts[k]) allEventCounts[k] = { submissions: 0, categories: 0 }
            allEventCounts[k].submissions += 1
          }
          for (const c of allCats) {
            const k = Number(c.event_id)
            if (!allEventCounts[k]) allEventCounts[k] = { submissions: 0, categories: 0 }
            allEventCounts[k].categories += 1
          }
        } else {
          const { data: mySub, error: mySubErr } = await supabaseAdmin
            .from('staff_award_submissions')
            .select('id, submitted_at')
            .eq('event_id', selectedEvent.id)
            .eq('voter_user_id', callerUserId)
            .maybeSingle()
          if (mySubErr) throw mySubErr
          callerSubmission = mySub || null
        }
      } else {
        selectedCategories = categories
          .filter(c => Number(c.event_id) === Number(selectedEvent.id))
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(a.id) - Number(b.id))

        eventSubmissions = submissions.filter(s => Number(s.event_id) === Number(selectedEvent.id))
        eventVotes = votes.filter(v => Number(v.event_id) === Number(selectedEvent.id))
        callerSubmission = eventSubmissions.find(s => Number(s.voter_user_id) === callerUserId) || null

        for (const s of submissions) {
          const k = Number(s.event_id)
          if (!allEventCounts[k]) allEventCounts[k] = { submissions: 0, categories: 0 }
          allEventCounts[k].submissions += 1
        }
        for (const c of categories) {
          const k = Number(c.event_id)
          if (!allEventCounts[k]) allEventCounts[k] = { submissions: 0, categories: 0 }
          allEventCounts[k].categories += 1
        }
      }
    }

    const yearMap = new Map(years.map(y => [Number(y.year_id), y.year_name]))
    const selectedEventEnriched = selectedEvent
      ? { ...selectedEvent, year_name: yearMap.get(Number(selectedEvent.year_id)) || '' }
      : null

    const baseResponse = {
      success: true,
      storage_mode: hasTables ? 'database_tables' : 'settings_fallback',
      is_admin: isAdmin,
      is_eligible_voter: isEligibleVoter,
      selected_event: selectedEventEnriched,
      categories: selectedCategories,
      nominees: eligibleStaff,
      has_voted: Boolean(callerSubmission),
      submitted_at: callerSubmission?.submitted_at || null
    }

    if (isAdmin) {
      const analytics = buildAdminAnalytics(eligibleStaff, selectedCategories, eventSubmissions, eventVotes)
      baseResponse.years = years
      baseResponse.events = [...events]
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(ev => ({
          ...ev,
          year_name: yearMap.get(Number(ev.year_id)) || '',
          category_count: allEventCounts[Number(ev.id)]?.categories || 0,
          submission_count: allEventCounts[Number(ev.id)]?.submissions || 0
        }))
      baseResponse.participation = analytics.participation
      baseResponse.results = analytics.results
    }

    return NextResponse.json(baseResponse)
  } catch (err) {
    console.error('GET /api/staff-awards error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, user_id } = body || {}

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action is required.' }, { status: 400 })
    }
    if (!user_id || isNaN(Number(user_id))) {
      return NextResponse.json({ success: false, message: 'User identifier (user_id) is required.' }, { status: 400 })
    }

    const callerUserId = Number(user_id)
    const [{ eligibleIdSet, isAdmin, isEligibleVoter }, hasTables] = await Promise.all([
      getEligibleStaffAndCaller(callerUserId),
      checkTablesExist()
    ])

    // ─────────────────────────────────────────────────────────────
    // ACTION: cast_vote (Any active non-student non-vendor non-guest staff)
    // ─────────────────────────────────────────────────────────────
    if (action === 'cast_vote') {
      if (!isEligibleVoter) {
        return NextResponse.json(
          { success: false, message: 'Your account is not eligible to vote in Staff Awards.' },
          { status: 403 }
        )
      }

      const eventId = Number(body.event_id)
      const selections = Array.isArray(body.selections) ? body.selections : []
      if (!eventId) {
        return NextResponse.json({ success: false, message: 'event_id is required.' }, { status: 400 })
      }

      let event = null
      let eventCategories = []
      let alreadyVoted = false

      if (hasTables) {
        const [{ data: evData, error: evErr }, { data: catData, error: catErr }, { data: subData, error: subErr }] = await Promise.all([
          supabaseAdmin.from('staff_award_events').select('*').eq('id', eventId).maybeSingle(),
          supabaseAdmin.from('staff_award_categories').select('id').eq('event_id', eventId),
          supabaseAdmin
            .from('staff_award_submissions')
            .select('id')
            .eq('event_id', eventId)
            .eq('voter_user_id', callerUserId)
            .maybeSingle()
        ])
        if (evErr) throw evErr
        if (catErr) throw catErr
        if (subErr) throw subErr
        event = evData
        eventCategories = catData || []
        alreadyVoted = Boolean(subData)
      } else {
        const store = await readStore()
        event = store.events.find(e => Number(e.id) === eventId) || null
        eventCategories = store.categories.filter(c => Number(c.event_id) === eventId)
        alreadyVoted = store.submissions.some(
          s => Number(s.event_id) === eventId && Number(s.voter_user_id) === callerUserId
        )
      }

      if (!event) {
        return NextResponse.json({ success: false, message: 'Recognition event not found.' }, { status: 404 })
      }
      if (event.status !== 'active') {
        return NextResponse.json({ success: false, message: 'Voting is currently not open for this event.' }, { status: 400 })
      }
      if (alreadyVoted) {
        return NextResponse.json({ success: false, message: 'You have already submitted your ballot for this recognition event.' }, { status: 409 })
      }
      if (eventCategories.length === 0) {
        return NextResponse.json({ success: false, message: 'No award categories are configured for this event.' }, { status: 400 })
      }

      // Verify exact category coverage
      const validCatIds = new Set(eventCategories.map(c => Number(c.id)))
      const seenCatIds = new Set()
      const nomineeIds = []

      for (const sel of selections) {
        const catId = Number(sel?.category_id)
        const nomId = Number(sel?.nominee_user_id)
        if (!validCatIds.has(catId) || seenCatIds.has(catId)) {
          return NextResponse.json({ success: false, message: 'Invalid or duplicate category selection.' }, { status: 400 })
        }
        if (!eligibleIdSet.has(nomId)) {
          return NextResponse.json({ success: false, message: 'Selected nominee is invalid or no longer active.' }, { status: 400 })
        }
        if (nomId === callerUserId) {
          return NextResponse.json({ success: false, message: 'You cannot nominate yourself.' }, { status: 400 })
        }
        seenCatIds.add(catId)
        nomineeIds.push(nomId)
      }

      if (seenCatIds.size !== validCatIds.size) {
        return NextResponse.json(
          { success: false, message: `Please complete all ${validCatIds.size} award categories before submitting.` },
          { status: 400 }
        )
      }

      if (new Set(nomineeIds).size !== nomineeIds.length) {
        return NextResponse.json(
          { success: false, message: 'Each colleague may only be nominated once across all award categories.' },
          { status: 400 }
        )
      }

      const now = new Date().toISOString()

      if (hasTables) {
        const { data: insertedSub, error: subInsertErr } = await supabaseAdmin
          .from('staff_award_submissions')
          .insert([{ event_id: eventId, voter_user_id: callerUserId, submitted_at: now }])
          .select()
          .single()

        if (subInsertErr) {
          if (subInsertErr.code === '23505') {
            return NextResponse.json({ success: false, message: 'You have already submitted your ballot for this recognition event.' }, { status: 409 })
          }
          throw subInsertErr
        }

        const votePayloads = selections.map(s => ({
          event_id: eventId,
          category_id: Number(s.category_id),
          nominee_user_id: Number(s.nominee_user_id),
          created_at: now
        }))

        const { error: votesErr } = await supabaseAdmin.from('staff_award_votes').insert(votePayloads)
        if (votesErr) {
          await supabaseAdmin.from('staff_award_submissions').delete().eq('id', insertedSub.id)
          throw votesErr
        }

        return NextResponse.json({
          success: true,
          message: 'Thank you. Your nominations have been recorded.',
          submitted_at: now
        })
      }

      // Fallback store mode
      const store = await readStore()
      const doubleCheck = store.submissions.some(
        s => Number(s.event_id) === eventId && Number(s.voter_user_id) === callerUserId
      )
      if (doubleCheck) {
        return NextResponse.json({ success: false, message: 'You have already submitted your ballot for this recognition event.' }, { status: 409 })
      }

      const newSub = {
        id: nextId(store.submissions),
        event_id: eventId,
        voter_user_id: callerUserId,
        submitted_at: now
      }
      let voteIdCursor = nextId(store.votes)
      const newVotes = selections.map(s => ({
        id: voteIdCursor++,
        event_id: eventId,
        category_id: Number(s.category_id),
        nominee_user_id: Number(s.nominee_user_id),
        created_at: now
      }))

      store.submissions.push(newSub)
      store.votes.push(...newVotes)
      await writeStore(store)

      return NextResponse.json({
        success: true,
        message: 'Thank you. Your nominations have been recorded.',
        submitted_at: now
      })
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN-ONLY GUARD FOR ALL MANAGEMENT ACTIONS
    // ─────────────────────────────────────────────────────────────
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Administrator privileges are required.' },
        { status: 403 }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: create_or_update_event
    // ─────────────────────────────────────────────────────────────
    if (action === 'create_or_update_event') {
      const { id, year_id, title, description, status, seed_defaults = true } = body
      if (!title || !String(title).trim()) {
        return NextResponse.json({ success: false, message: 'Event title is required.' }, { status: 400 })
      }
      const validStatus = ['draft', 'active', 'closed'].includes(status) ? status : 'draft'
      const now = new Date().toISOString()

      if (hasTables) {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('staff_award_events')
            .update({
              year_id: year_id ? Number(year_id) : null,
              title: String(title).trim(),
              description: description ? String(description).trim() : null,
              status: validStatus,
              updated_at: now
            })
            .eq('id', Number(id))
            .select()
            .single()
          if (error) throw error
          return NextResponse.json({ success: true, data, message: 'Event updated.' })
        }

        const { data: created, error } = await supabaseAdmin
          .from('staff_award_events')
          .insert([{
            year_id: year_id ? Number(year_id) : null,
            title: String(title).trim(),
            description: description ? String(description).trim() : null,
            status: validStatus
          }])
          .select()
          .single()
        if (error) throw error

        if (seed_defaults) {
          const catPayloads = DEFAULT_AWARD_CATEGORIES.map(c => ({ ...c, event_id: created.id }))
          const { error: catErr } = await supabaseAdmin.from('staff_award_categories').insert(catPayloads)
          if (catErr) throw catErr
        }
        return NextResponse.json({ success: true, data: created, message: 'Event created.' })
      }

      const store = await readStore()
      if (id) {
        const idx = store.events.findIndex(e => Number(e.id) === Number(id))
        if (idx === -1) return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 })
        store.events[idx] = {
          ...store.events[idx],
          year_id: year_id ? Number(year_id) : null,
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          status: validStatus,
          updated_at: now
        }
        await writeStore(store)
        return NextResponse.json({ success: true, data: store.events[idx], message: 'Event updated.' })
      }

      const newEv = {
        id: nextId(store.events),
        year_id: year_id ? Number(year_id) : null,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        status: validStatus,
        created_at: now,
        updated_at: now
      }
      store.events.push(newEv)
      if (seed_defaults) {
        let catIdCursor = nextId(store.categories)
        const seededCats = DEFAULT_AWARD_CATEGORIES.map(c => ({
          id: catIdCursor++,
          event_id: newEv.id,
          ...c,
          created_at: now
        }))
        store.categories.push(...seededCats)
      }
      await writeStore(store)
      return NextResponse.json({ success: true, data: newEv, message: 'Event created.' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: delete_event
    // ─────────────────────────────────────────────────────────────
    if (action === 'delete_event') {
      const eventId = Number(body.event_id || body.id)
      if (!eventId) return NextResponse.json({ success: false, message: 'event_id is required.' }, { status: 400 })

      if (hasTables) {
        const { error } = await supabaseAdmin.from('staff_award_events').delete().eq('id', eventId)
        if (error) throw error
        return NextResponse.json({ success: true, message: 'Event deleted.' })
      }

      const store = await readStore()
      store.events = store.events.filter(e => Number(e.id) !== eventId)
      store.categories = store.categories.filter(c => Number(c.event_id) !== eventId)
      store.submissions = store.submissions.filter(s => Number(s.event_id) !== eventId)
      store.votes = store.votes.filter(v => Number(v.event_id) !== eventId)
      await writeStore(store)
      return NextResponse.json({ success: true, message: 'Event deleted.' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: create_or_update_category
    // ─────────────────────────────────────────────────────────────
    if (action === 'create_or_update_category') {
      const { id, event_id, sort_order, title, description, icon, color_gradient } = body
      if (!event_id || !title || !String(title).trim()) {
        return NextResponse.json({ success: false, message: 'Event and category title are required.' }, { status: 400 })
      }
      const payload = {
        event_id: Number(event_id),
        sort_order: Number(sort_order) || 1,
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        icon: icon || 'award',
        color_gradient: color_gradient || 'amber'
      }

      if (hasTables) {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('staff_award_categories')
            .update(payload)
            .eq('id', Number(id))
            .select()
            .single()
          if (error) throw error
          return NextResponse.json({ success: true, data, message: 'Category updated.' })
        }
        const { data, error } = await supabaseAdmin.from('staff_award_categories').insert([payload]).select().single()
        if (error) throw error
        return NextResponse.json({ success: true, data, message: 'Category added.' })
      }

      const store = await readStore()
      if (id) {
        const idx = store.categories.findIndex(c => Number(c.id) === Number(id))
        if (idx === -1) return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 })
        store.categories[idx] = { ...store.categories[idx], ...payload }
        await writeStore(store)
        return NextResponse.json({ success: true, data: store.categories[idx], message: 'Category updated.' })
      }
      const newCat = { id: nextId(store.categories), ...payload, created_at: new Date().toISOString() }
      store.categories.push(newCat)
      await writeStore(store)
      return NextResponse.json({ success: true, data: newCat, message: 'Category added.' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: delete_category
    // ─────────────────────────────────────────────────────────────
    if (action === 'delete_category') {
      const catId = Number(body.category_id || body.id)
      const eventId = Number(body.event_id)
      if (!catId) return NextResponse.json({ success: false, message: 'category_id is required.' }, { status: 400 })

      if (hasTables) {
        if (eventId) {
          const { count } = await supabaseAdmin
            .from('staff_award_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId)
          if ((count || 0) > 0) {
            return NextResponse.json(
              { success: false, message: 'Cannot delete a category after votes have been submitted. Reset event votes first if you need to modify the category list.' },
              { status: 400 }
            )
          }
        }
        const { error } = await supabaseAdmin.from('staff_award_categories').delete().eq('id', catId)
        if (error) throw error
        return NextResponse.json({ success: true, message: 'Category deleted.' })
      }

      const store = await readStore()
      const cat = store.categories.find(c => Number(c.id) === catId)
      const targetEvId = eventId || Number(cat?.event_id)
      if (targetEvId && store.submissions.some(s => Number(s.event_id) === targetEvId)) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete a category after votes have been submitted. Reset event votes first if you need to modify the category list.' },
          { status: 400 }
        )
      }
      store.categories = store.categories.filter(c => Number(c.id) !== catId)
      store.votes = store.votes.filter(v => Number(v.category_id) !== catId)
      await writeStore(store)
      return NextResponse.json({ success: true, message: 'Category deleted.' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: seed_default_categories
    // ─────────────────────────────────────────────────────────────
    if (action === 'seed_default_categories') {
      const eventId = Number(body.event_id)
      if (!eventId) return NextResponse.json({ success: false, message: 'event_id is required.' }, { status: 400 })

      if (hasTables) {
        const { count } = await supabaseAdmin
          .from('staff_award_categories')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
        if ((count || 0) > 0) {
          return NextResponse.json({ success: false, message: 'This event already has categories configured.' }, { status: 400 })
        }
        const payloads = DEFAULT_AWARD_CATEGORIES.map(c => ({ ...c, event_id: eventId }))
        const { data, error } = await supabaseAdmin.from('staff_award_categories').insert(payloads).select()
        if (error) throw error
        return NextResponse.json({ success: true, data, message: 'Default CCS categories loaded.' })
      }

      const store = await readStore()
      if (store.categories.some(c => Number(c.event_id) === eventId)) {
        return NextResponse.json({ success: false, message: 'This event already has categories configured.' }, { status: 400 })
      }
      const now = new Date().toISOString()
      let catIdCursor = nextId(store.categories)
      const newCats = DEFAULT_AWARD_CATEGORIES.map(c => ({
        id: catIdCursor++,
        event_id: eventId,
        ...c,
        created_at: now
      }))
      store.categories.push(...newCats)
      await writeStore(store)
      return NextResponse.json({ success: true, data: newCats, message: 'Default CCS categories loaded.' })
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: reset_event_votes
    // ─────────────────────────────────────────────────────────────
    if (action === 'reset_event_votes') {
      const eventId = Number(body.event_id)
      if (!eventId) return NextResponse.json({ success: false, message: 'event_id is required.' }, { status: 400 })

      if (hasTables) {
        const { error: vErr } = await supabaseAdmin.from('staff_award_votes').delete().eq('event_id', eventId)
        if (vErr) throw vErr
        const { error: sErr } = await supabaseAdmin.from('staff_award_submissions').delete().eq('event_id', eventId)
        if (sErr) throw sErr
        return NextResponse.json({ success: true, message: 'All votes for this event have been reset.' })
      }

      const store = await readStore()
      store.submissions = store.submissions.filter(s => Number(s.event_id) !== eventId)
      store.votes = store.votes.filter(v => Number(v.event_id) !== eventId)
      await writeStore(store)
      return NextResponse.json({ success: true, message: 'All votes for this event have been reset.' })
    }

    return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('POST /api/staff-awards error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
