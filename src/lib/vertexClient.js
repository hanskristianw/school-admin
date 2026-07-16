/**
 * vertexClient.js
 *
 * Shared Vertex AI generative model factory.
 *
 * Auth strategy:
 *   1. Vercel / serverless  → set GOOGLE_APPLICATION_CREDENTIALS_JSON = full JSON string of the SA key
 *   2. Local / Docker        → set GOOGLE_APPLICATION_CREDENTIALS = path to the SA key JSON file
 *
 * VertexAI accepts `googleAuthOptions` which is forwarded directly to google-auth-library's
 * GoogleAuth constructor — so we can pass `credentials` (parsed object) instead of a file path.
 */

import { VertexAI } from '@google-cloud/vertexai'

let _genModel = null

export function getVertexModel() {
  // Allow creating a fresh model per request in case env vars change (e.g. during testing)
  // For production use the cached singleton.
  if (_genModel) return _genModel

  const project  = process.env.GCP_PROJECT_ID || '213755729408'
  const location = process.env.GCP_LOCATION   || 'us-central1'
  const modelId  = process.env.GEMINI_MODEL   || 'gemini-2.5-flash'

  /** @type {import('@google-cloud/vertexai').VertexInit} */
  const vertexInit = { project, location }

  // ── Vercel / serverless: credentials injected as a JSON string ──────────────
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credsJson) {
    try {
      const credentials = JSON.parse(credsJson)
      // googleAuthOptions is forwarded to google-auth-library's GoogleAuth constructor.
      // Pass `credentials` (the parsed SA object) so no file I/O is needed.
      vertexInit.googleAuthOptions = {
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }
      console.log('[vertexClient] Using inline JSON credentials for:', credentials.client_email)
    } catch (e) {
      console.error('[vertexClient] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message)
    }
  } else {
    // ── Local: ADC reads GOOGLE_APPLICATION_CREDENTIALS file path automatically ─
    console.log('[vertexClient] Using ADC (GOOGLE_APPLICATION_CREDENTIALS):', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  }

  const vertex = new VertexAI(vertexInit)
  _genModel = vertex.getGenerativeModel({ model: modelId })
  return _genModel
}
