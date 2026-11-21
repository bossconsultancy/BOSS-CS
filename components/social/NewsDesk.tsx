'use client'

import { useState } from 'react'
import { CATEGORIES, CATEGORY_LIST, CategoryId, FORMATS, STYLE_LIST } from '@/lib/social/brand'
import { useDesk } from './store'
import { StyleThumb } from './bits'

/** News to post: paste a news link (or the article text) and get a finished post about it. */
export default function NewsDesk() {
  const { createPosts, kit, setKit } = useDesk()
  const [url, setUrl] = useState('')
  const [headline, setHeadline] = useState('')
  const [text, setText] = useState('')
  const [dept, setDept] = useState<CategoryId | 'auto'>('auto')

  const link = url.trim()
  const okLink = /^https?:\/\/\S+\.\S+/.test(link)
  const ready = okLink || text.trim().length > 40 || headline.trim().length > 8

  function go() {
    if (!ready) return
    const title = headline.trim() || (okLink ? '' : text.trim().split(/\n/)[0].slice(0, 120))
    createPosts(
      [{
        topic: title || 'The news in this article',
        notes: text.trim() ? `FROM THE ARTICLE:\n${text.trim().slice(0, 6000)}` : undefined,
        category: dept,
        postType: 'informational',
        sources: okLink ? [{ title: title || link, url: link }] : [{ title: title || 'Pasted news', url: '' }],
        label: title || link,
      }],
      'link',
      1,
    )
    setUrl('')
    setHeadline('')
    setText('')
    setDept('auto')
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-24 pt-10 sm:px-8">
      <h1 className="font-display text-[30px] font-[600] leading-tight sm:text-[38px]">
        Turn <span className="text-[#4f7a95]">news</span> into a post
      </h1>
      <p className="mt-2 text-[15px] text-ink2">Paste a link to a news story (IRCC, CRA, Ontario, a newspaper…). We read it and design a post with the real facts. Long stories become a carousel.</p>

      <div className="mt-8 rounded-2xl border border-rule bg-card p-5 shadow-[0_10px_28px_rgba(38,57,74,0.10)]">
        <span className="label">News link</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.canada.ca/en/immigration-refugees-citizenship/news/…" className="input" autoFocus />
        {link && !okLink && <div className="mt-1 text-[13px] text-[#b42318]">That doesn’t look like a web link. It should start with https://</div>}

        <span className="label mt-5">Headline (optional)</span>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Canada opens new Parents and Grandparents intake" className="input" />

        <span className="label mt-5">No link? Paste the article text instead (optional)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the news text here…" className="input resize-y" />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex rounded-full border border-rule bg-paper p-0.5" role="group" aria-label="Language">
              {(['English', 'Tamil'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setKit({ language: l })} className={`rounded-full px-3 py-1 ${kit.language === l ? 'bg-ink font-semibold text-white' : 'text-muted hover:text-ink'}`}>
                  {l === 'Tamil' ? 'தமிழ்' : 'English'}
                </button>
              ))}
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value as CategoryId | 'auto')} className="rounded-full border border-rule bg-paper px-3 py-1.5 outline-none focus:border-ink">
              <option value="auto">Department: auto</option>
              {CATEGORY_LIST.map((c) => (
                <option key={c.id} value={c.id}>{CATEGORIES[c.id].short}</option>
              ))}
            </select>
          </div>
          <button onClick={go} disabled={!ready} className="btn-ink px-6 py-2.5">Design the post <span aria-hidden>→</span></button>
        </div>
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
