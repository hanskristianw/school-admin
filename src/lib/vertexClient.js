/**
 * vertexClient.js
 * 
 * Creates a VertexAI generative model instance.
 * 
 * Authentication (ADC) supports two modes:
 * 1. Local / Docker: GOOGLE_APPLICATION_CREDENTIALS = path to JSON file
 * 2. Vercel serverless: GOOGLE_APPLICATION_CREDENTIALS_JSON = full JSON string
 *    (because there's no writable filesystem on serverless)
 * 
 * If GOOGLE_APPLICATION_CREDENTIALS_JSON is set, credentials are parsed and
 * passed directly to the GoogleAuth constructor.
 */

import { VertexAI } from '@google-cloud/vertexai'

let _genModel = null

export function getVertexModel() {
  if (_genModel) return _genModel

  const project  = process.env.GCP_PROJECT_ID  || '213755729408'
  const location = process.env.GCP_LOCATION    || 'us-central1'
  const modelId  = process.env.GEMINI_MODEL    || 'gemini-2.5-flash'

  let vertexOptions = { project, location }

  // Vercel: credentials provided as JSON string in env var
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credsJson) {
    try {
      const credentials = JSON.parse(credsJson)
      const { GoogleAuth } = require('google-auth-library')
      const googleAuth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
      vertexOptions.googleAuthOptions = { authClient: googleAuth }
    } catch (e) {
      console.error('[vertexClient] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message)
    }
  }
  // Local: GOOGLE_APPLICATION_CREDENTIALS path — ADC picks it up automatically

  const vertex = new VertexAI(vertexOptions)
  _genModel = vertex.getGenerativeModel({ model: modelId })
  return _genModel
}
