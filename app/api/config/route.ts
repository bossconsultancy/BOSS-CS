import { NextResponse } from 'next/server'
import { imageModelName, imageProvider } from '@/lib/social/imageProviders'
import { textProvider } from '@/lib/social/openai'
import { libraryReady } from '@/lib/social/library'

export const dynamic = 'force-dynamic'

export async function GET() {
  const p = imageProvider()
  return NextResponse.json({
    imageProvider: p,
    imageModel: imageModelName(p),
    textProvider: textProvider(),
    cloud: libraryReady(),
  })
}
