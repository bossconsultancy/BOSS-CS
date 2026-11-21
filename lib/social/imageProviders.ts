import 'server-only'
import sharp from 'sharp'
import OpenAI, { toFile } from 'openai'
import { FORMATS, FormatId } from './brand'
import { clearCorner, GUIDE_NOTE, layoutGuide, stampLogo } from './logo'
import { explainGoogleError, geminiPost } from './googleErrors'
import { CF_IMAGE_MODEL, cfGenerateImage, cloudflareReady, CloudflareError } from './cloudflare'

export interface InputImage {
  mime: string
  b64: string // raw base64, no data: prefix
}

export interface GenerateArgs {
  prompt: string
  images: InputImage[]
  format: FormatId
  quality: 'standard' | 'high'
  /** Send the image AI a canvas with the real logo in place so it designs around it. */
  logoGuide?: boolean
}

/** Prepends the logo layout guide (at the AI's canvas size) and its instruction. */
async function withGuide(a: GenerateArgs, genW: number, genH: number): Promise<GenerateArgs> {
  if (!a.logoGuide) return a
  const f = FORMATS[a.format]
  const guide = await layoutGuide(genW, genH, f.w, f.h)
  return { ...a, prompt: `${GUIDE_NOTE}\n\n${a.prompt}`, images: [{ mime: 'image/png', b64: guide.toString('base64') }, ...a.images] }
}

export type ProviderId = 'cloudflare' | 'gemini' | 'openai' | 'mock'

export function imageProvider(): ProviderId | null {
  const forced = process.env.IMAGE_PROVIDER as ProviderId | undefined
  if (forced === 'mock') return 'mock'
  if (forced === 'cloudflare' && cloudflareReady()) return 'cloudflare'
  if (forced === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
  if (forced === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
  // OpenAI first when configured (best quality), then Cloudflare's free allowance, then Gemini.
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (cloudflareReady()) return 'cloudflare'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return null
}

/** Tried in order; a model the account can't use falls through to the next. */
export const OPENAI_IMAGE_MODELS = (process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare,gpt-image-2')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

export function imageModelName(p: ProviderId | null): string {
  if (p === 'gemini') return process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1'
  if (p === 'openai') return OPENAI_IMAGE_MODELS[0]
  if (p === 'mock') return 'mock'
  if (p === 'cloudflare') return CF_IMAGE_MODEL.split('/').pop() || CF_IMAGE_MODEL
  return 'none'
}

/** Extra layout instruction when the provider can't produce the target ratio natively. */
export function safeZoneFor(p: ProviderId | null, format: FormatId): string | undefined {
  if (p !== 'openai') return undefined
  if (format === 'portrait')
    return 'IMPORTANT: the canvas is 2:3 but will be centre-cropped to 4:5. Keep ALL text, the logo and faces inside the middle 82% of the height; the top and bottom 9% must be background only.'
  if (format === 'story')
    return 'IMPORTANT: the canvas is 2:3 but will be centre-cropped to 9:16. Keep ALL text, the logo and faces inside the middle 84% of the width; the left and right 8% must be background only.'
  return undefined
}

export class ProviderError extends Error {
  status: number
  code: 'billing' | 'rate' | 'key' | 'quota' | 'other' = 'other'
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/* ---------------- Gemini (Nano Banana) ---------------- */

const GEMINI_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta'

/** Finds the first base64 image anywhere in a Gemini response (handles both API shapes). */
function findImage(node: unknown): InputImage | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const hit = findImage(node[i])
      if (hit) return hit
    }
    return null
  }
  const o = node as Record<string, unknown>
  const inline = (o.inlineData || o.inline_data) as Record<string, unknown> | undefined
  if (inline && typeof inline.data === 'string') {
    return { b64: inline.data, mime: String(inline.mimeType || inline.mime_type || 'image/png') }
  }
  if (typeof o.data === 'string' && o.data.length > 1000) {
    const mime = String(o.mime_type || o.mimeType || 'image/png')
    if (mime.startsWith('image/') || o.type === 'image') return { b64: o.data, mime }
  }
  // Prefer the convenience field when present.
  if (o.output_image) {
    const hit = findImage(o.output_image)
    if (hit) return hit
  }
  for (const v of Object.values(o)) {
    const hit = findImage(v)
    if (hit) return hit
  }
  return null
}

function findText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  if (Array.isArray(node)) return node.map(findText).filter(Boolean).join(' ')
  const o = node as Record<string, unknown>
  if (typeof o.text === 'string') return o.text
  return Object.values(o).map(findText).filter(Boolean).join(' ')
}

async function geminiFetch(url: string, body: unknown) {
  return geminiPost(url, body)
}

async function geminiGenerate(a: GenerateArgs): Promise<InputImage> {
  const model = imageModelName('gemini')
  const f = FORMATS[a.format]
  const size = a.quality === 'high' ? '2K' : '1K'

  // 1) Interactions API (current docs).
  const interactions = await geminiFetch(`${GEMINI_BASE}/interactions`, {
    model,
    input: [
      { type: 'text', text: a.prompt },
      ...a.images.map((im) => ({ type: 'image', mime_type: im.mime, data: im.b64 })),
    ],
    response_format: { type: 'image', aspect_ratio: f.aspect, image_size: size },
  })
  if (interactions.ok) {
    const img = findImage(interactions.json)
    if (img) return img
    throw new ProviderError(`Gemini returned no image. ${findText(interactions.json).slice(0, 300)}`.trim(), 502)
  }

  // 2) Fallback: generateContent (older API shape), for accounts/models where Interactions isn't available.
  if (interactions.status === 404 || interactions.status === 400) {
    const gc = await geminiFetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      contents: [
        {
          role: 'user',
          parts: [{ text: a.prompt }, ...a.images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.b64 } }))],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: f.aspect, imageSize: size } },
    })
    if (gc.ok) {
      const img = findImage(gc.json)
      if (img) return img
      throw new ProviderError(`Gemini returned no image. ${findText(gc.json).slice(0, 300)}`.trim(), 502)
    }
    throw geminiError(gc.status, gc.json, gc.text)
  }
  throw geminiError(interactions.status, interactions.json, interactions.text)
}

function geminiError(status: number, json: unknown, text: string): ProviderError {
  const info = explainGoogleError(status, json)
  const e = new ProviderError(info.code === 'other' && !json ? text.slice(0, 200) || info.message : info.message, info.code === 'billing' ? 402 : status)
  e.code = info.code
  return e
}

/* ---------------- OpenAI (gpt-image) ---------------- */

async function openaiGenerate(input: GenerateArgs): Promise<InputImage> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const size = input.format === 'square' ? '1024x1024' : '1024x1536'
  const a = await withGuide(input, 1024, input.format === 'square' ? 1024 : 1536)
  const quality = a.quality === 'high' ? 'high' : 'medium'
  let lastErr: unknown = null
  for (const model of OPENAI_IMAGE_MODELS) {
  try {
    let b64: string | undefined
    if (a.images.length) {
      const files = await Promise.all(
        a.images.slice(0, 16).map((im, i) =>
          toFile(Buffer.from(im.b64, 'base64'), `ref-${i}.${im.mime.includes('png') ? 'png' : 'jpg'}`, { type: im.mime })
        )
      )
      const res = (await client.images.edit({ model, image: files, prompt: a.prompt, size, quality } as unknown as Parameters<typeof client.images.edit>[0])) as unknown as { data?: { b64_json?: string }[] }
      b64 = res.data?.[0]?.b64_json
    } else {
      const res = (await client.images.generate({ model, prompt: a.prompt, size, quality, n: 1 } as unknown as Parameters<typeof client.images.generate>[0])) as unknown as { data?: { b64_json?: string }[] }
      b64 = res.data?.[0]?.b64_json
    }
    if (!b64) throw new ProviderError('OpenAI returned no image.', 502)
    return { b64, mime: 'image/png' }
  } catch (e) {
    if (e instanceof ProviderError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    const status = (e as { status?: number }).status
    // Unknown / unavailable model → try the next one.
    if (status === 404 || /model.*(not found|does not exist|invalid)|invalid model|unsupported model|must be verified/i.test(msg)) {
      lastErr = e
      continue
    }
    if (/quota|billing|insufficient/i.test(msg)) {
      const pe = new ProviderError('The OpenAI credits have run out — add credit at platform.openai.com/settings/organization/billing.', 402)
      pe.code = 'quota'
      throw pe
    }
    if (status === 401 || /api key/i.test(msg)) {
      const pe = new ProviderError('OpenAI rejected the API key — check OPENAI_API_KEY in Render.', 401)
      pe.code = 'key'
      throw pe
    }
    if (/safety|moderation|policy/i.test(msg)) throw new ProviderError('Blocked by the safety filter — reword the idea and try again.', 400)
    throw new ProviderError(`OpenAI error: ${msg.slice(0, 300)}`, 500)
  }
  }
  const m = lastErr instanceof Error ? lastErr.message : ''
  throw new ProviderError(`No OpenAI image model was available. ${m.slice(0, 200)}`, 502)
}

/* ---------------- Mock (for local testing) ---------------- */

async function mockGenerate(a: GenerateArgs): Promise<InputImage> {
  const f = FORMATS[a.format]
  const lines = a.prompt
    .split('\n')
    .filter((l) => /Headline|SERVICE|STYLE:|Composition/.test(l))
    .slice(0, 5)
    .map((l) => l.replace(/[<>&]/g, '').slice(0, 70))
  const hex = a.prompt.match(/#[0-9A-F]{6}/i)?.[0] || '#234C8B'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}">
    <rect width="100%" height="100%" fill="${hex}"/>
    <text x="60" y="140" font-family="sans-serif" font-size="56" font-weight="700" fill="#fff">MOCK MODEL OUTPUT</text>
    <text x="60" y="200" font-family="sans-serif" font-size="26" fill="#fff">refs attached: ${a.images.length}</text>
    ${lines.map((l, i) => `<text x="60" y="${280 + i * 44}" font-family="sans-serif" font-size="24" fill="#fff">${l}</text>`).join('')}
  </svg>`
  const buf = await sharp(Buffer.from(svg)).png().toBuffer()
  await new Promise((r) => setTimeout(r, 400))
  return { b64: buf.toString('base64'), mime: 'image/png' }
}

/* ---------------- Public entry ---------------- */

export async function generateDesign(a: GenerateArgs & { fallbackPrompt?: string }): Promise<{ dataUrl: string; baseUrl: string; width: number; height: number }> {
  const p = imageProvider()
  if (!p) throw new ProviderError('Image generation isn’t switched on yet.', 503)
  let raw: InputImage
  try {
    raw =
      p === 'cloudflare'
        ? await cfGenerateImage(a.prompt, a.format, a.images)
        : p === 'gemini'
          ? await geminiGenerate(await withGuide(a, FORMATS[a.format].w, FORMATS[a.format].h))
          : p === 'openai'
            ? await openaiGenerate(a)
            : await mockGenerate(await withGuide(a, FORMATS[a.format].w, FORMATS[a.format].h))
  } catch (e) {
    // Paid provider out of credit or misconfigured → use the free Cloudflare allowance if available.
    if (p === 'openai' && e instanceof ProviderError && (e.code === 'quota' || e.code === 'key') && cloudflareReady()) {
      try {
        raw = await cfGenerateImage(a.fallbackPrompt || a.prompt, a.format, a.images)
      } catch (e2) {
        if (e2 instanceof CloudflareError) {
          const pe = new ProviderError(e2.message, e2.status)
          pe.code = e2.code
          throw pe
        }
        throw e2
      }
      return finish(raw, a.format)
    }
    if (e instanceof CloudflareError) {
      const pe = new ProviderError(e.message, e.status)
      pe.code = e.code
      throw pe
    }
    throw e
  }

  return finish(raw, a.format)
}

/** One high-quality JPEG encode: full colour detail (4:4:4) so text edges stay crisp. */
export function crispJpeg(img: ReturnType<typeof sharp>) {
  return img.jpeg({ quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
}

async function finish(raw: InputImage, format: FormatId): Promise<{ dataUrl: string; baseUrl: string; width: number; height: number }> {
  // Work losslessly (PNG) until the very end, then encode ONCE — repeated JPEG passes made posts look
  // like screenshots of screenshots.
  const f = FORMATS[format]
  const clean = await sharp(Buffer.from(raw.b64, 'base64'))
    .resize(f.w, f.h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .sharpen({ sigma: 0.55 })
    .png()
    .toBuffer()
  const stamped = await stampLogo(clean, f.w)
  const [final, base] = await Promise.all([crispJpeg(sharp(stamped)), crispJpeg(sharp(clean))])
  return {
    dataUrl: `data:image/jpeg;base64,${final.toString('base64')}`,
    baseUrl: `data:image/jpeg;base64,${base.toString('base64')}`,
    width: f.w,
    height: f.h,
  }
}

export function parseDataUrl(d: string): InputImage | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(d || '')
  return m ? { mime: m[1], b64: m[2] } : null
}
