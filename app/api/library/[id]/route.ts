import { NextRequest, NextResponse } from 'next/server'
import { deletePost, getPost, LibraryError, savePost } from '@/lib/social/library'
import { rateLimit } from '@/lib/social/limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }
export const maxDuration = 30

const fail = (e: unknown) =>
  NextResponse.json({ error: e instanceof Error ? e.message : 'Cloud error' }, { status: e instanceof LibraryError ? e.status : 500 })

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  try {
    const json = await getPost(id)
    if (!json) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return new NextResponse(json, { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return fail(e)
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const params = await ctx.params
  const limited = rateLimit(req, 'text')
  if (limited) return limited
  const body = await req.text()
  if (body.length > 20_000_000) return NextResponse.json({ error: 'Post too large to save.' }, { status: 413 })
  let job: { id?: string; status?: string; started?: number }
  try {
    job = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 })
  }
  if (job.id !== params.id || job.status !== 'done') return NextResponse.json({ error: 'Only finished posts can be saved.' }, { status: 400 })
  try {
    await savePost(params.id, body, Number(job.started) || Date.now())
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const params = await ctx.params
  const limited = rateLimit(req, 'text')
  if (limited) return limited
  try {
    await deletePost(params.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
