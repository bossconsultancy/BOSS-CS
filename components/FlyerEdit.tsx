"use client";

/**
 * Canva-style control on the flyer, on top of the automatic layout.
 * Hover: outline + pencil. Click: select. Drag: move. Handles: resize. Double-click: type.
 * Text changes go back into the flyer's fields; moves, sizes and colours are stored as overrides.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowUpLeft, Bold, EyeOff, Image as ImageIcon, Italic, Minus, Pencil, Plus, RotateCcw, X,
} from "lucide-react";
import { cleanText } from "@/lib/text";
import { elKey, selectorOf } from "@/lib/flyerEls";
import type { ElOverride, Project } from "@/lib/types";

type Pick = { field: string; i?: number; part?: string };

const NAMES: Record<string, string> = {
  eyebrow: "Small title", titleLine: "Title", bigCode: "Big code", pill: "Badge", tagline: "Tagline", intro: "Intro",
  financialNote: "Financial note", learn: "List item", careers: "Career", admission: "Admission item", highlights: "Highlight",
  facts: "Key fact", salary: "Salary", "brand.phone": "Phone", "brand.address": "Address", "brand.website": "Website",
  "brand.companyTagline": "Logo tagline",
  "el:band": "Header", "el:logo": "Logo", "el:title": "Title block", "el:photo": "Photo", "el:facts": "Key facts bar",
  "el:sec-learn": "What you will learn", "el:sec-careers": "Careers", "el:sec-admission": "Admission", "el:sec-highlights": "Highlights",
  "el:sec-salary": "Salary box", "el:callout": "Financial note box", "el:footer": "Footer",
};
const LISTS = ["learn", "careers", "admission", "highlights"] as const;
const SEL = "[data-el], [data-field]";

function realIndex<T>(arr: T[], shown: (x: T) => boolean, i: number) {
  let n = -1;
  for (let k = 0; k < arr.length; k++) if (shown(arr[k]) && ++n === i) return k;
  return -1;
}
const isText = (el: HTMLElement | null) => !!el && !!el.dataset.field && el.dataset.field !== "photo" && !el.dataset.el;
const readPick = (el: HTMLElement): Pick => ({
  field: el.dataset.field || "",
  i: el.dataset.i != null ? Number(el.dataset.i) : undefined,
  part: el.dataset.part,
});
const rgbToHex = (c: string) => {
  const m = c.match(/\d+(\.\d+)?/g);
  if (!m || (m.length === 4 && Number(m[3]) === 0)) return "#ffffff";
  return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
};

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
  const [key, setKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [, tick] = useState(0);
  const drag = useRef<{ el: HTMLElement; key: string; x: number; y: number; o: ElOverride; moved: boolean } | null>(null);

  const ovs = project?.design.overrides || {};
  const ov: ElOverride = (key && ovs[key]) || {};

  /* ---------- overrides ---------- */
  const setOv = useCallback((k: string, patch: Partial<ElOverride> | null) => {
    if (!project) return;
    const all = { ...(project.design.overrides || {}) };
    if (patch === null) delete all[k];
    else {
      const next: ElOverride = { ...(all[k] || {}), ...patch };
      for (const f of Object.keys(next) as (keyof ElOverride)[]) if (next[f] === undefined) delete next[f];
      if (Object.keys(next).length) all[k] = next;
      else delete all[k];
    }
    update({ design: { ...project.design, overrides: all } });
  }, [project, update]);

  /* ---------- text fields ---------- */
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
    if (p.field === "facts" || p.field === "salary") {
      const arr = (p.field === "facts" ? c.facts : c.salary) as unknown as Record<string, string>[];
      const k = realIndex(arr || [], (r) => !!String(r.value || "").trim(), p.i || 0);
      return k >= 0 ? String(arr[k][p.part || "value"] || "") : "";
    }
    if (p.field === "titleLine") return (c.titleLine || "").split("\n").map((s) => cleanText(s)).filter(Boolean)[p.i || 0] || "";
    return String((c as unknown as Record<string, string>)[p.field] || "");
  }, [project]);

  const write = useCallback((p: Pick, text: string) => {
    if (!project) return;
    const c = { ...project.content };
    const v = text.replace(/ /g, " ").replace(/\s+\n/g, "\n").trim();
    if (p.field.startsWith("brand.")) return update({ brand: { ...project.brand, [p.field.slice(6)]: v } });
    if (p.field.startsWith("titles.")) c.titles = { ...c.titles, [p.field.slice(7)]: v };
    else if ((LISTS as readonly string[]).includes(p.field)) {
      const k2 = p.field as (typeof LISTS)[number];
      const arr = [...(c[k2] || [])];
      const k = realIndex(arr, (x) => !!cleanText(x), p.i || 0);
      if (k < 0) return;
      if (v) arr[k] = v;
      else arr.splice(k, 1);
      c[k2] = arr;
    } else if (p.field === "facts" || p.field === "salary") {
      const arr = [...(p.field === "facts" ? c.facts : c.salary)] as unknown as Record<string, string>[];
      const k = realIndex(arr, (r) => !!String(r.value || "").trim(), p.i || 0);
      if (k < 0) return;
      arr[k] = { ...arr[k], [p.part || "value"]: v };
      if (p.field === "facts") c.facts = arr as unknown as typeof c.facts;
      else c.salary = arr as unknown as typeof c.salary;
    } else if (p.field === "titleLine") {
      const lines = (c.titleLine || "").split("\n").map((s) => cleanText(s)).filter(Boolean);
      lines[p.i || 0] = v;
      c.titleLine = lines.filter(Boolean).join("\n");
    } else (c as unknown as Record<string, string>)[p.field] = v;
    update({ content: c });
  }, [project, update]);

  /* ---------- selection ---------- */
  const select = (el: HTMLElement | null) => {
    setSelEl(el);
    setKey(el ? elKey(el) : null);
    setDraft(el && isText(el) ? valueOf(readPick(el)) : "");
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
    if (!isText(el)) { if (el.dataset.el === "photo") onPhoto(); return; }
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
  const parentOf = (el: HTMLElement | null) => (el?.parentElement?.closest(SEL) as HTMLElement | null) || null;

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const pickAt = (t: EventTarget | null) => ((t as HTMLElement)?.closest?.(SEL) as HTMLElement | null) || null;
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (d) {
        const dx = (e.clientX - d.x) / scale;
        const dy = (e.clientY - d.y) / scale;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        d.moved = true;
        d.el.style.setProperty("transform", `translate(${(d.o.x || 0) + dx}px,${(d.o.y || 0) + dy}px) scale(${d.o.s || 1})`, "important");
        d.el.style.setProperty("position", "relative", "important");
        d.el.style.setProperty("z-index", "3", "important");
        tick((n) => n + 1);
        return;
      }
      if (host.contains(e.target as Node)) {
        const f = pickAt(e.target);
        setHover((h) => (h === f ? h : f));
      }
    };
    const leave = () => setHover(null);
    const down = (e: MouseEvent) => {
      const f = pickAt(e.target);
      if (f && f.isContentEditable) return;
      if (editing && selEl) finishTyping(selEl);
      if (!f) { select(null); return; }
      e.preventDefault();
      // clicking inside the selected block keeps the block, so it can be dragged as a whole
      const target = selEl && selEl !== f && selEl.contains(f) && !isText(selEl) ? selEl : f;
      if (target !== selEl) select(target);
      const k = elKey(target);
      drag.current = { el: target, key: k, x: e.clientX, y: e.clientY, o: { ...((project?.design.overrides || {})[k] || {}) }, moved: false };
    };
    const up = (e: MouseEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.moved) return;
      const dx = (e.clientX - d.x) / scale;
      const dy = (e.clientY - d.y) / scale;
      ["transform", "position", "z-index"].forEach((p) => d.el.style.removeProperty(p));
      setOv(d.key, { x: Math.round((d.o.x || 0) + dx), y: Math.round((d.o.y || 0) + dy) });
    };
    const dbl = (e: MouseEvent) => {
      const f = pickAt(e.target);
      if (f) startTyping(isText(f) ? f : ((f.querySelector("[data-field]:not([data-el])") as HTMLElement) || f));
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
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !selEl || !key) return;
      if (e.key === "Escape") select(null);
      else if (e.key === "Enter" && isText(selEl)) { e.preventDefault(); startTyping(selEl); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setOv(key, { hide: true }); select(null); }
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const o = (project?.design.overrides || {})[key] || {};
        setOv(key, {
          x: (o.x || 0) + (e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0),
          y: (o.y || 0) + (e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0),
        });
      }
    };
    const redraw = () => tick((n) => n + 1);
    host.addEventListener("mouseleave", leave);
    host.addEventListener("mousedown", down);
    host.addEventListener("dblclick", dbl);
    host.addEventListener("focusout", out, true);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", keys);
    const stage = host.closest(".stage");
    stage?.addEventListener("scroll", redraw);
    window.addEventListener("resize", redraw);
    return () => {
      host.removeEventListener("mouseleave", leave);
      host.removeEventListener("mousedown", down);
      host.removeEventListener("dblclick", dbl);
      host.removeEventListener("focusout", out, true);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", keys);
      stage?.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
  });

  // after a re-render the selected element may be a new node: find it again
  useEffect(() => {
    if (!key || !box.current || (selEl && selEl.isConnected)) return;
    const el = box.current.querySelector(selectorOf(key)) as HTMLElement | null;
    setSelEl(el);
    if (!el) setKey(null);
  });

  /* ---------- resize handles ---------- */
  const startResize = (e: React.MouseEvent, dir: string) => {
    if (!selEl || !key) return;
    e.preventDefault();
    e.stopPropagation();
    const el = selEl;
    const k = key;
    const o = { ...ov };
    const x0 = e.clientX;
    const w0 = el.offsetWidth;
    const s0 = o.s || 1;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const d0 = Math.max(10, Math.abs(x0 - cx));
    let last: Partial<ElOverride> = {};
    const mv = (ev: MouseEvent) => {
      if (dir === "e" || dir === "w") {
        const dx = (ev.clientX - x0) / scale;
        const w = Math.max(30, Math.round(w0 + (dir === "e" ? dx : -dx)));
        last = { w };
        el.style.setProperty("width", `${w}px`, "important");
        el.style.setProperty("max-width", "none", "important");
      } else {
        const s = Math.max(0.3, Math.min(4, Math.round((s0 * Math.abs(ev.clientX - cx)) / d0 * 100) / 100));
        last = { s };
        el.style.setProperty("transform", `translate(${o.x || 0}px,${o.y || 0}px) scale(${s})`, "important");
      }
      tick((n) => n + 1);
    };
    const upR = () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", upR);
      ["width", "max-width", "transform"].forEach((p) => el.style.removeProperty(p));
      if (Object.keys(last).length) setOv(k, last);
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", upR);
  };

  /* ---------- overlays ---------- */
  const rect = (el: HTMLElement | null) => {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width || r.height ? r : null;
  };
  const hr = hover && hover !== selEl && !editing && !drag.current ? rect(hover) : null;
  const sr = rect(selEl);

  const overlays: ReactNode = (
    <>
      {hr && (
        <div className="bk-hover" style={{ left: hr.left - 2, top: hr.top - 2, width: hr.width + 4, height: hr.height + 4 }}>
          {(isText(hover) || hover?.dataset.el === "photo") && (
            <button type="button" className="bk-pencil" title="Edit"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (hover) startTyping(hover); }}>
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
      {sr && (
        <div className={`bk-selbox${editing ? " typing" : ""}`} style={{ left: sr.left - 2, top: sr.top - 2, width: sr.width + 4, height: sr.height + 4 }}>
          {!editing && ["nw", "ne", "se", "sw"].map((d) => <span key={d} className={`bk-handle h-${d}`} onMouseDown={(e) => startResize(e, d)} />)}
          {!editing && selEl?.dataset.el !== "photo" && selEl?.dataset.el !== "logo" && ["e", "w"].map((d) => (
            <span key={d} className={`bk-handle h-${d}`} onMouseDown={(e) => startResize(e, d)} />
          ))}
          {!editing && isText(selEl) && (
            <button type="button" className="bk-pencil" title="Type"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (selEl) startTyping(selEl); }}>
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
    </>
  );

  /* ---------- side panel ---------- */
  const cs = selEl ? getComputedStyle(selEl) : null;
  const curPx = ov.fpx || (cs ? Math.round(parseFloat(cs.fontSize)) : 14);
  const parent = parentOf(selEl);
  const text = isText(selEl);
  const anyOv = Object.keys(ovs).length > 0;

  const card: ReactNode = key ? (
    <div className="card open fe-card">
      <div className="card-head">
        <div className="card-toggle">{NAMES[key] || NAMES[key.slice(2).split("|")[0]] || (key.includes("titles.") ? "Section title" : "Text")}</div>
        <button type="button" className="icon-btn" onClick={() => select(null)} aria-label="Close"><X size={14} /></button>
      </div>
      <div className="card-body fe-tools">
        {text && (
          <textarea className="input" rows={2} value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { const p = selEl ? readPick(selEl) : null; if (p && draft.trim() !== valueOf(p).trim()) write(p, draft); }} />
        )}
        {selEl?.dataset.el === "photo" && <button type="button" className="btn" onClick={onPhoto}><ImageIcon size={14} /> Photo</button>}
        <div className="fe-row">
          {text && (
            <>
              <button type="button" className="btn icon-only" title="Smaller" onClick={() => setOv(key, { fpx: Math.max(6, curPx - 1) })}><Minus size={14} /></button>
              <span className="fe-num">{curPx}</span>
              <button type="button" className="btn icon-only" title="Bigger" onClick={() => setOv(key, { fpx: curPx + 1 })}><Plus size={14} /></button>
              <span className="fe-sep" />
              <button type="button" className={`btn icon-only ${ov.b ? "on" : ""}`} title="Bold" onClick={() => setOv(key, { b: !(ov.b ?? (cs ? Number(cs.fontWeight) >= 600 : false)) })}><Bold size={14} /></button>
              <button type="button" className={`btn icon-only ${ov.it ? "on" : ""}`} title="Italic" onClick={() => setOv(key, { it: !(ov.it ?? cs?.fontStyle === "italic") })}><Italic size={14} /></button>
              <span className="fe-sep" />
              <button type="button" className={`btn icon-only ${ov.al === "left" ? "on" : ""}`} title="Left" onClick={() => setOv(key, { al: "left" })}><AlignLeft size={14} /></button>
              <button type="button" className={`btn icon-only ${ov.al === "center" ? "on" : ""}`} title="Centre" onClick={() => setOv(key, { al: "center" })}><AlignCenter size={14} /></button>
              <button type="button" className={`btn icon-only ${ov.al === "right" ? "on" : ""}`} title="Right" onClick={() => setOv(key, { al: "right" })}><AlignRight size={14} /></button>
            </>
          )}
        </div>
        <div className="fe-row">
          {selEl?.dataset.el !== "logo" && selEl?.dataset.el !== "photo" && (
            <>
              <label className="fe-color" title="Text colour">
                <span>A</span>
                <input type="color" value={ov.color || rgbToHex(cs?.color || "#000")} onChange={(e) => setOv(key, { color: e.target.value })} />
              </label>
              <label className="fe-color" title="Fill colour">
                <span className="fe-fill" style={{ background: ov.bg || rgbToHex(cs?.backgroundColor || "#fff") }} />
                <input type="color" value={ov.bg || rgbToHex(cs?.backgroundColor || "#fff")} onChange={(e) => setOv(key, { bg: e.target.value })} />
              </label>
              <span className="fe-sep" />
            </>
          )}
          {parent && <button type="button" className="btn icon-only" title="Select the whole block" onClick={() => select(parent)}><ArrowUpLeft size={14} /></button>}
          <button type="button" className="btn icon-only" title="Hide" onClick={() => { setOv(key, { hide: true }); select(null); }}><EyeOff size={14} /></button>
          <button type="button" className="btn icon-only" title="Undo my changes to this" disabled={!ovs[key]} onClick={() => setOv(key, null)}><RotateCcw size={14} /></button>
        </div>
        {anyOv && (
          <button type="button" className="fe-link" onClick={() => project && update({ design: { ...project.design, overrides: {} } })}>Reset all manual changes</button>
        )}
      </div>
    </div>
  ) : anyOv ? (
    <div className="fe-resetall">
      <button type="button" className="fe-link" onClick={() => project && update({ design: { ...project.design, overrides: {} } })}>Reset all manual changes</button>
    </div>
  ) : null;

  return { overlays, card, clear: () => select(null) };
}
