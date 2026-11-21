"use client";

/**
 * Edit the flyer right on the page, the same way as the booklet:
 * point at any text to see the pencil, click to select it, double-click (or the pencil) to type.
 * The change is written back into the flyer's text fields, so the layout stays tidy.
 */

import { useCallback, useEffect, useState, type ReactNode, type RefObject } from "react";
import { Image as ImageIcon, Minus, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cleanText } from "@/lib/text";
import type { FontKey, Project } from "@/lib/types";

type Pick = { field: string; i?: number; part?: string; group?: FontKey };

const NAMES: Record<string, string> = {
  eyebrow: "Small line above the title", titleLine: "Title", bigCode: "Big code", pill: "Badge", tagline: "Tagline", intro: "Intro",
  financialNote: "Financial note", learn: "What you will learn", careers: "Career", admission: "Admission item", highlights: "Highlight",
  facts: "Key fact", salary: "Salary", photo: "Photo", "brand.phone": "Phone", "brand.address": "Address", "brand.website": "Website",
  "brand.companyTagline": "Logo tagline",
};
const nameOf = (p: Pick) => (p.field.startsWith("titles.") ? "Section title" : NAMES[p.field] || "Text");
const LISTS = ["learn", "careers", "admission", "highlights"] as const;

/** index in the stored list of the i-th item that is actually shown */
function realIndex<T>(arr: T[], shown: (x: T) => boolean, i: number) {
  let n = -1;
  for (let k = 0; k < arr.length; k++) if (shown(arr[k]) && ++n === i) return k;
  return -1;
}

function readPick(el: HTMLElement): Pick {
  return {
    field: el.dataset.field || "",
    i: el.dataset.i != null ? Number(el.dataset.i) : undefined,
    part: el.dataset.part,
    group: el.dataset.group as FontKey | undefined,
  };
}

export function useFlyerEdit({
  box,
  project,
  update,
  scale,
  onPhoto,
}: {
  box: RefObject<HTMLDivElement | null>;
  project: Project | null;
  update: (patch: Partial<Project>) => void;
  scale: number;
  onPhoto: () => void;
}) {
  const [hover, setHover] = useState<HTMLElement | null>(null);
  const [selEl, setSelEl] = useState<HTMLElement | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [, tick] = useState(0);

  /** current stored text for a picked item */
  const valueOf = useCallback((p: Pick): string => {
    if (!project) return "";
    const c = project.content;
    if (p.field.startsWith("brand.")) return String((project.brand as unknown as Record<string, string>)[p.field.slice(6)] || "");
    if (p.field.startsWith("titles.")) return c.titles[p.field.slice(7) as keyof typeof c.titles] || "";
    if ((LISTS as readonly string[]).includes(p.field)) {
      const arr = c[p.field as (typeof LISTS)[number]] || [];
      const k = realIndex(arr, (x) => !!cleanText(x), p.i || 0);
      return k >= 0 ? arr[k] : "";
    }
    if (p.field === "facts") {
      const k = realIndex(c.facts || [], (f) => !!f.value.trim(), p.i || 0);
      return k >= 0 ? String((c.facts[k] as unknown as Record<string, string>)[p.part || "value"] || "") : "";
    }
    if (p.field === "salary") {
      const k = realIndex(c.salary || [], (r) => !!r.value.trim(), p.i || 0);
      return k >= 0 ? String((c.salary[k] as unknown as Record<string, string>)[p.part || "value"] || "") : "";
    }
    if (p.field === "titleLine") return (c.titleLine || "").split("\n").map((s) => cleanText(s)).filter(Boolean)[p.i || 0] || "";
    return String((c as unknown as Record<string, string>)[p.field] || "");
  }, [project]);

  /** writes text back into the flyer (empty text removes a list item) */
  const write = useCallback((p: Pick, text: string) => {
    if (!project) return;
    const c = { ...project.content };
    const v = text.replace(/ /g, " ").replace(/\s+\n/g, "\n").trim();
    if (p.field.startsWith("brand.")) {
      update({ brand: { ...project.brand, [p.field.slice(6)]: v } });
      return;
    }
    if (p.field.startsWith("titles.")) c.titles = { ...c.titles, [p.field.slice(7)]: v };
    else if ((LISTS as readonly string[]).includes(p.field)) {
      const key = p.field as (typeof LISTS)[number];
      const arr = [...(c[key] || [])];
      const k = realIndex(arr, (x) => !!cleanText(x), p.i || 0);
      if (k < 0) return;
      if (v) arr[k] = v;
      else arr.splice(k, 1);
      c[key] = arr;
    } else if (p.field === "facts" || p.field === "salary") {
      const arr = [...(p.field === "facts" ? c.facts : c.salary)] as unknown as Record<string, string>[];
      const k = realIndex(arr, (r) => !!String(r.value || "").trim(), p.i || 0);
      if (k < 0) return;
      if (!v && (p.part || "value") === "value") arr.splice(k, 1);
      else arr[k] = { ...arr[k], [p.part || "value"]: v };
      if (p.field === "facts") c.facts = arr as unknown as typeof c.facts;
      else c.salary = arr as unknown as typeof c.salary;
    } else if (p.field === "titleLine") {
      const lines = (c.titleLine || "").split("\n").map((s) => cleanText(s)).filter(Boolean);
      lines[p.i || 0] = v;
      c.titleLine = lines.filter(Boolean).join("\n");
    } else (c as unknown as Record<string, string>)[p.field] = v;
    update({ content: c });
  }, [project, update]);

  const select = (el: HTMLElement | null) => {
    setSelEl(el);
    const p = el ? readPick(el) : null;
    setPick(p);
    setDraft(p ? valueOf(p) : "");
  };
  const finishTyping = useCallback((el: HTMLElement) => {
    el.contentEditable = "false";
    setEditing(false);
    const p = readPick(el);
    const text = el.innerText;
    if (text.trim() !== valueOf(p).trim()) write(p, text);
    setDraft(text.trim());
  }, [valueOf, write]);
  const startTyping = (el: HTMLElement) => {
    if (el.dataset.field === "photo") { onPhoto(); return; }
    select(el);
    el.contentEditable = "true";
    setEditing(true);
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  };

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const fieldOf = (t: EventTarget | null) => ((t as HTMLElement)?.closest?.("[data-field]") as HTMLElement | null) || null;
    const move = (e: MouseEvent) => {
      const f = fieldOf(e.target);
      setHover((h) => (h === f ? h : f));
    };
    const leave = () => setHover(null);
    const down = (e: MouseEvent) => {
      const f = fieldOf(e.target);
      if (f && f.isContentEditable) return;
      if (editing && selEl) finishTyping(selEl);
      if (!f) { select(null); return; }
      e.preventDefault();
      select(f);
    };
    const dbl = (e: MouseEvent) => {
      const f = fieldOf(e.target);
      if (f) startTyping(f);
    };
    const out = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el?.isContentEditable && el.dataset.field) finishTyping(el);
    };
    const keys = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.isContentEditable && el.dataset.field) {
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey && el.dataset.field !== "intro" && el.dataset.field !== "financialNote")) {
          e.preventDefault();
          el.blur();
        }
        return;
      }
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!selEl) return;
      if (e.key === "Escape") select(null);
      if (e.key === "Enter") { e.preventDefault(); startTyping(selEl); }
    };
    const redraw = () => tick((n) => n + 1);
    host.addEventListener("mousemove", move);
    host.addEventListener("mouseleave", leave);
    host.addEventListener("mousedown", down);
    host.addEventListener("dblclick", dbl);
    host.addEventListener("focusout", out, true);
    window.addEventListener("keydown", keys);
    const stage = host.closest(".stage");
    stage?.addEventListener("scroll", redraw);
    window.addEventListener("resize", redraw);
    return () => {
      host.removeEventListener("mousemove", move);
      host.removeEventListener("mouseleave", leave);
      host.removeEventListener("mousedown", down);
      host.removeEventListener("dblclick", dbl);
      host.removeEventListener("focusout", out, true);
      window.removeEventListener("keydown", keys);
      stage?.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
  });

  // after a re-render the selected element may be a new node: find it again by its field
  useEffect(() => {
    if (!pick || !box.current || (selEl && selEl.isConnected)) return;
    const q = `[data-field="${pick.field}"]${pick.i != null ? `[data-i="${pick.i}"]` : ""}${pick.part ? `[data-part="${pick.part}"]` : ""}`;
    const el = box.current.querySelector(q) as HTMLElement | null;
    setSelEl(el);
    if (!el) setPick(null);
  });

  const sizeStep = (d: number) => {
    if (!project || !pick?.group) return;
    const cur = project.design.fontScales?.[pick.group] ?? 1;
    const next = Math.max(0.6, Math.min(1.8, Math.round((cur + d) * 100) / 100));
    update({ design: { ...project.design, fontScales: { ...(project.design.fontScales || {}), [pick.group]: next } } });
  };
  const resetSize = () => {
    if (!project || !pick?.group) return;
    const fs = { ...(project.design.fontScales || {}) };
    delete fs[pick.group];
    update({ design: { ...project.design, fontScales: fs } });
  };
  const canRemove = pick && ((LISTS as readonly string[]).includes(pick.field) || pick.field === "facts" || pick.field === "salary" || ["eyebrow", "pill", "tagline", "intro", "financialNote", "bigCode"].includes(pick.field));

  const rect = (el: HTMLElement | null) => {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width || r.height ? r : null;
  };
  const hr = hover && hover !== selEl && !editing ? rect(hover) : null;
  const sr = rect(selEl);
  void scale;

  const overlays: ReactNode = (
    <>
      {hr && (
        <div className="bk-hover" style={{ left: hr.left - 2, top: hr.top - 2, width: hr.width + 4, height: hr.height + 4 }}>
          <button type="button" className="bk-pencil" title={hover?.dataset.field === "photo" ? "Change the photo" : "Edit this text"}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (hover) startTyping(hover); }}>
            <Pencil size={12} />
          </button>
        </div>
      )}
      {sr && (
        <div className={`bk-selbox${editing ? " typing" : ""}`} style={{ left: sr.left - 2, top: sr.top - 2, width: sr.width + 4, height: sr.height + 4 }}>
          {!editing && (
            <button type="button" className="bk-pencil" title="Edit (double-click or Enter)"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (selEl) startTyping(selEl); }}>
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
    </>
  );

  const card: ReactNode = pick ? (
    <div className="card open fe-card">
      <div className="card-head">
        <div className="card-toggle">Selected: {nameOf(pick)}</div>
        <button type="button" className="icon-btn" onClick={() => select(null)} aria-label="Close"><X size={14} /></button>
      </div>
      <div className="card-body">
        {pick.field === "photo" ? (
          <button type="button" className="btn" onClick={onPhoto}><ImageIcon size={14} /> Change or move the photo</button>
        ) : (
          <>
            <p className="bk-hint">Double-click text on the flyer to type in it, or edit it here.</p>
            <textarea className="input" rows={pick.field === "intro" || pick.field === "financialNote" ? 4 : 2} value={draft}
              onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft.trim() !== valueOf(pick).trim()) write(pick, draft); }} />
            {pick.group && (
              <div className="bk-row" style={{ alignItems: "center" }}>
                <span className="bk-label">Text size</span>
                <button type="button" className="btn icon-only" title="Smaller" onClick={() => sizeStep(-0.05)}><Minus size={14} /></button>
                <span className="bk-zoom">{Math.round((project?.design.fontScales?.[pick.group] ?? 1) * 100)}%</span>
                <button type="button" className="btn icon-only" title="Bigger" onClick={() => sizeStep(0.05)}><Plus size={14} /></button>
                <button type="button" className="btn icon-only" title="Reset size" onClick={resetSize}><RotateCcw size={14} /></button>
              </div>
            )}
            {pick.group && <p className="bk-hint">Size changes apply to all text of this kind, so the flyer stays consistent.</p>}
            {canRemove && (
              <button type="button" className="btn" onClick={() => { write(pick, ""); select(null); }}><Trash2 size={14} /> Remove</button>
            )}
          </>
        )}
      </div>
    </div>
  ) : null;

  return { overlays, card, clear: () => select(null) };
}
