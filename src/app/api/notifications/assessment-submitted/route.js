import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-updated'
import { sendEmail } from '@/lib/mailer'

function formatDate(dateString) {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.warn('[assessment-submitted] Failed to format date', dateString, error)
    return dateString
  }
}

function buildEmailContent({
  unitName,
  className,
  subjectName,
  topicName,
  teacherName,
  assessmentName,
  assessmentDate,
  assessmentNotes
}) {
  const lines = [
    'A new assessment has been submitted and awaits your review.',
    '',
    `Unit: ${unitName || '-'}`,
    `Class: ${className || '-'}`,
    `Subject: ${subjectName || '-'}`,
    topicName ? `Topic: ${topicName}` : null,
    `Assessment: ${assessmentName || '-'}`,
    `Scheduled Date: ${assessmentDate || '-'}`,
    `Teacher: ${teacherName || '-'}`,
    assessmentNotes ? `Notes: ${assessmentNotes}` : null,
    '',
  'Visit https://manageccs.online/data/assessment_approval to review and take action.'
  ].filter(Boolean)

  const textBody = lines.join('\n')

  const htmlBody = lines
    .map((line) => {
      if (!line) return ''
      if (line.startsWith('Unit:') || line.startsWith('Class:') || line.startsWith('Subject:') || line.startsWith('Topic:') || line.startsWith('Assessment:') || line.startsWith('Scheduled Date:') || line.startsWith('Teacher:') || line.startsWith('Notes:')) {
        const [label, ...rest] = line.split(':')
        const value = rest.join(':').trim()
        return `<p><strong>${label}:</strong> ${value || '-'}</p>`
      }
      if (line.startsWith('Visit https://manageccs.online')) {
        return `<p><a href="https://manageccs.online/data/assessment_approval" target="_blank" rel="noopener noreferrer">Visit manageccs.online/data/assessment_approval to review and take action.</a></p>`
      }
      return `<p>${line}</p>`
    })
    .join('\n')

  return { textBody, htmlBody }
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const assessmentId = body?.assessmentId ?? body?.assessment_id

    if (!assessmentId || Number.isNaN(Number(assessmentId))) {
      return NextResponse.json({ error: 'assessmentId is required' }, { status: 400 })
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessment')
      .select(`
        assessment_id,
        assessment_nama,
        assessment_tanggal,
        assessment_keterangan,
        assessment_detail_kelas_id,
        assessment_topic_id,
        assessment_user_id
      `)
      .eq('assessment_id', Number(assessmentId))
      .maybeSingle()

    if (assessmentError) {
      throw new Error(assessmentError.message)
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const detailId = assessment.assessment_detail_kelas_id

    let detail = null
    if (detailId) {
      const { data: detailData, error: detailError } = await supabaseAdmin
        .from('detail_kelas')
        .select('detail_kelas_id, detail_kelas_kelas_id, detail_kelas_subject_id')
        .eq('detail_kelas_id', detailId)
        .maybeSingle()

      if (detailError) {
        throw new Error(detailError.message)
      }

      detail = detailData
    }

    if (!detail) {
      return NextResponse.json({ message: 'Assessment detail_kelas not found. Skipping email notification.' })
    }

    let kelas = null
    if (detail.detail_kelas_kelas_id) {
      const { data: kelasData, error: kelasError } = await supabaseAdmin
        .from('kelas')
        .select('kelas_id, kelas_nama, kelas_unit_id')
        .eq('kelas_id', detail.detail_kelas_kelas_id)
        .maybeSingle()

      if (kelasError) {
        throw new Error(kelasError.message)
      }

      kelas = kelasData
    }

    const unitId = kelas?.kelas_unit_id

    if (!unitId) {
      return NextResponse.json({ message: 'Assessment class has no unit. Skipping email notification.' })
    }

    const { data: unit, error: unitError } = await supabaseAdmin
      .from('unit')
      .select('unit_id, unit_name')
      .eq('unit_id', unitId)
      .maybeSingle()

    if (unitError) {
      throw new Error(unitError.message)
    }

    const { data: subject, error: subjectError } = await supabaseAdmin
      .from('subject')
      .select('subject_id, subject_name')
      .eq('subject_id', detail.detail_kelas_subject_id)
      .maybeSingle()

    if (subjectError) {
      throw new Error(subjectError.message)
    }

    const { data: roles, error: roleError } = await supabaseAdmin
      .from('role')
      .select('role_id, role_name')
      .ilike('role_name', '%vice%curriculum%')

    if (roleError) {
      throw new Error(roleError.message)
    }

    const roleIds = (roles || []).map((role) => role.role_id).filter(Boolean)

    if (!roleIds.length) {
      return NextResponse.json({ message: 'Vice Principal Curriculum role not found. Skipping email notification.' })
    }

    const { data: recipientsData, error: recipientsError } = await supabaseAdmin
      .from('users')
      .select('user_email, user_nama_depan, user_nama_belakang')
      .in('user_role_id', roleIds)
      .eq('is_active', true)
      .eq('user_unit_id', unitId)
      .not('user_email', 'is', null)

    if (recipientsError) {
      throw new Error(recipientsError.message)
    }

    const recipients = (recipientsData || [])
      .map((user) => String(user.user_email || '').trim())
      .filter((email) => email.length > 0)

    if (!recipients.length) {
      return NextResponse.json({ message: 'No Vice Principal Curriculum recipients found in unit. Skipping email notification.' })
    }

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('users')
      .select('user_id, user_nama_depan, user_nama_belakang')
      .eq('user_id', assessment.assessment_user_id)
      .maybeSingle()

    if (teacherError) {
      throw new Error(teacherError.message)
    }

    let topicName = null
    if (assessment.assessment_topic_id) {
      const { data: topic, error: topicError } = await supabaseAdmin
        .from('topic')
        .select('topic_id, topic_nama')
        .eq('topic_id', assessment.assessment_topic_id)
        .maybeSingle()

      if (topicError) {
        throw new Error(topicError.message)
      }

      topicName = topic?.topic_nama || null
    }

    const teacherName = [teacher?.user_nama_depan, teacher?.user_nama_belakang]
      .filter(Boolean)
      .join(' ')

    const unitName = unit?.unit_name || 'Unknown Unit'
    const className = kelas?.kelas_nama || 'Unknown Class'
    const subjectName = subject?.subject_name || 'Unknown Subject'
    const assessmentDate = formatDate(assessment.assessment_tanggal)
    const assessmentNotes = assessment.assessment_keterangan || null
    const assessmentName = assessment.assessment_nama || `Assessment #${assessment.assessment_id}`

    const { textBody, htmlBody } = buildEmailContent({
      unitName,
      className,
      subjectName,
      topicName,
      teacherName,
      assessmentName,
      assessmentDate,
      assessmentNotes
    })

    const subjectLine = `[Assessment] ${unitName} / ${className} - ${assessmentName}`

    const emailResult = await sendEmail({
      to: recipients,
      subject: subjectLine,
      text: textBody,
      html: htmlBody
    })

    return NextResponse.json({
      message: 'Notification sent',
      recipients,
      providerId: emailResult?.id || null
    })
  } catch (error) {
    console.error('[assessment-submitted] Failed to send email notification', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
