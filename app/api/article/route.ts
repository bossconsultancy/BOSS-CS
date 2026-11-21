import { NextRequest, NextResponse } from 'next/server'
import { articleDetails } from '@/lib/social/article'
import { rateLimit } from '@/lib/social/limit'
import { departmentNews } from '@/lib/social/news'
import { isCategoryId } from '@/lib/social/brand'

export const dynamic = 'force-dynamic'

/** Free check: reads an article (no AI). */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'text')
  if (limited) return limited
  const body = await request.json().catch(() => ({}))
  let url: string = body.url || ''
  if (!url && isCategoryId(body.department)) url = (await departmentNews(body.department, { max: 3 }))[0]?.url || ''
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  const r = await articleDetails(url, 1200)
  return NextResponse.json({ input: url, resolved: r.url, chars: r.text.length, excerpt: r.text.slice(0, 400) })
}
