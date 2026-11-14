import { NextResponse } from "next/server";
import { ConflictError, cloudEnabled, isValidId, loadCloudProject, saveCloudProject, trashCloudProject } from "@/lib/cloud";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function guard(id: string) {
  if (!cloudEnabled()) return NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
  if (!isValidId(id)) return NextResponse.json({ error: "Invalid flyer id." }, { status: 400 });
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const bad = guard(id);
  if (bad) return bad;
  const r = await loadCloudProject(id);
  if (!r) return NextResponse.json({ error: "This flyer was not found. It may have been deleted." }, { status: 404 });
  return NextResponse.json(r);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const bad = guard(id);
  if (bad) return bad;
  let body: { project?: Project; etag?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The flyer is too large or could not be read." }, { status: 400 });
  }
  const project = body.project;
  if (!project || project.id !== id || !project.content || !project.design) {
    return NextResponse.json({ error: "This is not a valid flyer." }, { status: 400 });
  }
  try {
    const saved = await saveCloudProject(project, body.etag || null);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof ConflictError) return NextResponse.json({ conflict: true, current: e.current }, { status: 409 });
    return NextResponse.json({ error: `Could not save to the team library: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 502 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const bad = guard(id);
  if (bad) return bad;
  try {
    await trashCloudProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `Could not delete: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 502 });
  }
}
