"use client";

/**
 * Flyers home: every saved flyer and the ready-made BOSS designs as a wall of thumbnails.
 * Hover a flyer to see the pencil, click to open it in the editor.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Home, Pencil, Plus, Search } from "lucide-react";
import Flyer, { FLYER_H, FLYER_W } from "./Flyer";
import { TEMPLATES, isMasterId, masterId, templateByName, type Template } from "@/lib/samples";
import { loadMaster } from "@/lib/masters";
import { listProjects } from "@/lib/storage";
import { teamList, teamLoad } from "@/lib/teamApi";
import type { Project } from "@/lib/types";

const THUMB_W = 250;
const S = THUMB_W / FLYER_W;

type Item = { key: string; project: Project; etag?: string; sub: string };

export default function FlyerGallery({
  cloud,
  onOpen,
  onOpenMaster,
  onNew,
}: {
  cloud: boolean | null;
  onOpen: (p: Project, etag?: string) => void;
  onOpenMaster: (t: Template) => void;
  onNew: () => void;
}) {
  const [saved, setSaved] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cloud === null) return;
    let dead = false;
    (async () => {
      try {
        let items: Item[] = [];
        if (cloud) {
          const list = await teamList();
          const queue = [...list];
          const out: Item[] = [];
          await Promise.all(
            Array.from({ length: 6 }, async () => {
              while (queue.length) {
                const s = queue.shift()!;
                const r = await teamLoad(s.id).catch(() => null);
                if (r) out.push({ key: s.id, project: r.project, etag: r.etag, sub: sub(r.project) });
              }
            }),
          );
          items = out;
        } else {
          items = (await listProjects()).map((p) => ({ key: p.id, project: p, sub: sub(p) }));
        }
        items.sort((a, b) => (b.project.updatedAt || 0) - (a.project.updatedAt || 0));
        if (!dead) setSaved(items);
      } catch (e) {
        if (!dead) {
          setError(e instanceof Error ? e.message : "Could not load the flyers.");
          setSaved([]);
        }
      }
    })();
    return () => {
      dead = true;
    };
  }, [cloud]);

  // the current master flyer of each program (everyone's latest edits)
  const [masters, setMasters] = useState<{ t: Template; p: Project; saved: boolean }[] | null>(null);
  useEffect(() => {
    if (cloud === null) return;
    let dead = false;
    Promise.all(TEMPLATES.map(async (t) => {
      const r = await loadMaster(t, cloud);
      return { t, p: r.project, saved: !!r.etag || r.project.updatedBy !== undefined };
    })).then((m) => { if (!dead) setMasters(m); });
    return () => { dead = true; };
  }, [cloud]);

  const match = (name: string) => !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
  // other programs (made with New flyer) are their own single master; old duplicates of a program are tucked away
  const others = (saved || []).filter((i) => !isMasterId(i.project.id) && !templateByName(i.project.name));
  const olderCopies = (saved || []).filter((i) => !isMasterId(i.project.id) && templateByName(i.project.name));
  const shown = others.filter((i) => match(i.project.name));
  void masterId;
  void useMemo;

  return (
    <div className="app fg-app">
      <header className="topbar">
        <a className="brand-mark" href="/" title="Back to home">
          <img src="/logo-navy.svg" alt="" />
          <span>Flyers</span>
        </a>
        <span className={`save-state ${cloud ? "cloud" : "local"}`}>{cloud ? "Team library" : cloud === false ? "Saved on this computer only" : ""}</span>
        <div className="top-actions">
          <label className="fg-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a flyer" />
          </label>
          <a className="btn" href="/"><Home size={15} /> Home</a>
          <a className="btn" href="/booklet"><BookOpen size={15} /> Booklet</a>
          <button type="button" className="btn primary" onClick={onNew}><Plus size={15} /> New program flyer</button>
        </div>
      </header>

      <main className="fg-main">
        <section>
          <div className="fg-head">
            <h2>Program flyers</h2>
            <p>One master flyer per program. Everyone edits the same flyer, so it is always the latest version. Point at one and click the pencil.</p>
          </div>
          {error && <p className="fg-note">{error}</p>}
          <div className="fg-grid">
            {masters === null &&
              TEMPLATES.map((t) => (
                <div key={t.id} className="fg-card"><span className="fg-thumb fg-skel" style={{ width: THUMB_W, height: FLYER_H * S }} /></div>
              ))}
            {masters?.filter((m) => match(m.t.name)).map(({ t, p }) => (
              <Card key={t.id} project={p} sub={p.updatedBy ? sub(p) : "Master copy"} onOpen={() => onOpenMaster(t)} />
            ))}
            {saved === null && Array.from({ length: 1 }, (_, i) => (
              <div key={`s${i}`} className="fg-card"><span className="fg-thumb fg-skel" style={{ width: THUMB_W, height: FLYER_H * S }} /></div>
            ))}
            {shown.map((i) => (
              <Card key={i.key} project={i.project} sub={i.sub} onOpen={() => onOpen(i.project, i.etag)} />
            ))}
            <button type="button" className="fg-card fg-new" onClick={onNew}>
              <span className="fg-thumb fg-new-box" style={{ width: THUMB_W, height: FLYER_H * S }}>
                <Plus size={28} />
                <b>New program flyer</b>
                <small>For a program that has no flyer yet. Paste the course details and it builds itself.</small>
              </span>
            </button>
          </div>
        </section>

        {olderCopies.length > 0 && (
          <details className="fg-older">
            <summary>Older copies from before ({olderCopies.length})</summary>
            <p className="fg-note">These were made before each program had one master flyer. The newest one was used to start the master. You can open them to compare, or delete them from Team flyers.</p>
            <div className="fg-grid">
              {olderCopies.filter((i) => match(i.project.name)).map((i) => (
                <Card key={i.key} project={i.project} sub={i.sub} onOpen={() => onOpen(i.project, i.etag)} />
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function Card({ project, sub, onOpen }: { project: Project; sub: string; onOpen: () => void }) {
  return (
    <div className="fg-card">
      <button type="button" className="fg-thumb" style={{ width: THUMB_W, height: FLYER_H * S }} onClick={onOpen} title={`Edit ${project.name}`}>
        <span className="fg-scale" style={{ width: FLYER_W, height: FLYER_H, transform: `scale(${S})` }}>
          <Flyer content={project.content} design={project.design} brand={project.brand} />
        </span>
        <span className="fg-over">
          <span className="fg-pencil"><Pencil size={18} /></span>
          <span className="fg-edit">Edit flyer</span>
        </span>
      </button>
      <div className="fg-name" title={project.name}>{project.name}</div>
      <div className="fg-sub">{sub}</div>
    </div>
  );
}

function sub(p: Project) {
  const when = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "";
  const who = p.updatedBy ? ` by ${p.updatedBy}` : "";
  return when ? `Edited ${when}${who}` : "Saved flyer";
}
