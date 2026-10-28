import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SETTINGS_KEY = 'osis_election_data'

// Helper to check if dedicated tables exist
async function checkTablesExist() {
  try {
    const { error } = await supabaseAdmin.from('osis_elections').select('id').limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('relation "osis_elections" does not exist'))) {
      return false
    }
    return !error
  } catch {
    return false
  }
}

// Fallback: Read store from settings table
async function readFromSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single()

  if (error || !data?.value) {
    return { elections: [], candidates: [], votes: [] }
  }

  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  } catch {
    return { elections: [], candidates: [], votes: [] }
  }
}

// Fallback: Write store to settings table
async function writeToSettings(storeData) {
  const payload = {
    key: SETTINGS_KEY,
    value: JSON.stringify(storeData),
    description: 'Data OSIS Election & Live Quick Count (elections, candidates, and anonymous votes)'
  }

  const { error } = await supabaseAdmin
    .from('settings')
    .upsert(payload, { onConflict: 'key' })

  if (error) throw error
}

// Calculate quick count statistics
function computeQuickCount(candidates = [], votes = [], targetDpt = 0) {
  const voteMap = {}
  candidates.forEach(c => {
    voteMap[c.id] = 0
  })

  let totalVotes = 0
  votes.forEach(v => {
    const candId = Number(v.candidate_id)
    if (voteMap[candId] !== undefined) {
      voteMap[candId] += 1
      totalVotes += 1
    }
  })

  const results = candidates.map(cand => {
    const count = voteMap[cand.id] || 0
    const pct = totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0
    return {
      ...cand,
      vote_count: count,
      percentage: pct
    }
  })

  // Sort descending by vote count, then by candidate number
  results.sort((a, b) => b.vote_count - a.vote_count || a.candidate_number - b.candidate_number)

  const maxVotes = results[0]?.vote_count || 0
  const turnoutPct = targetDpt > 0 ? Number(((totalVotes / targetDpt) * 100).toFixed(1)) : 0

  return {
    total_votes: totalVotes,
    target_dpt: targetDpt,
    turnout_percentage: turnoutPct,
    results: results.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      is_leader: totalVotes > 0 && item.vote_count === maxVotes && maxVotes > 0
    }))
  }
}

// GET /api/osis-election
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const yearIdParam = searchParams.get('year_id')
    const electionIdParam = searchParams.get('election_id')

    // Fetch Academic Years from year table
    const { data: yearsData, error: yearsError } = await supabaseAdmin
      .from('year')
      .select('year_id, year_name, start_date, end_date')
      .order('year_id', { ascending: false })

    if (yearsError) throw yearsError
    const years = yearsData || []

    // Fetch Active Students count as reference for DPT
    const { count: studentCount } = await supabaseAdmin
      .from('users')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_role_id', 3)
      .eq('is_active', true)

    const defaultDpt = studentCount || 0

    // Determine target year_id
    let selectedYearId = yearIdParam ? Number(yearIdParam) : null
    if (!selectedYearId && years.length > 0) {
      // Find current active year by date, or pick the first
      const now = new Date()
      const currentYear = years.find(y => {
        if (!y.start_date || !y.end_date) return false
        const s = new Date(y.start_date)
        const e = new Date(y.end_date)
        return now >= s && now <= e
      })
      selectedYearId = currentYear ? currentYear.year_id : years[0].year_id
    }

    const hasTables = await checkTablesExist()

    if (hasTables) {
      // 1. DEDICATED TABLES MODE
      let electionQuery = supabaseAdmin
        .from('osis_elections')
        .select('*')
        .order('id', { ascending: false })

      if (selectedYearId) {
        electionQuery = electionQuery.eq('year_id', selectedYearId)
      }

      const { data: elections, error: elError } = await electionQuery
      if (elError) throw elError

      let selectedElection = null
      if (electionIdParam) {
        selectedElection = elections?.find(e => e.id === Number(electionIdParam)) || null
      }
      if (!selectedElection && elections && elections.length > 0) {
        selectedElection = elections[0]
      }

      let candidates = []
      let votes = []

      if (selectedElection) {
        const { data: candData, error: candError } = await supabaseAdmin
          .from('osis_candidates')
          .select('*')
          .eq('election_id', selectedElection.id)
          .order('candidate_number', { ascending: true })

        if (candError) throw candError
        candidates = candData || []

        const { data: votesData, error: votesError } = await supabaseAdmin
          .from('osis_votes')
          .select('id, candidate_id, created_at')
          .eq('election_id', selectedElection.id)

        if (votesError) throw votesError
        votes = votesData || []
      }

      const quickCount = computeQuickCount(
        candidates,
        votes,
        selectedElection?.target_dpt || defaultDpt
      )

      return NextResponse.json({
        success: true,
        mode: 'database_tables',
        years,
        selected_year_id: selectedYearId,
        default_student_count: defaultDpt,
        elections: elections || [],
        selected_election: selectedElection,
        candidates,
        quick_count: quickCount
      })
    } else {
      // 2. SETTINGS FALLBACK MODE
      const store = await readFromSettings()
      let elections = (store.elections || []).filter(e => !selectedYearId || e.year_id === selectedYearId)
      
      let selectedElection = null
      if (electionIdParam) {
        selectedElection = elections.find(e => e.id === Number(electionIdParam)) || null
      }
      if (!selectedElection && elections.length > 0) {
        selectedElection = elections[0]
      }

      let candidates = []
      let votes = []

      if (selectedElection) {
        candidates = (store.candidates || [])
          .filter(c => c.election_id === selectedElection.id)
          .sort((a, b) => a.candidate_number - b.candidate_number)

        votes = (store.votes || []).filter(v => v.election_id === selectedElection.id)
      }

      const quickCount = computeQuickCount(
        candidates,
        votes,
        selectedElection?.target_dpt || defaultDpt
      )

      return NextResponse.json({
        success: true,
        mode: 'settings_fallback',
        years,
        selected_year_id: selectedYearId,
        default_student_count: defaultDpt,
        elections,
        selected_election: selectedElection,
        candidates,
        quick_count: quickCount
      })
    }
  } catch (err) {
    console.error('GET /api/osis-election error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

// POST /api/osis-election
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action is required' }, { status: 400 })
    }

    const hasTables = await checkTablesExist()

    // ─────────────────────────────────────────────────────────────
    // ACTION: create_or_update_election
    // ─────────────────────────────────────────────────────────────
    if (action === 'create_or_update_election') {
      const { id, year_id, title, description, target_dpt, status } = body
      if (!year_id || !title) {
        return NextResponse.json({ success: false, message: 'Tahun ajaran dan Judul pemilihan wajib diisi' }, { status: 400 })
      }

      if (hasTables) {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('osis_elections')
            .update({
              year_id: Number(year_id),
              title: title.trim(),
              description: description || null,
              target_dpt: Number(target_dpt) || 0,
              status: status || 'draft',
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

          if (error) throw error
          return NextResponse.json({ success: true, data })
        } else {
          const { data, error } = await supabaseAdmin
            .from('osis_elections')
            .insert([{
              year_id: Number(year_id),
              title: title.trim(),
              description: description || null,
              target_dpt: Number(target_dpt) || 0,
              status: status || 'draft'
            }])
            .select()
            .single()

          if (error) throw error
          return NextResponse.json({ success: true, data })
        }
      } else {
        const store = await readFromSettings()
        const elections = store.elections || []
        let savedElection = null

        if (id) {
          const idx = elections.findIndex(e => e.id === Number(id))
          if (idx !== -1) {
            elections[idx] = {
              ...elections[idx],
              year_id: Number(year_id),
              title: title.trim(),
              description: description || null,
              target_dpt: Number(target_dpt) || 0,
              status: status || elections[idx].status || 'draft',
              updated_at: new Date().toISOString()
            }
            savedElection = elections[idx]
          }
        } else {
          const newId = elections.length > 0 ? Math.max(...elections.map(e => e.id)) + 1 : 1
          savedElection = {
            id: newId,
            year_id: Number(year_id),
            title: title.trim(),
            description: description || null,
            target_dpt: Number(target_dpt) || 0,
            status: status || 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          elections.push(savedElection)
        }

        store.elections = elections
        await writeToSettings(store)
        return NextResponse.json({ success: true, data: savedElection })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: save_candidate
    // ─────────────────────────────────────────────────────────────
    if (action === 'save_candidate') {
      const {
        id,
        election_id,
        candidate_number,
        leader_name,
        vice_name,
        photo_url,
        vision,
        mission,
        slogan,
        color
      } = body

      if (!election_id || !candidate_number || !leader_name) {
        return NextResponse.json({
          success: false,
          message: 'Nomor urut dan Nama Calon Ketua wajib diisi'
        }, { status: 400 })
      }

      const payload = {
        election_id: Number(election_id),
        candidate_number: Number(candidate_number),
        leader_name: leader_name.trim(),
        vice_name: vice_name ? vice_name.trim() : null,
        photo_url: photo_url ? photo_url.trim() : null,
        vision: vision ? vision.trim() : null,
        mission: mission ? mission.trim() : null,
        slogan: slogan ? slogan.trim() : null,
        color: color || '#3B82F6'
      }

      if (hasTables) {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('osis_candidates')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

          if (error) throw error
          return NextResponse.json({ success: true, data })
        } else {
          const { data, error } = await supabaseAdmin
            .from('osis_candidates')
            .insert([payload])
            .select()
            .single()

          if (error) throw error
          return NextResponse.json({ success: true, data })
        }
      } else {
        const store = await readFromSettings()
        const candidates = store.candidates || []
        let savedCandidate = null

        if (id) {
          const idx = candidates.findIndex(c => c.id === Number(id))
          if (idx !== -1) {
            candidates[idx] = {
              ...candidates[idx],
              ...payload,
              updated_at: new Date().toISOString()
            }
            savedCandidate = candidates[idx]
          }
        } else {
          const newId = candidates.length > 0 ? Math.max(...candidates.map(c => c.id)) + 1 : 1
          savedCandidate = {
            id: newId,
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          candidates.push(savedCandidate)
        }

        store.candidates = candidates
        await writeToSettings(store)
        return NextResponse.json({ success: true, data: savedCandidate })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: delete_candidate
    // ─────────────────────────────────────────────────────────────
    if (action === 'delete_candidate') {
      const { id, election_id } = body
      if (!id) {
        return NextResponse.json({ success: false, message: 'Candidate ID is required' }, { status: 400 })
      }

      if (hasTables) {
        const { error } = await supabaseAdmin
          .from('osis_candidates')
          .delete()
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      } else {
        const store = await readFromSettings()
        store.candidates = (store.candidates || []).filter(c => c.id !== Number(id))
        store.votes = (store.votes || []).filter(v => v.candidate_id !== Number(id))
        await writeToSettings(store)
        return NextResponse.json({ success: true })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: cast_vote (ANONYMOUS & SECURE)
    // ─────────────────────────────────────────────────────────────
    if (action === 'cast_vote') {
      const { election_id, candidate_id } = body
      if (!election_id || !candidate_id) {
        return NextResponse.json({ success: false, message: 'election_id dan candidate_id wajib disertakan' }, { status: 400 })
      }

      if (hasTables) {
        // Check if election is active
        const { data: election, error: elErr } = await supabaseAdmin
          .from('osis_elections')
          .select('status')
          .eq('id', election_id)
          .single()

        if (elErr || !election) {
          return NextResponse.json({ success: false, message: 'Pemilihan tidak ditemukan' }, { status: 404 })
        }
        if (election.status !== 'active') {
          return NextResponse.json({ success: false, message: 'Bilik suara sedang ditutup / tidak aktif' }, { status: 403 })
        }

        const { data, error } = await supabaseAdmin
          .from('osis_votes')
          .insert([{
            election_id: Number(election_id),
            candidate_id: Number(candidate_id)
          }])
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
      } else {
        const store = await readFromSettings()
        const election = (store.elections || []).find(e => e.id === Number(election_id))
        if (!election) {
          return NextResponse.json({ success: false, message: 'Pemilihan tidak ditemukan' }, { status: 404 })
        }
        if (election.status !== 'active') {
          return NextResponse.json({ success: false, message: 'Bilik suara sedang ditutup / tidak aktif' }, { status: 403 })
        }

        const votes = store.votes || []
        const newId = votes.length > 0 ? Math.max(...votes.map(v => v.id)) + 1 : 1
        const newVote = {
          id: newId,
          election_id: Number(election_id),
          candidate_id: Number(candidate_id),
          created_at: new Date().toISOString()
        }
        votes.push(newVote)
        store.votes = votes
        await writeToSettings(store)

        return NextResponse.json({ success: true, data: newVote })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: update_status (draft, active, closed)
    // ─────────────────────────────────────────────────────────────
    if (action === 'update_status') {
      const { election_id, status } = body
      if (!election_id || !status) {
        return NextResponse.json({ success: false, message: 'election_id dan status wajib disertakan' }, { status: 400 })
      }

      if (hasTables) {
        const { data, error } = await supabaseAdmin
          .from('osis_elections')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', election_id)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
      } else {
        const store = await readFromSettings()
        const idx = (store.elections || []).findIndex(e => e.id === Number(election_id))
        if (idx !== -1) {
          store.elections[idx].status = status
          store.elections[idx].updated_at = new Date().toISOString()
          await writeToSettings(store)
          return NextResponse.json({ success: true, data: store.elections[idx] })
        }
        return NextResponse.json({ success: false, message: 'Pemilihan tidak ditemukan' }, { status: 404 })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION: reset_votes (Testing / Re-election)
    // ─────────────────────────────────────────────────────────────
    if (action === 'reset_votes') {
      const { election_id } = body
      if (!election_id) {
        return NextResponse.json({ success: false, message: 'election_id wajib disertakan' }, { status: 400 })
      }

      if (hasTables) {
        const { error } = await supabaseAdmin
          .from('osis_votes')
          .delete()
          .eq('election_id', election_id)

        if (error) throw error
        return NextResponse.json({ success: true, message: 'Seluruh suara berhasil direset' })
      } else {
        const store = await readFromSettings()
        store.votes = (store.votes || []).filter(v => v.election_id !== Number(election_id))
        await writeToSettings(store)
        return NextResponse.json({ success: true, message: 'Seluruh suara berhasil direset' })
      }
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/osis-election error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
