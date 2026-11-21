import { BRAND, CATEGORIES, CategoryId, FORMATS, FormatId, StyleId } from './brand'
import { PostContent } from './post'

export interface DesignRequest {
  post: PostContent
  style: StyleId
  format: FormatId
  showPoints: boolean
  showExtension: boolean
  referenceCount: number
  variation: number // 0-based, nudges compositions apart
  extra?: string // free-form art direction from the user
  /** When the provider can't output the target ratio natively, keep content in a safe zone. */
  safeZone?: string
  /** Carousel slide 2+: slide 1 is attached so every slide matches. */
  deckRef?: boolean
  /** Number of design-quality reference images attached (BOSS sample posts). */
  designRefs?: number
}

/** Department-specific props and scenery the model can build the picture from. */
const PROPS: Record<CategoryId, string> = {
  immigration:
    'Canadian passport and PR card, official documents with a pen, a family holding a small Canadian flag, a 3D maple leaf, the Toronto skyline with the CN Tower, a jet plane in the sky',
  education:
    'graduation cap, stack of books, college acceptance letter, backpack, laptop, a bright university campus, a 3D graduation cap floating',
  employment:
    'resume on a clipboard, a handshake, business attire, laptop with a job application, a modern Toronto office, 3D briefcase and checkmark icons',
  legal:
    'official documents with a gold seal, a notary stamp, a fountain pen signing a page, a scale of justice, neat folders, 3D stamp and document icons',
  accounting:
    'calculator, tax forms and receipts, a laptop showing rising charts, coins and banknotes in Canadian dollars, a 3D calculator and pie-chart icons',
  investment:
    'a growing plant from a stack of coins, a piggy bank, a tablet showing an upward chart, a happy couple planning, 3D coins, a rising arrow and shield icons',
  business:
    'a shop owner opening their store, a whiteboard with a growth plan, a rocket, a laptop with analytics, 3D lightbulb, rocket and target icons',
  technology:
    'a smartphone and laptop mockup with a clean app screen, a point-of-sale terminal, cloud and lock icons, glowing circuit lines, 3D gear and shield icons',
  travel:
    'a jet plane flying through clouds, boarding passes and a passport, a suitcase, an airplane window view, world landmarks with the CN Tower, a beach umbrella, 3D plane and location-pin icons',
}

const STYLE_DIRECTION: Record<StyleId, (hex: string, name: string, cat: CategoryId) => string> = {
  vibrant: (hex, name, cat) => `
ART DIRECTION — "Vibrant Ad": a high-energy, agency-quality advertising poster like the best Instagram campaigns for travel agencies and service brands.
- Background: a rich, glowing gradient of ${name} (${hex}) blending into white and lighter tints of ${name}, with depth: soft sky and fluffy clouds or a softly blurred relevant environment, light rays, bokeh and a subtle sheen.
- Hero: ONE real, warm, smiling person (photorealistic studio-quality photo, natural skin, professional clothing in ${name} tones), cut out cleanly and overlapping other layers, holding a relevant prop toward the viewer.
- Supporting visuals, layered for depth (pick 2–3 that fit): ${PROPS[cat]}. Mix photographic elements with glossy 3D-rendered objects; let some elements break out of the frame edges.
- Dynamic flowing ${name} swoosh/brush ribbons sweeping behind the subject.
- Typography: big, heavy, rounded geometric sans-serif (like Montserrat ExtraBold / Gilroy Black); the headline in two tones — dark ${name} or white plus the emphasised words in a contrasting tint — with an optional small script word for flair.
- A neat "We offer" style list with small icons for the bullet points.
- THE PHONE NUMBER IS THE STAR: a big, bold, eye-catching call button (see TEXT) with a phone icon, centred horizontally in the lower-middle of the design — the most noticeable element after the headline. Website and address only as a small footer line at the very bottom.
- Overall: bright, optimistic, premium, busy-but-organised, extremely polished — absolutely not flat or minimal.`,
  night: (hex, name, cat) => `
ART DIRECTION — "Bold Night": a striking, premium tech-startup style campaign poster.
- Background: very deep, almost black shade of ${name} with subtle texture and vignette; large glowing ${name} neon swoosh arcs and rings sweeping across, with soft light bloom.
- Hero: ONE confident, smiling person (photorealistic, crisp studio lighting with a ${name} rim light), cut out cleanly, or a glossy 3D phone/laptop mockup showing a clean simple screen when the topic is digital.
- Supporting visuals (pick 1–2): ${PROPS[cat]}; plus floating glossy 3D hexagon or icon shapes in ${name}.
- Typography: huge, heavy, slightly italic or rounded bold sans-serif; headline in white with the emphasised words glowing in bright ${name}. Small info cards with rounded corners and thin ${name} outlines for the bullet points.
- THE PHONE NUMBER IS THE STAR: a big, bold, eye-catching call button (see TEXT) with a phone icon, centred horizontally in the lower-middle of the design — the most noticeable element after the headline. Website and address only as a small footer line at the very bottom.
- Overall: high contrast, dramatic, modern, energetic.`,
  bright: (hex, name, cat) => `
ART DIRECTION — "Bright & Airy": a clean, premium, light corporate-webinar style post.
- Background: airy white to very soft ${name}-tinted gradient, softly blurred bright modern office or home setting; large thin flowing ${name} ribbon arcs curving around the subject.
- Hero: ONE friendly, smiling professional (photorealistic, natural daylight), e.g. at a laptop or holding a relevant item, sitting in the lower half.
- Floating UI-style label chips with small icons (rounded rectangles in ${name}, white and dark ${name}) — use them for the bullet points. Optional small circular icon badges.
- Supporting props (1–2): ${PROPS[cat]}.
- Typography: modern bold geometric sans-serif; headline in near-black with the emphasised words in ${name}; supporting line in small uppercase.
- THE PHONE NUMBER IS THE STAR: a big, bold, eye-catching call button (see TEXT) with a phone icon, centred horizontally in the lower-middle of the design — the most noticeable element after the headline. Website and address only as a small footer line at the very bottom.
- Overall: fresh, trustworthy, spacious yet rich in detail.`,
}

/** Small footer on every post: website and address (the phone gets its own big call button). */
const FOOTER = `${BRAND.website}  ·  ${BRAND.address.replace(/,\s*ON\s+[A-Z0-9 ]+$/i, ', ON')}`

function quote(s: string) {
  return `"${s.replace(/"/g, '”').trim()}"`
}

/**
 * News posts: no fixed template. The AI art director (src/lib/artDirector.ts) wrote a concept,
 * hero visual and layout for this specific story; this turns it into the image prompt.
 */
function buildNewsPrompt(r: DesignRequest): string {
  const cat = CATEGORIES[r.post.category]
  const f = FORMATS[r.format]
  const p = r.post
  const name = cat.colourName
  const hex = cat.primary
  const lines = p.headline.split('\n').map((l) => l.trim()).filter(Boolean)
  const art = p.art ?? {
    look: `clean premium agency look: soft light ${name} gradient, bold two-tone headline, rounded info badges, generous white space`,
    visual: p.scene?.trim() || PROPS[r.post.category].split(', ').slice(0, 2).join(' and '),
    layout: 'hero image on one side, headline and badges stacked on the other',
  }
  const sl = p.slide
  const onColour = cat.onPrimary === '#111827' ? 'near-black' : 'white'

  const text = [
    p.kicker ? `- Small label pill: ${quote(p.kicker)}` : '',
    lines.length ? `- Headline (keep these line breaks): ${lines.map(quote).join(' / ')}` : '',
    p.accentWords.length ? `  Colour the word(s) ${p.accentWords.map(quote).join(', ')} in ${name}.` : '',
    p.support ? `- Short supporting line: ${quote(p.support)}` : '',
    p.keyStat ? `- Big number badge: ${quote(p.keyStat)}${p.keyStatLabel ? ` with the small caption ${quote(p.keyStatLabel)}` : ''}` : '',
    p.points.length
      ? `- INFO ROWS — a neat, evenly spaced list, one row each, with a small matching icon; where a row has "Label: detail", set the label in bold (brand colour) and the detail in regular weight, labels and details aligned in columns:\n${p.points.map((x) => `    • ${quote(x)}`).join('\n')}`
      : '',
    p.takeaway ? `- "What to do" line, highlighted in a small rounded strip: ${quote(p.takeaway)}` : '',
    sl && sl.index === 1 ? `- Small swipe hint at the right edge: "Swipe →"` : '',
    sl ? `- Tiny page indicator: "${sl.index}/${sl.total}"` : '',
    p.sourceLine ? `- Very small source line: ${quote(p.sourceLine)}` : '',
    `- BIG CALL BUTTON (centred horizontally, large, solid ${name} pill with a phone icon — the most eye-catching element after the headline): small line ${quote(p.cta || 'Questions? Call us')} above the big number ${quote(BRAND.phone)}`,
    `- Small footer line at the very bottom: ${quote(FOOTER)}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Create ONE finished, ready-to-post ${sl ? `slide ${sl.index} of ${sl.total} of an Instagram carousel` : 'Instagram post'} for ${BRAND.name}, a consultancy in Toronto, Canada, sharing a real news story. It must look like the work of a top social media agency: premium, polished, modern and eye-catching. It is INFORMATIVE: people read the picture, not the caption, so every fact below must be clearly visible and easy to read — organised like a smart news explainer (headline → short summary → aligned info rows → what to do), never cluttered. Typography does the organising: clear sizes, bold labels, generous line spacing, everything on a grid.

FORMAT: ${f.aspect} ${f.w === f.h ? 'square' : 'vertical'} (${f.w}×${f.h}).${r.safeZone ? `\n${r.safeZone}` : ''}

BRAND: ${cat.name}. Brand colour ${name} ${hex}, with its tints and shades, white and near-black. No other strong accent hue. ${onColour === 'white' ? `White text works on solid ${name}.` : `On solid ${name}, text must be near-black.`}

ART DIRECTION — designed specifically for this story (follow it):
- Concept & look: ${art.look}
- Hero visual: ${art.visual}. Photorealistic, natural light, high detail; diverse, natural-looking people when people appear (Tamil/South Asian and Canadian context where it fits). No third-party logos or brand names.
- Layout: ${art.layout}
${r.deckRef ? `- CAROUSEL CONSISTENCY: the second attached image is slide 1 of this same carousel. Match its look exactly — same background treatment, colour use, typography, badge style and motifs — so all slides feel like one set, while this slide has its own content and composition.\n` : ''}- Clear hierarchy, aligned to a grid, generous margins. The hero image fills roughly half the canvas; the information sits in a clean, readable panel/card on the other part. All info rows are fully legible at phone size.

TEXT — render EXACTLY these words, spelled exactly, and NO other words, numbers or fake text anywhere:
${text}
- Every word crisp, correctly spelled and legible at phone size. Keep text away from the edges.

LOGO AREA: The official company logo is on the first attached canvas in the top-left — keep it exactly once, unchanged, with clear space around it; keep all text, pills, badges, faces and key objects away from it and start the headline below it. Never draw any other logo or company name.

Never include: dates, prices or numbers not in the TEXT list; social handles, watermarks, placeholder text, or any text not listed above.`
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Posts briefed by the AI art director: its full free-form prompt + the non-negotiable brand rules. */
function buildBriefedPrompt(r: DesignRequest): string {
  const cat = CATEGORIES[r.post.category]
  const f = FORMATS[r.format]
  const sl = r.post.slide
  const order: string[] = []
  if (r.deckRef) order.push('slide 1 of this same carousel — match its look exactly (background, colours, typography, card and icon style) so the set feels like one series, while this slide has its own content and composition')
  if (r.designRefs) order.push(`${r.designRefs === 1 ? 'a sample design' : `${r.designRefs} sample designs`} — DESIGN REFERENCE ONLY: match their level of quality, polish, richness, typography mix and neat information layout. Do NOT copy anything else from them: no text, facts, numbers, topics, people, phone numbers, logos or exact layout`)
  const refs = order.length
    ? `\nATTACHED IMAGES (after the layout guide): ${order.map((x, i) => `${i === 0 ? 'first' : 'then'} ${x}`).join('; ')}.`
    : ''
  const variation = r.variation > 0 ? '\nThis is an ALTERNATIVE version: keep the same text but use a clearly different composition, hero image and colour balance.' : ''
  return `${r.post.art!.prompt}

FORMAT: ${f.aspect} ${f.w === f.h ? 'square' : 'vertical'} Instagram ${sl ? `carousel slide ${sl.index} of ${sl.total}` : 'post'} (${f.w}×${f.h}).${r.safeZone ? `\n${r.safeZone}` : ''}${refs}${variation}

NON-NEGOTIABLE BRAND RULES:
- Brand colour ${cat.colourName} ${cat.primary} with its tints/shades, white and near-black; no other strong accent hue.
- The phone number is exactly "${BRAND.phone}" (no extension) — big and bold in the footer with a phone icon. Website "${BRAND.website}" and address "${BRAND.address}" small.
- Render ONLY the quoted text above, every word spelled exactly and crisp at phone size; no other words, numbers, dates, prices or placeholder text.
- LOGO: the official company logo already on the first attached canvas stays in the top-left EXACTLY ONCE, unchanged, with clear space around it — no text, pills, faces or objects touching or overlapping it; the headline starts below it. Never draw any other logo, emblem or company wordmark.
- No other companies' logos or brand names; no watermarks or social handles.`
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildDesignPrompt(r: DesignRequest): string {
  if (r.post.art?.prompt) return buildBriefedPrompt(r)
  if (r.post.news) return buildNewsPrompt(r)
  const cat = CATEGORIES[r.post.category]
  const f = FORMATS[r.format]
  const p = r.post
  const headlineLines = p.headline.split('\n').map((l) => l.trim()).filter(Boolean)
  const phone = BRAND.phone
  const darkTextNote =
    cat.onPrimary === '#111827'
      ? `- ${cat.colourName} is a bright colour: text placed ON solid ${cat.colourName} must be near-black or a very dark ${cat.colourName}, never white.`
      : `- White text works on solid ${cat.colourName} areas.`

  const textBlock = [
    `- Small label: ${quote(p.kicker)}`,
    `- Headline (keep these line breaks): ${headlineLines.map(quote).join(' / ')}`,
    p.accentWords.length ? `  Emphasise the word(s) ${p.accentWords.map(quote).join(', ')}.` : '',
    `- Supporting line: ${quote(p.support)}`,
    (r.showPoints || p.news) && p.points.length ? `- ${p.news ? 'Key facts (bullets)' : 'List items'}:\n${p.points.map((x) => `    • ${quote(x)}`).join('\n')}` : '',
    p.news && p.sourceLine ? `- Small source line: ${quote(p.sourceLine)}` : '',
    `- BIG CALL BUTTON (centred, large, solid ${cat.colourName} pill with a phone icon — the number is the biggest text after the headline): small line ${quote(p.cta || 'Call us today')} above the big number ${quote(phone)} (no extension)`,
    `- Small footer line at the very bottom: ${quote(FOOTER)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const variationNote = [
    'Composition: person on the right side, text stacked on the left.',
    'Composition: person on the left, text on the right; use a different prop and background scene.',
    'Composition: headline across the top, person large in the lower half with props around them.',
    'Composition: centred hero with the headline layered behind and around them.',
  ][r.variation % 4]

  return `Create ONE finished, ready-to-post social media ${p.news ? 'news-update post' : 'advertisement'} for ${BRAND.name}, a consultancy in Scarborough, Toronto, Canada. Make it look like it was designed by a top advertising agency: photorealistic people, rich 3D elements, depth, lighting and polish.

FORMAT: ${f.aspect} ${f.w === f.h ? 'square' : 'vertical'} Instagram/Facebook post (${f.w}×${f.h}).${r.safeZone ? `\n${r.safeZone}` : ''}

SERVICE: ${cat.name}. Brand colour: ${cat.colourName} ${cat.primary}. Build the palette from this colour, its lighter and darker shades, white and near-black. Do not introduce any other strong accent hue.
${STYLE_DIRECTION[r.style](cat.primary, cat.colourName, r.post.category)}

SCENE IDEA: ${p.scene}. Diverse, natural-looking Canadian people. No visible third-party logos or brand names.

TEXT — render EXACTLY these words, spelled exactly, and NO other words, numbers or fake text anywhere:
${textBlock}
- Text must be crisp, perfectly legible and correctly spelled, with a clear hierarchy (headline first). Keep text away from the edges.
${darkTextNote}

LOGO AREA: The official company logo is on the first attached canvas in the top-left — keep it exactly once, unchanged, with clear space around it; keep all text, pills, badges, faces and key objects away from it and start the headline below it. Never draw any other logo or company name.
${
  r.referenceCount > 0
    ? `STYLE REFERENCES: The attached image(s) show the look we want. Match their richness, layering, 3D elements, photo quality and typographic energy — but never copy their logos, brand names, text, phone numbers or exact people.`
    : ''
}
${variationNote}
${r.extra?.trim() ? `\nEXTRA DIRECTION FROM THE CLIENT: ${r.extra.trim()}` : ''}

Never include: prices, discounts, dates, ratings, statistics or certifications unless they appear word-for-word in the TEXT list; no social-media handles, watermarks, placeholder text, or any text not listed above.`
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildRefinePrompt(instruction: string, post: PostContent): string {
  const cat = CATEGORIES[post.category]
  return `Edit the attached social media design. Keep the same overall design, layout, people, brand colour (${cat.colourName} ${cat.primary}) and all existing text exactly as it is, unless the instruction below says otherwise.

INSTRUCTION: ${instruction.trim()}

Keep every word correctly spelled and legible. Keep the company logo in the top-left exactly as it is, with clear space around it, and never add another logo. Do not add any new text, prices or dates that are not requested.`
}

/** Short look descriptions for diffusion models (FLUX), which follow concise, positive prompts best. */
const FLUX_LOOK: Record<StyleId, (name: string, hex: string) => string> = {
  vibrant: (name, hex) =>
    `vibrant agency-style advertising poster, glowing ${name} (${hex}) to white gradient background with soft clouds and light rays, flowing ${name} swoosh ribbons, glossy 3D objects, bold rounded sans-serif typography`,
  night: (name, hex) =>
    `premium dark poster, deep almost-black ${name} (${hex}) background, glowing ${name} neon arcs and rim light, glossy 3D icons, huge bold white sans-serif headline`,
  bright: (name, hex) =>
    `bright airy corporate poster, white to soft ${name} (${hex}) tinted background, thin flowing ${name} ribbon arcs, floating rounded label chips with icons, clean bold sans-serif typography`,
}

/** Concise FLUX prompt: same text and brand rules, phrased positively. */
export function buildFluxPrompt(r: DesignRequest): string {
  if (r.post.art?.prompt) {
    return `${r.post.art.prompt.slice(0, 1800)} Phone exactly "${BRAND.phone}". Keep the supplied company logo top-left with clear space around it; no other logo.`
  }
  const cat = CATEGORIES[r.post.category]
  const p = r.post
  const lines = p.headline.split('\n').map((l) => l.trim()).filter(Boolean)
  const phone = BRAND.phone
  const props = PROPS[r.post.category].split(', ').slice(0, 3).join(', ')
  const layout = [
    'person on the right, text on the left',
    'person on the left, text on the right',
    'headline across the top, person in the lower half',
    'centred person with the headline above',
  ][r.variation % 4]
  const textOnColour = cat.onPrimary === '#111827' ? 'dark text on bright colour areas' : 'white text on colour areas'
  if (p.news) {
    const art = p.art
    return [
      `Premium agency-quality informative Instagram ${p.slide ? `carousel slide ${p.slide.index}/${p.slide.total}` : 'post'} for a Toronto consultancy, news-explainer layout with neatly organised facts, ${cat.colourName} (${cat.primary}) brand colour with white.`,
      art?.look ? `Look: ${art.look}.` : `Clean light ${cat.colourName} gradient, bold two-tone headline, rounded badges.`,
      `Hero: ${art?.visual || p.scene || PROPS[r.post.category].split(', ')[0]}, photorealistic.`,
      art?.layout ? `Layout: ${art.layout}.` : '',
      `The company logo sits in the top-left with clear space around it: no text, faces or objects touching it; text starts below it.`,
      `Text, perfectly spelled and legible:`,
      p.kicker ? `${cat.colourName} label pill "${p.kicker}";` : '',
      lines.length ? `large bold headline "${lines.join(' ')}";` : '',
      p.support ? `short line "${p.support}";` : '',
      p.keyStat ? `big ${cat.colourName} number badge "${p.keyStat}"${p.keyStatLabel ? ` with caption "${p.keyStatLabel}"` : ''};` : '',
      p.points.length ? `neat aligned info rows with icons and bold labels: ${p.points.map((x) => `"${x}"`).join(', ')};` : '',
      p.takeaway ? `highlighted strip "${p.takeaway}";` : '',
      p.slide?.index === 1 ? `small "Swipe →" hint;` : '',
      p.sourceLine ? `tiny source line "${p.sourceLine}";` : '',
      `big centred ${cat.colourName} call button with phone icon: "${p.cta || 'Questions? Call us'}" above a large "${phone}";`,
      `small footer at the very bottom: "${FOOTER}".`,
    ]
      .filter(Boolean)
      .join(' ')
  }
  return [
    p.news
      ? `Professional Instagram news-update card for a Toronto consultancy (informative, editorial, not an advertisement), ${cat.colourName} (${cat.primary}) label pill and accents on a clean white or soft ${cat.colourName} gradient, one relevant documentary-style photo in a framed panel, bold sans-serif headline.`
      : `Professional Instagram social media advertisement for a Toronto consultancy, ${FLUX_LOOK[r.style](cat.colourName, cat.primary)}.`,
    `Scene: ${p.scene}; one photorealistic smiling person, natural light, studio quality, with ${props}.`,
    `Layout: ${layout}. The company logo sits in the top-left with clear space around it: no text, faces or objects touching it; text starts below it.`,
    `Text, perfectly spelled and legible:`,
    `small label "${p.kicker}";`,
    `large headline "${lines.join(' ')}"${p.accentWords.length ? ` with "${p.accentWords.join(' ')}" highlighted in ${cat.colourName}` : ''};`,
    `subtitle "${p.support}";`,
    (r.showPoints || p.news) && p.points.length ? `${p.news ? 'key facts as bullet rows with small icons' : 'three short list items with small icons'}: ${p.points.map((x) => `"${x}"`).join(', ')};` : '',
    p.news && p.sourceLine ? `small source line "${p.sourceLine}";` : '',
    `big centred ${cat.colourName} call button with phone icon: "${p.cta || 'Call us today'}" above a large "${phone}";`,
    `small footer at the very bottom: "${FOOTER}".`,
    `Colour palette: ${cat.colourName} ${cat.primary}, white, near-black; ${textOnColour}. Clean, premium, high detail, sharp focus.`,
    r.extra?.trim() ? `Also: ${r.extra.trim()}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
