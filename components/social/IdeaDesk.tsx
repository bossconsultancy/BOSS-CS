'use client'

import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_LIST, CategoryId, FORMATS, STYLE_LIST } from '@/lib/social/brand'
import { classifyTopic } from '@/lib/social/classify'
import { useDesk } from './store'
import { StyleThumb } from './bits'

const PROMPTS = [
  'Super visa for parents and grandparents — we help with the application',
  'Book your personal tax filing early this season',
  'Free resume review for newcomers in Scarborough',
  'Same-day notary and commissioner of oaths appointments',
  'Holiday flights and hotels from Toronto, planned for you',
]

type Hook = { text: string; angle: string }

const ANGLE: Record<string, string> = {
  question: 'Question',
  benefit: 'Benefit',
  problem: 'Pain point',
  curiosity: 'Curiosity',
  number: 'Number',
  urgency: 'Urgency',
  myth: 'Myth-buster',
  emotional: 'Emotional',
  'call-out': 'Call-out',
  polished: 'Polished',
}

export default function IdeaDesk() {
  const { createPosts, kit, setKit, notify } = useDesk()
  const [text, setText] = useState('')
  const [dept, setDept] = useState<CategoryId | 'auto'>('auto')
  const [hooks, setHooks] = useState<Hook[]>([])
  const [hook, setHook] = useState('') // the chosen hook
  const [own, setOwn] = useState('')
  const [busy, setBusy] = useState<'suggest' | 'polish' | null>(null)

  async function askHooks(mode: 'suggest' | 'polish') {
    setBusy(mode)
    try {
      const res = await fetch('/api/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: text.trim(), hook: mode === 'polish' ? own.trim() : undefined, category: dept }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || 'Couldn’t get hooks')
      setHooks(data.hooks)
      setHook(mode === 'polish' ? data.hooks[0]?.text || '' : '')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t get hooks')
    } finally {
      setBusy(null)
    }
  }

  const guess = useMemo(() => (text.trim().length > 4 ? classifyTopic(text) : null), [text])
  const shown: CategoryId | null = dept === 'auto' ? guess?.category ?? null : dept
  const accent = shown ? CATEGORIES[shown] : null

  function go() {
    if (!text.trim()) return
    const type = /how to|steps|guide/i.test(text) ? 'steps' : /happy|diwali|christmas|eid|new year|holiday greeting/i.test(text) ? 'greeting' : 'service'
    const chosen = (hook || own).trim()
    createPosts([{ topic: text.trim(), category: dept, postType: type, label: chosen || text.trim().slice(0, 80), hook: chosen || undefined }], 'idea', 2)
    setText('')
    setDept('auto')
    setHooks([])
    setHook('')
    setOwn('')
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-24 pt-10 sm:px-8">
      <h1 className="font-display text-[30px] font-[600] leading-tight sm:text-[38px]">
        Turn your <span className="text-[#4f7a95]">info</span> into a post
      </h1>

      <div className="relative mt-8 rounded-2xl border border-rule bg-card p-2 shadow-[0_10px_28px_rgba(38,57,74,0.10)] transition focus-within:shadow-[0_12px_32px_rgba(38,57,74,0.16)]">
        {accent && <div className="absolute left-6 right-6 top-0 h-1 rounded-b" style={{ background: accent.primary }} />}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && go()}
          rows={4}
          placeholder="What do you want to tell people? e.g. We now do same-day notary appointments in Scarborough…"
          className="w-full resize-none rounded-[20px] bg-transparent px-5 pb-2 pt-5 text-[18px] leading-snug outline-none placeholder:text-muted/60"
          autoFocus
        />
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2">
          <label className="flex items-center gap-2 text-sm text-ink2">
            {accent && <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: accent.primary }} />}
            <div className="flex rounded-full border border-rule bg-paper p-0.5 text-sm" role="group" aria-label="Language">
              {(['English', 'Tamil'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setKit({ language: l })} className={`rounded-full px-3 py-1 ${kit.language === l ? 'bg-ink font-semibold text-paper' : 'text-muted hover:text-ink'}`}>
                  {l === 'Tamil' ? 'தமிழ்' : 'English'}
                </button>
              ))}
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value as CategoryId | 'auto')} className="rounded-full border border-rule bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink">
              <option value="auto">{dept === 'auto' && shown ? `${CATEGORIES[shown].short} (auto)` : 'Department: auto'}</option>
              {CATEGORY_LIST.map((c) => (
                <option key={c.id} value={c.id}>{c.short}</option>
              ))}
            </select>
          </label>
          <button onClick={go} disabled={!text.trim()} className="btn-ink px-6 py-2.5">
            Design it <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      {/* Headline hook: AI suggestions, or the user's own hook polished by AI */}
      <div className="mt-6 rounded-[22px] border border-rule bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="label !mb-0">Headline hook</span>
            <div className="text-[13px] text-muted">The big words on the post. Optional — the AI writes one if you skip this.</div>
          </div>
          <button onClick={() => askHooks('suggest')} disabled={text.trim().length < 6 || busy !== null} className="btn-ink px-4 py-2 text-sm">
            {busy === 'suggest' ? 'Thinking…' : hooks.length && !own ? 'More hooks ↻' : 'Suggest catchy hooks'}
          </button>
        </div>

        {hooks.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {hooks.map((h) => (
              <button
                key={h.text}
                onClick={() => setHook(hook === h.text ? '' : h.text)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${hook === h.text ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink'}`}
              >
                <div className={`meta text-[10px] ${hook === h.text ? 'text-paper/60' : 'text-muted'}`}>{ANGLE[h.angle] || h.angle || 'Hook'}</div>
                <div className="mt-0.5 font-display text-[18px] font-[650] leading-tight">{h.text}</div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-full border border-rule bg-paper py-1 pl-4 pr-1 focus-within:border-ink">
          <input
            value={own}
            onChange={(e) => {
              setOwn(e.target.value)
              setHook('')
            }}
            placeholder="…or type your own hook"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted/70"
          />
          <button onClick={() => askHooks('polish')} disabled={!own.trim() || busy !== null} className="btn-line px-4 py-1.5 text-sm">
            {busy === 'polish' ? 'Polishing…' : 'Polish with AI ✨'}
          </button>
        </div>

        {(hook || own.trim()) && (
          <div className="mt-3 text-[13px] text-ink2">
            Using: <b className="font-display text-[15px]">{hook || own.trim()}</b>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => setText(p)} className="chip text-[12.5px]">{p}</button>
        ))}
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-[1fr_auto]">
        <div>
          <span className="label">Style</span>
          <div className="grid grid-cols-3 gap-2">
            {STYLE_LIST.map((s) => (
              <button key={s.id} onClick={() => setKit({ style: s.id })} className={`rounded-xl border bg-card p-1.5 text-left transition ${kit.style === s.id ? 'border-ink ring-2 ring-ink' : 'border-rule hover:border-ink'}`}>
                <StyleThumb id={s.id} />
                <div className="mt-1.5 px-0.5 text-[12px] font-semibold leading-tight">{s.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Size</span>
          <div className="flex flex-wrap gap-1.5 sm:flex-col">
            {Object.values(FORMATS).map((f) => (
              <button key={f.id} onClick={() => setKit({ format: f.id })} className={`chip ${kit.format === f.id ? 'chip-on' : ''}`}>{f.use}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
