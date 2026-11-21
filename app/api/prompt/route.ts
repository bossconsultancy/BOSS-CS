import { NextRequest, NextResponse } from 'next/server'
import { FORMATS, FormatId, isCategoryId, normaliseStyle } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { buildDesignPrompt } from '@/lib/social/prompt'

export const dynamic = 'force-dynamic'

/** Builds a ready-to-paste prompt for making the design in the ChatGPT app. */
export async function POST(request: NextRequest) {
  let b: { post: PostContent; style?: string; format?: FormatId; showPoints?: boolean; showExtension?: boolean }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!b.post || !isCategoryId(b.post.category)) return NextResponse.json({ error: 'Missing post text.' }, { status: 400 })
  const style = normaliseStyle(b.style)
  const format: FormatId = b.format && b.format in FORMATS ? b.format : 'portrait'
  const f = FORMATS[format]
  const prompt = buildDesignPrompt({
    post: b.post,
    style,
    format,
    showPoints: b.showPoints ?? true,
    showExtension: b.showExtension ?? true,
    referenceCount: 0,
    variation: Math.floor(Math.random() * 4),
  })
  const intro = `Please generate this image (${f.aspect} ${f.w === f.h ? 'square' : 'vertical'} format, ${f.w}×${f.h}). Do not ask questions — just create it.\n\n`
  return NextResponse.json({ prompt: intro + prompt })
}
