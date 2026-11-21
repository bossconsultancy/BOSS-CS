import 'server-only'
import sharp from 'sharp'
import { FORMATS, FormatId } from './brand'

// Cloudflare Workers AI — free plan includes 10,000 neurons/day (no card needed).
// FLUX.2 [klein 9B] ≈ 1,400 neurons per 1024×1280 image → ~7 free images a day.

export const CF_IMAGE_MODEL = process.env.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-9b'
export const CF_TEXT_MODEL = process.env.CF_TEXT_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export function cloudflareReady(): boolean {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)
}

function endpoint(model: string) {
  const base = process.env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4'
  return `${base}/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`
}

export class CloudflareError extends Error {
  code: 'quota' | 'key' | 'other'
  status: number
  constructor(message: string, code: CloudflareError['code'], status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function toError(status: number, json: unknown, text: string): CloudflareError {
  const errs = (json as { errors?: { code?: number; message?: string }[] } | null)?.errors || []
  const msg = errs.map((e) => e.message).filter(Boolean).join('; ') || text.slice(0, 200) || `HTTP ${status}`
  if (errs.some((e) => e.code === 4006) || /daily free allocation|neurons|exceeded/i.test(msg)) {
    return new CloudflareError('Today’s free AI images are used up. Use “Make it in ChatGPT” for more today, or try again tomorrow.', 'quota', 429)
  }
  if (status === 401 || status === 403 || /auth|token/i.test(msg)) {
    return new CloudflareError('The Cloudflare token was rejected — check CLOUDFLARE_API_TOKEN in Render.', 'key', 401)
  }
  return new CloudflareError(`Image service error: ${msg}`, 'other', status >= 400 ? status : 500)
}

/** Sizes must be multiples of 16 within 256–1920; we resize to the exact post size afterwards. */
const SIZES: Record<FormatId, [number, number]> = {
  square: [1024, 1024],
  portrait: [1024, 1280],
  story: [1088, 1920],
}

async function asSmallPng(b64: string): Promise<Blob> {
  const buf = await sharp(Buffer.from(b64, 'base64')).resize(496, 496, { fit: 'inside' }).png().toBuffer()
  return new Blob([new Uint8Array(buf)], { type: 'image/png' })
}

export async function cfGenerateImage(prompt: string, format: FormatId, refs: { b64: string }[] = []): Promise<{ b64: string; mime: string }> {
  const [w, h] = SIZES[format] || [FORMATS[format].w, FORMATS[format].h]
  const model = CF_IMAGE_MODEL
  let res: Response
  if (model.includes('flux-2')) {
    const form = new FormData()
    form.append('prompt', prompt.slice(0, 7500))
    form.append('width', String(w))
    form.append('height', String(h))
    const imgs = await Promise.all(refs.slice(0, 4).map((r) => asSmallPng(r.b64)))
    imgs.forEach((blob, i) => form.append(`input_image_${i}`, blob, `ref${i}.png`))
    res = await fetch(endpoint(model), { method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, body: form })
  } else {
    res = await fetch(endpoint(model), {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.slice(0, 7500), width: w, height: h, num_steps: 25, guidance: 4 }),
    })
  }

  const type = res.headers.get('content-type') || ''
  if (res.ok && type.startsWith('image/')) {
    return { b64: Buffer.from(await res.arrayBuffer()).toString('base64'), mime: type }
  }
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {}
  if (!res.ok) throw toError(res.status, json, text)
  const r = json as { result?: { image?: string } | string; image?: string }
  const b64 = (typeof r?.result === 'object' ? r.result?.image : undefined) || r?.image
  if (!b64) throw new CloudflareError('The image service returned no image.', 'other', 502)
  return { b64, mime: 'image/png' }
}

/** Plain chat completion; returns the model's text. */
export async function cfChat(system: string, user: string): Promise<string> {
  const res = await fetch(endpoint(CF_TEXT_MODEL), {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `${system}\n\nReply with ONLY the JSON object, no other text.` },
        { role: 'user', content: user },
      ],
      max_tokens: 1800,
      temperature: 0.6,
    }),
  })
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {}
  if (!res.ok) throw toError(res.status, json, text)
  const r = (json as { result?: { response?: unknown } })?.result?.response
  const out = typeof r === 'string' ? r : JSON.stringify(r ?? {})
  const start = out.indexOf('{')
  const end = out.lastIndexOf('}')
  return start >= 0 && end > start ? out.slice(start, end + 1) : '{}'
}
