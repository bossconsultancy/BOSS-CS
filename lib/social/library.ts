import 'server-only'
import { del, get, list, put } from '@vercel/blob'

// Shared post library on Vercel Blob (the same private storage as the flyer team library), so posts
// made on one computer appear on every computer.
//   social/posts/<id>.json   one finished post (text, caption, image)

const MOCK = process.env.MOCK_CLOUD === '1' // local testing: a temp folder instead of Vercel Blob
const PREFIX = 'social/posts/'

export const libraryReady = () => MOCK || Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)

export class LibraryError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
const pathOf = (id: string) => `${PREFIX}${safeId(id)}.json`

async function mockDir() {
  const fs = await import('fs/promises')
  const path = await import('path')
  const root = path.join(/* turbopackIgnore: true */ process.env.TMPDIR || '/tmp', 'boss-flyer-cloud', PREFIX)
  await fs.mkdir(root, { recursive: true })
  return { fs, path, root }
}

export interface LibraryItem {
  id: string
  started: number
}

/** All saved posts (ids + time), newest first. */
export async function listPosts(): Promise<LibraryItem[]> {
  if (!libraryReady()) throw new LibraryError('Team saving isn’t set up.', 503)
  const out: LibraryItem[] = []
  if (MOCK) {
    const { fs, path, root } = await mockDir()
    for (const n of await fs.readdir(root)) {
      if (!n.endsWith('.json')) continue
      const st = await fs.stat(path.join(root, n))
      out.push({ id: n.replace(/\.json$/, ''), started: st.mtimeMs })
    }
  } else {
    let cursor: string | undefined
    do {
      const page = await list({ prefix: PREFIX, limit: 1000, cursor })
      for (const b of page.blobs) out.push({ id: b.pathname.slice(PREFIX.length).replace(/\.json$/, ''), started: new Date(b.uploadedAt).getTime() })
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  }
  return out.sort((a, b) => b.started - a.started)
}

export async function getPost(id: string): Promise<string | null> {
  if (MOCK) {
    const { fs, path, root } = await mockDir()
    try {
      return await fs.readFile(path.join(/* turbopackIgnore: true */ root, `${safeId(id)}.json`), 'utf8')
    } catch {
      return null
    }
  }
  const r = await get(pathOf(id), { access: 'private', useCache: false }).catch(() => null)
  if (!r || r.statusCode !== 200) return null
  return new Response(r.stream).text()
}

export async function savePost(id: string, json: string, _started: number): Promise<void> {
  if (MOCK) {
    const { fs, path, root } = await mockDir()
    await fs.writeFile(path.join(root, `${safeId(id)}.json`), json)
    return
  }
  try {
    await put(pathOf(id), json, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true })
  } catch (e) {
    throw new LibraryError(`Couldn’t save to the team library: ${e instanceof Error ? e.message : 'unknown error'}`, 502)
  }
}

export async function deletePost(id: string): Promise<void> {
  if (MOCK) {
    const { fs, path, root } = await mockDir()
    await fs.rm(path.join(root, `${safeId(id)}.json`), { force: true })
    return
  }
  const page = await list({ prefix: pathOf(id), limit: 1 })
  if (page.blobs.length) await del(page.blobs.map((b) => b.url))
}
