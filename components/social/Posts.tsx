'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { CATEGORIES, fileName, FORMATS } from '@/lib/social/brand'
import { PostContent } from '@/lib/social/post'
import { Job, latestSlides, useDesk } from './store'
import { Dots } from './bits'
import { readFileAsDataURL, shrink } from '@/lib/social/clientImage'

export default function Posts() {
  const { jobs, setTab, mode } = useDesk()
  const [, tick] = useState(0)
  const active = jobs.some((j) => j.status !== 'done' && j.status !== 'error')
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])
  const [editing, setEditing] = useState<Job | null>(null)
  const [gpt, setGpt] = useState<Job | null>(null)
  // Carousel slides are shown together as one swipeable card.
  const items = useMemo(() => {
    const out: ({ job: Job } | { deck: string; slides: Job[] })[] = []
    const seen = new Set<string>()
    for (const j of jobs) {
      if (!j.deck) out.push({ job: j })
      else if (!seen.has(j.deck)) {
        seen.add(j.deck)
        out.push({ deck: j.deck, slides: latestSlides(jobs.filter((x) => x.deck === j.deck)) })
      }
    }
    return out
  }, [jobs])

  return (
    <div className="relative z-10 min-h-[calc(100vh-200px)] bg-night text-white">
      <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="meta text-white/40">Lightbox</div>
            <h1 className="mt-1 font-display text-[28px] font-[600] leading-tight sm:text-[34px]">
              Your <span className="text-[#4f7a95]">posts</span>
            </h1>
          </div>
          {jobs.length > 0 && <p className="max-w-sm text-sm text-white/50">Check the words before posting. Something off? Type a fix under the post.</p>}
        </div>

        {jobs.length === 0 ? (
          <div className="mt-12 rounded-[28px] border border-white/10 bg-night2 px-8 py-16 text-center">
            <div className="font-display text-[30px] italic text-white/80">Nothing on the light table yet.</div>
            <div className="mt-6 flex justify-center gap-3">
              {mode === 'news' ? (
                <button onClick={() => setTab('wire')} className="btn bg-paper text-ink">Find this week’s department news</button>
              ) : (
                <>
                  <button onClick={() => setTab('link')} className="btn bg-paper text-ink">Turn news into a post</button>
                  <button onClick={() => setTab('idea')} className="btn-ghost-night">Turn info into a post</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) =>
              'deck' in it ? (
                <Carousel key={it.deck} slides={it.slides} onEdit={setEditing} onChatGPT={setGpt} />
              ) : (
                <PostCard key={it.job.id} job={it.job} onEdit={() => setEditing(it.job)} onChatGPT={() => setGpt(it.job)} />
              )
            )}
          </div>
        )}
      </div>
      {editing && <EditSheet job={editing} onClose={() => setEditing(null)} />}
      {gpt && <ChatGPTSheet job={gpt} onClose={() => setGpt(null)} />}
    </div>
  )
}

function Carousel({ slides, onEdit, onChatGPT }: { slides: Job[]; onEdit: (j: Job) => void; onChatGPT: (j: Job) => void }) {
  const [i, setI] = useState(0)
  const idx = Math.min(i, slides.length - 1)
  const job = slides[idx]
  return <PostCard job={job} onEdit={() => onEdit(job)} onChatGPT={() => onChatGPT(job)} deck={{ index: idx, slides, go: setI }} />
}

type Deck = { index: number; slides: Job[]; go: (i: number) => void }

function PostCard({ job, onEdit, onChatGPT, deck }: { job: Job; onEdit: () => void; onChatGPT: () => void; deck?: Deck }) {
  const { refine, removeJob, notify, makeTamil } = useDesk()
  const [text, setText] = useState('')
  const f = FORMATS[job.format]
  const cat = job.post ? CATEGORIES[job.post.category] : job.brief.category !== 'auto' ? CATEGORIES[job.brief.category] : null
  const secs = Math.floor(((job.finished ?? Date.now()) - job.started) / 1000)
  const pending = job.status === 'queued' || job.status === 'writing' || job.status === 'designing'

  function save(j: Job, n: number) {
    if (!j.image || !j.post) return
    const a = document.createElement('a')
    a.href = j.image
    a.download = fileName(j.post.category, (deck ? deck.slides[0].post?.headline : null) || j.post.headline || 'slide', j.format, n)
    a.click()
  }
  function download() {
    if (deck) deck.slides.forEach((j, n) => setTimeout(() => save(j, n + 1), n * 350))
    else save(job, job.variation + 1)
  }
  const ready = deck ? deck.slides.every((j) => j.status === 'done') : job.status === 'done'
  const tamil = job.post?.language === 'Tamil'
  async function copyCaption() {
    if (!job.post) return
    try {
      await navigator.clipboard.writeText(`${job.post.caption}\n\n${job.post.hashtags.map((h) => `#${h}`).join(' ')}`)
      notify('Caption copied')
    } catch {
      notify('Clipboard blocked by the browser')
    }
  }

  return (
    <article className="animate-rise">
      <div className="group relative overflow-hidden rounded-[18px] bg-night2 ring-1 ring-white/10" style={{ aspectRatio: `${f.w} / ${f.h}` }}>
        {deck && (
          <>
            <div className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {deck.index + 1} / {deck.slides.length}
            </div>
            {deck.index > 0 && (
              <button onClick={() => deck.go(deck.index - 1)} aria-label="Previous slide" className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75">&lsaquo;</button>
            )}
            {deck.index < deck.slides.length - 1 && (
              <button onClick={() => deck.go(deck.index + 1)} aria-label="Next slide" className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75">&rsaquo;</button>
            )}
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
              {deck.slides.map((s, n) => (
                <button key={s.id} onClick={() => deck.go(n)} aria-label={`Slide ${n + 1}`} className={`h-2 rounded-full transition-all ${n === deck.index ? 'w-6 bg-white' : 'w-2 bg-white/45'}`} />
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => (deck ? deck.slides.forEach((j) => removeJob(j.id)) : removeJob(job.id))}
          aria-label={deck ? 'Delete this carousel' : 'Delete this post'}
          title="Delete"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg leading-none text-white backdrop-blur transition hover:scale-105 hover:bg-live"
        >
          ✕
        </button>
        {job.status === 'done' && job.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.image} alt={job.post?.headline.replace(/\n/g, ' ') || 'Post'} className="h-full w-full object-cover" />
        )}
        {pending && (
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(120% 80% at 30% 100%, ${cat?.primary ?? '#555'}55, transparent 60%)` }} />
            <div className="absolute inset-x-0 top-0 h-full w-1/2 animate-scan bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div className="relative">
              <div className="meta text-white/50">{secs}s</div>
              <div className="mt-1 font-display text-[26px] italic leading-tight text-white">
                {job.status === 'writing' ? 'Writing the copy' : job.status === 'designing' ? (job.origin === 'refine' ? 'Applying your edit' : 'Designing the post') : 'In the queue'} <Dots className="text-white/70" />
              </div>
              <div className="mt-3 text-sm text-white/50 line-clamp-2">{job.note || job.brief.label}</div>
            </div>
          </div>
        )}
        {job.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="font-display text-xl italic">That one didn’t print.</div>
            <div className="text-sm text-white/60">{job.error}</div>
            <div className="flex flex-wrap justify-center gap-2">
              {job.post && <button onClick={onChatGPT} className="btn bg-paper px-4 py-1.5 text-xs text-ink">Make it in ChatGPT</button>}
              <button onClick={() => removeJob(job.id)} className="btn-ghost-night px-4 py-1.5 text-xs">Dismiss</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {cat && (
            <div className="meta flex items-center gap-1.5 text-white/55">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: cat.primary }} />
              {cat.short.split(' & ')[0]}
              {job.origin === 'refine' && <span className="text-white/35">· refined</span>}
              {job.origin === 'redesign' && <span className="text-white/35">· text edited</span>}
              {deck && <span className="text-white/35">· carousel · {deck.slides.length} slides</span>}
            </div>
          )}
          <div className="mt-1 line-clamp-2 text-[14px] leading-snug text-white/85">{job.note && job.origin === 'refine' ? `“${job.note}”` : tamil ? `Tamil version · ${job.brief.label}` : job.brief.label}</div>
        </div>
        {(deck ? ready : job.status === 'done') && (
          <button onClick={download} className="btn shrink-0 bg-paper px-4 py-2 text-ink hover:bg-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" /></svg>
            {deck ? 'All slides' : 'JPG'}
          </button>
        )}
      </div>

      {job.status === 'done' && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) {
                refine(job, text.trim())
                setText('')
              }
            }}
            className="mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-4 pr-1 focus-within:border-white/40"
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Change something — e.g. make the headline bigger" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
            <button type="submit" disabled={!text.trim()} className="btn bg-white/10 px-3.5 py-1.5 text-xs text-white hover:bg-white/20">Fix</button>
          </form>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-white/55">
            {!tamil && (deck ? ready : true) && (
              <button onClick={() => makeTamil(job)} className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white hover:bg-white/20">
                {deck ? 'Make carousel in Tamil' : 'Make it in Tamil'}
              </button>
            )}
            <button onClick={copyCaption} className="hover:text-white">Copy caption</button>
            <button onClick={onChatGPT} className="hover:text-white">Make in ChatGPT</button>
            <button onClick={onEdit} className="hover:text-white">Edit text</button>
            {job.brief.sources?.slice(0, 2).map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="hover:text-white">↗ {s.title}</a>
            ))}
            <button onClick={() => removeJob(job.id)} className="ml-auto hover:text-live">{deck ? 'Delete slide' : 'Delete'}</button>
          </div>
        </>
      )}
    </article>
  )
}

function EditSheet({ job, onClose }: { job: Job; onClose: () => void }) {
  const { redesign } = useDesk()
  const [p, setP] = useState<PostContent | undefined>(job.post)
  if (!p) return null
  const set = <K extends keyof PostContent>(k: K, v: PostContent[K]) => setP((x) => (x ? { ...x, [k]: v } : x))
  return (
    <div className="fixed inset-0 z-50 flex justify-end text-ink">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <aside className="relative h-full w-full max-w-[460px] animate-rise overflow-y-auto bg-paper px-6 pb-10 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="meta text-muted">Edit the words</div>
            <h2 className="font-display text-[24px] font-[600] leading-tight">Text on the post</h2>
          </div>
          <button onClick={onClose} className="btn-line h-9 w-9 p-0" aria-label="Close">✕</button>
        </div>
        <div className="my-5 rule-double" />
        <label className="label">Headline (one line per row)</label>
        <textarea value={p.headline} onChange={(e) => set('headline', e.target.value.toUpperCase())} rows={3} className="input font-display text-xl font-[650] uppercase leading-tight" />
        <label className="label mt-4">Small label</label>
        <input value={p.kicker} onChange={(e) => set('kicker', e.target.value.toUpperCase())} className="input" />
        <label className="label mt-4">Supporting line</label>
        <textarea value={p.support} onChange={(e) => set('support', e.target.value)} rows={2} className="input" />
        {p.news && (
          <>
            <label className="label mt-4">Big number (optional)</label>
            <div className="flex gap-2">
              <input value={p.keyStat ?? ''} onChange={(e) => set('keyStat', e.target.value || undefined)} className="input w-32" placeholder="$1,500" />
              <input value={p.keyStatLabel ?? ''} onChange={(e) => set('keyStatLabel', e.target.value || undefined)} className="input flex-1" placeholder="What the number means" />
            </div>
          </>
        )}
        <label className="label mt-4">{p.news ? 'Key facts' : 'Bullet points (optional)'}</label>
        {(p.news ? [0, 1, 2, 3, 4] : [0, 1, 2]).map((i) => (
          <input
            key={i}
            value={p.points[i] ?? ''}
            onChange={(e) => {
              const pts = [0, 1, 2, 3, 4].map((j) => p.points[j] ?? '')
              pts[i] = e.target.value
              set('points', pts.filter(Boolean))
            }}
            className="input mb-2"
            placeholder={`Point ${i + 1}`}
          />
        ))}
        {p.news && (
          <>
            <label className="label mt-2">What to do</label>
            <textarea value={p.takeaway ?? ''} onChange={(e) => set('takeaway', e.target.value || undefined)} rows={2} className="input" />
          </>
        )}
        <label className="label mt-2">{p.news ? 'Bottom line' : 'Button text'}</label>
        <input value={p.cta} onChange={(e) => set('cta', e.target.value)} className="input" />
        <label className="label mt-4">Caption</label>
        <textarea value={p.caption} onChange={(e) => set('caption', e.target.value)} rows={4} className="input text-sm" />
        <button
          onClick={() => {
            redesign(job, p)
            onClose()
          }}
          className="btn-ink mt-6 w-full py-3.5"
        >
          Redesign with this text →
        </button>
      </aside>
    </div>
  )
}

function ChatGPTSheet({ job, onClose }: { job: Job; onClose: () => void }) {
  const { chatgptPrompt, finishFromUpload } = useDesk()
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const f = FORMATS[job.format]

  useEffect(() => {
    chatgptPrompt(job).then(setPrompt).catch((e) => setErr(e instanceof Error ? e.message : 'Couldn’t prepare the prompt'))
  }, [job, chatgptPrompt])

  async function copy() {
    if (!prompt) return
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      setErr('Your browser blocked copying — select the text below and copy it.')
    }
  }
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      await finishFromUpload(job, await shrink(await readFileAsDataURL(file), 2200))
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const Step = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
    <div className="border-t border-rule pt-4">
      <div className="flex items-baseline gap-3">
        <span className="meta text-muted">{n}</span>
        <h3 className="font-display text-[22px] font-[650] leading-tight">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end text-ink">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <aside className="relative h-full w-full max-w-[480px] animate-rise overflow-y-auto bg-paper px-6 pb-10 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="meta text-muted">Free with your ChatGPT plan</div>
            <h2 className="font-display text-[24px] font-[600] leading-tight">Make it in ChatGPT</h2>
          </div>
          <button onClick={onClose} className="btn-line h-9 w-9 p-0" aria-label="Close">✕</button>
        </div>
        <div className="my-5 rule-double" />
        <div className="space-y-6">
          <Step n="01" title="Copy the design prompt">
            <button onClick={copy} disabled={!prompt} className="btn-ink w-full py-3">{prompt ? (copied ? 'Copied ✓' : 'Copy prompt') : 'Preparing…'}</button>
            {prompt && <textarea readOnly value={prompt} rows={4} className="input mt-2 text-xs text-muted" onFocus={(e) => e.currentTarget.select()} />}
          </Step>
          <Step n="02" title="Paste it into ChatGPT">
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="btn-line w-full py-3">Open ChatGPT ↗</a>
            <p className="mt-2 text-sm text-ink2">Paste, send, then download the image it makes.</p>
          </Step>
          <Step n="03" title="Drop the image here">
            <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rule bg-card px-4 py-8 text-center transition hover:border-ink ${busy ? 'opacity-60' : ''}`}>
              <span className="font-display text-lg">{busy ? 'Adding your logo…' : 'Choose the downloaded image'}</span>
              <span className="mt-1 text-xs text-muted">We size it to {f.w}×{f.h} and add the BOSS logo.</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} disabled={busy} />
            </label>
          </Step>
          {err && <div className="rounded-xl bg-live/10 px-3 py-2 text-sm text-ink">{err}</div>}
        </div>
      </aside>
    </div>
  )
}
