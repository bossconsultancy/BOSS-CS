import { NextRequest, NextResponse } from 'next/server'
import { BRAND, isCategoryId } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { completeJson, friendlyError, textProvider } from '@/lib/social/openai'
import { rateLimit } from '@/lib/social/limit'
import { TAMIL_STYLE } from '@/lib/social/tamil'

export const maxDuration = 60

// Translates the words on a post (and its caption) so the same design can be redrawn in Tamil.

const SYSTEM = `You rewrite social media posts for ${BRAND.name}, a Toronto consultancy serving Tamil families, into Tamil.
${TAMIL_STYLE}
Field rules:
- The words are printed on a graphic: keep each field short (shorter than the English is fine).
- Keep the headline line breaks ("\\n") — 2–3 short lines.
- accentWords: 1–2 words copied exactly from your Tamil headline to emphasise.
- caption: rewrite fully and naturally in Tamil (website and phone in English); no hashtags in it.
- Never mention OSAP. Never add a phone extension.
Return ONLY JSON with the keys you were given (kicker, headline, accentWords, support, points, cta, keyStatLabel, takeaway, caption), rewritten in Tamil.`

const str = (v: unknown, f = '') => (typeof v === 'string' && v.trim() ? v.trim() : f)

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'text')
  if (limited) return limited
  let b: { post: PostContent; language?: string }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const p = b.post
  if (!p || !isCategoryId(p.category)) return NextResponse.json({ error: 'Missing post.' }, { status: 400 })
  if (!textProvider()) return NextResponse.json({ error: 'Translation needs the AI text service, which isn’t switched on.' }, { status: 503 })

  const source = {
    kicker: p.kicker,
    headline: p.headline,
    accentWords: p.accentWords,
    support: p.support,
    points: p.points,
    cta: p.cta,
    keyStatLabel: p.keyStatLabel || '',
    takeaway: p.takeaway || '',
    caption: p.caption,
  }
  try {
    const out = await completeJson(SYSTEM, `Rewrite this post in natural Tamil:\n${JSON.stringify(source, null, 1)}`)
    let raw: Record<string, unknown> = {}
    try {
      raw = JSON.parse(out.replace(/^```json\s*|\s*```$/g, ''))
    } catch {
      raw = {}
    }
    const arr = (v: unknown, f: string[]) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()) : f)
    const headline = str(raw.headline, p.headline).replace(/\\n/g, '\n')
    const words = headline.replace(/\n/g, ' ')
    const post: PostContent = {
      ...p,
      kicker: str(raw.kicker, p.kicker),
      headline,
      accentWords: arr(raw.accentWords, []).filter((w) => words.includes(w)).slice(0, 2),
      support: str(raw.support, p.support),
      points: arr(raw.points, p.points).slice(0, p.points.length || 3),
      cta: str(raw.cta, p.cta),
      keyStatLabel: p.keyStatLabel ? str(raw.keyStatLabel, p.keyStatLabel) : undefined,
      takeaway: p.takeaway ? str(raw.takeaway, p.takeaway) : undefined,
      caption: str(raw.caption, p.caption),
      language: 'Tamil',
    }
    return NextResponse.json({ post })
  } catch (error) {
    const { message, status } = friendlyError(error, 'Translation failed')
    return NextResponse.json({ error: message }, { status })
  }
}
