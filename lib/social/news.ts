import 'server-only'
import { CategoryId } from './brand'

// Free news gathering: Google News RSS (no key, no quota), Canadian edition.

export interface NewsItem {
  title: string
  publisher: string
  url: string
  date: string // ISO
  snippet: string
}

/** The audience: South Asian immigrants — Sri Lankan, Indian, Tamil Canadians first. */
const SA = '("Sri Lankan" OR Indian OR Tamil OR "South Asian" OR Pakistani OR Bangladeshi OR Nepali)'

/** Searches per department: community-focused first, then the general Canada/Ontario news that affects them too. */
const QUERIES: Record<CategoryId, string[]> = {
  immigration: [
    `${SA} immigrants Canada IRCC OR "Express Entry" OR PR`,
    'India OR "Sri Lanka" Canada visa OR "study permit" OR "work permit" OR "visitor visa" processing',
    'IRCC immigration Canada new rules',
    'Express Entry OR "permanent residence" OR "super visa" OR citizenship Canada',
  ],
  education: [
    'Indian OR "Sri Lankan" OR "South Asian" international students Canada',
    'international students Canada colleges study permit cap',
    'Ontario college university admissions OR scholarships',
  ],
  employment: [
    `${SA} newcomers jobs Canada OR Toronto OR Brampton OR Scarborough`,
    'newcomers foreign credentials jobs Ontario',
    'Toronto jobs hiring OR "job market" Ontario',
  ],
  legal: [
    `${SA} community Toronto OR Scarborough OR Brampton legal OR fraud OR scam`,
    'Ontario Landlord and Tenant Board OR tenants news',
    'Ontario law change wills OR "power of attorney" OR notary',
  ],
  accounting: [
    'CRA newcomers taxes OR benefits Canada',
    'CRA Canada Revenue Agency tax changes',
    'CRA scam OR "tax deadline" OR GST HST Canada',
  ],
  investment: [
    'remittances India OR "Sri Lanka" Canada OR "NRI" OR "rupee" Canada',
    'newcomers personal finance Canada TFSA OR RRSP OR FHSA OR mortgage',
    'Bank of Canada interest rate',
  ],
  business: [
    `${SA} entrepreneurs OR "small business" Toronto OR Scarborough OR Brampton OR Mississauga`,
    'Ontario small business grants OR funding OR rules',
    'Canada India OR "Sri Lanka" trade business',
  ],
  technology: [
    `${SA} community scam OR fraud Canada`,
    'Canadian Anti-Fraud Centre scam alert',
    'small business technology OR AI Canada',
  ],
  // Tourism news for the places Tamil families travel to and live in.
  travel: [
    'tourism (Thailand OR "Sri Lanka" OR India OR Malaysia) visa OR flights OR travellers',
    'tourism (Singapore OR Mauritius OR Maldives) visa OR flights OR travellers',
    'tourism (UK OR Germany OR France OR Switzerland) visa OR travellers OR flights',
    'Canadian travellers visa OR "e-visa" OR "visa-free" Asia OR Europe',
  ],
}

/** Extra searches used by "Find more news". */
const MORE: Record<CategoryId, string[]> = {
  immigration: [
    'Tamil Canadians OR "Sri Lankan Canadians" immigration OR refugees OR sponsorship',
    'Indian students OR workers Canada IRCC news',
    'family sponsorship OR "parents and grandparents" OR "visitor visa" Canada',
    'Canada immigration levels plan',
  ],
  education: [
    'Tamil OR "South Asian" students Toronto OR Scarborough schools OR university',
    'India Canada students study visa news',
    'Ontario colleges programs OR tuition news',
  ],
  employment: [
    'Indian OR "Sri Lankan" OR "South Asian" workers Canada OR "temporary foreign workers"',
    'Brampton OR Scarborough OR Mississauga jobs OR hiring',
    'in-demand jobs Canada OR "minimum wage" Ontario',
  ],
  legal: [
    'Tamil OR "Sri Lankan" OR Indian community Canada court OR law',
    'Ontario tenant rights OR "rent increase guideline"',
    'consumer protection Ontario OR "immigration consultant" fraud',
  ],
  accounting: [
    'newcomers first tax return Canada OR "Canada child benefit"',
    'Canada tax credit benefit payment',
    'self-employed OR gig workers taxes Canada',
  ],
  investment: [
    'Indian OR "South Asian" Canadians homebuyers OR mortgage OR savings',
    'Canada inflation rate OR mortgage rates',
    'RESP OR FHSA newcomers Canada',
  ],
  business: [
    'Tamil OR "South Asian" business Scarborough OR Markham OR Brampton',
    'Canada small business tax OR regulations',
    'India Canada trade OR tariffs small business',
  ],
  technology: [
    'WhatsApp OR phone scam immigrants Canada',
    'phishing scam Canada warning OR "payment fraud"',
    'AI tools small business news',
  ],
  travel: [
    'Air Canada OR "Air India" OR SriLankan OR "Thai Airways" OR "Malaysia Airlines" OR "Singapore Airlines" new route Toronto',
    'Sri Lanka tourism OR "Jaffna" OR "Tamil Nadu tourism" OR Chennai flights',
    'Thailand OR Malaysia OR Singapore visa-free OR "digital arrival card" OR "tourist tax"',
    'UK ETA OR "EU ETIAS" OR "Schengen" travellers Canadians',
    'travel to USA OR UAE OR Australia rules travellers Canada',
    'Mauritius OR Maldives OR Bali tourism news',
  ],
}

const EXCLUDED = /\bosap\b|student loans?/i

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]).trim() : ''
}
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export function parseRss(xml: string): NewsItem[] {
  const items = xml.split(/<item>/).slice(1)
  return items.map((raw) => {
    const block = raw.split('</item>')[0]
    let title = tag(block, 'title')
    const publisher = tag(block, 'source') || (title.includes(' - ') ? title.split(' - ').pop()! : '')
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3))
    const pub = tag(block, 'pubDate')
    const d = pub ? new Date(pub) : null
    const snippet = strip(tag(block, 'description')).replace(title, '').replace(publisher, '').trim()
    return {
      title,
      publisher,
      url: tag(block, 'link'),
      date: d && !isNaN(+d) ? d.toISOString() : '',
      snippet: snippet.slice(0, 280),
    }
  })
}

const RSS_BASE = process.env.NEWS_RSS_BASE || 'https://news.google.com/rss/search'

async function search(q: string, days = 30): Promise<NewsItem[]> {
  const url = `${RSS_BASE}?q=${encodeURIComponent(`${q} when:${days}d`)}&hl=en-CA&gl=CA&ceid=CA:en`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (BOSS Post Desk)' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`News feed ${res.status}`)
  return parseRss(await res.text())
}

/** Recent, de-duplicated news for a department, newest first. */
export async function departmentNews(dept: CategoryId, opts: { more?: boolean; exclude?: string[]; max?: number } = {}): Promise<NewsItem[]> {
  const max = opts.max ?? 14
  const queries = opts.more ? [...MORE[dept], ...QUERIES[dept]] : QUERIES[dept]
  const days = opts.more ? 60 : 30
  const results = await Promise.allSettled(queries.map((q) => search(q, days)))
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  if (!all.length && results.every((r) => r.status === 'rejected')) throw new Error('Couldn’t reach the news feeds right now.')
  const cutoff = Date.now() - (days + 5) * 86400_000
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 60)
  const seen = new Set<string>((opts.exclude || []).map(norm))
  return all
    .filter((i) => i.title && i.url && !EXCLUDED.test(`${i.title} ${i.snippet}`))
    .filter((i) => !i.date || +new Date(i.date) >= cutoff)
    .filter((i) => {
      const k = norm(i.title)
      if (seen.has(k) || seen.has(norm(i.url))) return false
      seen.add(k)
      return true
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, max)
}

export function shortDate(iso: string): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}
