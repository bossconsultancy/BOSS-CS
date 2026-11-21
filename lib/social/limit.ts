import 'server-only'
import { NextRequest, NextResponse } from 'next/server'

// Lightweight spend protection now that the site has no password:
// a per-visitor hourly limit plus a site-wide daily cap on paid AI calls.

const hits = new Map<string, number[]>()
let day = ''
let dayCount = 0

const PER_HOUR: Record<string, number> = { design: 40, research: 30, text: 80 }
const DAILY_CAP = Number(process.env.DAILY_AI_LIMIT || 400)

export function rateLimit(req: NextRequest, kind: keyof typeof PER_HOUR): NextResponse | null {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'
  const now = Date.now()
  const key = `${kind}:${ip}`
  const recent = (hits.get(key) || []).filter((t) => now - t < 3_600_000)
  const today = new Date().toISOString().slice(0, 10)
  if (today !== day) {
    day = today
    dayCount = 0
  }
  if (recent.length >= PER_HOUR[kind]) {
    return NextResponse.json({ error: 'You’ve made a lot of requests this hour — please wait a bit and try again.' }, { status: 429 })
  }
  if (kind !== 'text' && dayCount >= DAILY_CAP) {
    return NextResponse.json({ error: 'Today’s limit has been reached. Try again tomorrow.' }, { status: 429 })
  }
  recent.push(now)
  hits.set(key, recent)
  if (kind !== 'text') dayCount++
  return null
}
