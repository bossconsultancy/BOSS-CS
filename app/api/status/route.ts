import { NextResponse } from "next/server";
import { cloudEnabled } from "@/lib/cloud";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ cloud: cloudEnabled(), ai: Boolean(process.env.OPENAI_API_KEY) || process.env.MOCK_OPENAI === "1" });
}
