import { NextResponse } from 'next/server'
import { LibraryError, libraryReady, listPosts } from '@/lib/social/library'

export const dynamic = 'force-dynamic'

/** Saved posts in the shared cloud library (ids + times). */
export async function GET() {
  if (!libraryReady()) return NextResponse.json({ enabled: false, items: [] })
  try {
    return NextResponse.json({ enabled: true, items: await listPosts() })
  } catch (e) {
    const status = e instanceof LibraryError ? e.status : 500
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Cloud error' }, { status })
  }
}
