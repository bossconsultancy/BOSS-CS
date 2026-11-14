import { NextResponse } from "next/server";
import { cloudEnabled, listCloudProjects } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!cloudEnabled()) return NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
  try {
    return NextResponse.json({ projects: await listCloudProjects() });
  } catch (e) {
    return NextResponse.json({ error: `Could not load the team library: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 502 });
  }
}
