import { NextResponse } from "next/server";
import { cloudEnabled, loadGeneral, saveGeneral, storeGeneralPhoto, trashGeneral } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
const off = () => NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
const ok = (id: string) => /^[a-z0-9]{4,40}$/i.test(id);

export async function GET(_req: Request, { params }: Ctx) {
  if (!cloudEnabled()) return off();
  const { id } = await params;
  if (!ok(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await loadGeneral(id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ html: r.doc.html, name: r.doc.name, etag: r.etag });
}

/** Save (the latest save always wins, like Google Docs): { html?, name?, by? } */
export async function PUT(req: Request, { params }: Ctx) {
  if (!cloudEnabled()) return off();
  const { id } = await params;
  if (!ok(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { html?: string; name?: string; by?: string } | null;
  if (!body) return NextResponse.json({ error: "The flyer is too large to save. Use smaller photos." }, { status: 400 });
  const cur = await loadGeneral(id);
  if (!cur) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.html !== undefined && !body.html.includes('class="sheet"')) return NextResponse.json({ error: "Not a valid flyer." }, { status: 400 });
  const doc = { ...cur.doc, html: body.html ?? cur.doc.html, name: (body.name ?? cur.doc.name).trim().slice(0, 80) || cur.doc.name, updatedAt: Date.now(), updatedBy: body.by ?? cur.doc.updatedBy };
  return NextResponse.json(await saveGeneral(doc));
}

/** Upload a photo: { photo: dataUrl } → { url } */
export async function POST(req: Request) {
  if (!cloudEnabled()) return off();
  const body = (await req.json().catch(() => ({}))) as { photo?: string };
  if (!body.photo?.startsWith("data:image/")) return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
  return NextResponse.json({ url: await storeGeneralPhoto(body.photo) });
}

/** Delete: moved to the trash folder in storage (recoverable). */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!cloudEnabled()) return off();
  const { id } = await params;
  if (!ok(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await trashGeneral(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
