import 'server-only'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

// The official BOSS logo on every post, exactly as supplied:
// 1. layoutGuide(): the image AI gets the real logo already placed top-left and designs AROUND it
//    (so no text ever sits under the logo).
// 2. stampLogo(): finds where the logo ended up in the finished design (template matching), cleans that
//    spot with the surrounding background colour and puts the original logo file back exactly there —
//    so the logo on the post is never the AI's redraw, never doubled, never covering text.

const FILES = {
  navy: 'public/brand/boss-horizontal-navy.svg',
  white: 'public/brand/boss-horizontal-white.svg',
}
const cache = new Map<string, Buffer>()

async function logoPng(variant: 'navy' | 'white', width: number): Promise<Buffer> {
  const key = `${variant}-${width}`
  const hit = cache.get(key)
  if (hit) return hit
  const svg = await fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), FILES[variant]))
  const png = await sharp(svg, { density: 400 }).resize({ width }).png().toBuffer()
  cache.set(key, png)
  return png
}

/** Default logo placement (fractions of the post width) — used in the guide and as a fallback. */
export const LOGO_BOX = { widthPct: 0.32, marginPct: 0.05, aspect: 332 / 1119.69 }

export function logoRect(w: number) {
  const lw = Math.round(w * LOGO_BOX.widthPct)
  const lh = Math.round(lw * LOGO_BOX.aspect)
  const m = Math.round(w * LOGO_BOX.marginPct)
  return { left: m, top: m, lw, lh }
}

/** Kept for the pipeline. */
export async function clearCorner(image: Buffer, _w: number, _h: number): Promise<Buffer> {
  return image
}

type Grey = { data: Uint8Array; w: number; h: number }
async function grey(input: Buffer, width: number): Promise<Grey> {
  const { data, info } = await sharp(input).flatten({ background: '#ffffff' }).greyscale().resize({ width }).raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8Array(data), w: info.width, h: info.height }
}

/** Finds the logo the image AI kept/drew (normalised cross-correlation, works for navy-on-light and white-on-dark). */
async function findLogo(image: Buffer, W: number, H: number): Promise<{ left: number; top: number; lw: number; score: number } | null> {
  const SW = 270
  const f = SW / W
  const img = await grey(image, SW)
  const maxX = Math.floor(img.w * 0.8)
  const maxY = Math.floor(img.h * 0.45)
  // integral images for fast window mean/variance
  const iw = img.w + 1
  const S = new Float64Array(iw * (img.h + 1))
  const S2 = new Float64Array(iw * (img.h + 1))
  for (let y = 0; y < img.h; y++) {
    let r = 0
    let r2 = 0
    for (let x = 0; x < img.w; x++) {
      const v = img.data[y * img.w + x]
      r += v
      r2 += v * v
      S[(y + 1) * iw + x + 1] = S[y * iw + x + 1] + r
      S2[(y + 1) * iw + x + 1] = S2[y * iw + x + 1] + r2
    }
  }
  const box = (A: Float64Array, x: number, y: number, w: number, h: number) => A[(y + h) * iw + x + w] - A[y * iw + x + w] - A[(y + h) * iw + x] + A[y * iw + x]

  let best = { x: 0, y: 0, tw: 0, th: 0, score: 0 }
  for (let pct = 0.2; pct <= 0.48; pct += 0.025) {
    const tw = Math.round(SW * pct)
    const t = await grey(await logoPng('navy', Math.max(8, Math.round(W * pct))), tw)
    const n = t.w * t.h
    let tm = 0
    for (let i = 0; i < n; i++) tm += t.data[i]
    tm /= n
    const tc = new Float64Array(n)
    let tv = 0
    for (let i = 0; i < n; i++) {
      tc[i] = t.data[i] - tm
      tv += tc[i] * tc[i]
    }
    const tsd = Math.sqrt(tv)
    const scoreAt = (x: number, y: number) => {
      const sum = box(S, x, y, t.w, t.h)
      const sum2 = box(S2, x, y, t.w, t.h)
      const varI = sum2 - (sum * sum) / n
      if (varI < n * 25) return 0 // flat area — no logo here
      let cross = 0
      for (let yy = 0; yy < t.h; yy++) {
        const row = (y + yy) * img.w + x
        const trow = yy * t.w
        for (let xx = 0; xx < t.w; xx++) cross += img.data[row + xx] * tc[trow + xx]
      }
      return Math.abs(cross / (Math.sqrt(varI) * tsd))
    }
    for (let y = 0; y + t.h <= Math.min(img.h, maxY + t.h); y += 2) {
      for (let x = 0; x + t.w <= Math.min(img.w, maxX + t.w); x += 2) {
        const sc = scoreAt(x, y)
        if (sc > best.score) best = { x, y, tw: t.w, th: t.h, score: sc }
      }
    }
    // refine around the best hit at this scale
    if (best.tw === t.w) {
      for (let y = Math.max(0, best.y - 2); y <= best.y + 2 && y + t.h <= img.h; y++)
        for (let x = Math.max(0, best.x - 2); x <= best.x + 2 && x + t.w <= img.w; x++) {
          const sc = scoreAt(x, y)
          if (sc > best.score) best = { x, y, tw: t.w, th: t.h, score: sc }
        }
    }
  }
  if (!best.tw) return null
  return { left: Math.round(best.x / f), top: Math.round(best.y / f), lw: Math.round(best.tw / f), score: best.score }
}

/** Median colour of a thin ring just outside a rectangle (the background around the logo). */
async function ringColour(image: Buffer, W: number, H: number, r: { left: number; top: number; width: number; height: number }) {
  const { data } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const px: number[][] = [[], [], []]
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 3
    px[0].push(data[i])
    px[1].push(data[i + 1])
    px[2].push(data[i + 2])
  }
  const d = Math.max(3, Math.round(W * 0.004))
  for (let x = r.left - d; x <= r.left + r.width + d; x += 2) {
    add(x, r.top - d)
    add(x, r.top + r.height + d)
  }
  for (let y = r.top - d; y <= r.top + r.height + d; y += 2) {
    add(r.left - d, y)
    add(r.left + r.width + d, y)
  }
  const med = (a: number[]) => (a.length ? a.sort((p, q) => p - q)[Math.floor(a.length / 2)] : 255)
  return { r: med(px[0]), g: med(px[1]), b: med(px[2]) }
}

/**
 * Puts the official logo, unmodified, where the design has it: finds the logo in the finished image,
 * cleans that spot with the surrounding background colour, and places the original file exactly there.
 * Falls back to the fixed top-left spot if no logo is found.
 */
export async function stampLogo(image: Buffer, w: number, h?: number): Promise<Buffer> {
  const H = h ?? (await sharp(image).metadata()).height ?? w
  const hit = await findLogo(image, w, H).catch(() => null)
  const layers: { input: Buffer; left: number; top: number }[] = []
  let place: { left: number; top: number; lw: number }
  let dark: boolean

  if (hit && hit.score >= 0.45) {
    const lh = Math.round(hit.lw * LOGO_BOX.aspect)
    const pad = Math.round(lh * 0.18)
    const rect = { left: Math.max(0, hit.left - pad), top: Math.max(0, hit.top - pad), width: Math.min(w - Math.max(0, hit.left - pad), hit.lw + pad * 2), height: Math.min(H - Math.max(0, hit.top - pad), lh + pad * 2) }
    const c = await ringColour(image, w, H, rect)
    dark = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 140
    const feather = Math.max(2, Math.round(pad * 0.6))
    const patch = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><defs><filter id="b"><feGaussianBlur stdDeviation="${feather / 2}"/></filter></defs><rect x="${feather}" y="${feather}" width="${rect.width - feather * 2}" height="${rect.height - feather * 2}" rx="${feather}" fill="rgb(${c.r},${c.g},${c.b})" filter="url(#b)"/></svg>`
    )
    layers.push({ input: await sharp(patch).png().toBuffer(), left: rect.left, top: rect.top })
    place = { left: hit.left, top: hit.top, lw: hit.lw }
  } else {
    const r = logoRect(w)
    const region = await sharp(image).extract({ left: r.left, top: r.top, width: r.lw, height: r.lh }).toBuffer()
    const { channels } = await sharp(region).stats()
    dark = 0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean < 140
    place = { left: r.left, top: r.top, lw: r.lw }
  }
  layers.push({ input: await logoPng(dark ? 'white' : 'navy', place.lw), left: place.left, top: place.top })
  // Lossless here; the caller encodes the final file once.
  return sharp(image).composite(layers).png().toBuffer()
}

/**
 * Layout guide for the image AI, at its generation size: a plain canvas with the official logo already
 * placed top-left, where it should stay after the post is resized/cropped to finalW × finalH.
 */
export async function layoutGuide(genW: number, genH: number, finalW: number, finalH: number): Promise<Buffer> {
  const scale = Math.max(finalW / genW, finalH / genH)
  const offX = (genW * scale - finalW) / 2
  const offY = (genH * scale - finalH) / 2
  const r = logoRect(finalW)
  const logo = await logoPng('navy', Math.round(r.lw / scale))
  return sharp({ create: { width: genW, height: genH, channels: 3, background: '#ececec' } })
    .composite([{ input: logo, left: Math.round((r.left + offX) / scale), top: Math.round((r.top + offY) / scale) }])
    .png()
    .toBuffer()
}

export const GUIDE_NOTE =
  'LOGO & LAYOUT GUIDE: The FIRST attached image is the canvas. It already contains the official BOSS company logo in the top-left. Build the whole design on this canvas and KEEP THAT LOGO exactly as it is — same place, same size, same shapes and colours (you may switch it to white only if the background behind it becomes dark). It must appear EXACTLY ONCE. Give it clear breathing space: nothing (no text, label pills, badges, faces, objects) may touch or overlap it, and the headline starts clearly below it. Keep the background directly behind the logo calm and plain. Never draw any second logo, emblem or company wordmark anywhere else.'
