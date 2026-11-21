'use client'
import { useEffect, useRef, useState } from 'react'

import { StyleId } from '@/lib/social/brand'

/** Small illustrative thumbnails for each style (not real outputs). */
/** Real sample design for a style (public/styles/<id>.jpg); falls back to the little drawing if missing. */
export function StyleThumb({ id }: { id: StyleId }) {
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading')
  const ref = useRef<HTMLImageElement>(null)
  // A cached image can finish loading before React attaches onLoad — check it directly too.
  useEffect(() => {
    const img = ref.current
    if (img?.complete) setState(img.naturalWidth > 0 ? 'ok' : 'none')
  }, [])
  if (state === 'none') return <DrawnThumb id={id} />
  return (
    <div className="relative">
      {state === 'loading' && <DrawnThumb id={id} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={`/styles/${id}.jpg`}
        alt=""
        onLoad={() => setState('ok')}
        onError={() => setState('none')}
        className={state === 'ok' ? 'aspect-square w-full rounded-lg object-cover' : 'absolute h-0 w-0 opacity-0'}
      />
    </div>
  )
}

function DrawnThumb({ id }: { id: StyleId }) {
  if (id === 'vibrant')
    return (
      <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(170deg, #0f8a4a 0%, #6fd39a 55%, #f4fff8 100%)' }}>
        <div className="absolute left-[-10%] top-[45%] h-6 w-[130%] rotate-[-12deg] rounded-full bg-white/35" />
        <div className="absolute right-2 top-1.5 h-0 w-0 border-b-[6px] border-l-[18px] border-b-transparent border-l-white/90" />
        <div className="absolute bottom-0 right-3 h-11 w-8 rounded-t-full bg-[#1c3d2c]/70" />
        <div className="absolute left-2 top-2.5 h-2 w-11 rounded-sm bg-white" />
        <div className="absolute left-2 top-5 h-2 w-8 rounded-sm bg-[#0b5a30]" />
        <div className="absolute bottom-1 left-1.5 h-2 w-9 rounded-full bg-white" />
      </div>
    )
  if (id === 'night')
    return (
      <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: 'radial-gradient(90% 90% at 80% 20%, #10224a, #050b1d)' }}>
        <div className="absolute -left-4 top-6 h-16 w-16 rounded-full border-[3px] border-[#2ee66b] opacity-80" />
        <div className="absolute bottom-0 right-3 h-11 w-8 rounded-t-full bg-white/35" />
        <div className="absolute left-2 top-2.5 h-2.5 w-11 rounded-sm bg-white" />
        <div className="absolute left-2 top-6 h-2.5 w-8 rounded-sm bg-[#2ee66b]" />
      </div>
    )
  if (id === 'bright')
    return (
      <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(160deg, #ffffff, #dff5ee)' }}>
        <div className="absolute -right-6 bottom-[-18px] h-14 w-24 rounded-full border-[3px] border-[#11a37f]/70" />
        <div className="absolute bottom-0 right-3 h-10 w-8 rounded-t-full bg-neutral-400/70" />
        <div className="absolute left-2 top-2.5 h-2 w-11 rounded-sm bg-[#15120f]" />
        <div className="absolute left-2 top-5 h-2 w-7 rounded-sm bg-[#11a37f]" />
        <div className="absolute left-2 top-9 h-2.5 w-8 rounded-md bg-[#11a37f]" />
        <div className="absolute left-3 top-[46px] h-2.5 w-8 rounded-md bg-[#f2c94c]" />
      </div>
    )
  return (
    <div className="relative h-16 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(160deg, #234C8B, #0b1220)' }}>
      <div className="absolute bottom-0 right-3 h-11 w-8 rounded-t-full bg-white/45" />
      <div className="absolute left-2 top-2.5 h-2.5 w-11 rounded-sm bg-white" />
      <div className="absolute left-2 top-6 font-display text-[12px] italic text-white/85">script</div>
    </div>
  )
}

export function Dots({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-current" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  )
}

export function timeAgo(t: number | null): string {
  if (!t) return ''
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}
