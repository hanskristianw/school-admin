import { NextResponse } from 'next/server'

// GET /api/classroom/coursework?courseId=...
// Proxy to fetch published coursework/assignments for a specific course
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId parameter is required' }, { status: 400 })
    }

    const res = await fetch(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork?courseWorkStates=PUBLISHED&pageSize=100`, {
      headers: { 
        Authorization: authHeader,
        Accept: 'application/json'
      }
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[Classroom API] coursework fetch error:', res.status, data)
      return NextResponse.json(
        { error: data.error?.message || 'Failed to fetch coursework from Google Classroom' },
        { status: res.status }
      )
    }

    const items = data.courseWork || data.coursework || []
    return NextResponse.json({ 
      success: true, 
      coursework: items,
      courseWork: items
    })
  } catch (err) {
    console.error('[Classroom API] coursework error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
