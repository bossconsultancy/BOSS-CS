import { NextResponse } from "next/server";
import { type BookletLang, BookletConflictError, cloudEnabled, loadCloudBooklet, resetCloudBooklet, saveCloudBooklet, storeBookletPhoto } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The team's shared, edited copy of the company profile booklet (Vercel Blob).

const langOf = (req: Request): BookletLang => (new URL(req.url).searchParams.get("lang") === "en" ? "en" : "ta");

function off() {
  return NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
}

export async function GET(req: Request) {
  if (!cloudEnabled()) return off();
  const r = await loadCloudBooklet(langOf(req));
  if (!r) return NextResponse.json({ html: null, etag: null });
  return NextResponse.json(r);
}

export async function PUT(req: Request) {
  if (!cloudEnabled()) return off();
  let body: { html?: string; etag?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The booklet is too large to save. Use smaller photos." }, { status: 400 });
  }
  const html = body.html || "";
  if (!html.includes('class="sheet"')) return NextResponse.json({ error: "This is not a valid booklet." }, { status: 400 });
  try {
    return NextResponse.json(await saveCloudBooklet(html, body.etag || null, langOf(req)));
  } catch (e) {
    if (e instanceof BookletConflictError) return NextResponse.json({ conflict: true }, { status: 409 });
    return NextResponse.json({ error: `Could not save the booklet: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 502 });
  }
}

/** Upload a replacement photo: { photo: dataUrl } → { url } */
export async function POST(req: Request) {
  if (!cloudEnabled()) return off();
  let body: { photo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The photo is too large." }, { status: 400 });
  }
  if (!body.photo?.startsWith("data:image/")) return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
  try {
    return NextResponse.json({ url: await storeBookletPhoto(body.photo) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  if (!cloudEnabled()) return off();
  await resetCloudBooklet(langOf(req));
  return NextResponse.json({ ok: true });
}
