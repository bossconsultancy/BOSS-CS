'use client'

import { useDesk, type DeskTab } from './store'

export function Masthead() {
  const { tab, setTab, jobs, mode } = useDesk()
  const working = jobs.filter((j) => j.status !== 'done' && j.status !== 'error').length
  const done = jobs.filter((j) => j.status === 'done').length
  const tabs: [DeskTab, string][] =
    mode === 'news'
      ? [['wire', 'Department news'], ['posts', `Saved posts${done ? ` · ${done}` : ''}`]]
      : [['link', 'News to post'], ['idea', 'Info to post'], ['posts', `Saved posts${done ? ` · ${done}` : ''}`]]

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 font-display text-[15px] font-semibold" title="Back to home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/boss-horizontal-navy.svg" alt="BOSS" className="h-7 w-auto" />
          <span className="border-l border-rule pl-2.5">{mode === 'news' ? 'Department news' : 'Social media posts'}</span>
        </a>
        <nav className="ml-2 flex gap-1 overflow-x-auto text-[14px] font-medium">
          {tabs.map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 transition ${tab === id ? 'bg-ink text-white' : 'text-ink2 hover:bg-paper'}`}>
              {name}
              {id === 'posts' && working > 0 && <span className="h-1.5 w-1.5 animate-blink rounded-full bg-live" />}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-[13.5px]">
          <a href={mode === 'news' ? '/social' : '/news'} className="rounded-lg border border-rule bg-white px-3 py-1.5 font-medium hover:bg-paper">
            {mode === 'news' ? 'Social media posts' : 'Department news'}
          </a>
          <a href="/" className="rounded-lg border border-rule bg-white px-3 py-1.5 font-medium hover:bg-paper">⌂ Home</a>
        </div>
      </div>
    </header>
  )
}

export function AiIssueBanner() {
  const { aiIssue, clearAiIssue } = useDesk()
  if (!aiIssue) return null
  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 sm:px-8">
      <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-ink bg-card p-5 shadow-[0_10px_28px_rgba(38,57,74,0.10)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-live font-display text-xl font-bold text-white">!</div>
        <div className="min-w-[240px] flex-1">
          <div className="font-display text-[22px] font-[650] leading-tight">Automatic images aren’t switched on</div>
          <p className="mt-1 text-[15px] leading-relaxed text-ink2">{aiIssue}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearAiIssue} className="btn-line">Dismiss</button>
        </div>
      </div>
    </div>
  )
}

export function Toast() {
  const { toast } = useDesk()
  if (!toast) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-rise rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-xl">{toast}</div>
  )
}
