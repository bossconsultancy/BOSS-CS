import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { FORMATS, FormatId } from '@/lib/social/brand'
import { parseDataUrl } from '@/lib/social/imageProviders'
import { clearCorner, stampLogo } from '@/lib/social/logo'
import { crispJpeg } from '@/lib/social/imageProviders'
import { rateLimit } from '@/lib/social/limit'

export const dynamic = 'force-dynamic'

/** Takes an image made elsewhere (e.g. ChatGPT), sizes it exactly and stamps the official logo. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'text')
  if (limited) return limited
  let b: { image: string; format?: FormatId }
  try {
    b = await request.json()
  } catch {
    return NextResponse.json({ error: 'That image is too large — try a smaller file.' }, { status: 400 })
  }
  const img = parseDataUrl(b.image)
  if (!img) return NextResponse.json({ error: 'Please upload a PNG or JPG image.' }, { status: 400 })
  const format: FormatId = b.format && b.format in FORMATS ? b.format : 'portrait'
  const f = FORMATS[format]
  try {
    const sized = await sharp(Buffer.from(img.b64, 'base64'))
      .rotate()
      .resize(f.w, f.h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
      .png()
      .toBuffer()
    const base = await clearCorner(sized, f.w, f.h)
    const stamped = await stampLogo(base, f.w)
    const [final, clean] = await Promise.all([crispJpeg(sharp(stamped)), crispJpeg(sharp(base))])
    return NextResponse.json({
      image: `data:image/jpeg;base64,${final.toString('base64')}`,
      base: `data:image/jpeg;base64,${clean.toString('base64')}`,
    })
  } catch {
    return NextResponse.json({ error: 'Couldn’t read that image.' }, { status: 400 })
  }
}
