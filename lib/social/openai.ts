import 'server-only'
import OpenAI from 'openai'

import { cfChat, cloudflareReady } from './cloudflare'

export type TextProvider = 'openai' | 'gemini' | 'cloudflare' | null

export function textProvider(): TextProvider {
  if (process.env.DEMO_MODE === 'true') return null
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (cloudflareReady()) return 'cloudflare'
  return null
}

export const OPENAI_TEXT_MODEL = process.env.SOCIAL_TEXT_MODEL || 'gpt-4o-mini'
export const GEMINI_TEXT_MODELS = (process.env.GEMINI_TEXT_MODEL || 'gemini-flash-lite-latest,gemini-flash-latest')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

/** Returns the model's JSON reply as a string. */
export async function completeJson(system: string, user: string): Promise<string> {
  const p = textProvider()
  if (p === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await client.chat.completions.create({
      model: OPENAI_TEXT_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    return r.choices[0]?.message?.content || '{}'
  }
  if (p === 'gemini') {
    const { explainGoogleError, GoogleApiError } = await import('./googleErrors')
    const base = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta'
    let lastErr: unknown = null
    // Cheapest model first; fall back if it's unavailable or out of quota.
    for (const model of GEMINI_TEXT_MODELS) {
      const res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
        }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok) {
        return json?.candidates?.[0]?.content?.parts?.map((x: { text?: string; thought?: boolean }) => (x.thought ? '' : x.text || '')).join('') || '{}'
      }
      lastErr = new GoogleApiError(explainGoogleError(res.status, json), res.status)
      if (res.status === 401 || res.status === 403) break
    }
    // Free fallback when Google refuses (no billing / quota).
    if (cloudflareReady()) return cfChat(system, user)
    throw lastErr
  }
  if (p === 'cloudflare') return cfChat(system, user)
  throw new Error('No text model configured')
}

export function friendlyError(error: unknown, fallback: string): { message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error)
  if (/quota|billing|insufficient|rate/i.test(msg)) return { message: `Quota or rate limit reached: ${msg.slice(0, 160)}`, status: 429 }
  if (/api key|401|403|unauthor|permission/i.test(msg)) return { message: `The API key was rejected: ${msg.slice(0, 160)}`, status: 401 }
  return { message: `${fallback}: ${msg.slice(0, 200)}`, status: 500 }
}
