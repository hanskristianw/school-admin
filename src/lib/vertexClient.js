/**
 * vertexClient.js
 *
 * Dual Gemini client provider:
 * 1. Primary: Direct Google Gemini API (AI Studio) via GEMINI_API_KEY (fast, no billing restriction).
 * 2. Secondary / Fallback: Google Cloud Vertex AI via Service Account / ADC.
 */

import { VertexAI } from '@google-cloud/vertexai'
import fs from 'fs'
import path from 'path'

let _vertexGenModel = null

export function getVertexModel(modelOverride) {
  const apiKey = process.env.GEMINI_API_KEY
  let modelId = (modelOverride || process.env.GEMINI_MODEL || 'gemini-2.5-flash').replace(/^models\//, '')

  // ── Strategy 1: Direct Google Generative Language API (GEMINI_API_KEY) ──
  if (apiKey) {
    return {
      async generateContent({ contents }) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
        console.log(`[GeminiClient] Calling Google AI Studio API with model: ${modelId}`)

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`[GeminiClient] Error ${res.status}:`, errText)
          throw new Error(`Gemini API error (${res.status}): ${errText}`)
        }

        const data = await res.json()
        return { response: data }
      }
    }
  }

  // ── Strategy 2: Google Cloud Vertex AI ──
  if (_vertexGenModel && !modelOverride) return _vertexGenModel

  const saFilePath = path.join(process.cwd(), 'project-c16c7efe-fd40-417e-8ee-a95d10636d04.json')
  let project  = process.env.GCP_PROJECT_ID || '213755729408'
  const location = process.env.GCP_LOCATION   || 'us-central1'

  /** @type {import('@google-cloud/vertexai').VertexInit} */
  const vertexInit = { project, location }

  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credsJson) {
    try {
      const credentials = JSON.parse(credsJson)
      if (credentials.project_id) vertexInit.project = credentials.project_id
      vertexInit.googleAuthOptions = {
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }
      console.log('[vertexClient] Using inline JSON credentials for:', credentials.client_email)
    } catch (e) {
      console.error('[vertexClient] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message)
    }
  } else if (fs.existsSync(saFilePath)) {
    try {
      const credentials = JSON.parse(fs.readFileSync(saFilePath, 'utf8'))
      if (credentials.project_id) vertexInit.project = credentials.project_id
      vertexInit.googleAuthOptions = {
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }
      console.log('[vertexClient] Using local SA key file:', saFilePath, '| project:', vertexInit.project)
    } catch (e) {
      console.error('[vertexClient] Failed to read SA key file:', e.message)
    }
  } else {
    console.log('[vertexClient] Using ADC (GOOGLE_APPLICATION_CREDENTIALS):', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  }

  const vertex = new VertexAI(vertexInit)
  const genModel = vertex.getGenerativeModel({ model: modelId })
  if (!modelOverride) _vertexGenModel = genModel
  return genModel
}
