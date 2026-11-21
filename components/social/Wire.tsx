'use client'

import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_LIST, CategoryId, FORMATS } from '@/lib/social/brand'
import { Idea } from '@/lib/social/ideas'
import { ideaToBrief, useDesk } from './store'
import { Dots, timeAgo } from './bits'

const KIND_LABEL: Record<Idea['kind'], string> = { news: 'News', deadline: 'Deadline', seasonal: 'Seasonal', evergreen: 'Evergreen' }

export default function Wire() {
  const { desks, setDesks, ideas, scanning, scanErrors, runWire, scannedAt, sample, config } = useDesk()
  const count = 4
  const verifiedOnly = false
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const running = Object.values(scanning).some((s) => s === 'running')
  const noKey = config && !config.imageProvider
  const all = desks.length === CATEGORY_LIST.length

  const sections = useMemo(
    () =>
      CATEGORY_LIST.filter((c) => desks.includes(c.id) || ideas.some((i) => i.department === c.id))
        .map((c) => ({
          c,
          state: scanning[c.id],
          error: scanErrors[c.id],
          ideas: ideas
            .filter((i) => i.department === c.id && (!verifiedOnly || i.verified))
            .sort((a, b) => Number(b.verified) - Number(a.verified)),
        }))
        .filter((s) => s.state || s.ideas.length || s.error),
    [desks, ideas, scanning, scanErrors, verifiedOnly]
  )
  const hasAny = sections.length > 0

  function toggleDesk(id: CategoryId) {
    setDesks(desks.includes(id) ? desks.filter((d) => d !== id) : [...desks, id])
  }

  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-40 pt-8 sm:px-8 lg:grid-cols-[290px_1fr]">
      {/* Desks */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="meta mb-3 flex items-center justify-between text-muted">
          <span>Desks to scan</span>
          <button onClick={() => setDesks(all ? [] : CATEGORY_LIST.map((c) => c.id))} className="underline decoration-rule underline-offset-4 hover:text-ink">
            {all ? 'Clear' : 'All'}
          </button>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {CATEGORY_LIST.map((c) => {
            const on = desks.includes(c.id)
            const st = scanning[c.id]
            return (
              <li key={c.id}>
                <button onClick={() => toggleDesk(c.id)} className="group flex w-full items-center gap-3 py-2.5 text-left">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition ${on ? 'border-transparent' : 'border-rule bg-card'}`} style={on ? { background: c.primary } : undefined}>
                    {on && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={c.onPrimary} strokeWidth="2.2"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
                    )}
                  </span>
                  <span className={`flex-1 text-[15px] ${on ? 'font-semibold text-ink' : 'text-muted'}`}>{c.short}</span>
                  {st === 'running' && <Dots className="text-muted" />}
                  {st === 'done' && <span className="meta text-muted">{ideas.filter((i) => i.department === c.id).length}</span>}
                  {st === 'error' && <span className="meta text-live">!</span>}
                </button>
              </li>
            )
          })}
        </ul>


        <button
          onClick={() => runWire(count)}
          disabled={running || desks.length === 0 || Boolean(noKey)}
          className="btn-ink mt-5 w-full py-3.5 text-[15px]"
        >
          {running ? (
            <>
              Scanning the news <Dots />
            </>
          ) : (
            <>
              {ideas.length ? 'Re-run the wire' : 'Run the wire'}
              <span aria-hidden>→</span>
            </>
          )}
        </button>
        {scannedAt && <p className="meta mt-3 text-muted">Updated {timeAgo(scannedAt)}</p>}
      </aside>

      {/* Feed */}
      <section>
        {sample && (
          <div className="mb-6 rounded-xl border border-live/40 bg-live/5 px-4 py-3 text-sm text-ink2">
            These are <b>sample ideas</b> — live news isn’t switched on yet.
          </div>
        )}

        {!hasAny ? (
          <EmptyWire onRun={() => runWire(count)} disabled={running || desks.length === 0 || Boolean(noKey)} />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h1 className="font-display text-[28px] font-[600] leading-tight sm:text-[34px]">
                {running ? (
                  <>
                    Reading today’s <span className="text-[#4f7a95]">news…</span>
                  </>
                ) : (
                  <>
                    Pick what’s <span className="text-[#4f7a95]">worth posting.</span>
                  </>
                )}
              </h1>
            </div>

            <div className="space-y-12">
              {sections.map(({ c, state, error, ideas: list }) => (
                <div key={c.id}>
                  <div className="mb-4 flex items-baseline gap-3 border-b border-ink pb-2">
                    <span className="h-3.5 w-3.5 translate-y-0.5 rounded-[4px]" style={{ background: c.primary }} />
                    <h2 className="font-display text-[20px] font-[600] leading-tight">{c.short}</h2>
                    <span className="meta text-muted">{state === 'running' ? 'searching…' : `${list.length} ideas`}</span>
                  </div>
                  {error && <div className="rounded-xl border border-live/40 bg-live/5 px-4 py-3 text-sm text-ink2">Couldn’t research this desk: {error}</div>}
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {state === 'running' && list.length === 0
                      ? Array.from({ length: Math.min(count, 3) }).map((_, i) => <SkeletonClip key={i} color={c.primary} i={i} />)
                      : list.map((idea, i) => <Clipping key={idea.id} idea={idea} i={i} />)}
                  </div>
                  {state !== 'running' && <MoreNews dept={c.id} />}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <SelectionBar />
    </div>
  )
}

function EmptyWire({ onRun, disabled }: { onRun: () => void; disabled: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-ink bg-card px-6 py-14 sm:px-14 sm:py-20">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-paper2" />
      <div className="meta text-muted">Edition of the day</div>
      <h1 className="mt-3 max-w-3xl font-display text-[30px] font-[600] leading-tight sm:text-[40px]">
        What’s worth <span className="text-[#4f7a95]">posting</span> this week?
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink2">
        Get this week’s real news for each department, pick the ideas you like, and get finished posts.
      </p>
      <ol className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        {[
          ['01', 'Find', 'Fresh news and deadlines for each department.'],
          ['02', 'Pick', 'Tick the ideas you want to post.'],
          ['03', 'Post', 'Download finished designs in your brand colours.'],
        ].map(([n, t, d]) => (
          <li key={n} className="border-t-2 border-ink pt-3">
            <div className="meta text-muted">{n}</div>
            <div className="font-display text-[22px] font-[650]">{t}</div>
            <div className="text-sm text-ink2">{d}</div>
          </li>
        ))}
      </ol>
      <button onClick={onRun} disabled={disabled} className="btn-ink mt-10 px-7 py-3.5 text-[15px]">
        Run the wire <span aria-hidden>→</span>
      </button>
    </div>
  )
}

function SkeletonClip({ color, i }: { color: string; i: number }) {
  const lines = ['Searching official sources', 'Checking dates', 'Reading Canadian news']
  return (
    <div className="relative overflow-hidden rounded-2xl border border-rule bg-card p-5" style={{ animationDelay: `${i * 80}ms` }}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="meta text-muted">{lines[i % 3]}…</div>
      <div className="mt-4 h-5 w-5/6 rounded bg-paper2" />
      <div className="mt-2 h-5 w-2/3 rounded bg-paper2" />
      <div className="mt-5 space-y-2">
        <div className="h-3 w-full rounded bg-paper2" />
        <div className="h-3 w-11/12 rounded bg-paper2" />
        <div className="h-3 w-3/4 rounded bg-paper2" />
      </div>
    </div>
  )
}

function Clipping({ idea, i }: { idea: Idea; i: number }) {
  const { selected, toggleIdea } = useDesk()
  const c = CATEGORIES[idea.department]
  const on = selected.includes(idea.id)
  return (
    <article
      onClick={() => toggleIdea(idea.id)}
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleIdea(idea.id))}
      className={`group relative flex cursor-pointer animate-rise flex-col overflow-hidden rounded-2xl border bg-card p-5 transition duration-200 ${on ? '-translate-y-0.5 border-ink shadow-[0_10px_28px_rgba(38,57,74,0.10)]' : 'border-rule hover:-translate-y-0.5 hover:border-ink/60 hover:shadow-[4px_4px_0_0_rgba(21,18,15,.12)]'}`}
      style={{ animationDelay: `${i * 70}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: c.primary }} />
      <div className="flex items-center justify-between gap-2">
        <span className="meta text-ink2">
          {KIND_LABEL[idea.kind]}
          {idea.date && <span className="text-muted"> · {idea.date}</span>}
        </span>
        {idea.verified && <span className="meta inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-paper">✓ Verified</span>}
      </div>

      <h3 className="mt-3 font-display text-[21px] font-[650] leading-[1.12] tracking-[-0.01em]">{idea.topic}</h3>
      {idea.summary && <p className="mt-2 text-[14px] leading-relaxed text-ink2">{idea.summary}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        {idea.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="meta rounded-full border border-rule bg-paper px-2 py-1 normal-case tracking-normal text-ink2 transition hover:border-ink hover:text-ink">
            ↗ {s.title}
          </a>
        ))}
        <span className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${on ? 'border-transparent' : 'border-rule group-hover:border-ink'}`} style={on ? { background: c.primary } : undefined}>
          {on && <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke={c.onPrimary} strokeWidth="2.2"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>}
        </span>
      </div>
    </article>
  )
}

function SelectionBar() {
  const { selected, ideas, clearSelection, createPosts, kit, setKit } = useDesk()
  if (!selected.length) return null
  const chosen = ideas.filter((i) => selected.includes(i.id))
  const total = chosen.length * kit.perIdea

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="flex w-full max-w-[980px] animate-rise flex-wrap items-center gap-3 rounded-[22px] bg-night px-4 py-3 text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,.6)] sm:flex-nowrap sm:rounded-full sm:pl-6">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {Array.from(new Set(chosen.map((i) => i.department))).map((d) => (
              <span key={d} className="h-3.5 w-3.5 rounded-full ring-2 ring-night" style={{ background: CATEGORIES[d].primary }} />
            ))}
          </div>
          <span className="text-[15px] font-semibold">{chosen.length} selected</span>
          <button onClick={clearSelection} className="text-xs text-white/50 underline underline-offset-2 hover:text-white">clear</button>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <select value={kit.format} onChange={(e) => setKit({ format: e.target.value as typeof kit.format })} className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none">
            {Object.values(FORMATS).map((f) => <option key={f.id} value={f.id} className="text-ink">{f.use}</option>)}
          </select>
          <div className="flex rounded-full border border-white/15 bg-white/5 p-0.5 text-sm" role="group" aria-label="Language">
            {(['English', 'Tamil'] as const).map((l) => (
              <button key={l} onClick={() => setKit({ language: l })} className={`rounded-full px-3 py-1.5 ${kit.language === l ? 'bg-paper font-semibold text-ink' : 'text-white/70 hover:text-white'}`}>
                {l === 'Tamil' ? 'தமிழ்' : 'English'}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              createPosts(chosen.map(ideaToBrief), 'wire')
              clearSelection()
            }}
            className="btn bg-paper px-5 py-2.5 text-ink hover:bg-white"
          >
            Design {total} post{total > 1 ? 's' : ''} <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function MoreNews({ dept }: { dept: CategoryId }) {
  const { findMore, moreLoading } = useDesk()
  const busy = moreLoading.includes(dept)
  return (
    <div className="mt-4 flex justify-center">
      <button onClick={() => findMore(dept)} disabled={busy} className="btn-line px-5 py-2 text-sm">
        {busy ? (
          <>
            Finding more news <Dots />
          </>
        ) : (
          <>Find more news ↻</>
        )}
      </button>
    </div>
  )
}
