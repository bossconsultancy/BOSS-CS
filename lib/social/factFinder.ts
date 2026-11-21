import 'server-only'
import OpenAI from 'openai'

// Researches a news story on the web so the post carries real, specific facts
// (who, what, how much, how long, conditions, steps, dates) even when the original article can't be read.
// OpenAI Responses API + web search ≈ 2–3 cents per story. Falls back to the notes we already have.

const MODELS = (process.env.OPENAI_RESEARCH_MODEL || 'gpt-4.1-mini,gpt-4o-mini').split(',').map((m) => m.trim()).filter(Boolean)

const INSTRUCTIONS = `You are a fact researcher for a Toronto consultancy's social media team (audience: newcomers, Tamil/South Asian families, students, small businesses in the GTA).
Search the web and gather everything useful and interesting about the news story given, so a designer can build an informative post from it. Prefer official sources (government, IRCC, CRA, embassies, tourism boards) and major news outlets.
There is NO fixed form. Collect whatever matters for THIS story, in the shape that suits it — for example: the full list of countries or destinations, a fee or price breakdown, eligibility conditions, step-by-step process, what's included, comparisons (before vs after), key places, timings, numbers, quotes from officials, practical tips, who benefits and why it matters to GTA families — and especially anything specific to Sri Lankan, Indian, Tamil or other South Asian Canadians (e.g. rules for Indian or Sri Lankan passport holders, flights to Colombo/Chennai, community impact in Scarborough/Brampton).
Write 8–15 short, specific fact lines (plain text, one per line, starting with "- "), grouped under short headings only if it helps. Then one line "Sources: …" with 1–3 source names.
Only include facts you actually found — never write "unknown", "not specified" or empty placeholders; simply leave out what isn't available. Never guess. Max 300 words.`

export async function researchStory(topic: string, notes: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return ''
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const input = `News story: ${topic}\n\nWhat we already have (may be thin):\n${notes.slice(0, 3000)}`
  for (const model of MODELS) {
    for (const tool of ['web_search', 'web_search_preview']) {
      try {
        const res = (await client.responses.create({
          model,
          instructions: INSTRUCTIONS,
          input,
          tools: [{ type: tool }],
          max_output_tokens: 700,
        } as unknown as Parameters<typeof client.responses.create>[0])) as unknown as { output_text?: string }
        const text = (res.output_text || '').trim()
        if (text) return text
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // unsupported tool name → try the other; unknown model → next model; anything else → give up quietly
        if (/tool|web_search/i.test(msg)) continue
        if (/model/i.test(msg)) break
        console.error('researchStory failed:', msg)
        return ''
      }
    }
  }
  return ''
}
