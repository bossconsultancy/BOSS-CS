import { NextRequest, NextResponse } from 'next/server'
import { isCategoryId } from '@/lib/social/brand'
import { researchDepartment, sampleIdeas } from '@/lib/social/research'
import { rateLimit } from '@/lib/social/limit'
import { GoogleApiError } from '@/lib/social/googleErrors'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/** Researches ONE department (the client fans out, so results stream in as they finish). */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'research')
  if (limited) return limited

  let body: { department?: string; count?: number; more?: boolean; exclude?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const dept = body.department
  if (!isCategoryId(dept)) return NextResponse.json({ error: 'Unknown department' }, { status: 400 })
  const count = Math.min(6, Math.max(2, Number(body.count) || 4))

  if (process.env.DISCOVER_MOCK === 'true') {
    return NextResponse.json({ department: dept, ideas: sampleIdeas(dept), sample: true })
  }
  try {
    const exclude = Array.isArray(body.exclude) ? body.exclude.filter((x) => typeof x === 'string').slice(0, 200) : []
    const ideas = await researchDepartment(dept, count, { more: Boolean(body.more), exclude })
    return NextResponse.json({ department: dept, ideas, sample: false })
  } catch (e) {
    console.error('discover error:', e)
    const code = e instanceof GoogleApiError ? e.code : 'other'
    return NextResponse.json({ department: dept, ideas: [], error: e instanceof Error ? e.message : 'Research failed', code }, { status: code === 'billing' ? 402 : 502 })
  }
}
