"use client";

/**
 * BOSS company profile booklet: the 40 printed pages, editable in the browser.
 * No AI except "Ask for a change". Edits save in this browser and, when the team library is set up,
 * to the team's shared copy, so the latest booklet opens on every computer.
 * Export as HTML, PDF or PNG.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { get, set, del } from "idb-keyval";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Copy, FileDown, Image as ImageIcon, ImageDown,
  ArrowLeft, Home, Italic, LayoutGrid, Minus, Pencil, Plus, Printer, Redo2, RefreshCw, RotateCcw, Save, Sparkles, Trash2, Type, Undo2, ZoomIn, ZoomOut, MessageSquarePlus, X,
} from "lucide-react";
import { elementToTyped, isBamini, typedToBookletHtml } from "@/lib/bamini";

type Lang = "ta" | "en";
const KEYS: Record<Lang, string> = { ta: "boss-booklet-v2", en: "boss-booklet-en-v1" }; // v2 = the November 2026 master (BOSS CS)
const SRCS: Record<Lang, string> = { ta: "/booklet/pages.html", en: "/booklet/pages-en.html" };
const NAMES: Record<Lang, string> = { ta: "Tamil", en: "English" };
const CSS = "/booklet/booklet.css";
type Snap = { page: number; html: string };

/** Without `doc` this is the company profile booklet; with `doc` it edits one general flyer (one US Letter page). */
export default function Booklet({ doc }: { doc?: { id: string; title: string } } = {}) {
  const PAGE_W = doc ? 816 : 840;
  const PAGE_H = doc ? 1056 : 1080;
  const docName = doc ? doc.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "BOSS-flyer" : "";
  const stage = useRef<HTMLDivElement>(null);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const pending = useRef<Snap | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [edited, setEdited] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [count, setCount] = useState(0);
  const [sel, setSel] = useState<HTMLElement | null>(null);
  const [typed, setTyped] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState("");
  // notes pinned to a spot or a piece of the page; saved inside the page so the whole team sees them
  const [noteMode, setNoteMode] = useState(false);
  const [noteOpen, setNoteOpen] = useState<{ page: number; id: string | null; x: number; y: number; nid?: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteMsg, setNoteMsg] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [, force] = useState(0);
  const cloud = useRef(false);
  const etag = useRef<string | null>(null);
  const [cloudNote, setCloudNote] = useState("");
  const [lang, setLangState] = useState<Lang>("ta");
  const [hover, setHover] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState<HTMLElement | null>(null);
  const [, tick] = useState(0);
  const dragRef = useRef<{ box: HTMLElement; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const KEY = doc ? `boss-general-${doc.id}` : KEYS[lang];
  const SRC = doc ? "" : SRCS[lang];
  const docUrl = doc ? `/api/general/${doc.id}` : `/api/booklet-doc?lang=${lang}`;
  useEffect(() => {
    try { const l = localStorage.getItem("boss-booklet-lang"); if (l === "en" || l === "ta") setLangState(l); } catch { /* private window */ }
  }, []);
  const setLang = (l: Lang) => {
    if (l === lang) return;
    try { localStorage.setItem("boss-booklet-lang", l); } catch { /* ignore */ }
    setLangState(l);
  };

  // ---------- load ----------
  useEffect(() => {
    let dead = false;
    setReady(false);
    clearSel();
    past.current = [];
    future.current = [];
    etag.current = null;
    setCloudNote("");
    setSaveState("idle");
    (async () => {
      // The team's shared copy comes first, then this browser's copy, then the original.
      let saved: string | null = null;
      try {
        const st = await fetch("/api/status", { cache: "no-store" }).then((r) => r.json());
        if (st?.cloud) {
          cloud.current = true;
          const doc = await fetch(docUrl, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
          if (doc?.html) {
            saved = doc.html as string;
            etag.current = doc.etag || null;
          }
        }
      } catch {
        // offline: fall back to this browser
      }
      if (!saved) saved = (await get(KEY).catch(() => null)) as string | null;
      const html: string = saved || (SRC ? await fetch(SRC).then((r) => r.text() as Promise<string>) : "");
      if (dead || !stage.current) return;
      stage.current.innerHTML = html;
      setCount(stage.current.querySelectorAll("section.sheet").length);
      setEdited(!!saved);
      setReady(true);
    })();
    return () => { dead = true; };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- saving ----------
  const save = useCallback(() => {
    if (!stage.current) return;
    setSaveState("saving");
    const html = stage.current.innerHTML;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await set(KEY, html).catch(() => null);
      if (cloud.current) {
        try {
          const res = await fetch(docUrl, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html, etag: etag.current, latest: true }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) setCloudNote(data.error || "Could not save to the team library. Your change is kept on this computer.");
          else {
            etag.current = data.etag || null;
            setCloudNote("");
          }
        } catch {
          setCloudNote("No connection. Your change is kept on this computer.");
        }
      }
      setSaveState("saved");
      setEdited(true);
    }, 900);
  }, [KEY, docUrl]);

  // ---------- history ----------
  const pageOf = (el: HTMLElement) => {
    const sheet = el.closest("section.sheet");
    const all = [...(stage.current?.querySelectorAll("section.sheet") || [])];
    return sheet ? all.indexOf(sheet) : -1;
  };
  const sheetAt = (i: number) =>
    stage.current?.querySelectorAll("section.sheet")[i] as HTMLElement | undefined;

  const begin = (el: HTMLElement | null) => {
    if (!el || !stage.current) return;
    const p = pageOf(el);
    const sheet = sheetAt(p);
    if (p < 0 || !sheet) return;
    pending.current = { page: p, html: sheet.innerHTML };
  };
  const commit = () => {
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    const sheet = sheetAt(p.page);
    if (!sheet || sheet.innerHTML === p.html) return;
    past.current.push(p);
    if (past.current.length > 120) past.current.shift();
    future.current = [];
    save();
    force((n) => n + 1);
  };
  /** Snapshot, change, keep. */
  const act = (fn: () => void, el: HTMLElement | null = sel) => {
    begin(el);
    fn();
    commit();
  };
  /* ---------- notes ---------- */
  type Note = { id: string; x: number; y: number; nid?: string; text: string; by?: string; at: number };
  const boardOf = (sheet: Element | undefined) => sheet?.firstElementChild as HTMLElement | null;
  const notesOf = (sheet: Element | undefined): Note[] => {
    const tag = boardOf(sheet)?.querySelector(":scope > script.bk-notes");
    try { return tag ? (JSON.parse(tag.textContent || "[]") as Note[]) : []; } catch { return []; }
  };
  const writeNotes = (sheet: Element, list: Note[]) => {
    const board = boardOf(sheet);
    if (!board) return;
    let tag = board.querySelector(":scope > script.bk-notes") as HTMLScriptElement | null;
    if (!list.length) { tag?.remove(); return; }
    if (!tag) {
      tag = document.createElement("script");
      tag.type = "application/json";
      tag.className = "bk-notes";
      board.appendChild(tag);
    }
    tag.textContent = JSON.stringify(list).replace(/</g, "\\u003c");
  };
  const noteTarget = (sheet: Element | undefined, n: { x: number; y: number; nid?: string }) => {
    if (!sheet) return null;
    if (n.nid) {
      const el = sheet.querySelector(`[data-nid="${n.nid}"]`) as HTMLElement | null;
      if (el) return el;
    }
    // a note on a spot: the piece of the page under it
    const r = sheet.getBoundingClientRect();
    const k = r.width / PAGE_W;
    const hit = document.elementsFromPoint(r.left + n.x * k, r.top + n.y * k).find((e) => sheet.contains(e) && e !== sheet && e !== boardOf(sheet)) as HTMLElement | undefined;
    return hit ? itemOf(hit) : null;
  };
  const userName = () => { try { return localStorage.getItem("boss-flyer-user") || ""; } catch { return ""; } };
  const openNoteFor = (page: number, n: Note) => { setNoteOpen({ page, id: n.id, x: n.x, y: n.y, nid: n.nid }); setNoteDraft(n.text); setNoteMsg(""); };
  const startNoteOn = (item: HTMLElement) => {
    const sheet = item.closest("section.sheet");
    if (!sheet) return;
    const r = sheet.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    const k = r.width / PAGE_W;
    setNoteOpen({ page: pageOf(item), id: null, x: Math.round((ir.right - r.left) / k), y: Math.round((ir.top - r.top) / k), nid: "pending" });
    setNoteDraft("");
    setNoteMsg("");
    noteItem.current = item;
  };
  const noteItem = useRef<HTMLElement | null>(null);
  /** Saves the open note (new or edited). Returns the saved note. */
  const saveNote = (): Note | null => {
    const o = noteOpen;
    const sheet = o ? sheetAt(o.page) : undefined;
    if (!o || !sheet || !noteDraft.trim()) return null;
    const list = notesOf(sheet);
    let note: Note;
    act(() => {
      if (o.id) {
        note = { ...list.find((n) => n.id === o.id)!, text: noteDraft.trim() };
        writeNotes(sheet, list.map((n) => (n.id === o.id ? note : n)));
      } else {
        const id = `n${Date.now().toString(36)}`;
        let nid: string | undefined;
        if (o.nid === "pending" && noteItem.current?.isConnected) {
          nid = noteItem.current.dataset.nid || id;
          noteItem.current.dataset.nid = nid;
        }
        note = { id, x: o.x, y: o.y, nid, text: noteDraft.trim(), by: userName(), at: Date.now() };
        writeNotes(sheet, [...list, note]);
      }
    }, boardOf(sheet));
    setNoteOpen((cur) => (cur ? { ...cur, id: note!.id } : cur));
    return note!;
  };
  const deleteNote = (page: number, id: string) => {
    const sheet = sheetAt(page);
    if (!sheet) return;
    act(() => writeNotes(sheet, notesOf(sheet).filter((n) => n.id !== id)), boardOf(sheet));
    setNoteOpen(null);
  };
  const noteWithAi = async () => {
    const saved = saveNote();
    const o = noteOpen;
    if (!saved || !o) return;
    const sheet = sheetAt(o.page);
    const item = noteTarget(sheet, saved);
    const target = item ? textOf(item) || item : null;
    if (!target) { setNoteMsg("Put the note on a piece of text or a box so AI knows what to change."); return; }
    setNoteBusy(true);
    setNoteMsg("");
    const res = await runAi(target, saved.text);
    setNoteBusy(false);
    if (res.ok) {
      deleteNote(o.page, saved.id);
      setAiNote(res.note);
    } else setNoteMsg(res.note);
  };

  const step = (from: Snap[], to: Snap[]) => {
    const s = from.pop();
    if (!s) return;
    const sheet = sheetAt(s.page);
    if (!sheet) return;
    to.push({ page: s.page, html: sheet.innerHTML });
    clearSel();
    sheet.innerHTML = s.html;
    save();
    force((n) => n + 1);
  };

  // ---------- selection (works like Figma: hover shows a pencil, click selects, drag moves, double-click types) ----------
  /** The layer you clicked: the item that sits directly on the page (text, photo, shape or a cropped frame). */
  const itemOf = (t: HTMLElement | null): HTMLElement | null => {
    const sheet = t?.closest?.("section.sheet");
    const board = sheet?.firstElementChild;
    if (!t || !sheet || !board) return null;
    let n: HTMLElement | null = t;
    while (n && n.parentElement && n.parentElement !== board) n = n.parentElement;
    return n && n.parentElement === board ? n : null;
  };
  const textOf = (box: HTMLElement | null) =>
    !box ? null : box.dataset.kind === "text" ? box : (box.querySelector('[data-kind="text"]') as HTMLElement | null);
  const photoOf = (box: HTMLElement | null) =>
    !box ? null : box.tagName === "IMG" ? (box as HTMLImageElement) : (box.querySelector("img") as HTMLImageElement | null);

  const stopEditing = () => {
    stage.current?.querySelectorAll('[contenteditable="true"]').forEach((e) => {
      (e as HTMLElement).contentEditable = "false";
    });
    setEditing(null);
  };
  const clearSel = () => {
    stopEditing();
    setSel(null);
    setTyped("");
  };
  const pick = (el: HTMLElement) => {
    setSel(el);
    const t = textOf(el);
    setTyped(t && !photoOf(el) ? elementToTyped(t) : "");
  };
  const startEditing = (box: HTMLElement, x?: number, y?: number) => {
    const t = textOf(box);
    if (!t) return;
    pick(box);
    begin(t);
    t.contentEditable = "true";
    setEditing(t);
    t.focus();
    // caret where you double-clicked, otherwise at the end
    const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const r = x != null && y != null && doc.caretRangeFromPoint ? doc.caretRangeFromPoint(x, y) : null;
    const range = r && t.contains(r.startContainer) ? r : (() => { const k = document.createRange(); k.selectNodeContents(t); k.collapse(false); return k; })();
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(range);
  };

  useEffect(() => {
    const host = stage.current;
    const wrap = host?.parentElement;
    if (!host || !wrap || !ready) return;

    const move = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const dx = (e.clientX - drag.x) / zoom;
        const dy = (e.clientY - drag.y) / zoom;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        if (!drag.moved) { begin(drag.box); drag.moved = true; }
        drag.box.style.left = `${Math.round((drag.left + dx) * 2) / 2}px`;
        drag.box.style.top = `${Math.round((drag.top + dy) * 2) / 2}px`;
        tick((n) => n + 1);
        return;
      }
      const it = itemOf(e.target as HTMLElement);
      setHover((h) => (h === it ? h : it));
    };
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (noteMode) {
        e.preventDefault();
        setNoteMode(false);
        const sheet = t.closest?.("section.sheet");
        if (!sheet) return;
        const item = itemOf(t);
        if (item && item.offsetWidth < PAGE_W - 40) { startNoteOn(item); return; }
        const r = sheet.getBoundingClientRect();
        const k = r.width / PAGE_W;
        setNoteOpen({ page: pageOf(t), id: null, x: Math.round((e.clientX - r.left) / k), y: Math.round((e.clientY - r.top) / k) });
        setNoteDraft("");
        setNoteMsg("");
        return;
      }
      if (t.closest?.('[contenteditable="true"]')) return; // typing: let the caret move
      const box = itemOf(t);
      if (!box) { if (!t.closest?.(".bk-handle")) clearSel(); return; }
      e.preventDefault();
      if (editing) editing.blur();
      if (box !== sel) pick(box);
      dragRef.current = { box, x: e.clientX, y: e.clientY, left: parseFloat(box.style.left || "0"), top: parseFloat(box.style.top || "0"), moved: false };
    };
    const up = () => {
      if (dragRef.current?.moved) commit();
      dragRef.current = null;
    };
    const dbl = (e: MouseEvent) => {
      const box = itemOf(e.target as HTMLElement);
      if (box && textOf(box)) startEditing(box, e.clientX, e.clientY);
    };
    const input = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.scrollHeight > t.clientHeight + 1) t.style.height = `${t.scrollHeight}px`; // grow instead of cutting text off
      tick((n) => n + 1);
    };
    const out = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el?.getAttribute?.("contenteditable") === "true") {
        el.contentEditable = "false";
        setEditing(null);
        commit();
        const box = itemOf(el);
        const t = textOf(box);
        if (t) setTyped(elementToTyped(t));
      }
    };
    const keys = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = (e.target as HTMLElement)?.getAttribute?.("contenteditable") === "true"
        || tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !(typing && tag !== "DIV")) {
        e.preventDefault();
        (e.target as HTMLElement)?.blur?.();
        e.shiftKey ? step(future.current, past.current) : step(past.current, future.current);
        return;
      }
      if (typing) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (!sel) return;
      if (e.key === "Escape") { clearSel(); return; }
      if (e.key === "Enter" && textOf(sel)) { e.preventDefault(); startEditing(sel); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(); return; }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        act(() => {
          const left = parseFloat(sel.style.left || "0");
          const top = parseFloat(sel.style.top || "0");
          if (e.key === "ArrowLeft") sel.style.left = `${left - d}px`;
          if (e.key === "ArrowRight") sel.style.left = `${left + d}px`;
          if (e.key === "ArrowUp") sel.style.top = `${top - d}px`;
          if (e.key === "ArrowDown") sel.style.top = `${top + d}px`;
        }, sel);
      }
    };
    const redraw = () => tick((n) => n + 1);
    const leave = () => setHover(null);

    host.addEventListener("mousemove", move);
    host.addEventListener("mouseleave", leave);
    host.addEventListener("mousedown", down);
    host.addEventListener("dblclick", dbl);
    host.addEventListener("input", input);
    host.addEventListener("focusout", out, true);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", keys);
    wrap.addEventListener("scroll", redraw);
    window.addEventListener("resize", redraw);
    return () => {
      host.removeEventListener("mousemove", move);
      host.removeEventListener("mouseleave", leave);
      host.removeEventListener("mousedown", down);
      host.removeEventListener("dblclick", dbl);
      host.removeEventListener("input", input);
      host.removeEventListener("focusout", out, true);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", keys);
      wrap.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
  }, [ready, sel, editing, zoom, noteMode]);           // eslint-disable-line react-hooks/exhaustive-deps

  /** Resize from a corner or side handle. */
  const startResize = (e: React.MouseEvent, dir: string) => {
    if (!sel) return;
    e.preventDefault();
    e.stopPropagation();
    const box = sel;
    const x0 = e.clientX, y0 = e.clientY;
    const l0 = parseFloat(box.style.left || "0"), t0 = parseFloat(box.style.top || "0");
    const w0 = box.offsetWidth, h0 = box.offsetHeight;
    const ratio = w0 / Math.max(1, h0);
    const isPhoto = !!photoOf(box) && !textOf(box);
    begin(box);
    const mv = (ev: MouseEvent) => {
      const dx = (ev.clientX - x0) / zoom, dy = (ev.clientY - y0) / zoom;
      let l = l0, t = t0, w = w0, h = h0;
      if (dir.includes("e")) w = w0 + dx;
      if (dir.includes("w")) { w = w0 - dx; l = l0 + dx; }
      if (dir.includes("s")) h = h0 + dy;
      if (dir.includes("n")) { h = h0 - dy; t = t0 + dy; }
      if (isPhoto && ev.shiftKey && dir.length === 2) { h = w / ratio; if (dir.includes("n")) t = t0 + (h0 - h); }
      w = Math.max(8, w); h = Math.max(4, h);
      box.style.left = `${Math.round(l)}px`; box.style.top = `${Math.round(t)}px`;
      box.style.width = `${Math.round(w)}px`; box.style.height = `${Math.round(h)}px`;
      // keep a cropped photo filling its frame
      if (box.dataset.kind === "frame") {
        const inner = box.firstElementChild as HTMLElement | null;
        if (inner && photoOf(box) && inner.offsetWidth >= w0 - 2 && inner.offsetHeight >= h0 - 2) { inner.style.width = `${Math.round(w)}px`; inner.style.height = `${Math.round(h)}px`; inner.style.left = "0px"; inner.style.top = "0px"; }
      }
      tick((n) => n + 1);
    };
    const upR = () => {
      window.removeEventListener("mousemove", mv);
      window.removeEventListener("mouseup", upR);
      commit();
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", upR);
  };

  const rectOf = (el: HTMLElement | null) => {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width || r.height ? r : null;
  };

  const positioned = (el: HTMLElement | null): HTMLElement | null => el;

  // ---------- text and block tools ----------
  const styleIt = (fn: (s: CSSStyleDeclaration) => void, target: HTMLElement | null = textOf(sel) || sel) => {
    if (!target) return;
    act(() => fn(target.style), target);
  };
  const fontStep = (d: number) => {
    if (!sel) return;
    const now = parseFloat(getComputedStyle(textOf(sel) || sel).fontSize) || 14;
    styleIt((s) => { s.fontSize = `${Math.max(6, now + d)}px`; });
  };
  const applyTyped = () => {
    const t = textOf(sel);
    if (!t) return;
    act(() => {
      t.innerHTML = isBamini(t) ? typedToBookletHtml(typed) : esc(typed).replace(/\n/g, "<br>");
    }, t);
  };
  const duplicate = () => {
    const box = positioned(sel) || sel;
    if (!box || !box.parentElement) return;
    act(() => {
      const copy = box.cloneNode(true) as HTMLElement;
      copy.classList.remove("bk-sel");
      copy.style.left = `${parseFloat(box.style.left || "0") + 16}px`;
      copy.style.top = `${parseFloat(box.style.top || "0") + 16}px`;
      box.parentElement!.appendChild(copy);
    }, box);
  };
  const remove = () => {
    const box = positioned(sel) || sel;
    if (!box) return;
    begin(box);
    const page = pageOf(box);
    box.remove();
    const snap = pending.current;
    pending.current = null;
    if (snap) {
      past.current.push(snap);
      future.current = [];
      save();
    }
    clearSel();
    void page;
    force((n) => n + 1);
  };
  const addText = () => {
    const sheet = sheetAt(currentPage() - 1);
    if (!sheet) return;
    const board = (sheet.firstElementChild as HTMLElement) || sheet;
    begin(board);
    const d = document.createElement("div");
    d.setAttribute(
      "style",
      "position: absolute; left: 72px; top: 480px; width: 400px; font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 600; color: #22343F",
    );
    d.dataset.kind = "text";
    d.textContent = "New text";
    board.appendChild(d);
    commit();
    pick(d);
  };

  // ---------- ask for a change in words (uses the OpenAI key on this site) ----------
  /** Asks AI to change one element as described; applies the answer (undo works). */
  const runAi = async (target: HTMLElement, instruction: string): Promise<{ ok: boolean; note: string; text?: string }> => {
    try {
      const r = await fetch("/api/booklet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          text: isBamini(target) ? elementToTyped(target) : target.innerText,
          style: target.getAttribute("style") || "",
          tag: target.tagName.toLowerCase(),
          context: doc ? "flyer" : "booklet",
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) return { ok: false, note: d.error || "Something went wrong." };
      const fresh = typeof d.text === "string" && d.text.trim() ? (d.text as string) : "";
      act(() => {
        if (fresh) target.innerHTML = isBamini(target) ? typedToBookletHtml(fresh) : esc(fresh).replace(/\n/g, "<br>");
        (d.style || []).forEach((x: { property: string; value: string }) => {
          try { target.style.setProperty(x.property, x.value); } catch { /* ignore a property the browser does not know */ }
        });
      }, target);
      return { ok: true, note: d.note || "Done.", text: fresh };
    } catch {
      return { ok: false, note: "Could not reach the server." };
    }
  };
  const askAi = async () => {
    const target = textOf(sel) || sel;
    if (!target || !ask.trim()) return;
    setBusy("ai");
    setAiNote("");
    const res = await runAi(target, ask);
    setBusy("");
    setAiNote(res.note);
    if (res.ok) {
      if (res.text) setTyped(res.text);
      setAsk("");
    }
  };

  // ---------- pictures ----------
  const fileRef = useRef<HTMLInputElement>(null);
  const replacePhoto = async (file: File) => {
    const img = photoOf(sel);
    if (!img) return;
    setBusy("Adding photo");
    try {
      // Print-quality size (pages print at up to ~2,600 px wide), then store it in the team library.
      const src = await shrinkPhoto(file, 2400);
      let url = src;
      if (cloud.current) {
        const res = await fetch(docUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: src }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.url) url = data.url;
      }
      act(() => { img.src = url; }, img);
    } finally {
      setBusy("");
    }
  };
  const photoPos = (axis: "x" | "y", v: number) => {
    const img = photoOf(sel);
    if (!img) return;
    const cur = (getComputedStyle(img).objectPosition || "50% 50%").split(" ");
    const x = axis === "x" ? `${v}%` : cur[0] || "50%";
    const y = axis === "y" ? `${v}%` : cur[1] || "50%";
    styleIt((s) => { s.objectPosition = `${x} ${y}`; }, img);
  };
  const posValue = (axis: "x" | "y") => {
    const img = photoOf(sel);
    if (!img) return 50;
    const cur = (getComputedStyle(img).objectPosition || "50% 50%").split(" ");
    return parseFloat(axis === "x" ? cur[0] : cur[1]) || 50;
  };

  // ---------- page helpers ----------
  const currentPage = () => {
    const host = stage.current?.parentElement;
    if (!host) return 1;
    const sheets = [...(stage.current?.querySelectorAll("section.sheet") || [])] as HTMLElement[];
    const mid = host.scrollTop + host.clientHeight / 2;
    let best = 1;
    sheets.forEach((s, i) => { if (s.offsetTop * zoom < mid) best = i + 1; });
    return best;
  };
  const goto = (n: number) => {
    const s = sheetAt(n - 1);
    s?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---------- exports ----------
  const assetsToData = async (html: string) => {
    const urls = [...new Set(html.match(/\/booklet\/assets\/[A-Za-z0-9.]+/g) || [])];
    let out = html;
    for (const u of urls) {
      const blob = await fetch(u).then((r) => r.blob());
      const data: string = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(blob);
      });
      out = out.split(u).join(data);
    }
    return out;
  };
  const downloadHtml = async () => {
    if (!stage.current) return;
    setBusy("html");
    try {
      const css = await fetch(CSS).then((r) => r.text());
      const body = await assetsToData(stage.current.innerHTML);
      const style = await assetsToData(css);
      const html = `<!doctype html><html lang="${doc ? "en" : lang}"><head><meta charset="utf-8">`
        + `<title>${doc ? doc.title : `BOSS CS Company Profile (${NAMES[lang]})`}</title><style>${style}`
        + `@page{size:${PAGE_W}px ${PAGE_H}px;margin:0}html,body{margin:0}`
        + `.sheet{width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;break-after:page}`
        + `.sheet:last-child{break-after:auto}</style></head><body>${body}</body></html>`;
      saveBlob(new Blob([html], { type: "text/html" }), doc ? `${docName}.html` : `BOSS-CS-Company-Profile-${NAMES[lang]}.html`);
    } finally {
      setBusy("");
    }
  };
  const downloadPng = async () => {
    const sheet = sheetAt(currentPage() - 1);
    if (!sheet) return;
    setBusy("png");
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(sheet, { width: PAGE_W, height: PAGE_H, pixelRatio: 3.125, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = doc ? `${docName}.png` : `BOSS-booklet-${lang}-page-${String(currentPage()).padStart(2, "0")}.png`;
      a.click();
    } finally {
      setBusy("");
    }
  };
  const downloadPdf = async () => {
    const sheets = [...(stage.current?.querySelectorAll("section.sheet") || [])] as HTMLElement[];
    if (!sheets.length) return;
    try {
      const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [PAGE_W, PAGE_H] });
      for (let i = 0; i < sheets.length; i++) {
        setBusy(`pdf ${i + 1}/${sheets.length}`);
        const url = await toJpeg(sheets[i], { width: PAGE_W, height: PAGE_H, pixelRatio: 2, quality: 0.92, cacheBust: true });
        if (i) pdf.addPage([PAGE_W, PAGE_H], "portrait");
        pdf.addImage(url, "JPEG", 0, 0, PAGE_W, PAGE_H);
      }
      pdf.save(doc ? `${docName}.pdf` : `BOSS-CS-Company-Profile-${NAMES[lang]}.pdf`);
    } finally {
      setBusy("");
    }
  };
  const saveBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const reset = async () => {
    if (!confirm(cloud.current ? `Put every page of the ${NAMES[lang]} booklet back to the original for the whole team? The edited copy is moved to the trash folder in storage.` : `Put every page of the ${NAMES[lang]} booklet back to the original? Your changes in this browser are lost.`)) return;
    await del(KEY).catch(() => null);
    if (cloud.current) {
      await fetch(docUrl, { method: "DELETE" }).catch(() => null);
      etag.current = null;
    }
    const html = await fetch(SRC, { cache: "reload" }).then((r) => r.text());
    if (!stage.current) return;
    clearSel();
    past.current = [];
    future.current = [];
    stage.current.innerHTML = html;
    setEdited(false);
    setSaveState("idle");
  };

  const isImg = !!photoOf(sel) && !textOf(sel);
  const allNotes: { page: number; n: Note; num: number }[] = [];
  if (ready && stage.current) {
    let num = 0;
    stage.current.querySelectorAll("section.sheet").forEach((sh, page) => notesOf(sh).forEach((n) => allNotes.push({ page, n, num: ++num })));
  }
  const pinAt = (page: number, n: { x: number; y: number; nid?: string }) => {
    const sheet = sheetAt(page);
    if (!sheet) return null;
    if (n.nid && n.nid !== "pending") {
      const el = sheet.querySelector(`[data-nid="${n.nid}"]`) as HTMLElement | null;
      if (el) { const r = el.getBoundingClientRect(); return { x: r.right - 4, y: r.top - 10 }; }
    }
    const r = sheet.getBoundingClientRect();
    const k = r.width / PAGE_W;
    return { x: r.left + n.x * k, y: r.top + n.y * k };
  };
  const selRect = rectOf(sel);
  const hoverRect = hover && hover !== sel ? rectOf(hover) : null;

  return (
    <div className="app bk-app">
      <link rel="stylesheet" href={CSS} />
      <header className="topbar">
        <a className="back-link" href={doc ? "/flyers/general" : "/"} title="Back"><ArrowLeft size={18} /></a>
        <a className="brand-mark" href={doc ? "/flyers/general" : "/"}>
          <img src="/logo-navy.svg" alt="" />
          <span>{doc ? doc.title : "Company profile booklet"}</span>
        </a>
        <span className={`save-state ${cloud.current ? "cloud" : "local"}`} title={cloudNote || undefined}>
          {cloudNote ? "Not saved to team library" : saveState === "saving" ? "Saving…" : edited ? (cloud.current ? "Saved to team library" : "Saved in this browser") : doc ? "" : "Original booklet"}
        </span>
        {cloudNote ? <span className="save-state local" style={{ maxWidth: 360, whiteSpace: "normal" }}>{cloudNote}</span> : null}
        <div className="top-actions">
          <a className="btn" href="/" title="All BOSS tools"><Home size={15} /> Home</a>
          {doc ? (
            <a className="btn" href="/flyers/general"><LayoutGrid size={15} /> All general flyers</a>
          ) : (
            <div className="bk-lang" role="group" aria-label="Booklet language">
              <button type="button" className={lang === "ta" ? "on" : ""} onClick={() => setLang("ta")}>தமிழ்</button>
              <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>English</button>
            </div>
          )}
          <div className="undo-group">
            <button type="button" className="btn icon-only" title="Undo (Cmd/Ctrl + Z)"
              disabled={!past.current.length} onClick={() => step(past.current, future.current)}>
              <Undo2 size={15} />
            </button>
            <button type="button" className="btn icon-only" title="Redo (Cmd/Ctrl + Shift + Z)"
              disabled={!future.current.length} onClick={() => step(future.current, past.current)}>
              <Redo2 size={15} />
            </button>
          </div>
          <span className="sep" />
          <button type="button" className="btn icon-only" title="Smaller view" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>
            <ZoomOut size={15} />
          </button>
          <span className="bk-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn icon-only" title="Bigger view" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
            <ZoomIn size={15} />
          </button>
          <span className="sep" />
          <button type="button" className="btn primary" disabled={!!busy} onClick={downloadPdf}>
            <FileDown size={15} /> {busy.startsWith("pdf") ? busy.toUpperCase() : "PDF"}
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={downloadPng} title="300 dpi image of the page you are on">
            <ImageDown size={15} /> PNG
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={downloadHtml} title="One file with the fonts and photos inside">
            <Save size={15} /> {busy === "html" ? "Building…" : "HTML"}
          </button>
          <button type="button" className="btn" onClick={() => window.print()} title="Print, or Save as PDF with sharp text">
            <Printer size={15} /> Print
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar bk-side">
          <div className="panel-scroll">
            <div className="card open">
              <div className="card-body">
                <div className="bk-row">
                  <button type="button" className="btn" onClick={addText}><Type size={14} /> Add text</button>
                  <button type="button" className="btn" onClick={duplicate} disabled={!sel}><Copy size={14} /> Copy</button>
                  <button type="button" className="btn" onClick={remove} disabled={!sel}><Trash2 size={14} /> Delete</button>
                  <button type="button" className={`btn ${noteMode ? "on" : ""}`} title="Add a note"
                    onClick={() => { if (sel) startNoteOn(sel); else setNoteMode((m) => !m); }}>
                    <MessageSquarePlus size={14} /> Note
                  </button>
                </div>
                {noteMode && <p className="bk-hint">Click the spot or the piece the note is about.</p>}
              </div>
            </div>

            {allNotes.length > 0 && (
              <div className="card open">
                <div className="card-head"><div className="card-toggle">Notes · {allNotes.length}</div></div>
                <div className="card-body bk-notes-list">
                  {allNotes.map(({ page, n, num }) => (
                    <button key={n.id} type="button" className="bk-note-row" onClick={() => { sheetAt(page)?.scrollIntoView({ behavior: "smooth", block: "center" }); openNoteFor(page, n); }}>
                      <span className="bk-note-num">{num}</span>
                      <span className="bk-note-text">{n.text}</span>
                      {!doc && <span className="bk-note-page">p. {page + 1}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sel && (
              <div className="card open">
                <div className="card-head"><div className="card-toggle">Ask for a change</div></div>
                <div className="card-body">
                  <textarea className="input" rows={3} value={ask} placeholder="e.g. make this shorter"
                    onChange={(e) => setAsk(e.target.value)} />
                  <button type="button" className="btn primary" disabled={busy === "ai" || !ask.trim()} onClick={askAi}>
                    {busy === "ai" ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />} Make the change
                  </button>
                  {aiNote && <p className="bk-hint">{aiNote}</p>}
                </div>
              </div>
            )}

            {sel && !isImg && (
              <div className="card open">
                <div className="card-head"><div className="card-toggle">Text</div></div>
                <div className="card-body">
                  <div className="bk-row">
                    <button type="button" className="btn icon-only" title="Bold"
                      onClick={() => styleIt((s) => { s.fontWeight = s.fontWeight === "700" ? "" : "700"; })}><Bold size={14} /></button>
                    <button type="button" className="btn icon-only" title="Italic"
                      onClick={() => styleIt((s) => { s.fontStyle = s.fontStyle === "italic" ? "" : "italic"; })}><Italic size={14} /></button>
                    <button type="button" className="btn icon-only" title="Smaller" onClick={() => fontStep(-0.5)}><Minus size={14} /></button>
                    <button type="button" className="btn icon-only" title="Bigger" onClick={() => fontStep(0.5)}><Plus size={14} /></button>
                    <button type="button" className="btn icon-only" title="Left" onClick={() => styleIt((s) => { s.textAlign = "left"; })}><AlignLeft size={14} /></button>
                    <button type="button" className="btn icon-only" title="Centre" onClick={() => styleIt((s) => { s.textAlign = "center"; })}><AlignCenter size={14} /></button>
                    <button type="button" className="btn icon-only" title="Right" onClick={() => styleIt((s) => { s.textAlign = "right"; })}><AlignRight size={14} /></button>
                  </div>
                  <div className="bk-row">
                    <label className="bk-color">Text
                      <input type="color" value={rgbToHex(sel ? getComputedStyle(textOf(sel) || sel).color : "#000")}
                        onChange={(e) => styleIt((s) => { s.color = e.target.value; })} />
                    </label>
                    <label className="bk-color">Background
                      <input type="color" value={rgbToHex(sel ? getComputedStyle(textOf(sel) || sel).backgroundColor : "#fff")}
                        onChange={(e) => styleIt((s) => { s.background = e.target.value; })} />
                    </label>
                  </div>
                  <label className="bk-label">
                    {isBamini(textOf(sel) || sel) ? "Tamil text (type normally, it is converted to the booklet font)" : "Text"}
                  </label>
                  <textarea className="input" rows={4} value={typed} onChange={(e) => setTyped(e.target.value)} />
                  <button type="button" className="btn primary" onClick={applyTyped}>Replace this text</button>
                </div>
              </div>
            )}

            {sel && isImg && (
              <div className="card open">
                <div className="card-head"><div className="card-toggle">Photo</div></div>
                <div className="card-body">
                  <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                    <ImageIcon size={14} /> Use my own photo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) replacePhoto(f); e.target.value = ""; }} />
                  <label className="bk-label">Move across</label>
                  <input type="range" min={0} max={100} value={posValue("x")} onChange={(e) => photoPos("x", +e.target.value)} />
                  <label className="bk-label">Move up and down (keep faces in view)</label>
                  <input type="range" min={0} max={100} value={posValue("y")} onChange={(e) => photoPos("y", +e.target.value)} />
                </div>
              </div>
            )}

            <div className="card open">
              <div className="card-head"><div className="card-toggle">Pages</div></div>
              <div className="card-body">
                <div className="bk-pages">
                  {Array.from({ length: count }, (_, i) => (
                    <button key={i} type="button" className="btn bk-page-btn" onClick={() => goto(i + 1)}>{i + 1}</button>
                  ))}
                </div>
                {!doc && <button type="button" className="btn" onClick={reset}><RotateCcw size={14} /> Back to the original</button>}
              </div>
            </div>
          </div>
        </aside>

        <div className="stage bk-stage-wrap">
          {!ready && <p className="stage-foot">Opening the booklet…</p>}
          <div ref={stage} className="bk-stage" style={{ zoom }} />
          {allNotes.map(({ page, n, num }) => {
            const p = pinAt(page, n);
            return p ? (
              <button key={n.id} type="button" className={`bk-pin${noteOpen?.id === n.id ? " on" : ""}`} style={{ left: p.x, top: p.y }} title={n.text}
                onMouseDown={(e) => e.stopPropagation()} onClick={() => openNoteFor(page, n)}>{num}</button>
            ) : null;
          })}
          {noteOpen && (() => {
            const p = pinAt(noteOpen.page, noteOpen);
            if (!p) return null;
            const existing = noteOpen.id ? notesOf(sheetAt(noteOpen.page)).find((n) => n.id === noteOpen.id) : null;
            return (
              <>
                {!noteOpen.id && <span className="bk-pin on" style={{ left: p.x, top: p.y }}>+</span>}
                <div className="bk-note-pop" style={{ left: Math.min(p.x + 20, window.innerWidth - 340), top: Math.min(p.y - 8, window.innerHeight - 260) }} onMouseDown={(e) => e.stopPropagation()}>
                  <div className="bk-note-head">
                    <span>{existing ? `${existing.by ? existing.by + " · " : ""}${new Date(existing.at).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "New note"}</span>
                    <button type="button" className="icon-btn" onClick={() => setNoteOpen(null)} aria-label="Close"><X size={14} /></button>
                  </div>
                  <textarea className="input" rows={3} autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="e.g. make this heading bigger and red" />
                  {noteMsg && <p className="bk-note-msg">{noteMsg}</p>}
                  <div className="bk-note-actions">
                    <button type="button" className="btn" disabled={!noteDraft.trim() || noteBusy} onClick={() => { if (saveNote()) setNoteOpen(null); }}>Save note</button>
                    <button type="button" className="btn primary" disabled={!noteDraft.trim() || noteBusy} onClick={noteWithAi}>
                      <Sparkles size={14} /> {noteBusy ? "Changing…" : "Make the change with AI"}
                    </button>
                    {existing && <button type="button" className="btn icon-only" title="Delete note" onClick={() => deleteNote(noteOpen.page, existing.id)}><Trash2 size={14} /></button>}
                  </div>
                </div>
              </>
            );
          })()}
          {hoverRect && !editing && (
            <div className="bk-hover" style={{ left: hoverRect.left, top: hoverRect.top, width: hoverRect.width, height: hoverRect.height }}>
              <button type="button" className="bk-pencil" title={hover && textOf(hover) ? "Edit this text" : "Select"}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (!hover) return; if (textOf(hover)) startEditing(hover); else pick(hover); }}>
                <Pencil size={12} />
              </button>
            </div>
          )}
          {selRect && (
            <div className={`bk-selbox${editing ? " typing" : ""}`} style={{ left: selRect.left, top: selRect.top, width: selRect.width, height: selRect.height }}>
              {!editing && ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((d) => (
                <span key={d} className={`bk-handle h-${d}`} onMouseDown={(e) => startResize(e, d)} />
              ))}
              {!editing && textOf(sel) && (
                <button type="button" className="bk-pencil sel" title="Edit text (double-click or Enter)"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); if (sel) startEditing(sel); }}>
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function rgbToHex(c: string) {
  if (/rgba\([^)]*,\s*0\)/.test(c) || c === "transparent") return "#ffffff";
  const m = c.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return c.startsWith("#") ? c : "#000000";
  return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
}

/** Reads a photo, scales it down to `max` px on the long side and returns a JPEG data URL. */
function shrinkPhoto(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Could not read the photo"));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(r.result));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        if (k === 1 && file.size < 1_500_000) return resolve(String(r.result));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.9));
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}
