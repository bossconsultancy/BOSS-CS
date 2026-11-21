import { CATEGORIES, CategoryId, PostType } from './brand'

/** The exact words that go on the post, plus the visual idea. */
export interface PostContent {
  category: CategoryId
  kicker: string // small label, 1–4 words
  headline: string // 2–3 short lines separated by \n
  accentWords: string[] // headline words to emphasise
  support: string // one sentence
  points: string[] // 0–3 short bullets
  cta: string // 2–6 words
  scene: string // what the imagery should show
  caption: string // social caption (not printed on the image)
  hashtags: string[]
  classificationReason?: string
  news?: boolean // informative news-update post (not an ad)
  sourceLine?: string // e.g. "Source: CIC News · Oct 25, 2026"
  keyStat?: string // news: the one big number/date, e.g. "$1,500" or "NOV 3"
  keyStatLabel?: string // news: what the number means, e.g. "new minimum funds"
  takeaway?: string // news: "What this means for you" sentence
  /** News: a design written by the AI art director for this specific story (no fixed template). */
  art?: { look: string; visual: string; layout: string; /** full free-form image prompt written by the AI art director */ prompt?: string }
  /** Carousel position (1-based) when this post is one slide of a set. */
  slide?: { index: number; total: number }
  /** Set when the words were translated (e.g. "Tamil"). */
  language?: string
}

const POINTS: Record<CategoryId, string[]> = {
  immigration: ['Application review and preparation', 'Document checklists', 'Clear next steps'],
  education: ['Program and college selection', 'Application support', 'Scholarship guidance'],
  employment: ['Resume and cover letter refresh', 'Mock interviews', 'Job search strategy'],
  legal: ['Affidavits and declarations', 'Certified true copies', 'Agreements and authorisations'],
  accounting: ['Personal and corporate tax', 'Bookkeeping and payroll', 'GST/HST returns'],
  investment: ['TFSA, RRSP and RESP options', 'Long-term savings planning', 'Insurance and protection'],
  business: ['Startup roadmap and setup', 'Brand positioning', 'Marketing and growth'],
  technology: ['POS and payment systems', 'Websites and e-commerce', 'Automation and cloud backup'],
  travel: ['Flights and accommodation', 'Trip itineraries', 'Group and family travel'],
}

const SCENES: Record<CategoryId, string> = {
  immigration: 'a smiling newcomer family holding documents, with a soft Toronto skyline and a Canadian flag in the background',
  education: 'a confident college student with a backpack and books, campus building behind',
  employment: 'a confident young professional in business attire holding a resume, modern office behind',
  legal: 'a professional signing a document at a desk with a pen and an official stamp',
  accounting: 'a friendly accountant with a calculator, receipts and a laptop showing charts',
  investment: 'a happy middle-aged couple planning their future with an advisor and a tablet',
  business: 'two entrepreneurs planning at a whiteboard in a bright startup studio',
  technology: 'a shop owner using a modern point-of-sale terminal and tablet at a counter',
  travel: 'a joyful traveller with a suitcase, an airplane taking off and world landmarks behind',
}

const CTAS: Record<CategoryId, string> = {
  immigration: 'Book a consultation',
  education: 'Book a consultation',
  employment: 'Get job-ready today',
  legal: 'Call us today',
  accounting: 'Book your appointment',
  investment: 'Start planning today',
  business: 'Let’s build it together',
  technology: 'Upgrade your systems',
  travel: 'Plan your trip',
}

const TAGS: Record<CategoryId, string[]> = {
  immigration: ['CanadaImmigration', 'Citizenship', 'NewcomersToCanada'],
  education: ['StudyInCanada', 'CollegeAdmissions', 'StudentLife'],
  employment: ['JobSearch', 'ResumeTips', 'CareerSupport'],
  legal: ['Notary', 'Affidavit', 'DocumentServices'],
  accounting: ['TaxSeason', 'Bookkeeping', 'SmallBusinessCanada'],
  investment: ['FinancialPlanning', 'TFSA', 'RRSP'],
  business: ['SmallBusiness', 'Startup', 'GrowthStrategy'],
  technology: ['POS', 'DigitalSolutions', 'BusinessAutomation'],
  travel: ['TravelPlanning', 'FamilyTravel', 'Vacation'],
}

/** Template copy used when no text AI is configured. */
export function demoPost(category: CategoryId, _topic: string, postType: PostType): PostContent {
  const c = CATEGORIES[category]
  const words = c.sampleHeadline.replace(/\n/g, ' ').split(/\s+/)
  return {
    category,
    kicker: c.short.toUpperCase(),
    headline: c.sampleHeadline,
    accentWords: words.slice(-2).map((w) => w.replace(/[^A-Z0-9’']/gi, '')),
    support: c.sampleSupport,
    points: postType === 'steps' ? ['Book a consultation', 'Bring your documents', 'We guide the next steps'] : POINTS[category],
    cta: CTAS[category],
    scene: SCENES[category],
    caption: `${c.sampleSupport} Our team at BOSS Consultancy Services is here to help. Call 416 605 0101 or visit BOSSCS.COM.`,
    hashtags: ['BOSSConsultancy', ...TAGS[category], 'Scarborough', 'Toronto'],
  }
}
