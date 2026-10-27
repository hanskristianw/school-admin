import { NextResponse } from 'next/server'

// GET /api/classroom/submissions?courseId=...&courseworkId=...
// Proxy to fetch student submissions and attachments for a specific coursework
export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const courseworkId = searchParams.get('courseworkId')

    if (!courseId || !courseworkId) {
      return NextResponse.json({ error: 'courseId and courseworkId parameters are required' }, { status: 400 })
    }

    // 1. Fetch student roster from course to map userId -> email & full name
    // Requires scope: https://www.googleapis.com/auth/classroom.rosters.readonly
    const studentProfileMap = new Map() // userId -> { email, name, photoUrl }
    let rosterPageToken = null

    do {
      const pageQuery = rosterPageToken ? `&pageToken=${encodeURIComponent(rosterPageToken)}` : ''
      const studentsRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/students?pageSize=100${pageQuery}`,
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json'
          }
        }
      )

      if (!studentsRes.ok) {
        const errText = await studentsRes.text()
        console.error(`[Classroom API] courses.students error (${studentsRes.status}):`, errText)

        if (studentsRes.status === 401) {
          return NextResponse.json(
            { error: 'Google Classroom session expired. Please re-authenticate.' },
            { status: 401 }
          )
        }

        if (studentsRes.status === 403) {
          return NextResponse.json(
            {
              error: 'insufficient_roster_scope',
              message: 'Google Classroom permissions need to be updated to load student names and submissions. Please re-authorize Google Classroom.'
            },
            { status: 403 }
          )
        }

        // For non-fatal errors on other status codes, log and break loop
        break
      }

      const studentsData = await studentsRes.json()
      const studentsList = studentsData.students || []
      studentsList.forEach(s => {
        if (s.userId && s.profile) {
          const prof = s.profile
          const givenName = prof.name?.givenName || ''
          const familyName = prof.name?.familyName || ''
          const fullName = prof.name?.fullName || `${givenName} ${familyName}`.trim()

          studentProfileMap.set(s.userId, {
            email: (prof.emailAddress || '').toLowerCase().trim(),
            name: fullName,
            photoUrl: prof.photoUrl || null
          })
        }
      })

      rosterPageToken = studentsData.nextPageToken || null
    } while (rosterPageToken)

    // 2. Fetch all student submissions for this coursework (with pagination support)
    let rawSubmissions = []
    let subPageToken = null

    do {
      const pageQuery = subPageToken ? `&pageToken=${encodeURIComponent(subPageToken)}` : ''
      const submissionsRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork/${encodeURIComponent(courseworkId)}/studentSubmissions?pageSize=100${pageQuery}`,
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json'
          }
        }
      )

      if (!submissionsRes.ok) {
        const errData = await submissionsRes.json().catch(() => ({}))
        console.error(`[Classroom API] studentSubmissions error (${submissionsRes.status}):`, errData)
        return NextResponse.json(
          { error: errData.error?.message || 'Failed to fetch student submissions from Google Classroom' },
          { status: submissionsRes.status }
        )
      }

      const submissionsData = await submissionsRes.json()
      rawSubmissions = rawSubmissions.concat(submissionsData.studentSubmissions || [])
      subPageToken = submissionsData.nextPageToken || null
    } while (subPageToken)

    // 3. Normalize and enrich submissions
    const enrichedSubmissions = rawSubmissions.map(sub => {
      const profile = studentProfileMap.get(sub.userId) || {}

      // Extract attachments
      const rawAttachments = sub.assignmentSubmission?.attachments || []
      const attachments = rawAttachments.map(att => {
        if (att.driveFile) {
          const df = att.driveFile
          return {
            type: 'driveFile',
            id: df.id,
            title: df.title,
            alternateLink: df.alternateLink || `https://docs.google.com/document/d/${df.id}/edit`,
            thumbnailUrl: df.thumbnailUrl || null,
            previewUrl: `https://drive.google.com/file/d/${df.id}/preview`
          }
        }
        if (att.link) {
          return {
            type: 'link',
            url: att.link.url,
            title: att.link.title || att.link.url,
            thumbnailUrl: att.link.thumbnailUrl || null
          }
        }
        if (att.youTubeVideo) {
          return {
            type: 'youtube',
            id: att.youTubeVideo.id,
            title: att.youTubeVideo.title,
            alternateLink: att.youTubeVideo.alternateLink,
            thumbnailUrl: att.youTubeVideo.thumbnailUrl || null
          }
        }
        if (att.form) {
          return {
            type: 'form',
            title: att.form.title,
            formUrl: att.form.formUrl,
            thumbnailUrl: att.form.thumbnailUrl || null
          }
        }
        return {
          type: 'other',
          raw: att
        }
      })

      return {
        submissionId: sub.id,
        userId: sub.userId,
        studentEmail: profile.email || '',
        studentName: profile.name || '',
        photoUrl: profile.photoUrl || null,
        state: sub.state || 'NEW', // TURNED_IN, RETURNED, NEW, CREATED, RECLAIMED_BY_STUDENT
        late: Boolean(sub.late),
        assignedGrade: sub.assignedGrade ?? null,
        draftGrade: sub.draftGrade ?? null,
        alternateLink: sub.alternateLink || null,
        updateTime: sub.updateTime || null,
        attachments: attachments,
        shortAnswer: sub.shortAnswerSubmission?.answer || null
      }
    })

    return NextResponse.json({
      success: true,
      courseId,
      courseworkId,
      submissions: enrichedSubmissions,
      total: enrichedSubmissions.length
    })
  } catch (err) {
    console.error('[Classroom API] Unexpected error in submissions handler:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
