import OpenAI from "openai";
import { NextResponse } from "next/server";
import { FLYER_SCHEMA, SYSTEM_PROMPT } from "@/lib/schema";
import { cleanContent } from "@/lib/text";
import { DEFAULT_TITLES, type FlyerContent } from "@/lib/types";
import { TEMPLATES } from "@/lib/samples";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = String(body?.text || "").slice(0, 20000);
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }
  if (text.trim().length < 20) {
    return NextResponse.json({ error: "Please paste more course information (at least a few lines)." }, { status: 400 });
  }

  // Local testing without a key: MOCK_OPENAI=1 returns the PSW sample.
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.MOCK_OPENAI === "1") {
      const c = TEMPLATES[3].content;
      return NextResponse.json({ content: c, missing: ["(mock mode: sample data, no OpenAI call)"] });
    }
    return NextResponse.json({ error: "The OpenAI key is not set up yet. Ask your admin to add OPENAI_API_KEY in the hosting settings." }, { status: 500 });
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Course information:\n\n${text}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "flyer", strict: true, schema: FLYER_SCHEMA as unknown as Record<string, unknown> } },
    });
    const msg = completion.choices[0]?.message;
    if (!msg?.content) {
      return NextResponse.json({ error: msg?.refusal || "OpenAI returned an empty answer. Please try again." }, { status: 502 });
    }
    const raw = JSON.parse(msg.content) as FlyerContent & { missing: string[] };
    const { missing, ...rest } = raw;
    const content = cleanContent({ ...rest, titleLine: rest.titleLine.replace(/\\n/g, "\n"), titles: { ...DEFAULT_TITLES } });
    return NextResponse.json({ content, missing: missing || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `OpenAI error: ${message}` }, { status: 502 });
  }
}
