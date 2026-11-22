import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Ask for a change to one piece of the booklet in plain language. The answer is a new piece of text,
// a few style changes, or both. Tamil goes in and comes back in normal Unicode; the browser turns it
// into the Bamini characters the booklet is set in.
const SYSTEM = `You edit one element of a printed Tamil company profile booklet for BOSS Consolidated Services (BOSS CS).

You are given the element's current text, its tag and its inline CSS. Do exactly what the person asks and nothing more.

Rules for this booklet:
- Write Tamil in normal Unicode Tamil. Keep English words in English.
- "BOSS" and "BOSS CS" are always written in Latin letters, never in Tamil script.
- Never use long dashes (— or –). Use a comma, or the word "to" / "முதல்".
- Do not mention tax, taxation or tax savings.
- Keep the length close to the current text unless the person asks for shorter or longer: the page is fixed, text that grows a lot will not fit.
- Keep the English line that goes with a Tamil heading, if there is one, on its own line.

Answer with:
- "text": the full replacement text for this element, or null when the text should stay as it is. Use a line break for a new line.
- "style": CSS declarations to set on this element, as kebab-case property names ("font-size", "color", "background", "text-align", "font-weight", "line-height", "letter-spacing", "width", "left", "top", "opacity"). Use px for sizes and #rrggbb for colours. Empty when nothing about the look should change.
- "note": one short sentence for the person about what you changed, in their language.

The booklet's colours are navy #304656, dark navy #22343F, pale blue #C3D7DD, body text #3C4A54, muted #55646E.`;

// General flyers (notices, announcements) are English, in the BOSS flyer style.
const FLYER_SYSTEM = `You edit one element of a one-page printed flyer for BOSS Consultancy Services, a Toronto consultancy serving South Asian Canadian families.

You are given the element's current text, its tag and its inline CSS. Do exactly what the person asks and nothing more.

Rules:
- Clear, friendly Canadian English. Keep "BOSS" in capitals.
- Never use long dashes (— or –). Use a comma or the word "to".
- Keep the length close to the current text unless asked for shorter or longer: the page is fixed.

Answer with:
- "text": the full replacement text for this element, or null when the text should stay as it is. Use a line break for a new line.
- "style": CSS declarations to set on this element, as kebab-case property names ("font-size", "color", "background", "text-align", "font-weight", "line-height", "letter-spacing", "width", "height", "left", "top", "opacity", "border-radius"). Use px for sizes and #rrggbb for colours. Empty when nothing about the look should change.
- "note": one short sentence about what you changed.

BOSS colours: navy #1B3A5C, pale blue #DCE8F0, light #EEF4F8, body text #22343F, red for warnings #D7262E.`;

const SCHEMA = {
  type: "object",
  properties: {
    text: { type: ["string", "null"] },
    style: {
      type: "array",
      items: {
        type: "object",
        properties: { property: { type: "string" }, value: { type: "string" } },
        required: ["property", "value"],
        additionalProperties: false,
      },
    },
    note: { type: "string" },
  },
  required: ["text", "style", "note"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  let instruction = "";
  let text = "";
  let style = "";
  let tag = "";
  let context = "booklet";
  try {
    const body = await req.json();
    instruction = String(body?.instruction || "").slice(0, 2000);
    text = String(body?.text || "").slice(0, 4000);
    style = String(body?.style || "").slice(0, 2000);
    tag = String(body?.tag || "").slice(0, 20);
    context = body?.context === "flyer" ? "flyer" : "booklet";
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }
  if (instruction.trim().length < 2) {
    return NextResponse.json({ error: "Say what you would like changed." }, { status: 400 });
  }
  if (process.env.MOCK_OPENAI === "1") {
    return NextResponse.json({ text: `${text} (changed)`, style: [{ property: "color", value: "#D7262E" }], note: "Done (test mode)." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "The OpenAI key is not set up yet. Ask your admin to add OPENAI_API_KEY in the hosting settings." },
      { status: 500 },
    );
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6",
      messages: [
        { role: "system", content: context === "flyer" ? FLYER_SYSTEM : SYSTEM },
        {
          role: "user",
          content: `Element: <${tag || "div"}>\nInline CSS: ${style || "(none)"}\n\nCurrent text:\n${text || "(empty)"}\n\nWhat to change:\n${instruction}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: { name: "booklet_edit", strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
    });
    const msg = completion.choices[0]?.message;
    if (!msg?.content) {
      return NextResponse.json({ error: msg?.refusal || "OpenAI returned an empty answer. Please try again." }, { status: 502 });
    }
    const out = JSON.parse(msg.content) as { text: string | null; style: { property: string; value: string }[]; note: string };
    const clean = (s: string) => s.replace(/[—–]/g, ", ").replace(/\s+,/g, ",");
    return NextResponse.json({
      text: out.text === null ? null : clean(out.text),
      style: Array.isArray(out.style) ? out.style.slice(0, 20) : [],
      note: out.note || "Done.",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `OpenAI error: ${message}` }, { status: 502 });
  }
}
