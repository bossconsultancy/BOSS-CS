import 'server-only'

// Reads the real article behind a news item (free, no AI) so posts can carry
// concrete facts instead of just a headline.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function get(url: string, ms = 7000, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Accept-Language': 'en-CA,en;q=0.9', ...(init.headers || {}) } })
  } finally {
    clearTimeout(t)
  }
}

/** Google News RSS links are wrapped; decode them to the publisher's URL. */
export async function resolveNewsUrl(url: string): Promise<string> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return url
  }
  if (!u.hostname.endsWith('news.google.com')) return url
  const id = u.pathname.split('/').pop()
  if (!id) return url
  try {
    const page = await get(`https://news.google.com/rss/articles/${id}?hl=en-CA&gl=CA&ceid=CA:en`)
    const html = await page.text()
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1]
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1]
    if (!sg || !ts) return page.url && !page.url.includes('news.google.com') ? page.url : url
    const inner = `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`
    const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner]]]))
    const res = await get('https://news.google.com/_/DotsSplashUi/data/batchexecute', 7000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    })
    const text = await res.text()
    const chunk = text.split('\n\n')[1]
    if (!chunk) return url
    const parsed = JSON.parse(chunk)
    const payload = JSON.parse(parsed[0][2])
    return typeof payload?.[1] === 'string' ? payload[1] : url
  } catch {
    return url
  }
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

const BOILER = /cookie|subscribe|newsletter|sign up|advertis|all rights reserved|javascript|log in|your browser|follow us|share this|click here|related:/i

/** Main text of an article page: description + body paragraphs, trimmed. */
export function extractText(html: string, max = 3000): string {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const meta =
    clean.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    clean.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:description|description)["']/i)?.[1] ||
    ''
  const scope = clean.match(/<article[\s\S]*?<\/article>/i)?.[0] || clean
  const paras = Array.from(scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => decode(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 60 && !BOILER.test(p))
  const seen = new Set<string>()
  const parts = [decode(meta).trim(), ...paras].filter((p) => p && !seen.has(p) && seen.add(p))
  let out = ''
  for (const p of parts) {
    if (out.length + p.length > max) break
    out += (out ? '\n' : '') + p
  }
  return out
}

/** Fetches article details; returns '' if the page can't be read (paywall, blocked, timeout). */
export async function articleDetails(url: string, max = 3000): Promise<{ url: string; text: string }> {
  const real = await resolveNewsUrl(url)
  if (/(^|\.)news\.google\.com$/.test(new URL(real).hostname)) return { url: real, text: '' }
  try {
    const res = await get(real, 8000)
    if (!res.ok || !(res.headers.get('content-type') || '').includes('html')) return { url: real, text: '' }
    return { url: res.url || real, text: extractText(await res.text(), max) }
  } catch {
    return { url: real, text: '' }
  }
}
