import { NextResponse } from 'next/server'

// GET /api/classroom/courses
// Proxy to fetch active courses taught by the authenticated teacher
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const res = await fetch('https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE', {
      headers: { 
        Authorization: authHeader,
        Accept: 'application/json'
      }
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch courses from Google Classroom' },
        { status: res.status }
      )
    }

    return NextResponse.json({ 
      success: true, 
      courses: data.courses || [] 
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
