import { readPhoto, cloudEnabled } from "@/lib/cloud";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") || "";
  if (!cloudEnabled()) return new Response("Not set up", { status: 501 });
  if (!/^photos\/[a-z0-9]{6,40}\/\d+\.(jpg|png|webp|svg)$/i.test(p)) return new Response("Bad request", { status: 400 });
  const r = await readPhoto(p);
  if (!r || r.statusCode !== 200) return new Response("Not found", { status: 404 });
  return new Response(r.stream as ReadableStream, {
    headers: {
      "Content-Type": r.blob.contentType || "image/jpeg",
      // photo files never change (each new photo gets a new name)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
