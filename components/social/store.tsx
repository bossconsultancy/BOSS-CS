'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_LIST, CategoryId, FormatId, normaliseStyle, PostType, StyleId } from '@/lib/social/brand'
import { Idea, Source } from '@/lib/social/ideas'
import { PostContent } from '@/lib/social/post'
import { idbGet, idbSet } from '@/lib/social/idb'

/* ---------------- Types ---------------- */

export interface Config {
  imageProvider: 'gemini' | 'openai' | 'mock' | null
  imageModel: string
  textProvider: 'openai' | 'gemini' | null
  /** Posts are saved to the shared cloud library (seen on every computer). */
  cloud?: boolean
}

export interface Brief {
  topic: string
  notes?: string
  category: CategoryId | 'auto'
  postType: PostType
  sources?: Source[]
  sourceDate?: string
  label: string
  /** Headline hook chosen on the Your Idea page (used word-for-word). */
  hook?: string
}

export type JobStatus = 'queued' | 'writing' | 'designing' | 'done' | 'error'

export interface Job {
  id: string
  group: string
  status: JobStatus
  error?: string
  image?: string
  base?: string // design without the logo (used for edits)
  post?: PostContent
  brief: Brief
  format: FormatId
  style: StyleId
  variation: number
  started: number
  finished?: number
  origin: 'wire' | 'idea' | 'link' | 'refine' | 'redesign' | 'chatgpt' | 'tamil'
  note?: string
  /** Carousel: all slides share a deck id; slide is 1-based. */
  deck?: string
  slide?: number
  slides?: number
  /** Saved to the cloud library. */
  synced?: boolean
}

export interface Kit {
  refs: string[]
  style: StyleId
  format: FormatId
  quality: 'standard' | 'high'
  perIdea: number
  showExtension: boolean
  showPoints: boolean
  extra: string
  /** Language of the words on new posts. */
  language: 'English' | 'Tamil'
}

export type DeskTab = 'wire' | 'link' | 'idea' | 'posts'
export type DeskMode = 'news' | 'social'

export interface DeskState {
  config: Config | null
  kit: Kit
  setKit: (patch: Partial<Kit>) => void

  // The wire
  desks: CategoryId[]
  setDesks: (d: CategoryId[]) => void
  ideas: Idea[]
  scanning: Partial<Record<CategoryId, 'running' | 'done' | 'error' | undefined>>
  scanErrors: Partial<Record<CategoryId, string>>
  sample: boolean
  scannedAt: number | null
  runWire: (count: number) => Promise<void>
  findMore: (dept: CategoryId) => Promise<void>
  moreLoading: CategoryId[]
  selected: string[]
  toggleIdea: (id: string) => void
  clearSelection: () => void

  // Posts
  jobs: Job[]
  createPosts: (briefs: Brief[], origin: Job['origin'], variations?: number) => void
  refine: (job: Job, instruction: string) => void
  redesign: (job: Job, post: PostContent) => void
  removeJob: (id: string) => void
  /** Same design (or whole carousel), words translated to Tamil. */
  makeTamil: (job: Job) => void
  chatgptPrompt: (job: Job) => Promise<string>
  finishFromUpload: (job: Job, dataUrl: string) => Promise<void>

  tab: DeskTab
  setTab: (t: DeskTab) => void
  mode: DeskMode
  kitOpen: boolean
  setKitOpen: (o: boolean) => void
  toast: string | null
  notify: (m: string) => void
  aiIssue: string | null
  clearAiIssue: () => void
}

const Ctx = createContext<DeskState | null>(null)
export const useDesk = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDesk outside provider')
  return c
}

/* ---------------- Storage ---------------- */

const KEYS = { kit: 'boss.desk.kit.v1', desks: 'boss.desk.desks', wire: 'boss.desk.wire.v1', jobs: 'jobs.v1', cloudMigrated: 'boss.desk.cloud.migrated' }
const ls = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
      return true
    } catch {
      return false
    }
  },
}

const DEFAULT_KIT: Kit = {
  refs: [],
  style: 'vibrant',
  format: 'portrait',
  quality: 'standard',
  perIdea: 1,
  showExtension: true,
  showPoints: true,
  extra: '',
  language: 'English',
}

const uid = () => Math.random().toString(36).slice(2, 10)

/* A tiny semaphore so we don't fire 20 image calls at once. */
function makeLimiter(max: number) {
  let active = 0
  const queue: (() => void)[] = []
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((r) => queue.push(r))
    active++
    try {
      return await fn()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

/* ---------------- Provider ---------------- */

export function DeskProvider({ children, initialTab = 'wire', mode = 'news' }: { children: ReactNode; initialTab?: DeskTab; mode?: DeskMode }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [kit, setKitState] = useState<Kit>(DEFAULT_KIT)
  const [desks, setDesksState] = useState<CategoryId[]>(CATEGORY_LIST.map((c) => c.id))
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [scanning, setScanning] = useState<DeskState['scanning']>({})
  const [scanErrors, setScanErrors] = useState<DeskState['scanErrors']>({})
  const [sample, setSample] = useState(false)
  const [scannedAt, setScannedAt] = useState<number | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [tab, setTab] = useState<DeskState['tab']>(initialTab)
  const [kitOpen, setKitOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [aiIssue, setAiIssue] = useState<string | null>(null)

  const kitRef = useRef(kit)
  kitRef.current = kit
  const jobsRef = useRef<Job[]>([])
  jobsRef.current = jobs
  const loaded = useRef(false)
  const designLimit = useRef(makeLimiter(3))
  const writeLimit = useRef(makeLimiter(3))
  const researchLimit = useRef(makeLimiter(2))

  /* Load */
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ imageProvider: null, imageModel: 'none', textProvider: null }))
    try {
      const k = JSON.parse(ls.get(KEYS.kit) || 'null')
      if (k) setKitState({ ...DEFAULT_KIT, ...k, refs: [], style: normaliseStyle(k.style), perIdea: 1, quality: 'standard', extra: '' })
    } catch {}
    try {
      const d = JSON.parse(ls.get(KEYS.desks) || 'null')
      if (Array.isArray(d) && d.length) setDesksState(d)
    } catch {}
    try {
      const w = JSON.parse(ls.get(KEYS.wire) || 'null')
      if (w?.ideas) {
        setIdeas(w.ideas)
        setScannedAt(w.at ?? null)
        setSample(Boolean(w.sample))
      }
    } catch {}
    idbGet<Job[]>(KEYS.jobs).then((saved) => {
      if (Array.isArray(saved)) setJobs(saved.filter((j) => j.status === 'done'))
      loaded.current = true
      setLocalReady(true)
    })
  }, [])

  /* ---------- Cloud library: same posts on every computer ---------- */
  const [localReady, setLocalReady] = useState(false)
  const uploading = useRef(new Set<string>())
  const syncing = useRef(false)

  const pullCloud = useCallback(async () => {
    if (syncing.current) return
    syncing.current = true
    try {
      const res = await fetch('/api/library', { cache: 'no-store' })
      const data = (await res.json().catch(() => null)) as { enabled?: boolean; items?: { id: string; started: number }[] } | null
      if (!res.ok || !data?.enabled) return
      const remote = new Set((data.items || []).map((i) => i.id))
      const firstTime = ls.get(KEYS.cloudMigrated) !== '1'
      // Posts deleted on another computer disappear here too (unless they were never uploaded).
      setJobs((js) => js.filter((j) => j.status !== 'done' || remote.has(j.id) || !j.synced || firstTime))
      if (firstTime) ls.set(KEYS.cloudMigrated, '1')
      const have = new Set(jobsRef.current.map((j) => j.id))
      const missing = (data.items || []).filter((i) => !have.has(i.id)).slice(0, 60)
      const got: Job[] = []
      for (let i = 0; i < missing.length; i += 4) {
        const batch = await Promise.all(
          missing.slice(i, i + 4).map((m) =>
            fetch(`/api/library/${m.id}`, { cache: 'no-store' })
              .then((r) => (r.ok ? (r.json() as Promise<Job>) : null))
              .catch(() => null)
          )
        )
        got.push(...batch.filter((j): j is Job => Boolean(j && j.id && j.status === 'done')).map((j) => ({ ...j, synced: true })))
      }
      if (got.length) {
        setJobs((js) => {
          const ids = new Set(js.map((j) => j.id))
          return [...js, ...got.filter((j) => !ids.has(j.id))].sort((a, b) => b.started - a.started)
        })
      }
    } catch {
      // offline or cloud unavailable — local copies still work
    } finally {
      syncing.current = false
    }
  }, [])

  // Initial sync, then whenever the tab comes back into view and every few minutes.
  useEffect(() => {
    if (!localReady || !config?.cloud) return
    pullCloud()
    const onFocus = () => document.visibilityState === 'visible' && pullCloud()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    const t = setInterval(pullCloud, 3 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
      clearInterval(t)
    }
  }, [localReady, config?.cloud, pullCloud])

  // Upload every finished post that isn't in the cloud yet.
  useEffect(() => {
    if (!localReady || !config?.cloud) return
    for (const j of jobs) {
      if (j.status !== 'done' || j.synced || uploading.current.has(j.id)) continue
      uploading.current.add(j.id)
      fetch(`/api/library/${j.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...j, synced: true }) })
        .then((r) => {
          if (r.ok) setJobs((js) => js.map((x) => (x.id === j.id ? { ...x, synced: true } : x)))
        })
        .catch(() => {})
        .finally(() => uploading.current.delete(j.id))
    }
  }, [jobs, localReady, config?.cloud])

  /* Persist finished posts */
  useEffect(() => {
    if (!loaded.current) return
    idbSet(KEYS.jobs, jobs.filter((j) => j.status === 'done').slice(0, 60))
  }, [jobs])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const notify = useCallback((m: string) => setToast(m), [])


  const setKit = useCallback((patch: Partial<Kit>) => {
    setKitState((k) => {
      const next = { ...k, ...patch }
      if (!ls.set(KEYS.kit, JSON.stringify(next))) {
        // Too big (large references) — persist without images.
        ls.set(KEYS.kit, JSON.stringify({ ...next, refs: [] }))
      }
      return next
    })
  }, [])

  const setDesks = useCallback((d: CategoryId[]) => {
    setDesksState(d)
    ls.set(KEYS.desks, JSON.stringify(d))
  }, [])

  const api = useCallback(async <T,>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let data: T & { error?: string; code?: string }
    try {
      data = await res.json()
    } catch {
      throw new Error(res.status === 413 ? 'Upload too large — remove a reference image.' : `Server error (${res.status}). It may have timed out — try again.`)
    }
    if (!res.ok || data.error) {
      const err = new Error(data.error || `Request failed (${res.status})`) as Error & { code?: string }
      err.code = data.code
      if (data.code === 'billing' || data.code === 'key') setAiIssue(err.message)
      throw err
    }
    return data
  }, [])

  /* ---------- The wire ---------- */

  const runWire = useCallback(
    async (count: number) => {
      const chosen = desks.length ? desks : CATEGORY_LIST.map((c) => c.id)
      setIdeas((prev) => prev.filter((i) => !chosen.includes(i.department)))
      setSelected([])
      setScanErrors({})
      setAiIssue(null)
      setScanning(Object.fromEntries(chosen.map((d) => [d, 'running'])))
      let anySample = false
      let stop = false
      await Promise.all(
        chosen.map((d) =>
          researchLimit.current(async () => {
            if (stop) {
              setScanning((s) => ({ ...s, [d]: undefined }))
              return
            }
            try {
              const r = await api<{ ideas: Idea[]; sample?: boolean }>('/api/discover', { department: d, count })
              anySample = anySample || Boolean(r.sample)
              setIdeas((prev) => [...prev.filter((i) => i.department !== d), ...r.ideas])
              setScanning((s) => ({ ...s, [d]: 'done' }))
            } catch (e) {
              const code = (e as { code?: string }).code
              if (code === 'billing' || code === 'key') {
                stop = true
                setScanning((s) => ({ ...s, [d]: undefined }))
                return
              }
              setScanErrors((s) => ({ ...s, [d]: e instanceof Error ? e.message : 'Failed' }))
              setScanning((s) => ({ ...s, [d]: 'error' }))
            }
          })
        )
      )
      const at = Date.now()
      setSample(anySample)
      setScannedAt(at)
      setIdeas((all) => {
        ls.set(KEYS.wire, JSON.stringify({ ideas: all, at, sample: anySample }))
        return all
      })
    },
    [desks, api]
  )

  const [moreLoading, setMoreLoading] = useState<CategoryId[]>([])
  const ideasRef = useRef<Idea[]>([])
  ideasRef.current = ideas
  const findMore = useCallback(
    async (dept: CategoryId) => {
      setMoreLoading((m) => [...m, dept])
      try {
        const existing = ideasRef.current.filter((i) => i.department === dept)
        const exclude = existing.flatMap((i) => [i.topic, ...i.sources.map((s) => s.url)])
        const r = await api<{ ideas: Idea[] }>('/api/discover', { department: dept, count: 4, more: true, exclude })
        const known = new Set(existing.map((i) => i.topic.toLowerCase()))
        const fresh = r.ideas.filter((i) => !known.has(i.topic.toLowerCase()))
        if (!fresh.length) notify('No new stories found right now — try again later.')
        setIdeas((all) => {
          const next = [...all, ...fresh]
          ls.set(KEYS.wire, JSON.stringify({ ideas: next, at: Date.now(), sample: false }))
          return next
        })
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Couldn’t find more news')
      } finally {
        setMoreLoading((m) => m.filter((d) => d !== dept))
      }
    },
    [api, notify]
  )

  const toggleIdea = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }, [])
  const clearSelection = useCallback(() => setSelected([]), [])

  /* ---------- Posts ---------- */

  const patchJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }, [])

  const design = useCallback(
    async (job: Job, post: PostContent, deckRef?: string): Promise<string | undefined> => {
      const k = kitRef.current
      patchJob(job.id, { status: 'designing', post })
      try {
        const r = await designLimit.current(() =>
          api<{ image: string; base?: string }>('/api/generate-design', {
            post,
            style: job.style,
            format: job.format,
            showPoints: k.showPoints && post.points.length > 0,
            showExtension: k.showExtension,
            references: post.news ? [] : k.refs,
            variation: job.variation,
            extra: k.extra,
            quality: k.quality,
            deckRef,
          })
        )
        patchJob(job.id, { status: 'done', image: r.image, base: r.base, finished: Date.now() })
        return r.base || r.image
      } catch (e) {
        patchJob(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Design failed' })
        return undefined
      }
    },
    [api, patchJob]
  )

  const createPosts = useCallback(
    (briefs: Brief[], origin: Job['origin'], variations?: number) => {
      const k = kitRef.current
      const n = Math.max(1, Math.min(4, variations ?? k.perIdea))
      const now = Date.now()
      const groups = briefs.map((brief) => {
        const group = uid()
        const js: Job[] = Array.from({ length: n }).map((_, v) => ({
          id: uid(),
          group,
          status: 'queued',
          brief,
          format: k.format,
          style: k.style,
          variation: v,
          started: now,
          origin,
        }))
        return { brief, js }
      })
      setJobs((prev) => [...groups.flatMap((g) => g.js), ...prev])
      setTab('posts')

      groups.forEach(({ brief, js }) => {
        js.forEach((j) => patchJob(j.id, { status: 'writing' }))
        writeLimit.current(() =>
          api<{ post: PostContent; slides?: PostContent[] }>('/api/generate-text', {
            topic: brief.topic,
            notes: brief.notes,
            category: brief.category,
            postType: brief.postType,
            sources: brief.sources,
            sourceDate: brief.sourceDate,
            hook: brief.hook,
            style: k.style,
            language: k.language,
          })
        )
          .then(async ({ post, slides }) => {
            // News with lots of content → the art director made a carousel.
            if (slides && slides.length > 1 && js.length === 1) {
              const cover = js[0]
              const deck = cover.group
              const rest: Job[] = slides.slice(1).map((_, i) => ({ ...cover, id: uid(), status: 'queued', deck, slide: i + 2, slides: slides.length }))
              setJobs((prev) => {
                const at = prev.findIndex((x) => x.id === cover.id)
                const next = prev.map((x) => (x.id === cover.id ? { ...x, deck, slide: 1, slides: slides.length } : x))
                next.splice(at + 1, 0, ...rest)
                return next
              })
              const ref = await design({ ...cover, deck, slide: 1, slides: slides.length }, slides[0])
              rest.forEach((j, i) => design(j, slides[i + 1], ref))
              return
            }
            js.forEach((j) => design(j, post))
          })
          .catch((e) => js.forEach((j) => patchJob(j.id, { status: 'error', error: e instanceof Error ? e.message : 'Writing failed' })))
      })
    },
    [api, design, patchJob]
  )

  const refine = useCallback(
    (src: Job, instruction: string) => {
      if (!src.image || !src.post) return
      const job: Job = { ...src, id: uid(), status: 'designing', image: undefined, base: undefined, error: undefined, started: Date.now(), origin: 'refine', note: instruction }
      setJobs((js) => [job, ...js])
      const k = kitRef.current
      designLimit.current(() =>
        api<{ image: string; base?: string }>('/api/refine', { image: src.base || src.image, instruction, post: src.post, format: src.format, quality: k.quality })
      )
        .then((r) => patchJob(job.id, { status: 'done', image: r.image, base: r.base, finished: Date.now() }))
        .catch((e) => patchJob(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Refine failed' }))
    },
    [api, patchJob]
  )

  const redesign = useCallback(
    (src: Job, edited: PostContent) => {
      // Briefed posts: tell the designer exactly which words changed.
      let post = edited
      const before = src.post
      if (before?.art?.prompt) {
        const q = (x?: string) => `"${(x || '').replace(/\n/g, ' / ')}"`
        const changes = [
          before.headline !== edited.headline && `headline → ${q(edited.headline)}`,
          before.kicker !== edited.kicker && `small label → ${q(edited.kicker)}`,
          before.support !== edited.support && `supporting line → ${q(edited.support)}`,
          before.points.join('|') !== edited.points.join('|') && `facts → ${edited.points.map((p) => q(p)).join(', ')}`,
          before.cta !== edited.cta && `line above the phone → ${q(edited.cta)}`,
        ].filter(Boolean)
        if (changes.length) post = { ...edited, art: { ...before.art, prompt: `${before.art.prompt}\n\nTEXT CORRECTIONS FROM THE CLIENT (these override the text above): ${changes.join('; ')}.` } }
      }
      const job: Job = { ...src, id: uid(), status: 'designing', image: undefined, base: undefined, error: undefined, post, started: Date.now(), origin: 'redesign', note: 'Edited text' }
      setJobs((js) => [job, ...js])
      // A carousel slide keeps matching its set: use another finished slide as the style reference.
      const sibling = src.deck ? jobsRef.current.find((j) => j.deck === src.deck && j.id !== src.id && j.status === 'done' && j.base) : undefined
      design(job, post, sibling?.base)
    },
    [design]
  )

  const removeJob = useCallback((id: string) => {
    setJobs((js) => js.filter((j) => j.id !== id))
    fetch(`/api/library/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const makeTamil = useCallback(
    (src: Job) => {
      // A carousel is translated as a whole set (latest version of each slide).
      const sources = src.deck ? latestSlides(jobsRef.current.filter((j) => j.deck === src.deck && j.status === 'done')) : [src]
      const deck = src.deck ? uid() : undefined
      const now = Date.now()
      const js: Job[] = sources.map((s) => ({ ...s, id: uid(), status: 'writing', image: undefined, base: undefined, error: undefined, started: now, finished: undefined, origin: 'tamil', note: 'Tamil version', deck, slide: deck ? s.slide : undefined }))
      setJobs((prev) => [...js, ...prev])
      const k = kitRef.current
      // Posts with an AI design brief: rewrite the brief in natural Tamil and make the post FRESH
      // (same design idea, full quality). Carousels: slide 1 first, the rest match it.
      if (sources.every((s) => s.post?.art?.prompt)) {
        ;(async () => {
          let ref: string | undefined
          for (let i = 0; i < js.length; i++) {
            const job = js[i]
            try {
              const { post } = await api<{ post: PostContent }>('/api/tamil-version', { post: sources[i].post })
              const base = await design(job, post, i > 0 ? ref : undefined)
              if (i === 0) ref = base
            } catch (e) {
              patchJob(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Tamil version failed' })
            }
          }
        })()
        return
      }
      js.forEach((job, i) => {
        const from = sources[i]
        if (!from.post || !(from.base || from.image)) return patchJob(job.id, { status: 'error', error: 'Nothing to translate yet.' })
        api<{ post: PostContent }>('/api/translate', { post: from.post, language: 'Tamil' })
          .then(({ post }) => {
            patchJob(job.id, { status: 'designing', post })
            return designLimit.current(() =>
              api<{ image: string; base?: string }>('/api/refine', { image: from.base || from.image, instruction: tamilInstruction(post), post, format: from.format, quality: k.quality })
            )
          })
          .then((r) => patchJob(job.id, { status: 'done', image: r.image, base: r.base, finished: Date.now() }))
          .catch((e) => patchJob(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Tamil version failed' }))
      })
    },
    [api, patchJob, design]
  )

  const chatgptPrompt = useCallback(
    async (job: Job) => {
      const k = kitRef.current
      const post = job.post
      if (!post) throw new Error('This post has no text yet.')
      const r = await api<{ prompt: string }>('/api/prompt', { post, style: job.style, format: job.format, showPoints: k.showPoints && post.points.length > 0, showExtension: k.showExtension })
      return r.prompt
    },
    [api]
  )

  const finishFromUpload = useCallback(
    async (src: Job, dataUrl: string) => {
      const r = await api<{ image: string; base: string }>('/api/finish', { image: dataUrl, format: src.format })
      const job: Job = { ...src, id: uid(), status: 'done', image: r.image, base: r.base, error: undefined, started: Date.now(), finished: Date.now(), origin: 'chatgpt', note: 'Made in ChatGPT' }
      setJobs((js) => [job, ...js.filter((j) => !(j.id === src.id && j.status === 'error'))])
    },
    [api]
  )

  const value = useMemo<DeskState>(
    () => ({
      config,
      kit,
      setKit,
      desks,
      setDesks,
      ideas,
      scanning,
      scanErrors,
      sample,
      scannedAt,
      runWire,
      findMore,
      moreLoading,
      selected,
      toggleIdea,
      clearSelection,
      jobs,
      createPosts,
      refine,
      redesign,
      removeJob,
      makeTamil,
      chatgptPrompt,
      finishFromUpload,
      tab,
      setTab,
      mode,
      kitOpen,
      setKitOpen,
      toast,
      notify,
      aiIssue,
      clearAiIssue: () => setAiIssue(null),
    }),
    [config, kit, setKit, desks, setDesks, ideas, scanning, scanErrors, sample, scannedAt, runWire, findMore, moreLoading, selected, toggleIdea, clearSelection, jobs, createPosts, refine, redesign, removeJob, makeTamil, chatgptPrompt, finishFromUpload, tab, mode, kitOpen, toast, notify, aiIssue]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function ideaToBrief(i: Idea): Brief {
  return {
    topic: `${i.topic}. Post angle: ${i.angle} Suggested headline: ${i.headline}`,
    notes: [i.summary, i.date ? `Date: ${i.date}` : '', i.whyNow, i.details ? `\nFROM THE ARTICLE:\n${i.details}` : ''].filter(Boolean).join(' '),
    category: i.department,
    postType: i.postType,
    sources: i.sources,
    sourceDate: i.date,
    label: i.topic,
  }
}

/** Newest finished version of each slide of a carousel, in slide order. */
export function latestSlides(js: Job[]): Job[] {
  const by = new Map<number, Job>()
  for (const j of js) {
    const n = j.slide ?? 1
    const cur = by.get(n)
    if (!cur || j.started > cur.started) by.set(n, j)
  }
  return Array.from(by.entries())
    .sort((a, b) => a[0] - b[0])
    .map((e) => e[1])
}

function tamilInstruction(p: PostContent): string {
  const q = (x?: string) => (x ? `"${x.replace(/\n/g, ' / ')}"` : '')
  const lines = [
    p.kicker && `label: ${q(p.kicker)}`,
    p.headline && `headline: ${q(p.headline)}${p.accentWords.length ? ` (emphasise ${p.accentWords.map(q).join(', ')})` : ''}`,
    p.support && `supporting line: ${q(p.support)}`,
    p.points.length && `bullets/badges: ${p.points.map(q).join(', ')}`,
    p.keyStatLabel && `number caption: ${q(p.keyStatLabel)}`,
    p.takeaway && `note: ${q(p.takeaway)}`,
    p.cta && `call to action: ${q(p.cta)}`,
  ].filter(Boolean)
  return `Translate this design into TAMIL. Replace every piece of English wording with the Tamil text below, in the same place, with the same size, weight, colour and hierarchy, using clean, correct, modern Tamil script (render each Tamil letter accurately). Keep "bosscs.com", "416 605 0101", numbers, amounts and "Swipe →" / page numbers as they are. Keep the photo, people, layout, colours, badges, icons and everything else exactly the same.\nTamil text:\n- ${lines.join('\n- ')}`
}
