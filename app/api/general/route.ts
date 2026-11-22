import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cloudEnabled, listGeneral, saveGeneral } from "@/lib/cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMPLATES: Record<string, string> = { notice: "notice.html", blank: "blank.html" };

async function readTemplate(req: Request, file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "public", "general", file), "utf8");
  } catch {
    const r = await fetch(new URL(`/general/${file}`, req.url), { headers: { authorization: req.headers.get("authorization") || "" }, cache: "no-store" });
    if (!r.ok) throw new Error(`Could not load the ${file} design (${r.status}).`);
    return r.text();
  }
}

/** All general flyers (name, time, who), newest first. */
export async function GET(req: Request) {
  if (!cloudEnabled()) return NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
  let docs = await listGeneral();
  // the first notice copied the sample's look; switch it to the BOSS design (wording unchanged)
  const old = docs.filter((d) => /notice to all clients/i.test(d.name) && (/data-tpl="notice-v[2-6]"/.test(d.html) || (!d.html.includes("data-tpl") && d.html.includes("rgb(215, 38, 46)"))));
  if (old.length) {
    const html = await readTemplate(req, "notice.html");
    for (const d of old) {
      d.html = html;
      d.updatedAt = Date.now();
      await saveGeneral(d);
    }
  }
  if (!docs.length) {
    // first visit: start the library with the notice to clients and visitors
    const html = await readTemplate(req, "notice.html");
    const doc = { id: `g${Date.now().toString(36)}notice`, name: "Notice to all clients and visitors", html, updatedAt: Date.now(), updatedBy: "" };
    await saveGeneral(doc);
    docs = [doc];
  }
  return NextResponse.json({ flyers: docs.map(({ id, name, updatedAt, updatedBy, html }) => ({ id, name, updatedAt, updatedBy, html })) });
}

/** New general flyer from a starting design: { template, name, by } → { id } */
export async function POST(req: Request) {
  if (!cloudEnabled()) return NextResponse.json({ error: "The team library is not set up yet." }, { status: 501 });
  const body = (await req.json().catch(() => ({}))) as { template?: string; name?: string; by?: string };
  const file = TEMPLATES[body.template || "blank"] || TEMPLATES.blank;
  const html = await readTemplate(req, file);
  const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const name = (body.name || "").trim().slice(0, 80) || "New flyer";
  await saveGeneral({ id, name, html, updatedAt: Date.now(), updatedBy: body.by || "" });
  return NextResponse.json({ id });
}
