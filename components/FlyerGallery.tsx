"use client";

/**
 * Flyers home: every saved flyer and the ready-made BOSS designs as a wall of thumbnails.
 * Hover a flyer to see the pencil, click to open it in the editor.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Home, Pencil, Plus, Search } from "lucide-react";
import Flyer, { FLYER_H, FLYER_W } from "./Flyer";
import { TEMPLATES, projectFromTemplate } from "@/lib/samples";
import { listProjects, loadDefaultBrand } from "@/lib/storage";
import { teamList, teamLoad } from "@/lib/teamApi";
import type { Project } from "@/lib/types";

const THUMB_W = 250;
const S = THUMB_W / FLYER_W;

type Item = { key: string; project: Project; etag?: string; sub: string };

export default function FlyerGallery({
  cloud,
  onOpen,
  onNew,
}: {
  cloud: boolean | null;
  onOpen: (p: Project, etag?: string) => void;
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

  const starters = useMemo(
    () =>
      TEMPLATES.map((t) => {
        const p = projectFromTemplate(t);
        p.brand = loadDefaultBrand();
        return { t, p };
      }),
    [],
  );

  const match = (name: string) => !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
  const shown = (saved || []).filter((i) => match(i.project.name));

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
          <button type="button" className="btn primary" onClick={onNew}><Plus size={15} /> New flyer</button>
        </div>
      </header>

      <main className="fg-main">
        <section>
          <div className="fg-head">
            <h2>{cloud ? "Team flyers" : "My flyers"}</h2>
            <p>Point at a flyer and click the pencil to edit it. Changes save automatically.</p>
          </div>
          {error && <p className="fg-note">{error}</p>}
          <div className="fg-grid">
            <button type="button" className="fg-card fg-new" onClick={onNew}>
              <span className="fg-thumb fg-new-box" style={{ width: THUMB_W, height: FLYER_H * S }}>
                <Plus size={28} />
                <b>New flyer</b>
                <small>Paste course details and the flyer builds itself</small>
              </span>
            </button>
            {saved === null &&
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="fg-card"><span className="fg-thumb fg-skel" style={{ width: THUMB_W, height: FLYER_H * S }} /></div>
              ))}
            {shown.map((i) => (
              <Card key={i.key} project={i.project} sub={i.sub} onOpen={() => onOpen(i.project, i.etag)} />
            ))}
          </div>
          {saved && !shown.length && !q && <p className="fg-note">No saved flyers yet. Start from a ready-made design below.</p>}
        </section>

        <section>
          <div className="fg-head">
            <h2>Ready-made designs</h2>
            <p>Opening one makes a new copy, so the original design stays as it is.</p>
          </div>
          <div className="fg-grid">
            {starters.filter((s) => match(s.t.name)).map(({ t, p }) => (
              <Card key={t.id} project={p} sub="BOSS design" onOpen={() => {
                const fresh = projectFromTemplate(t);
                fresh.brand = loadDefaultBrand();
                onOpen(fresh);
              }} />
            ))}
          </div>
        </section>
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
