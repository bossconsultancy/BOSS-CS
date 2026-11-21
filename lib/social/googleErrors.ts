import 'server-only'

export interface GoogleErrorInfo {
  code: 'billing' | 'rate' | 'key' | 'other'
  message: string
  retryAfterSec?: number
}

/** Turns a Gemini API error body into something a person can act on. */
export function explainGoogleError(status: number, body: unknown): GoogleErrorInfo {
  const err = (body as { error?: { message?: string; status?: string; details?: Record<string, unknown>[] } } | null)?.error
  const raw = err?.message || ''
  const details = err?.details || []
  let retry: number | undefined
  let zeroLimit = false
  let perDay = false
  for (const d of details) {
    const type = String(d['@type'] || '')
    if (type.includes('RetryInfo') && typeof d.retryDelay === 'string') retry = parseFloat(d.retryDelay)
    if (type.includes('QuotaFailure') && Array.isArray(d.violations)) {
      for (const v of d.violations as Record<string, unknown>[]) {
        const id = String(v.quotaId || '')
        if (/PerDay/i.test(id)) perDay = true
        if (String(v.quotaValue ?? '') === '0') zeroLimit = true
      }
    }
  }
  if (/limit:\s*0\b/.test(raw)) zeroLimit = true

  if (status === 401 || status === 403 || /api key not valid|permission/i.test(raw)) {
    return { code: 'key', message: 'The Google AI key isn’t valid. Create a new key in Google AI Studio and update it in Render.' }
  }
  if (status === 429 || err?.status === 'RESOURCE_EXHAUSTED' || /quota/i.test(raw)) {
    if (!zeroLimit && !perDay && retry !== undefined && retry <= 40) {
      return { code: 'rate', message: 'Google is busy — retrying shortly.', retryAfterSec: retry }
    }
    return {
      code: 'billing',
      message: 'Google wants billing to make images. Use “Make it in ChatGPT” on any post (free with your plan), or switch on free automatic images with Cloudflare.',
    }
  }
  return { code: 'other', message: raw ? raw.slice(0, 200) : `Google AI error (${status})` }
}

export class GoogleApiError extends Error {
  code: GoogleErrorInfo['code']
  status: number
  constructor(info: GoogleErrorInfo, status: number) {
    super(info.message)
    this.code = info.code
    this.status = status
  }
}

/** POST to Gemini with one automatic retry on short per-minute limits. */
export async function geminiPost(url: string, body: unknown): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let json: unknown = null
    try {
      json = JSON.parse(text)
    } catch {}
    if (res.ok) return { ok: true, status: res.status, json, text }
    const info = explainGoogleError(res.status, json)
    if (info.code === 'rate' && attempt === 0) {
      await new Promise((r) => setTimeout(r, Math.ceil((info.retryAfterSec || 5) * 1000) + 500))
      continue
    }
    return { ok: false, status: res.status, json, text }
  }
  return { ok: false, status: 429, json: null, text: '' }
}
