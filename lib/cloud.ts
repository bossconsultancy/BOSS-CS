import "server-only";
import { BlobPreconditionFailedError, del, get, list, put, rename } from "@vercel/blob";
import type { Project } from "./types";

/**
 * Team library on Vercel Blob (private storage).
 *   projects/<id>.json        one file per flyer (text, colours, settings)
 *   photos/<id>/<time>.jpg    the flyer photo
 *   trash/<id>-<time>.json    deleted flyers are moved here, not destroyed
 */

const MOCK = process.env.MOCK_CLOUD === "1"; // local testing only: stores files in a temp folder

export function cloudEnabled(): boolean {
  return MOCK || Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isValidId(id: string): boolean {
  return /^[a-z0-9]{6,40}$/i.test(id);
}

const projectPath = (id: string) => `projects/${id}.json`;

export interface Summary {
  id: string;
  name: string;
  updatedAt: number;
  updatedBy: string;
  createdBy: string;
  header: string;
  hasPhoto: boolean;
}

/* ---- local test store (MOCK_CLOUD=1) ---- */
async function mockFs() {
  const fs = await import("fs/promises");
  const path = await import("path");
  const crypto = await import("crypto");
  const root = path.join(process.env.TMPDIR || "/tmp", "boss-flyer-cloud");
  const file = (p: string) => path.join(root, p);
  const etagOf = (buf: Buffer) => crypto.createHash("md5").update(buf).digest("hex");
  return {
    async read(p: string) {
      try {
        const buf = await fs.readFile(file(p));
        return { buf, etag: etagOf(buf) };
      } catch {
        return null;
      }
    },
    async write(p: string, data: Buffer | string, opts: { ifMatch?: string; allowOverwrite?: boolean }) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const cur = await this.read(p);
      if (opts.ifMatch && (!cur || cur.etag !== opts.ifMatch)) throw new BlobPreconditionFailedError();
      if (!opts.ifMatch && opts.allowOverwrite === false && cur) throw new BlobPreconditionFailedError();
      await fs.mkdir(path.dirname(file(p)), { recursive: true });
      await fs.writeFile(file(p), buf);
      return { etag: etagOf(buf) };
    },
    async list(prefix: string) {
      try {
        const dir = file(prefix);
        const names = await fs.readdir(dir);
        return names.map((n) => ({ pathname: prefix + n, url: prefix + n }));
      } catch {
        return [];
      }
    },
    async del(p: string) {
      await fs.rm(file(p), { force: true });
    },
    async rename(a: string, b: string) {
      await fs.mkdir(path.dirname(file(b)), { recursive: true });
      await fs.rename(file(a), file(b));
    },
  };
}

async function readText(pathname: string): Promise<{ text: string; etag: string } | null> {
  if (MOCK) {
    const r = await (await mockFs()).read(pathname);
    return r ? { text: r.buf.toString("utf8"), etag: r.etag } : null;
  }
  const r = await get(pathname, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return { text: await new Response(r.stream).text(), etag: r.blob.etag };
}

export async function loadCloudProject(id: string): Promise<{ project: Project; etag: string } | null> {
  const r = await readText(projectPath(id));
  if (!r) return null;
  return { project: JSON.parse(r.text) as Project, etag: r.etag };
}

export async function listCloudProjects(): Promise<Summary[]> {
  const blobs: { pathname: string }[] = [];
  let cursor: string | undefined;
  if (MOCK) blobs.push(...(await (await mockFs()).list("projects/")));
  else do {
    const page = await list({ prefix: "projects/", limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const out: Summary[] = [];
  const queue = [...blobs];
  async function worker() {
    while (queue.length) {
      const b = queue.shift()!;
      try {
        const r = await readText(b.pathname);
        if (!r) continue;
        const p = JSON.parse(r.text) as Project;
        out.push({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
          updatedBy: p.updatedBy || "",
          createdBy: p.createdBy || "",
          header: p.design?.palette?.header || "#1B3A5C",
          hasPhoto: Boolean(p.design?.photo?.src),
        });
      } catch {
        // skip unreadable files
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function photoUrl(pathname: string) {
  return `/api/photo?p=${encodeURIComponent(pathname)}`;
}

/** Turn an inline photo (data URL) into a stored file and return the app URL for it. */
async function storePhoto(id: string, dataUrl: string): Promise<string> {
  const m = /^data:(image\/[a-z+.-]+);base64,(.*)$/i.exec(dataUrl);
  if (!m) throw new Error("The photo could not be read.");
  const contentType = m[1];
  const ext = contentType.includes("png") ? "png" : contentType.includes("svg") ? "svg" : contentType.includes("webp") ? "webp" : "jpg";
  const pathname = `photos/${id}/${Date.now()}.${ext}`;
  if (MOCK) await (await mockFs()).write(pathname, Buffer.from(m[2], "base64"), {});
  else await put(pathname, Buffer.from(m[2], "base64"), { access: "private", contentType, addRandomSuffix: false });
  return photoUrl(pathname);
}

async function cleanupPhotos(id: string, keepUrl: string) {
  try {
    if (MOCK) {
      const m = await mockFs();
      for (const b of await m.list(`photos/${id}/`)) if (photoUrl(b.pathname) !== keepUrl) await m.del(b.pathname);
      return;
    }
    const page = await list({ prefix: `photos/${id}/`, limit: 100 });
    const old = page.blobs.filter((b) => photoUrl(b.pathname) !== keepUrl).map((b) => b.url);
    if (old.length) await del(old);
  } catch {
    // not critical
  }
}

export class ConflictError extends Error {
  constructor(public current: { project: Project; etag: string } | null) {
    super("conflict");
  }
}

export async function saveCloudProject(project: Project, etag: string | null): Promise<{ project: Project; etag: string }> {
  const p: Project = JSON.parse(JSON.stringify(project));
  let newPhoto = false;
  if (p.design?.photo?.src?.startsWith("data:")) {
    p.design.photo.src = await storePhoto(p.id, p.design.photo.src);
    newPhoto = true;
  }
  const body = JSON.stringify(p);
  try {
    const res = MOCK
      ? await (await mockFs()).write(projectPath(p.id), body, etag ? { ifMatch: etag } : { allowOverwrite: false })
      : await put(projectPath(p.id), body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    });
    if (newPhoto) cleanupPhotos(p.id, p.design.photo.src);
    return { project: p, etag: res.etag };
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError || (e instanceof Error && /already exists|precondition/i.test(e.message))) {
      throw new ConflictError(await loadCloudProject(p.id));
    }
    throw e;
  }
}

export async function trashCloudProject(id: string): Promise<void> {
  if (MOCK) return (await mockFs()).rename(projectPath(id), `trash/${id}-${Date.now()}.json`);
  await rename(projectPath(id), `trash/${id}-${Date.now()}.json`, { access: "private" });
}

export async function readPhoto(pathname: string): Promise<{ statusCode: number; stream: ReadableStream | null; blob: { contentType: string | null } } | null> {
  if (MOCK) {
    const r = await (await mockFs()).read(pathname);
    if (!r) return null;
    const type = pathname.endsWith(".svg") ? "image/svg+xml" : pathname.endsWith(".png") ? "image/png" : "image/jpeg";
    return { statusCode: 200, stream: new Blob([new Uint8Array(r.buf)]).stream(), blob: { contentType: type } };
  }
  return get(pathname, { access: "private" });
}

/* ---- Company profile booklet (one shared, editable copy for the whole team) ---- */

export type BookletLang = "ta" | "en";
const bookletPath = (lang: BookletLang) => (lang === "en" ? "booklet/current-en.html" : "booklet/current.html");

export async function loadCloudBooklet(lang: BookletLang = "ta"): Promise<{ html: string; etag: string } | null> {
  const r = await readText(bookletPath(lang));
  return r ? { html: r.text, etag: r.etag } : null;
}

export class BookletConflictError extends Error {
  constructor() {
    super("conflict");
  }
}

/** Saves the edited booklet. `etag` guards against overwriting someone else's newer save. */
export async function saveCloudBooklet(html: string, etag: string | null, lang: BookletLang = "ta"): Promise<{ etag: string }> {
  const BOOKLET_PATH = bookletPath(lang);
  try {
    const res = MOCK
      ? await (await mockFs()).write(BOOKLET_PATH, html, etag ? { ifMatch: etag } : { allowOverwrite: false })
      : await put(BOOKLET_PATH, html, {
          access: "private",
          contentType: "text/html; charset=utf-8",
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
          ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
        });
    return { etag: res.etag };
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError || (e instanceof Error && /already exists|precondition/i.test(e.message))) throw new BookletConflictError();
    throw e;
  }
}

/** "Back to the original": moves the team's edited copy to trash (recoverable by an admin). */
export async function resetCloudBooklet(lang: BookletLang = "ta"): Promise<void> {
  const BOOKLET_PATH = bookletPath(lang);
  const to = `trash/booklet-${lang}-${Date.now()}.html`;
  try {
    if (MOCK) return (await mockFs()).rename(BOOKLET_PATH, to);
    await rename(BOOKLET_PATH, to, { access: "private" });
  } catch {
    // nothing saved yet
  }
}

/** Stores a photo placed into the booklet and returns its app URL. */
export async function storeBookletPhoto(dataUrl: string): Promise<string> {
  return storePhoto("booklet", dataUrl);
}
