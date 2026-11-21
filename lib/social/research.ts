import 'server-only'
import { CATEGORIES, CategoryId, isCategoryId, PostType } from './brand'
import { Idea, Source } from './ideas'
import { departmentNews, NewsItem, shortDate } from './news'
import { completeJson, textProvider } from './openai'
import { articleDetails } from './article'

// Research = free news (Google News RSS) + a cheap text model that turns real
// headlines into post ideas. Every news idea links to the article it came from.
// If the text model is unavailable, ideas are built from the headlines alone.

const KINDS = ['news', 'deadline', 'seasonal', 'evergreen'] as const
const POST_TYPES: PostType[] = ['service', 'informational', 'announcement', 'steps', 'greeting']

/** Topics the client has permanently excluded. */
const EXCLUDED = /\bosap\b|student loans?/i

function todayToronto(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full' }).format(new Date())
}

const SYSTEM = `You are the research editor for BOSS Consultancy Services in Scarborough, Toronto, Canada. BOSS helps newcomers, students, families and small businesses with immigration, education, employment, legal documents, accounting/tax, investment, business operations, technology and travel.
You receive REAL news items (numbered). Turn the most useful ones into social media post ideas.
Rules:
- Use ONLY facts stated in the given headline/snippet/date. Never add numbers, dates, eligibility or claims that are not there.
- THE AUDIENCE: South Asian immigrants in the GTA — above all Sri Lankan, Indian and Tamil Canadians (also Pakistani, Bangladeshi, Nepali). STRONGLY prefer news that directly concerns them: India / Sri Lanka visas and processing, Indian & South Asian students and workers, Tamil and South Asian community news in Scarborough, Markham, Brampton and Mississauga, remittances, flights to Colombo/Chennai/Delhi, scams targeting the community. General Canada/Ontario news is fine when it clearly affects newcomer families (rule changes, deadlines, benefits). Skip news with no link to them, crime stories, political fights and celebrity items.
- Prefer items that matter this week: rule changes, deadlines, official announcements, practical consumer news.
- Prefer real news reports (government, CBC, Global, CTV, Globe and Mail, CIC News, etc.) over evergreen SEO listicles or course-seller blogs ("Top 10…", "Highest paying jobs…"); use those only if nothing better exists.
- BOSS is not a law firm, licensed immigration consultant, CPA or financial adviser: angles offer help and guidance, never guarantees.
- Never mention OSAP or student loans.
Reply with ONLY JSON: {"ideas":[{"item":<number of the news item, or 0 for an evergreen tip>,"kind":"news|deadline|seasonal|evergreen","topic":"short factual headline, max 12 words","summary":"1–2 sentences restating the item's facts","whyNow":"1 sentence why clients should care","angle":"1 sentence: what the BOSS post says and offers","headline":"post headline, 3–7 punchy words","postType":"informational|announcement|service|steps"}]}`

/** Extra editorial focus per department. */
const FOCUS: Partial<Record<CategoryId, string>> = {
  immigration: 'Prioritise news about Indian, Sri Lankan and Tamil applicants: processing times from India/Sri Lanka, study/work permits for Indian students, family sponsorship, Tamil refugee or community stories, Express Entry draws.',
  employment: 'Prioritise jobs and work news for South Asian newcomers: foreign credentials, in-demand jobs, hiring in Scarborough/Brampton/Mississauga, international student work rules.',
  education: 'Prioritise news for Indian, Sri Lankan and Tamil students and families: study permits, caps, college programs, scholarships.',
  travel:
    'BOSS clients are largely Tamil families in the GTA. Pick TOURISM news about the places they travel to and have family in: Sri Lanka, India (especially Tamil Nadu), Thailand, Malaysia, Singapore, Mauritius, Maldives, the UK, Germany, France, Switzerland, the UAE, the USA and Australia — new visa rules, visa-free or e-visa schemes, arrival cards, tourist taxes, new flight routes from Toronto, festivals and seasonal travel. Skip airline business/earnings news, accidents and politics.',
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function sourceOf(n: NewsItem): Source {
  let host = 'news'
  try {
    host = new URL(n.url).hostname.replace(/^www\./, '')
  } catch {}
  return { title: n.publisher || host, url: n.url }
}

function fallbackIdeas(dept: CategoryId, news: NewsItem[], count: number): Idea[] {
  const c = CATEGORIES[dept]
  return news.slice(0, count).map((n, i) => ({
    id: `${dept}-${Date.now().toString(36)}-${i}`,
    department: dept,
    kind: 'news',
    topic: n.title,
    summary: n.snippet || `${n.publisher || 'News'} reported this${n.date ? ` on ${shortDate(n.date)}` : ''}.`,
    whyNow: '',
    angle: `Questions about this? ${c.sampleSupport}`,
    headline: c.sampleHeadline.replace(/\n/g, ' '),
    postType: 'informational',
    date: shortDate(n.date),
    sources: [sourceOf(n)],
    verified: true,
  }))
}

async function pickIdeas(dept: CategoryId, count = 4, opts: { more?: boolean; exclude?: string[] } = {}): Promise<Idea[]> {
  const news = await departmentNews(dept, { ...opts, max: opts.more ? 18 : 14 })
  if (!news.length) return []
  if (!textProvider()) return fallbackIdeas(dept, news, count)

  const c = CATEGORIES[dept]
  const list = news
    .map((n, i) => `${i + 1}. ${n.title} — ${n.publisher || 'unknown'}${n.date ? `, ${shortDate(n.date)}` : ''}${n.snippet ? `\n   ${n.snippet}` : ''}`)
    .join('\n')
  const focus = FOCUS[dept] ? `\nFocus for this department: ${FOCUS[dept]}` : ''
  const user = `Today is ${todayToronto()}. Department: ${c.name}.${focus}
Pick the ${count} best post ideas for this department (at most 1 evergreen tip; the rest must each come from one numbered item).

NEWS ITEMS:
${list}`

  let raw: Record<string, unknown>[] = []
  try {
    const out = await completeJson(SYSTEM, user)
    const parsed = JSON.parse(out.replace(/^```json\s*|\s*```$/g, ''))
    raw = Array.isArray(parsed?.ideas) ? parsed.ideas : []
  } catch (e) {
    console.error('research text model failed, using headlines:', e)
    return fallbackIdeas(dept, news, count)
  }
  if (!raw.length) return fallbackIdeas(dept, news, count)

  const used = new Set<number>()
  const ideas = raw
    .map((r, i): Idea | null => {
      const topic = str(r.topic)
      if (!topic) return null
      const idx = Number(r.item) - 1
      const item = idx >= 0 && idx < news.length ? news[idx] : null
      if (item) {
        if (used.has(idx)) return null
        used.add(idx)
      }
      const kindRaw = str(r.kind)
      const kind = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as Idea['kind']) : 'news'
      const pt = str(r.postType) as PostType
      return {
        id: `${dept}-${Date.now().toString(36)}-${i}`,
        department: dept,
        kind: item ? (kind === 'evergreen' ? 'news' : kind) : 'evergreen',
        topic,
        summary: str(r.summary),
        whyNow: str(r.whyNow),
        angle: str(r.angle),
        headline: str(r.headline).toUpperCase(),
        postType: POST_TYPES.includes(pt) ? pt : 'informational',
        date: item ? shortDate(item.date) : '',
        sources: item ? [sourceOf(item)] : [],
        verified: Boolean(item),
      }
    })
    .filter((x): x is Idea => Boolean(x))
    .filter((x) => !EXCLUDED.test(`${x.topic} ${x.summary} ${x.angle} ${x.headline}`))
    .slice(0, count)
  return ideas.length ? ideas : fallbackIdeas(dept, news, count)
}

/** Clearly-labelled sample ideas so the UI works without any setup. */
export function sampleIdeas(dept: CategoryId): Idea[] {
  const c = CATEGORIES[dept]
  return [
    {
      id: `${dept}-sample-1`,
      department: dept,
      kind: 'evergreen',
      topic: `Sample idea: ${c.short} support for GTA families`,
      summary: 'This is a sample idea shown because live news isn’t switched on yet.',
      whyNow: '',
      angle: c.sampleSupport,
      headline: c.sampleHeadline.replace(/\n/g, ' '),
      postType: 'service',
      date: '',
      sources: [],
      verified: false,
    },
  ]
}

export function parseDepartments(v: unknown): CategoryId[] {
  if (!Array.isArray(v)) return []
  return Array.from(new Set(v.filter(isCategoryId))).slice(0, 9)
}

/** Reads each chosen article (free) so ideas carry real details, not just a headline. */
async function enrich(ideas: Idea[]): Promise<Idea[]> {
  return Promise.all(
    ideas.map(async (idea) => {
      const src = idea.sources[0]
      if (!src) return idea
      const { url, text } = await articleDetails(src.url, 2500).catch(() => ({ url: src.url, text: '' }))
      if (!text) return idea
      const first = text.split('\n')[0]
      return {
        ...idea,
        details: text,
        // A thin headline-only summary is replaced by the article's own description.
        summary: idea.summary && idea.summary.length > 90 ? idea.summary : first.slice(0, 320),
        sources: [{ title: src.title, url }, ...idea.sources.slice(1)],
      }
    })
  )
}

export async function researchDepartment(dept: CategoryId, count = 4, opts: { more?: boolean; exclude?: string[] } = {}): Promise<Idea[]> {
  const ideas = await pickIdeas(dept, count, opts)
  return enrich(ideas)
}
