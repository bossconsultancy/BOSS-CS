import OpenAI from "openai";
import { NextResponse } from "next/server";
import { PHOTO_SIZE } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

type Quality = "low" | "medium" | "high";

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = String(body?.prompt || "").slice(0, 4000);
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }
  if (prompt.trim().length < 20) {
    return NextResponse.json({ error: "The photo description is too short." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    if (process.env.MOCK_OPENAI === "1") {
      // Mock mode: a flat grey square so the layout can be tested without spending credit.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1440"><rect width="1440" height="1440" fill="#9AA7B2"/><circle cx="720" cy="560" r="180" fill="#C9D2DA"/><text x="720" y="980" font-size="64" text-anchor="middle" fill="#fff" font-family="sans-serif">Mock photo</text></svg>`;
      return NextResponse.json({ image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` });
    }
    return NextResponse.json({ error: "The OpenAI key is not set up yet. Ask your admin to add OPENAI_API_KEY in the hosting settings." }, { status: 500 });
  }

  try {
    const client = new OpenAI();
    const quality = (process.env.OPENAI_IMAGE_QUALITY || "high") as Quality;
    const result = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst",
      prompt,
      size: PHOTO_SIZE,
      quality,
      output_format: "jpeg",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "OpenAI did not return an image. Please try again." }, { status: 502 });
    return NextResponse.json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `OpenAI error: ${message}` }, { status: 502 });
  }
}
