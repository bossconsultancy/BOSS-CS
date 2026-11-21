import { NextRequest, NextResponse } from 'next/server'
import { BRAND, CATEGORIES, CATEGORY_LIST, CategoryId, isCategoryId, PostType } from '@/lib/social/brand'
import { classifyTopic } from '@/lib/social/classify'
import { demoPost, PostContent } from '@/lib/social/post'
import { completeJson, friendlyError, textProvider } from '@/lib/social/openai'
import { rateLimit } from '@/lib/social/limit'
import { articleDetails } from '@/lib/social/article'
import { directPost } from '@/lib/social/artDirector'
import { researchStory } from '@/lib/social/factFinder'
import { normaliseStyle, StyleId } from '@/lib/social/brand'

export const maxDuration = 60

interface Body {
  topic: string
  sources?: { title: string; url: string }[]
  sourceDate?: string
  category?: CategoryId | 'auto'
  postType?: PostType
  notes?: string
  language?: string
  /** Headline hook the user picked or polished on the Your Idea page — used as-is. */
  hook?: string
  /** Visual style picked on the Your Idea page. */
  style?: StyleId
}

const SYSTEM_PROMPT = `You are the copywriter for ${BRAND.name} (${BRAND.website}, ${BRAND.phone}, ${BRAND.address}).
You write the exact words that will be printed on ONE social media graphic, plus a caption.

STEP 1 — CLASSIFY the post into exactly ONE category by its substance, audience and call to action:
${CATEGORY_LIST.map((c) => `- "${c.id}": ${c.name}`).join('\n')}
Signals: immigration = IRCC, visitor visa for Canada, study/work permit, super visa, PR, citizenship, sponsorship, refugee. education = college/university admission, programs, scholarships, ESL/IELTS. employment = jobs, resume, cover letter, interviews, career coaching, LinkedIn. legal = notary, commissioner of oaths, affidavits, declarations, certified copies, agreements, POA, wills, tribunal, landlord/tenant. accounting = tax, CRA, GST/HST, payroll, T4, bookkeeping, Uber/Lyft driver taxes. investment = TFSA, RRSP, RESP as savings, retirement, insurance, financial planning. business = starting a business, branding, marketing, growth strategy. technology = POS, ERP/CRM, websites, e-commerce, apps, automation, cloud, cybersecurity. travel = flights, hotels, vacations, itineraries, tours, destination weddings.
Rules: CRA/tax/HST → accounting. Canadian visitor visa/PR/permit → immigration; flights/hotels → travel. Website/POS → technology; branding/marketing → business. Notarising an affidavit → legal. RESP for college navigation → education; RESP as savings → investment.

STEP 2 — WRITE (simple, confident Canadian English unless another language is requested). Short words render best on images:
- kicker: 1–4 words, uppercase.
- headline: 3–8 punchy words, UPPERCASE, split into 2 (max 3) short lines with "\\n"; each line ≤ 16 characters.
- accentWords: 1–2 words copied exactly from the headline to emphasise.
- support: ONE sentence, 8–18 words.
- points: 3 bullets, each ≤ 5 words, sentence case (ordered actions for how-to posts).
- cta: 2–5 words inviting a phone call; it is printed above the big phone number (e.g. "Call us today", "Book your call now").
- scene: one vivid sentence describing the photo/imagery for the designer (people, setting, props, mood). Relevant, realistic, Canadian context. No text or logos in it.
- caption: 2–4 short sentences for the social caption, ending with ${BRAND.phone} and ${BRAND.website}. Max 2 emoji.
- hashtags: 5–7, without "#", always including "BOSSConsultancy".
- classificationReason: one short sentence.

For holiday/greeting posts: the headline is the greeting (e.g. "HAPPY\\nDIWALI"), support is a warm one-line wish, cta can be "From all of us at BOSS".

COMPLIANCE — never break:
- Never invent prices, discounts, deadlines, dates, statistics, ratings, credentials, approvals or client stories. Use only facts the user supplied (verified research counts as supplied). For news/deadline posts, a key verified date or number may go in the headline or support line, copied exactly.
- Never claim BOSS is a lawyer, licensed immigration consultant (RCIC), CPA, investment adviser or travel agency.
- Never promise approvals, refunds, returns, admission, funding or job placement.

Never mention OSAP or student loans (the client has excluded that topic). Never write a phone extension — the phone number is only 416 605 0101.

Return ONLY a JSON object with keys: category, kicker, headline, accentWords, support, points, cta, scene, caption, hashtags, classificationReason.`

const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v.trim() : f)
const strArr = (v: unknown, f: string[]) => {
  if (!Array.isArray(v)) return f
  const out = v.filter((x) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
  return out.length ? out : f
}

function normalise(raw: Record<string, unknown>, forced: CategoryId | null, postType: PostType, topic: string): PostContent {
  const ai = isCategoryId(raw.category) ? raw.category : null
  const category: CategoryId = forced ?? ai ?? classifyTopic(topic).category
  const base = demoPost(category, topic, postType)

  let headline = str(raw.headline, base.headline).toUpperCase().replace(/\\n/g, '\n')
  if (!headline.includes('\n')) {
    const w = headline.split(/\s+/)
    if (w.length > 2) headline = `${w.slice(0, Math.ceil(w.length / 2)).join(' ')}\n${w.slice(Math.ceil(w.length / 2)).join(' ')}`
  }
  headline = headline.split('\n').slice(0, 3).join('\n')
  const hw = new Set(headline.replace(/\n/g, ' ').split(/\s+/).map((w) => w.replace(/[^A-Z0-9’']/g, '')))
  const accentWords = strArr(raw.accentWords, base.accentWords)
    .map((w) => w.toUpperCase().replace(/[^A-Z0-9’']/g, ''))
    .filter((w) => hw.has(w))
    .slice(0, 2)
  const hashtags = strArr(raw.hashtags, base.hashtags).map((h) => h.replace(/^#/, '').replace(/\s+/g, ''))
  if (!hashtags.some((h) => h.toLowerCase() === 'bossconsultancy')) hashtags.unshift('BOSSConsultancy')

  return {
    category,
    kicker: str(raw.kicker, base.kicker).toUpperCase(),
    headline,
    accentWords: accentWords.length ? accentWords : base.accentWords,
    support: str(raw.support, base.support),
    points: strArr(raw.points, base.points).slice(0, 3),
    cta: str(raw.cta, base.cta),
    scene: str(raw.scene, base.scene),
    caption: str(raw.caption, base.caption),
    hashtags: hashtags.slice(0, 8),
    classificationReason: forced ? 'Category chosen manually.' : str(raw.classificationReason, ''),
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'text')
  if (limited) return limited

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const topic = (body.topic || '').trim()
  if (!topic) return NextResponse.json({ error: 'Describe what the post is about.' }, { status: 400 })
  const postType: PostType = body.postType || 'service'
  const forced = body.category && body.category !== 'auto' && isCategoryId(body.category) ? body.category : null

  if (!textProvider()) {
    const cls = classifyTopic(topic)
    const post = demoPost(forced ?? cls.category, topic, postType)
    post.classificationReason = forced ? 'Category chosen manually.' : `Offline classifier (${cls.confidence} confidence). ${cls.reason}`
    return NextResponse.json({ post, demo: true })
  }

  try {
    const isNews = Boolean(body.sources?.length)
    // Read the article if the idea didn't already bring its details (free).
    let notes = body.notes || ''
    if (isNews && !/FROM THE ARTICLE:/.test(notes) && body.sources?.[0]?.url) {
      const art = await articleDetails(body.sources[0].url, 2500).catch(() => ({ text: '' }))
      if (art.text) notes = `${notes}\nFROM THE ARTICLE:\n${art.text}`
    }
    const sourceNote = (caption: string) => {
      const src = (body.sources || []).map((x) => x.title).filter(Boolean).slice(0, 2)
      return src.length ? `${caption}\n\nSource: ${src.join(', ')}${body.sourceDate ? ` (${body.sourceDate})` : ''}. General information only, not legal or financial advice.` : caption
    }

    if (isNews) {
      // 1) research the story on the web for real facts, 2) the AI art director designs it from scratch.
      const facts = await researchStory(topic, notes).catch(() => '')
      const slides = await directPost({ mode: 'news', topic, notes, facts, forced, language: body.language, sourceTitle: body.sources?.[0]?.title, sourceDate: body.sourceDate })
      slides.forEach((s) => (s.caption = sourceNote(s.caption)))
      return NextResponse.json({ post: slides[0], slides, demo: false })
    }

    // Your Idea posts: same art director, promotional, using the chosen style and hook.
    if (process.env.OPENAI_API_KEY) {
      const [post] = await directPost({ mode: 'idea', topic, notes, forced, language: body.language, hook: (body.hook || '').trim() || undefined, style: normaliseStyle(body.style) })
      return NextResponse.json({ post, demo: false })
    }

    const hook = (body.hook || '').trim()
    const user = [
      `Brief: ${topic}`,
      hook ? `HEADLINE IS FIXED — use exactly this hook as the headline (you may only split it into 2–3 lines with "\\n"): "${hook.toUpperCase()}". Write everything else to support it.` : '',
      `Post type: ${postType}`,
      `Language: ${body.language || 'English'}`,
      forced ? `Use the category "${forced}" (${CATEGORIES[forced].name}).` : 'Classify the category automatically.',
      notes ? `Verified facts (you may use these): ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    const content = await completeJson(SYSTEM_PROMPT, user)
    let raw: Record<string, unknown> = {}
    try {
      raw = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))
    } catch {
      raw = {}
    }
    const post = normalise(raw, forced, postType, topic)
    if (hook) {
      // Keep the user's hook word-for-word (only the line breaks may differ).
      const flat = (x: string) => x.replace(/\s+/g, ' ').trim()
      if (flat(post.headline) !== flat(hook.toUpperCase())) {
        const w = hook.toUpperCase().split(/\s+/)
        post.headline = w.length > 3 ? `${w.slice(0, Math.ceil(w.length / 2)).join(' ')}\n${w.slice(Math.ceil(w.length / 2)).join(' ')}` : w.join(' ')
      }
    }
    post.caption = sourceNote(post.caption)
    return NextResponse.json({ post, demo: false })
  } catch (error) {
    console.error('generate-text error:', error)
    const code = (error as { code?: string })?.code
    if (code === 'billing' || code === 'key' || code === 'quota') {
      // No paid AI available — fall back to the built-in copy so posts still get made.
      const cls = classifyTopic(topic)
      const post = demoPost(forced ?? cls.category, topic, postType)
      return NextResponse.json({ post, demo: true })
    }
    const { message, status } = friendlyError(error, 'Failed to write copy')
    return NextResponse.json({ error: message }, { status })
  }
}
