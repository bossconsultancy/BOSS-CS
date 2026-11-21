import { NextRequest, NextResponse } from 'next/server'
import { FORMATS, FormatId, isCategoryId } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { buildRefinePrompt } from '@/lib/social/prompt'
import { generateDesign, parseDataUrl, ProviderError } from '@/lib/social/imageProviders'
import { rateLimit } from '@/lib/social/limit'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'design')
  if (limited) return limited

  let b: { image: string; instruction: string; post: PostContent; format: FormatId; quality?: 'standard' | 'high' }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const base = parseDataUrl(b.image)
  if (!base) return NextResponse.json({ error: 'Missing the design to refine.' }, { status: 400 })
  if (!b.instruction?.trim()) return NextResponse.json({ error: 'Say what to change.' }, { status: 400 })
  if (!b.post || !isCategoryId(b.post.category)) return NextResponse.json({ error: 'Missing post copy.' }, { status: 400 })
  const format: FormatId = b.format in FORMATS ? b.format : 'square'
  const prompt = buildRefinePrompt(b.instruction, b.post)

  try {
    const img = await generateDesign({ prompt, images: [base], format, quality: b.quality === 'high' ? 'high' : 'standard' })
    return NextResponse.json({ image: img.dataUrl, base: img.baseUrl })
  } catch (e) {
    console.error('refine error:', e)
    const status = e instanceof ProviderError ? e.status : 500
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Refine failed', code: e instanceof ProviderError ? e.code : 'other' }, { status })
  }
}
