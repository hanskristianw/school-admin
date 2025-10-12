const RESEND_API_URL = 'https://api.resend.com/emails'

function normalizeRecipients(to = []) {
  if (!Array.isArray(to)) {
    return [to].filter(Boolean)
  }
  return to.filter(Boolean)
}

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!fromEmail) {
    throw new Error('Missing RESEND_FROM_EMAIL environment variable')
  }

  const recipients = normalizeRecipients(to).map((email) => String(email || '').trim()).filter(Boolean)

  if (!recipients.length) {
    throw new Error('No valid recipients provided')
  }

  if (!subject?.trim()) {
    throw new Error('Email subject is required')
  }

  const payload = {
    from: fromEmail,
    to: recipients,
    subject: subject.trim(),
    html: html || undefined,
    text: text || undefined
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Resend API error (${response.status}): ${errorText || response.statusText}`)
  }

  return response.json()
}
