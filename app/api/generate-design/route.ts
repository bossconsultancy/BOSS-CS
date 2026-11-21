import { NextRequest, NextResponse } from 'next/server'
import { FORMATS, FormatId, isCategoryId, normaliseStyle, StyleId } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { buildDesignPrompt, buildFluxPrompt, DesignRequest } from '@/lib/social/prompt'
import { generateDesign, imageProvider, InputImage, parseDataUrl, ProviderError, safeZoneFor } from '@/lib/social/imageProviders'
import { rateLimit } from '@/lib/social/limit'
import { promises as fs } from 'fs'
import path from 'path'

/** BOSS sample posts used as design-quality references (never as content). */
async function sampleImage(rel: string): Promise<InputImage | null> {
  try {
    const buf = await fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), 'public', rel))
    return { mime: 'image/jpeg', b64: buf.toString('base64') }
  } catch {
    return null
  }
}

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface Body {
  post: PostContent
  style: StyleId
  format: FormatId
  showPoints?: boolean
  showExtension?: boolean
  references?: string[]
  variation?: number
  extra?: string
  quality?: 'standard' | 'high'
  /** Carousel slide 2+: the finished slide 1 (without logo), so every slide matches it. */
  deckRef?: string
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'design')
  if (limited) return limited

  let b: Body
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body (images may be too large).' }, { status: 400 })
  }
  if (!b.post || !isCategoryId(b.post.category)) return NextResponse.json({ error: 'Missing post copy.' }, { status: 400 })
  const style: StyleId = normaliseStyle(b.style)
  const format: FormatId = b.format in FORMATS ? b.format : 'square'

  // Style references are ad examples: never send them with news posts, or the AI copies the ad look.
  const deck = b.deckRef ? parseDataUrl(b.deckRef) : null
  const briefed = Boolean(b.post.art?.prompt)
  // Briefed posts: slide 1 (for carousels) + BOSS sample designs as quality references.
  const samples = briefed
    ? ((await Promise.all(
        b.post.news ? ['house/ref-1.jpg', 'house/ref-2.jpg'].map(sampleImage) : [sampleImage(`house/style-${style}.jpg`), sampleImage('house/ref-1.jpg')]
      )).filter(Boolean) as InputImage[])
    : []
  const refs = briefed
    ? [...(deck ? [deck] : []), ...samples]
    : b.post.news
      ? deck
        ? [deck]
        : []
      : ((b.references || []).map(parseDataUrl).filter(Boolean).slice(0, 4) as InputImage[])
  const images = refs

  const req: DesignRequest = {
    post: b.post,
    style,
    format,
    showPoints: b.showPoints ?? true,
    showExtension: b.showExtension ?? true,
    referenceCount: b.post.news ? 0 : refs.length,
    variation: b.variation ?? 0,
    extra: b.extra,
    safeZone: safeZoneFor(imageProvider(), format),
    deckRef: Boolean(deck),
    designRefs: samples.length,
  }
  const provider = imageProvider()
  const prompt = provider === 'cloudflare' ? buildFluxPrompt(req) : buildDesignPrompt(req)

  try {
    const img = await generateDesign({ prompt, fallbackPrompt: buildFluxPrompt(req), images, logoGuide: true, format, quality: b.quality === 'high' ? 'high' : 'standard' })
    return NextResponse.json({ image: img.dataUrl, base: img.baseUrl })
  } catch (e) {
    console.error('generate-design error:', e)
    const status = e instanceof ProviderError ? e.status : 500
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed', code: e instanceof ProviderError ? e.code : 'other' }, { status })
  }
}
