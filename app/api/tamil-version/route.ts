import { NextRequest, NextResponse } from 'next/server'
import { BRAND, isCategoryId } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { completeJson, friendlyError, textProvider } from '@/lib/social/openai'
import { rateLimit } from '@/lib/social/limit'
import { TAMIL_STYLE } from '@/lib/social/tamil'

export const maxDuration = 60

// "Make it in Tamil": rewrites the post's design brief so every word on the image is natural Tamil,
// then the post is generated FRESH from it (same design idea, full quality) — not by re-editing the
// English picture, which blurred it.

const SYSTEM = `You create the Tamil version of an Instagram post for ${BRAND.name} (Toronto consultancy serving Sri Lankan and Indian Tamil families).
You receive the English post's IMAGE PROMPT (a designer's brief for an image model; every word printed on the image is inside double quotes) and its copy fields.
${TAMIL_STYLE}
Return ONLY JSON:
{"imagePrompt": "the same brief with EVERY quoted on-image text replaced by Tamil written by the rules above; keep the layout, visuals, colours, sizes and all other instructions exactly the same; keep ${BRAND.phone} and ${BRAND.website} in English; add: All Tamil text must be rendered in clean, correctly spelled Unicode Tamil script with a clear, modern Tamil font.",
 "kicker": "...", "headline": "...", "support": "...", "points": ["..."], "cta": "...", "caption": "the caption rewritten naturally in Tamil (website and phone in English)"}`

const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'text')
  if (limited) return limited
  let b: { post?: PostContent }
  try {
    b = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const p = b.post
  if (!p || !isCategoryId(p.category) || !p.art?.prompt) return NextResponse.json({ error: 'This post can’t be redone in Tamil.' }, { status: 400 })
  if (!textProvider()) return NextResponse.json({ error: 'The AI text service isn’t switched on.' }, { status: 503 })
  const input = { imagePrompt: p.art.prompt, kicker: p.kicker, headline: p.headline, support: p.support, points: p.points, cta: p.cta, caption: p.caption }
  try {
    const out = await completeJson(SYSTEM, JSON.stringify(input, null, 1))
    let r: Record<string, unknown> = {}
    try {
      r = JSON.parse(out.replace(/^```json\s*|\s*```$/g, ''))
    } catch {
      r = {}
    }
    const prompt = str(r.imagePrompt, '')
    if (!prompt || !/[஀-௿]/.test(prompt)) return NextResponse.json({ error: 'Couldn’t write the Tamil version — try again.' }, { status: 502 })
    const arr = Array.isArray(r.points) ? r.points.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : p.points
    const post: PostContent = {
      ...p,
      kicker: str(r.kicker, p.kicker),
      headline: str(r.headline, p.headline).replace(/\\n/g, '\n'),
      accentWords: [],
      support: str(r.support, p.support),
      points: arr,
      cta: str(r.cta, p.cta),
      caption: str(r.caption, p.caption),
      language: 'Tamil',
      art: { ...p.art, prompt },
    }
    return NextResponse.json({ post })
  } catch (error) {
    const { message, status } = friendlyError(error, 'Tamil version failed')
    return NextResponse.json({ error: message }, { status })
  }
}
