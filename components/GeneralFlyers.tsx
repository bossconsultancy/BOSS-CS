"use client";

/** General flyers (notices, announcements, events…): a wall of thumbnails, hover for the pencil, click to edit. */

import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { getUserName } from "@/lib/teamApi";

type Item = { id: string; name: string; updatedAt: number; updatedBy?: string; html: string };
const W = 250;
const S = W / 816;

const STARTS = [
  { id: "blank", name: "Blank BOSS flyer" },
  { id: "notice", name: "Notice to clients and visitors" },
];

export default function GeneralFlyers() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("blank");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/general", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load the flyers.");
        setItems(d.flyers);
      })
      .catch((e) => { setError(e.message); setItems([]); });
  }, []);

  const create = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/general", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: start, name: name || STARTS.find((s) => s.id === start)?.name, by: getUserName() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not create the flyer.");
      location.href = `/flyers/general/${d.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the flyer.");
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (confirm !== id) return setConfirm(id);
    setConfirm("");
    await fetch(`/api/general/${id}`, { method: "DELETE" }).catch(() => null);
    setItems((l) => (l || []).filter((i) => i.id !== id));
  };
  const rename = async (id: string, n: string) => {
    const v = n.trim();
    if (!v) return;
    setItems((l) => (l || []).map((i) => (i.id === id ? { ...i, name: v } : i)));
    await fetch(`/api/general/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v }) }).catch(() => null);
  };

  const shown = (items || []).filter((i) => !q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="app fg-app">
      <header className="topbar">
        <a className="back-link" href="/flyers" title="Back"><ArrowLeft size={18} /></a>
        <a className="brand-mark" href="/flyers">
          <img src="/logo-navy.svg" alt="" />
          <span>General flyers</span>
        </a>
        <div className="top-actions">
          <label className="fg-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a flyer" />
          </label>
          <button type="button" className="btn primary" onClick={() => setPicking(true)}><Plus size={15} /> New flyer</button>
        </div>
      </header>

      <main className="fg-main">
        {error && <p className="fg-note">{error}</p>}
        <div className="fg-grid">
          {items === null && Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="fg-card"><span className="fg-thumb fg-skel" style={{ width: W, height: 1056 * S }} /></div>
          ))}
          {shown.map((i) => (
            <div key={i.id} className="fg-card fg-dup">
              <a className="fg-thumb" href={`/flyers/general/${i.id}`} style={{ width: W, height: 1056 * S }} title={`Edit ${i.name}`}>
                <span className="fg-scale" style={{ width: 816, height: 1056, transform: `scale(${S})` }} dangerouslySetInnerHTML={{ __html: i.html }} />
                <span className="fg-over">
                  <span className="fg-pencil"><Pencil size={18} /></span>
                  <span className="fg-edit">Edit flyer</span>
                </span>
              </a>
              <input className="fg-rename" defaultValue={i.name} onBlur={(e) => e.target.value !== i.name && rename(i.id, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label="Flyer name" />
              <button type="button" className={`btn small ${confirm === i.id ? "danger" : ""}`} onClick={() => remove(i.id)}>
                <Trash2 size={14} /> {confirm === i.id ? "Click again to delete" : "Delete"}
              </button>
            </div>
          ))}
          <button type="button" className="fg-card fg-new" onClick={() => setPicking(true)}>
            <span className="fg-thumb fg-new-box" style={{ width: W, height: 1056 * S }}>
              <Plus size={28} />
              <b>New flyer</b>
            </span>
          </button>
        </div>
      </main>

      {picking && (
        <div className="modal-backdrop" onClick={() => setPicking(false)}>
          <form className="modal small" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); create(); }}>
            <div className="card-head"><h3 className="h3">New flyer</h3><button type="button" className="icon-btn" onClick={() => setPicking(false)}><X size={14} /></button></div>
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Holiday hours" />
            <div className="gf-starts">
              {STARTS.map((s) => (
                <button key={s.id} type="button" className={`gf-start ${start === s.id ? "on" : ""}`} onClick={() => setStart(s.id)}>
                  <span className="gf-start-thumb"><img src={`/general/${s.id}.png`} alt="" /></span>
                  {s.name}
                </button>
              ))}
            </div>
            <button type="submit" className="btn primary wide" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
