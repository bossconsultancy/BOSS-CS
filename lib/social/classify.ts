import { CategoryId } from './brand'

// Keyword classifier implementing the BOSS topic-recognition table and
// disambiguation rules. Used offline (demo mode) and as a sanity check on
// the AI's choice. Weights: strong signals 3, normal 2, weak 1.

type Rule = [RegExp, number]

const RULES: Record<CategoryId, Rule[]> = {
  immigration: [
    [/\bircc\b/, 4],
    [/\b(pr|permanent resident(ce)?)\b/, 3],
    [/\bpr card\b/, 3],
    [/citizenship/, 4],
    [/\b(study|work) permit/, 4],
    [/super ?visa/, 4],
    [/(family|spousal|parent) sponsorship|sponsor (my|your|a) (spouse|parent|family)/, 4],
    [/refugee|asylum/, 4],
    [/immigra/, 3],
    [/express entry|pgwp|lmia|biometrics?/, 3],
    [/police clearance/, 2],
    [/visitor visa|trv|temporary resident visa/, 2],
    [/\bvisa\b/, 1],
  ],
  education: [
    [/college|university/, 3],
    [/admission/, 3],
    [/scholarship|bursar(y|ies)|tuition/, 3],
    [/student loan|grants? for students/, 3],
    [/\besl\b|ielts|celpip/, 3],
    [/program selection|academic|study in canada|course/, 2],
    [/\bco-?op\b/, 1],
    [/student/, 1],
  ],
  employment: [
    [/resume|résumé|\bcv\b/, 4],
    [/cover letter/, 4],
    [/interview/, 3],
    [/job (search|hunt|seekers?|application|agency|fair)|find (a|your next) job/, 4],
    [/career/, 2],
    [/linkedin profile/, 3],
    [/hiring|recruit(ment|er)|employer referral/, 2],
    [/\bjobs?\b|employment/, 2],
  ],
  legal: [
    [/notar(y|ize|ization)/, 4],
    [/commissioner of oaths|commission(ing)?/, 3],
    [/affidavit|statutory declaration/, 4],
    [/certified (true )?cop(y|ies)/, 4],
    [/power of attorney|\bwills?\b|\bpoa\b/, 4],
    [/contract|agreement|legal notice|authori[sz]ation letter/, 2],
    [/court|tribunal|landlord|tenant|\bltb\b/, 3],
    [/legal|document/, 1],
  ],
  accounting: [
    [/\bcra\b/, 4],
    [/tax (return|filing|season)|file (your )?tax|income tax/, 4],
    [/\b(gst|hst)\b/, 4],
    [/payroll|\bt4s?\b|\bt5\b|\bnoa\b/, 4],
    [/bookkeeping|reconciliation|accounting|accountant/, 4],
    [/uber|lyft|self-employed|sole proprietor/, 2],
    [/\btax(es)?\b/, 2],
    [/expense|receipts/, 1],
  ],
  investment: [
    [/\btfsa\b|\brrsp\b|\bfhsa\b|\brrif\b/, 5],
    [/\bresp\b/, 3],
    [/invest(ment|ing|or)?/, 3],
    [/retirement|portfolio|diversif/, 3],
    [/insurance|life cover|critical illness/, 3],
    [/stocks?|mutual fund|\betf\b|wealth|financial plan/, 3],
    [/savings?|grow your money|compound/, 1],
  ],
  business: [
    [/start(ing)? (a|your) business|startup|start-up|entrepreneur/, 4],
    [/business plan|growth strategy|brand(ing)? positioning|marketing (campaign|strategy|plan)/, 4],
    [/lead generation|competitor|market research|workforce planning/, 3],
    [/register (a|your) business|business (setup|registration)|incorporat/, 2],
    [/small business|\bsmb\b|operations/, 2],
    [/marketing|branding/, 2],
  ],
  technology: [
    [/\bpos\b|point of sale|payment terminal/, 5],
    [/\berp\b|\bcrm\b/, 4],
    [/website|e-?commerce|online store|mobile app|\bapp\b/, 3],
    [/automation|\bai\b|artificial intelligence|chatbot/, 2],
    [/cyber ?security|data protection|cloud backup|cloud/, 4],
    [/software|inventory system|digital presence|it support/, 3],
    [/digital|tech(nology)?/, 1],
  ],
  travel: [
    [/flights?|airfare|airline/, 4],
    [/hotels?|resort|accommodation/, 4],
    [/vacation|holiday|getaway|honeymoon/, 4],
    [/itinerary|tour(s|ism)?\b|cruise|sightseeing/, 3],
    [/destination wedding|group travel|family trip/, 4],
    [/travel|trip/, 2],
  ],
}

export interface Classification {
  category: CategoryId
  confidence: 'high' | 'medium' | 'low'
  scores: Record<CategoryId, number>
  reason: string
}

export function classifyTopic(text: string): Classification {
  const t = ` ${text.toLowerCase()} `
  const scores = Object.fromEntries(Object.keys(RULES).map((k) => [k, 0])) as Record<CategoryId, number>
  const hits: Record<string, string[]> = {}

  for (const [cat, rules] of Object.entries(RULES) as [CategoryId, Rule[]][]) {
    for (const [re, w] of rules) {
      const m = t.match(re)
      if (m) {
        scores[cat] += w
        ;(hits[cat] ||= []).push(m[0].trim())
      }
    }
  }

  // --- Disambiguation rules from the design system ---
  // 2. CRA / tax / HST → Accounting, not Business or Investment.
  if (/\bcra\b|\b(gst|hst)\b|tax return/.test(t)) {
    scores.business = Math.max(0, scores.business - 2)
    scores.investment = Math.max(0, scores.investment - 2)
  }
  // 3. Visitor visa for Canada → Immigration; flights/hotels/itinerary → Travel.
  const travelArrangements = /flights?|hotels?|vacation|itinerary|resort|tour/.test(t)
  const immigrationProcess = /ircc|\bpr\b|permit|citizenship|sponsor|super ?visa|canada/.test(t)
  if (/visa/.test(t) && travelArrangements && !immigrationProcess) scores.travel += 3
  if (/visa/.test(t) && immigrationProcess) scores.immigration += 2
  // 5. Business website / POS / automation → Technology; branding/marketing → Business.
  if (/website|\bpos\b|automation/.test(t) && !/branding|marketing strategy/.test(t)) scores.technology += 1
  // 6. Affidavit / notarization → Legal when the service is the document itself.
  if (/notar|affidavit|commissioner|certified/.test(t)) scores.legal += 2
  // 7. RESP: education-support framing → Education; savings framing → Investment.
  if (/\bresp\b/.test(t)) {
    if (/college|university|admission|program/.test(t)) scores.education += 3
    else scores.investment += 2
  }
  // "AI career skills" etc. — classify by the service, not incidental words.
  if (/resume|interview|job/.test(t)) scores.technology = Math.max(0, scores.technology - 2)

  const ranked = (Object.entries(scores) as [CategoryId, number][]).sort((a, b) => b[1] - a[1])
  const [best, second] = ranked
  const top = best[1]
  const gap = top - (second?.[1] ?? 0)

  if (top === 0) {
    return {
      category: 'business',
      confidence: 'low',
      scores,
      reason: 'No service keywords found — pick a category manually.',
    }
  }

  return {
    category: best[0],
    confidence: top >= 4 && gap >= 2 ? 'high' : gap >= 1 ? 'medium' : 'low',
    scores,
    reason: `Matched: ${Array.from(new Set(hits[best[0]] || [])).slice(0, 4).join(', ')}`,
  }
}
