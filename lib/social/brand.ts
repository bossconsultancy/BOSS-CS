// BOSS Consultancy Services — locked brand tokens.
// Source of truth: the BOSS social media design system (nine service brochures).
// ONE SERVICE CATEGORY = ONE EXACT PRIMARY HEX + WHITE. Do not edit casually.

export type CategoryId =
  | 'immigration'
  | 'education'
  | 'employment'
  | 'legal'
  | 'accounting'
  | 'investment'
  | 'business'
  | 'technology'
  | 'travel'

export interface Category {
  id: CategoryId
  name: string
  short: string
  primary: string // fills, blocks, circles, rings
  textOnWhite: string // accent text placed on white
  onPrimary: string // text colour placed on a primary fill
  colourName: string
  sampleHeadline: string
  sampleSupport: string
}

export const INK = '#111827'
export const CHARCOAL = '#24272E'
export const MUTED = '#667085'
export const WHITE = '#FFFFFF'
export const SOFT_BG = '#F7F8FA'

export const BRAND = {
  name: 'BOSS Consultancy Services',
  website: 'BOSSCS.COM',
  phone: '416 605 0101',
  address: '151 Nashdene Rd, #51, Scarborough, ON M1V 4C3',
}

export const CATEGORIES: Record<CategoryId, Category> = {
  immigration: {
    id: 'immigration',
    name: 'Immigration & Citizenship Services',
    short: 'Immigration',
    primary: '#AB1E11',
    textOnWhite: '#AB1E11',
    onPrimary: WHITE,
    colourName: 'Deep Red',
    sampleHeadline: 'EXPLORE YOUR\nNEXT STEP',
    sampleSupport: 'Guidance for immigration and citizenship pathways.',
  },
  education: {
    id: 'education',
    name: 'Education & Recruitment Services',
    short: 'Education',
    primary: '#234C8B',
    textOnWhite: '#234C8B',
    onPrimary: WHITE,
    colourName: 'Royal Blue',
    sampleHeadline: 'YOUR NEXT CHAPTER\nSTARTS HERE',
    sampleSupport: 'College admissions, program selection and application guidance.',
  },
  employment: {
    id: 'employment',
    name: 'Employment & Recruitment Services',
    short: 'Employment',
    primary: '#EE7124',
    textOnWhite: '#BD5A1D',
    onPrimary: INK, // contrast exception
    colourName: 'Orange',
    sampleHeadline: 'LET YOUR NEXT\nOPPORTUNITY FIND YOU',
    sampleSupport: 'Resume and interview-readiness support.',
  },
  legal: {
    id: 'legal',
    name: 'Legal & Document Services',
    short: 'Legal & Documents',
    primary: '#442D7D',
    textOnWhite: '#442D7D',
    onPrimary: WHITE,
    colourName: 'Deep Purple',
    sampleHeadline: 'DOCUMENTS DONE\nWITH CLARITY',
    sampleSupport: 'Affidavits, declarations and document support.',
  },
  accounting: {
    id: 'accounting',
    name: 'Accounting & Tax Services',
    short: 'Accounting & Tax',
    primary: '#02763A',
    textOnWhite: '#02763A',
    onPrimary: WHITE,
    colourName: 'Green',
    sampleHeadline: 'STAY READY FOR\nTAX SEASON',
    sampleSupport: 'Bookkeeping, tax filing and payroll support.',
  },
  investment: {
    id: 'investment',
    name: 'Investment & Financial Solutions',
    short: 'Investment',
    primary: '#D65598',
    textOnWhite: '#C04C88',
    onPrimary: INK, // contrast exception
    colourName: 'Rose Pink',
    sampleHeadline: 'PLAN FOR\nWHAT MATTERS',
    sampleSupport: 'Explore long-term savings and financial planning options.',
  },
  business: {
    id: 'business',
    name: 'Business Operations Support Solutions',
    short: 'Business Operations',
    primary: '#F1BE2A',
    textOnWhite: '#917219',
    onPrimary: INK, // yellow always takes dark lettering
    colourName: 'Golden Yellow',
    sampleHeadline: 'BUILD IT. GROW IT.\nMOVE FORWARD.',
    sampleSupport: 'Startup and business operations support.',
  },
  technology: {
    id: 'technology',
    name: 'Technology & Digital Solutions',
    short: 'Technology',
    primary: '#7A4A2E',
    textOnWhite: '#7A4A2E',
    onPrimary: WHITE,
    colourName: 'Warm Brown',
    sampleHeadline: 'SMARTER SYSTEMS.\nBETTER WORKFLOWS.',
    sampleSupport: 'POS, business software, automation and digital solutions.',
  },
  travel: {
    id: 'travel',
    name: 'Travel & Tourism Services',
    short: 'Travel & Tourism',
    primary: '#2E4454',
    textOnWhite: '#2E4454',
    onPrimary: WHITE,
    colourName: 'Dark Slate Blue',
    sampleHeadline: 'PLAN MORE.\nWORRY LESS.',
    sampleSupport: 'Flights, accommodation and journey coordination.',
  },
}

export const CATEGORY_LIST: Category[] = Object.values(CATEGORIES)

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && v in CATEGORIES
}

/** Hex + alpha (0–1) → rgba() for tints (8–18% per the design system). */
export function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type FormatId = 'square' | 'portrait' | 'story'

export const FORMATS: Record<FormatId, { id: FormatId; label: string; w: number; h: number; aspect: string; use: string }> = {
  square: { id: 'square', label: '1080 × 1080', w: 1080, h: 1080, aspect: '1:1', use: 'Square post' },
  portrait: { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350, aspect: '4:5', use: 'Tall post' },
  story: { id: 'story', label: '1080 × 1920', w: 1080, h: 1920, aspect: '9:16', use: 'Story / Reel' },
}

export type StyleId = 'vibrant' | 'night' | 'bright'

export const STYLES: Record<StyleId, { id: StyleId; name: string; hint: string }> = {
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant Ad',
    hint: 'Rich colour gradient, smiling person holding a prop, 3D objects, landmarks, service list, Book Now pill',
  },
  night: {
    id: 'night',
    name: 'Bold Night',
    hint: 'Deep dark background, glowing colour swooshes, huge two-tone headline, 3D icons, phone mockups',
  },
  bright: {
    id: 'bright',
    name: 'Bright & Airy',
    hint: 'Light airy scene, professional at a laptop, floating icon chips, flowing ribbon, CTA bar',
  },
}

export function normaliseStyle(v: unknown): StyleId {
  return typeof v === 'string' && v in STYLES ? (v as StyleId) : 'vibrant'
}

export const STYLE_LIST = Object.values(STYLES)

export type PostType = 'service' | 'informational' | 'announcement' | 'steps' | 'greeting'

export const POST_TYPES: { id: PostType; label: string }[] = [
  { id: 'service', label: 'Service promo' },
  { id: 'informational', label: 'Tip / info' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'steps', label: 'How-to steps' },
  { id: 'greeting', label: 'Holiday greeting' },
]

export function fileName(cat: CategoryId, headline: string, fmt: FormatId, n = 1): string {
  const slug =
    headline
      .replace(/\n/g, ' ')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join('-') || 'post'
  const f = FORMATS[fmt]
  return `BOSS_${cat}_${slug}_${String(n).padStart(2, '0')}_${f.w}x${f.h}.jpg`
}
