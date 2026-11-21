import 'server-only'
import OpenAI from 'openai'
import { BRAND, CATEGORIES, CATEGORY_LIST, CategoryId, isCategoryId, STYLES, StyleId } from './brand'
import { completeJson } from './openai'
import { demoPost, PostContent } from './post'
import { classifyTopic } from './classify'
import { TAMIL_STYLE } from './tamil'

// The AI art director. For every post it writes a complete, free-form design brief (the way a senior
// designer briefs an image model) in the style of BOSS's own best posts — no fixed template.
// It also returns the words on the post (for editing, Tamil translation, captions and labels).

const DESIGN_MODELS = (process.env.OPENAI_DESIGN_MODEL || 'gpt-4.1,gpt-4o,gpt-4o-mini').split(',').map((m) => m.trim()).filter(Boolean)

/** Starting compositions to push variety between posts (the director adapts freely). */
const COMPOSITIONS = [
  'hero person large on the right, headline stacked on the left with a script accent word, a 4-item icon fact strip across the middle on a white rounded card, a second brand-colour section below with more facts, two small rounded photo insets on the right',
  'big photo across the top 55% with the headline overlapping its bottom edge on a brand-colour panel, a 2×3 grid of white rounded fact cards below',
  'split layout: left half solid deep brand colour with the headline and a neat facts table, right half a full-height photo of the hero; a big round badge with the key number overlapping the split',
  'centred headline at the top, hero person cut out in the centre, fact chips floating around them in a balanced arrangement, a highlighted strip with the key takeaway above the footer',
  'magazine-cover style: full-bleed photo, bold headline in a frosted panel, a vertical list of icon + bold label + detail rows on the left, one large number badge',
  'landmark/scene collage at the top (2–3 rounded photos), headline below, then a clean comparison table or fee/requirements table in a white card',
  'diagonal brand-colour band across the canvas separating a photo area and an information area; icon row of facts, then a "What you need" checklist with check-mark icons',
]

const SYSTEM = `You are the senior art director at a top social media agency. You design Instagram posts for ${BRAND.name}, a Toronto consultancy for newcomers, Tamil and South Asian families, students and small businesses. The posts exist to make people CALL ${BRAND.phone}.

HOUSE STYLE (from BOSS's own best posts — the image model will also see two of them):
- Rich, premium, polished agency design; light airy backgrounds with deep brand-colour sections and soft gradients; photorealistic smiling people (South Asian / Canadian context), Toronto skyline / CN Tower where relevant.
- Typography mix: a heavy bold sans-serif headline (some words in brand colour), often ONE word in an elegant handwritten script, a clean supporting line.
- INFORMATION IS PART OF THE DESIGN: icon fact strips or grids (round icon + bold title + small detail line), white rounded cards, tables (e.g. fees by year, requirements, steps), career-path rows, number badges, small photo insets. Neat, aligned, generous spacing, nothing vague.
- Footer band on every post: a phone icon circle, small "CALL US TODAY", and the number "${BRAND.phone}" HUGE and bold (the most eye-catching text after the headline); next to it the website "${BRAND.website}" and the address "${BRAND.address}" in small text.
- Top-left corner: the official company logo is supplied to the image model already placed on its canvas. In the image prompt write: "Keep the supplied company logo exactly as it is in the top-left corner, with generous clear space around it — no text, badges or objects touching it; the headline starts below it." Do not describe the logo's design and never ask for another logo anywhere.

YOUR JOB: write the post copy and a COMPLETE IMAGE PROMPT for each slide.
- Every word that will appear on the image must be written inside the image prompt in double quotes, exactly as it should be spelled.
- The image prompt (250–450 words) describes: format, overall look and palette (built from the brand colour given, its tints/shades, white and near-black), the hero image (specific to THIS topic — real places, people, objects), the exact layout and every section with its exact text, icons for each fact, typography, the footer band, and the clear space around the logo in the top-left.
- Do NOT copy one fixed layout. Design what suits THIS story; a starting composition is suggested — adapt it, mix it, or do better.
- Information density like the examples: a headline, a supporting line, then 4–8 concrete facts arranged as icon grid / table / checklist / rows — the reader understands everything WITHOUT the caption.

CONTENT RULES — never break:
- NEWS posts: use ONLY the facts in the fact sheet / article. Real names, numbers, durations, fees, conditions, steps, start dates/deadlines. Say "proposal" if it isn't final. Never the article's publish date. Design around the facts that exist — don't force fixed sections (no \"Who/When/Cost\" boxes just because); never print \"unknown\", \"TBA\", \"not specified\" or empty fields. If facts are thin, use fewer facts and a bigger hero — never vague filler like "Tourism boost", "Easy travel", "Stay informed", "Check eligibility".
- SERVICE/IDEA posts: use the user's details exactly; you may describe BOSS's help in general terms (e.g. "Document checklist", "Application review", "Interview coaching") but NEVER invent prices, durations, guarantees, statistics, deadlines or approvals.
- Never mention OSAP or student loans. Phone is only ${BRAND.phone} — never an extension. BOSS is not a law firm, licensed immigration consultant, CPA or financial adviser — never promise outcomes.
- No other companies' logos or brand names in visuals.

FORMAT DECISION (news only): "carousel" (3–5 slides) when the facts clearly don't fit one post (many rules, steps, destinations, fees); slide 1 = headline + what happened, middle = one topic each, last = what to do + call. Otherwise "single". Service/idea posts are always "single".

Return ONLY JSON:
{"category":"<department id>","format":"single|carousel","caption":"4–6 sentences: what it is, key details, who it helps, what to do, how BOSS helps; end with ${BRAND.phone} and ${BRAND.website}; max 2 emoji","hashtags":["5–7 without #, include BOSSConsultancy"],
 "slides":[{"kicker":"small label, 1–3 words","headline":"the big words (UPPERCASE allowed), lines split with \\\\n","support":"supporting line","points":["each fact exactly as printed, e.g. 'Stay: up to 15 days'"],"cta":"2–4 words above the phone, e.g. 'CALL US TODAY'","imagePrompt":"the complete image prompt"}]}

DEPARTMENTS: ${CATEGORY_LIST.map((c) => `"${c.id}" = ${c.name} (brand colour ${c.colourName} ${c.primary})`).join('; ')}.`

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()) : [])

async function designJson(user: string): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    for (const model of DESIGN_MODELS) {
      try {
        const r = await client.chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          temperature: 0.9,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: user },
          ],
        })
        const out = r.choices[0]?.message?.content
        if (out) return out
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/model|does not exist|not found|access/i.test(msg)) continue
        throw e
      }
    }
  }
  return completeJson(SYSTEM, user)
}

export interface DirectBrief {
  mode: 'news' | 'idea'
  topic: string
  notes?: string
  facts?: string
  forced: CategoryId | null
  language?: string
  sourceTitle?: string
  sourceDate?: string
  hook?: string
  style?: StyleId
}

/** Designs a post (or a news carousel). Returns one PostContent per slide, each carrying its full image prompt. */
export async function directPost(b: DirectBrief): Promise<PostContent[]> {
  const guess = b.forced ?? classifyTopic(b.topic).category
  const composition = COMPOSITIONS[Math.floor(Math.random() * COMPOSITIONS.length)]
  const user = [
    `POST TYPE: ${b.mode === 'news' ? 'NEWS post (informative, real facts)' : 'SERVICE / IDEA post (promote BOSS help, get calls)'}`,
    `Topic: ${b.topic}`,
    b.facts ? `FACT SHEET (researched — use these):\n${b.facts}` : '',
    b.notes ? `Article / notes:\n${b.notes.slice(0, 3500)}` : '',
    b.hook ? `HEADLINE IS FIXED — use exactly: "${b.hook}" (you may split it into lines and style it).` : '',
    b.mode === 'idea' && b.style ? `Visual style chosen by the user: ${STYLES[b.style].name} — ${STYLES[b.style].hint}. (The image model also sees a sample of this style.)` : '',
    b.forced ? `Department is fixed: "${b.forced}" (${CATEGORIES[b.forced].name}, brand colour ${CATEGORIES[b.forced].colourName} ${CATEGORIES[b.forced].primary}).` : `Likely department: "${guess}" — change it if the topic clearly fits another.`,
    `Suggested starting composition (adapt freely): ${composition}.`,
    b.language === 'Tamil'
      ? `LANGUAGE: TAMIL. Every word printed on the image (all quoted text in the image prompt) and the caption must be in Tamil, written by the rules below. In the image prompt also say: "All Tamil text must be rendered in clean, correctly spelled Unicode Tamil script with a clear, modern Tamil font." Keep the phone ${BRAND.phone} and website ${BRAND.website} in English letters.\n${TAMIL_STYLE}`
      : `Language on the image: English.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  let raw: Record<string, unknown> = {}
  try {
    raw = JSON.parse((await designJson(user)).replace(/^```json\s*|\s*```$/g, ''))
  } catch {
    raw = {}
  }

  const category: CategoryId = b.forced ?? (isCategoryId(raw.category) ? raw.category : guess)
  const base = demoPost(category, b.topic, b.mode === 'news' ? 'informational' : 'service')
  const rawSlides = (Array.isArray(raw.slides) ? raw.slides : []).filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
  const carousel = b.mode === 'news' && str(raw.format) === 'carousel' && rawSlides.length >= 3
  const slides = carousel ? rawSlides.slice(0, 5) : rawSlides.slice(0, 1)
  if (!slides.length) slides.push({})

  const hashtags = arr(raw.hashtags).map((h) => h.replace(/^#/, '').replace(/\s+/g, ''))
  if (!hashtags.some((h) => h.toLowerCase() === 'bossconsultancy')) hashtags.unshift('BOSSConsultancy')
  const caption = str(raw.caption) || base.caption
  const total = slides.length
  const pub = (b.sourceDate || '').trim()
  const noPub = (x: string) => (pub && x.toLowerCase().includes(pub.toLowerCase()) ? x.split(pub).join('').replace(/\s{2,}/g, ' ').trim() : x)

  return slides.map((s, i): PostContent => {
    const headline = (str(s.headline) || (b.hook ?? base.headline)).replace(/\\n/g, '\n')
    const prompt = noPub(str(s.imagePrompt))
    return {
      category,
      kicker: str(s.kicker) || (b.mode === 'news' && i === 0 ? 'NEWS UPDATE' : ''),
      headline,
      accentWords: [],
      support: noPub(str(s.support)),
      points: arr(s.points).map(noPub).slice(0, 8),
      cta: str(s.cta) || 'CALL US TODAY',
      scene: base.scene,
      caption,
      hashtags: hashtags.slice(0, 8),
      news: b.mode === 'news' ? true : undefined,
      sourceLine: b.mode === 'news' && i === total - 1 && b.sourceTitle ? `Source: ${b.sourceTitle}` : undefined,
      art: { look: '', visual: '', layout: '', prompt: prompt || undefined },
      slide: total > 1 ? { index: i + 1, total } : undefined,
      language: b.language === 'Tamil' ? 'Tamil' : undefined,
    }
  })
}
