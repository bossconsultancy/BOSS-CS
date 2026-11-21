import { NextRequest, NextResponse } from 'next/server'
import { BRAND, CATEGORIES, CategoryId, isCategoryId } from '@/lib/social/brand'
import { completeJson, friendlyError, textProvider } from '@/lib/social/openai'
import { rateLimit } from '@/lib/social/limit'

export const maxDuration = 30

// Headline hooks for the Your Idea page: suggest fresh, specific hooks from the user's idea,
// or polish a hook the user typed.

const SYSTEM = `You are a top social media copywriter for ${BRAND.name}, a Toronto consultancy serving newcomers, Tamil and South Asian families, students and small businesses.
You write HEADLINE HOOKS for Instagram graphics: the big words that stop the scroll.
A great hook is SPECIFIC to the idea (names the real thing, the person it helps, the benefit or the problem), short (3–8 words), and has a clear angle. Never generic ("Explore your next step", "We are here for you", "Your journey starts here", "Contact us today").
Use a different angle for each hook, from: question, bold promise/benefit, problem/pain, curiosity gap, number/list, urgency/season, myth-buster, emotional/family, direct call-out of the audience ("Newcomers in Scarborough:").
Rules: never invent prices, discounts, deadlines, statistics or guarantees that the user didn't give; never promise approvals, refunds or results; never mention OSAP; no phone extensions; no hashtags or emoji in hooks.
Return ONLY JSON: {"hooks":[{"text":"...","angle":"question|benefit|problem|curiosity|number|urgency|myth|emotional|call-out"}]}`

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'text')
  if (limited) return limited
  let b: { idea?: string; hook?: string; category?: CategoryId | 'auto' }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const idea = (b.idea || '').trim()
  const hook = (b.hook || '').trim()
  if (!idea && !hook) return NextResponse.json({ error: 'Type your idea first.' }, { status: 400 })
  if (!textProvider()) return NextResponse.json({ error: 'Hook ideas need the AI text service, which isn’t switched on.' }, { status: 503 })
  const dept = b.category && b.category !== 'auto' && isCategoryId(b.category) ? CATEGORIES[b.category].name : null

  const user = hook
    ? `POLISH this hook the user wrote. Keep their meaning and any facts; make it punchier, clearer and more scroll-stopping. Give 4 polished versions with different angles; the first should stay closest to their wording.\nUser's hook: "${hook}"${idea ? `\nThe post is about: ${idea}` : ''}${dept ? `\nDepartment: ${dept}` : ''}`
    : `Suggest 6 headline hooks, each with a DIFFERENT angle, for this post idea:\n${idea}${dept ? `\nDepartment: ${dept}` : ''}`

  try {
    const out = await completeJson(SYSTEM, user)
    let raw: { hooks?: { text?: string; angle?: string }[] } = {}
    try {
      raw = JSON.parse(out.replace(/^```json\s*|\s*```$/g, ''))
    } catch {
      raw = {}
    }
    const seen = new Set<string>()
    const hooks = (Array.isArray(raw.hooks) ? raw.hooks : [])
      .map((h) => ({ text: String(h?.text || '').replace(/^["“]|["”]$/g, '').replace(/#\w+/g, '').trim(), angle: String(h?.angle || '').trim() }))
      .filter((h) => h.text && h.text.split(/\s+/).length <= 12 && !/\bosap\b/i.test(h.text) && !seen.has(h.text.toLowerCase()) && seen.add(h.text.toLowerCase()))
      .slice(0, hook ? 4 : 6)
    if (!hooks.length) return NextResponse.json({ error: 'No hooks came back — try again.' }, { status: 502 })
    return NextResponse.json({ hooks })
  } catch (error) {
    const { message, status } = friendlyError(error, 'Couldn’t write hooks')
    return NextResponse.json({ error: message }, { status })
  }
}
