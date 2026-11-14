"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, CloudOff, Redo2, Undo2, Copy, Download, FileDown, FileUp, FolderOpen, ImageDown, Plus, Printer, RefreshCw, Search, Sparkles, Trash2, Upload, Users, X } from "lucide-react";
import Flyer, { FLYER_H, FLYER_W, type FitInfo, type FlyerHandle } from "./Flyer";
import { BrandPanel, ContentPanel, DesignPanel, PhotoPanel } from "./Panels";
import { Toggle } from "./ui";
import { buildImagePrompt } from "@/lib/prompt";
import { TEMPLATES, defaultDesign, newId, projectFromTemplate } from "@/lib/samples";
import { deleteProject, lastProjectId, listProjects, loadDefaultBrand, loadProject, saveDefaultBrand, saveProject } from "@/lib/storage";
import { exportJson, exportPdf, exportPng, exportSocialJpg } from "@/lib/exporters";
import { getStatus, getUserName, setUserName, teamDelete, teamList, teamLoad, teamSave, type TeamSummary } from "@/lib/teamApi";
import { emptyContent, type Project } from "@/lib/types";

type Tab = "start" | "content" | "photo" | "design" | "brand";

function blankProject(): Project {
  return { id: newId(), name: "New flyer", updatedAt: Date.now(), content: emptyContent(), design: defaultDesign(), brand: loadDefaultBrand() };
}

export default function Studio() {
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("start");
  const [pasted, setPasted] = useState("");
  const [alsoPhoto, setAlsoPhoto] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [fit, setFit] = useState<FitInfo>({ k: 1, overflow: 0, heroOverflow: false });
  const [library, setLibrary] = useState<Project[] | null>(null);
  const [scale, setScale] = useState(0.6);
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState("");
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState<{ project: Project; etag: string } | null>(null);
  const [team, setTeam] = useState<TeamSummary[] | null>(null);
  const [teamQuery, setTeamQuery] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [userName, setUserNameState] = useState("");
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const etags = useRef<Map<string, string>>(new Map());
  const lastSaved = useRef<string>("");
  const saveSeq = useRef(0);
  const flyerRef = useRef<FlyerHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // load the last flyer (team library first, then this browser), or start from the PSW template
  useEffect(() => {
    (async () => {
      const status = await getStatus();
      setCloud(status.cloud);
      const name = getUserName();
      setUserNameState(name);
      if (status.cloud && !name) setAskName(true);
      const id = lastProjectId();
      let p: Project | undefined;
      if (id && status.cloud) {
        try {
          const r = await teamLoad(id);
          if (r) {
            etags.current.set(r.project.id, r.etag);
            lastSaved.current = JSON.stringify(r.project);
            p = r.project;
          }
        } catch {}
      }
      if (!p && id) p = await loadProject(id);
      if (p) {
        setProject(p);
        setTab("content");
      } else {
        const t = projectFromTemplate(TEMPLATES[3]);
        t.brand = loadDefaultBrand();
        lastSaved.current = JSON.stringify(t);
        setProject(t);
      }
    })();
  }, []);

  /** Save to the team library (and keep a copy in this browser). */
  const saveNow = useCallback(
    async (p: Project, opts: { etag?: string | null; force?: boolean } = {}) => {
      const snapshot = JSON.stringify(p);
      // untouched starters and unchanged flyers are not saved
      if (!opts.force && snapshot === lastSaved.current) return;
      saveProject(p).catch(() => {});
      if (!cloud) {
        lastSaved.current = snapshot;
        return;
      }
      const seq = ++saveSeq.current;
      setSaveState("saving");
      const name = getUserName();
      const payload: Project = { ...p, updatedBy: name || p.updatedBy, createdBy: p.createdBy || name };
      const etag = opts.etag !== undefined ? opts.etag : etags.current.get(p.id) || null;
      const r = await teamSave(payload, etag);
      if (seq !== saveSeq.current && r.ok) {
        etags.current.set(p.id, r.etag);
        return;
      }
      if (r.ok) {
        etags.current.set(p.id, r.etag);
        setSaveState("saved");
        setSaveError("");
        setProject((cur) => {
          if (!cur || cur.id !== p.id) return cur;
          const next = { ...cur, updatedBy: r.project.updatedBy, createdBy: r.project.createdBy };
          // the server swaps an inline photo for a stored file; adopt it if the photo has not changed since
          if (cur.design.photo.src === p.design.photo.src && r.project.design.photo.src !== p.design.photo.src) {
            next.design = { ...cur.design, photo: { ...cur.design.photo, src: r.project.design.photo.src } };
          }
          lastSaved.current = JSON.stringify(next);
          return next;
        });
      } else if (r.conflict) {
        setSaveState("conflict");
        setConflict(r.current);
      } else {
        setSaveState("error");
        setSaveError(r.error);
      }
    },
    [cloud],
  );

  // autosave
  useEffect(() => {
    if (!project || cloud === null || saveState === "conflict") return;
    const h = setTimeout(() => saveNow(project), cloud ? 1200 : 600);
    return () => clearTimeout(h);
  }, [project, cloud, saveState, saveNow]);

  // retry failed saves every 15 seconds
  useEffect(() => {
    if (saveState !== "error" || !project) return;
    const h = setTimeout(() => saveNow(project, { force: true }), 15000);
    return () => clearTimeout(h);
  }, [saveState, project, saveNow]);

  const openProject = (p: Project, etag?: string) => {
    if (etag) etags.current.set(p.id, etag);
    lastSaved.current = etag ? JSON.stringify(p) : "";
    setConflict(null);
    setSaveState(etag ? "saved" : "idle");
    setProject(p);
    setMissing([]);
    setTab("content");
  };

  const startBlank = () => {
    const p = blankProject();
    lastSaved.current = JSON.stringify(p);
    setConflict(null);
    setSaveState("idle");
    setProject(p);
    setTab("start");
  };

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      setTeam(await teamList());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the team library.");
    } finally {
      setTeamLoading(false);
    }
  };

  // preview scale
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(0.25, Math.min((r.width - 48) / FLYER_W, (r.height - 110) / FLYER_H, 1.2)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [project === null]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  /* ---------- undo / redo ---------- */
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;
  const past = useRef<Project[]>([]);
  const future = useRef<Project[]>([]);
  const lastPush = useRef({ key: "", at: 0 });
  const historyId = useRef<string>("");
  const [, setHistTick] = useState(0);

  // a different flyer starts a fresh history
  if (project && historyId.current !== project.id) {
    historyId.current = project.id;
    past.current = [];
    future.current = [];
    lastPush.current = { key: "", at: 0 };
  }

  /** Remember the current state before a change. Quick edits to the same field are grouped. */
  const remember = useCallback((key: string) => {
    const cur = projectRef.current;
    if (!cur) return;
    const now = Date.now();
    if (key && key === lastPush.current.key && now - lastPush.current.at < 900) {
      lastPush.current.at = now;
      return;
    }
    past.current.push(cur);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    lastPush.current = { key, at: now };
    setHistTick((n) => n + 1);
  }, []);

  const changeKey = (patch: Partial<Project>) => {
    const cur = projectRef.current;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(patch)) {
      const before = cur ? (cur as unknown as Record<string, unknown>)[k] : undefined;
      if (v && before && typeof v === "object") {
        const changed = Object.keys(v).find((sub) => (v as unknown as Record<string, unknown>)[sub] !== (before as Record<string, unknown>)[sub]);
        parts.push(`${k}.${changed || ""}`);
      } else parts.push(k);
    }
    return parts.join(",");
  };

  const update = useCallback((patch: Partial<Project>) => {
    remember(changeKey(patch));
    setProject((p) => (p ? { ...p, ...patch, updatedAt: Date.now() } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remember]);

  const undo = useCallback(() => {
    const cur = projectRef.current;
    const prev = past.current.pop();
    if (!cur || !prev) return;
    future.current.push(cur);
    lastPush.current = { key: "", at: 0 };
    setProject({ ...prev, updatedAt: Date.now() });
    setHistTick((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const cur = projectRef.current;
    const next = future.current.pop();
    if (!cur || !next) return;
    past.current.push(cur);
    lastPush.current = { key: "", at: 0 };
    setProject({ ...next, updatedAt: Date.now() });
    setHistTick((n) => n + 1);
  }, []);

  // keyboard shortcuts (text boxes keep their own undo while you type in them)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const generatePhoto = useCallback(async (p: Project) => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: buildImagePrompt(p.content.photoScene, p.design.palette) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo generation failed.");
      if (projectRef.current?.id === p.id) remember("photo");
      setProject((cur) => (cur && cur.id === p.id ? { ...cur, design: { ...cur.design, photo: { src: data.image, x: 50, y: 35, zoom: 1 } }, updatedAt: Date.now() } : cur));
      flash("Photo added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [remember]);

  const runParse = async () => {
    if (!project) return;
    setParsing(true);
    setError("");
    setMissing([]);
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pasted }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the course information.");
      const next: Project = {
        ...project,
        name: data.content.programName || project.name,
        content: { ...data.content, titles: project.content.titles },
        design: { ...project.design, photo: { ...project.design.photo, src: "" } },
        updatedAt: Date.now(),
      };
      remember("ai-fill");
      setProject(next);
      setMissing(data.missing || []);
      setTab("content");
      flash("Flyer filled in. Check every fact before printing.");
      if (alsoPhoto && next.content.photoScene) generatePhoto(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setParsing(false);
    }
  };

  const doExport = async (kind: "png" | "pdf" | "jpg") => {
    const node = flyerRef.current?.node;
    if (!node || !project) return;
    setBusy(kind);
    setError("");
    try {
      if (kind === "png") await exportPng(node, project.name);
      else if (kind === "pdf") await exportPdf(node, project.name);
      else await exportSocialJpg(node, project.name);
    } catch (e) {
      setError(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy("");
    }
  };

  const openLibrary = async () => {
    setLibrary(await listProjects());
    if (cloud) loadTeam();
  };

  if (!project) return <div className="loading">Loading…</div>;

  const scaledW = FLYER_W * scale;
  const scaledH = FLYER_H * scale;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-navy.svg" alt="BOSS" />
          <span>Flyer Studio</span>
        </div>
        <input className="input name-input" value={project.name} onChange={(e) => update({ name: e.target.value })} aria-label="Flyer name" />
        {cloud ? (
          <span className={`save-state ${saveState}`} title={saveError || undefined}>
            {saveState === "saving" ? <><RefreshCw size={13} className="spin" /> Saving…</> : null}
            {saveState === "saved" ? <><Check size={13} /> Saved to team library</> : null}
            {saveState === "idle" ? <><Users size={13} /> Team library</> : null}
            {saveState === "error" ? <><CloudOff size={13} /> Not saved, retrying</> : null}
            {saveState === "conflict" ? <><CloudOff size={13} /> Needs your choice</> : null}
          </span>
        ) : cloud === false ? (
          <span className="save-state local" title="Ask your admin to connect Vercel Blob storage to share flyers">Saved on this computer only</span>
        ) : null}
        <div className="top-actions">
          <div className="undo-group">
            <button type="button" className="btn icon-only" onClick={undo} disabled={past.current.length === 0} title="Undo (Cmd/Ctrl + Z)" aria-label="Undo">
              <Undo2 size={16} />
            </button>
            <button type="button" className="btn icon-only" onClick={redo} disabled={future.current.length === 0} title="Redo (Cmd/Ctrl + Shift + Z)" aria-label="Redo">
              <Redo2 size={16} />
            </button>
          </div>
          <span className="sep" />
          <button type="button" className="btn" onClick={() => { const p = blankProject(); lastSaved.current = JSON.stringify(p); setConflict(null); setSaveState("idle"); setProject(p); setPasted(""); setMissing([]); setTab("start"); }}>
            <Plus size={15} /> New
          </button>
          <button type="button" className="btn" onClick={openLibrary}>
            <FolderOpen size={15} /> {cloud ? "Team flyers" : "My flyers"}
          </button>
          <span className="sep" />
          <button type="button" className="btn primary" disabled={!!busy} onClick={() => doExport("pdf")}>
            {busy === "pdf" ? <RefreshCw size={15} className="spin" /> : <FileDown size={15} />} PDF
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => doExport("png")} title="300 dpi PNG for printing">
            {busy === "png" ? <RefreshCw size={15} className="spin" /> : <ImageDown size={15} />} PNG
          </button>
          <button type="button" className="btn" disabled={!!busy} onClick={() => doExport("jpg")} title="Smaller JPG for WhatsApp, email and social media">
            {busy === "jpg" ? <RefreshCw size={15} className="spin" /> : <Download size={15} />} Web JPG
          </button>
          <button type="button" className="btn" onClick={() => window.print()} title="Print, or Save as PDF with sharp vector text">
            <Printer size={15} /> Print
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <nav className="tabs" role="tablist">
            {([
              ["start", "1. Paste"],
              ["content", "2. Text"],
              ["photo", "3. Photo"],
              ["design", "4. Design"],
              ["brand", "Contact"],
            ] as [Tab, string][]).map(([id, label]) => (
              <button type="button" role="tab" aria-selected={tab === id} key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="panel-scroll">
            {error ? (
              <div className="note error">
                {error}
                <button type="button" className="icon-btn" onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button>
              </div>
            ) : null}
            {conflict !== undefined && saveState === "conflict" ? (
              <div className="note warn conflict">
                <b>{conflict ? `${conflict.project.updatedBy || "A teammate"} changed this flyer` : "This flyer was deleted"} while you were editing.</b>
                <span>Choose what to keep:</span>
                <div className="conflict-actions">
                  {conflict ? (
                    <button type="button" className="btn small" onClick={() => openProject(conflict.project, conflict.etag)}>Load their version</button>
                  ) : null}
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      const etag = conflict ? conflict.etag : null;
                      setConflict(null);
                      saveNow(project, { etag, force: true });
                    }}
                  >
                    Keep mine (replace theirs)
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      const copy: Project = { ...project, id: newId(), name: `${project.name} (my copy)`, createdBy: undefined, updatedAt: Date.now() };
                      lastSaved.current = "";
                      setConflict(null);
                      setSaveState("idle");
                      setProject(copy);
                    }}
                  >
                    Save mine as a copy
                  </button>
                </div>
              </div>
            ) : null}
            {saveState === "error" && saveError ? <div className="note warn">{saveError}</div> : null}
            {missing.length ? (
              <div className="note warn">
                <b>Not found in the text:</b> {missing.join(", ")}. Add them in the Text tab if you have them.
              </div>
            ) : null}

            {tab === "start" ? (
              <>
                <div className="card open">
                  <div className="card-body">
                    <h3 className="h3">Paste the course information</h3>
                    <p className="note">Paste anything: a brochure, a website page, an email or notes. AI fills in the flyer using only those facts. You can edit everything afterwards.</p>
                    <textarea className="input paste" rows={14} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Program: Personal Support Worker\nDuration: 6 months, 700 hours including 300 hours clinical placement\nFee: $5,500\nWhat you will learn: ...\nCareers: ...\nAdmission: ..."} />
                    <Toggle label="Also generate a photo" checked={alsoPhoto} onChange={setAlsoPhoto} />
                    <button type="button" className="btn primary wide" disabled={parsing || pasted.trim().length < 20} onClick={runParse}>
                      {parsing ? <RefreshCw size={15} className="spin" /> : <Sparkles size={15} />}
                      {parsing ? "Reading the course details…" : "Create flyer"}
                    </button>
                    {generating ? <p className="note"><RefreshCw size={13} className="spin" /> Generating the photo…</p> : null}
                  </div>
                </div>
                <div className="card open">
                  <div className="card-body">
                    <h3 className="h3">Or start from an existing flyer</h3>
                    <div className="template-list">
                      {TEMPLATES.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className="btn ghost"
                          onClick={() => {
                            const p = projectFromTemplate(t);
                            p.brand = loadDefaultBrand();
                            lastSaved.current = JSON.stringify(p);
                            setSaveState("idle");
                            setConflict(null);
                            setProject(p);
                            setMissing([]);
                            setTab("content");
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {tab === "content" ? <ContentPanel content={project.content} set={(c) => update({ content: c })} /> : null}
            {tab === "photo" ? (
              <PhotoPanel
                content={project.content}
                design={project.design}
                setContent={(c) => update({ content: c })}
                setDesign={(d) => update({ design: d })}
                generating={generating}
                onGenerate={() => generatePhoto(project)}
              />
            ) : null}
            {tab === "design" ? <DesignPanel design={project.design} set={(d) => update({ design: d })} fitK={fit.k} /> : null}
            {tab === "brand" && cloud ? (
              <div className="card open">
                <div className="card-body">
                  <label className="field">
                    <span className="field-label">Your name (shown in the team library)</span>
                    <input className="input" value={userName} onChange={(e) => { setUserNameState(e.target.value); setUserName(e.target.value.trim()); }} />
                  </label>
                </div>
              </div>
            ) : null}
            {tab === "brand" ? (
              <BrandPanel
                brand={project.brand}
                set={(b) => update({ brand: b })}
                onSaveDefault={() => {
                  saveDefaultBrand(project.brand);
                  flash("Saved as the default for new flyers");
                }}
              />
            ) : null}
          </div>
        </aside>

        <section className="stage" ref={stageRef}>
          <div className="stage-status">
            {fit.overflow > 0 ? (
              <span className="pill bad">Too much text: about {Math.ceil(fit.overflow)}px over. Shorten a list, hide a section, lower the header or switch layout.</span>
            ) : fit.heroOverflow ? (
              <span className="pill bad">The headline is too long for the header. Shorten it or raise the header height.</span>
            ) : (
              <span className="pill ok">Fits the page · text size {Math.round(fit.k * 100)}%</span>
            )}
            {generating ? <span className="pill"><RefreshCw size={12} className="spin" /> Generating photo…</span> : null}
          </div>
          <div className="preview-box" style={{ width: scaledW, height: scaledH }}>
            <div className="preview-scale" style={{ transform: `scale(${scale})` }}>
              <Flyer ref={flyerRef} content={project.content} design={project.design} brand={project.brand} onFit={setFit} />
            </div>
          </div>
          <p className="stage-foot">US Letter with 0.125 in bleed (8.75 x 11.25 in). Keep important text away from the edges.</p>
        </section>
      </div>

      {library ? (
        <div className="modal-backdrop" onClick={() => setLibrary(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Flyers">
            <div className="modal-head">
              <h3 className="h3">{cloud ? "Team flyers" : "My flyers"}</h3>
              <button type="button" className="icon-btn" onClick={() => setLibrary(null)} aria-label="Close"><X size={16} /></button>
            </div>

            {cloud ? (
              <>
                <p className="note">Everyone on the team sees these flyers. Changes save automatically.</p>
                <div className="search-row">
                  <Search size={15} />
                  <input className="input" placeholder="Search flyers" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} />
                  <button type="button" className="icon-btn" onClick={loadTeam} title="Refresh" aria-label="Refresh"><RefreshCw size={14} className={teamLoading ? "spin" : ""} /></button>
                </div>
                <ul className="lib-list">
                  {team === null ? <li className="note">Loading…</li> : null}
                  {team && team.length === 0 ? <li className="note">No team flyers yet. The flyer you are working on is saved here automatically.</li> : null}
                  {(team || [])
                    .filter((t) => t.name.toLowerCase().includes(teamQuery.toLowerCase().trim()))
                    .map((t) => (
                      <li key={t.id} className={t.id === project.id ? "current" : ""}>
                        <button
                          type="button"
                          className="lib-open"
                          onClick={async () => {
                            try {
                              const r = await teamLoad(t.id);
                              if (!r) throw new Error("This flyer was deleted.");
                              openProject(r.project, r.etag);
                              setLibrary(null);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Could not open the flyer.");
                            }
                          }}
                        >
                          <span className="lib-swatch" style={{ background: t.header }} />
                          <span>
                            <b>{t.name}</b>
                            <small>
                              {t.updatedBy ? `${t.updatedBy} · ` : ""}
                              {new Date(t.updatedAt).toLocaleString()}
                            </small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Make a copy"
                          aria-label="Make a copy"
                          onClick={async () => {
                            const r = await teamLoad(t.id);
                            if (!r) return;
                            const copy: Project = { ...r.project, id: newId(), name: `${r.project.name} (copy)`, createdBy: undefined, updatedAt: Date.now() };
                            openProject(copy);
                            setLibrary(null);
                            flash("Copy created. It saves to the team library as you edit.");
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className={`icon-btn ${confirmDel === t.id ? "danger" : ""}`}
                          title={confirmDel === t.id ? "Click again to delete for everyone" : "Delete"}
                          aria-label="Delete"
                          onClick={async () => {
                            if (confirmDel !== t.id) {
                              setConfirmDel(t.id);
                              return;
                            }
                            setConfirmDel("");
                            try {
                              await teamDelete(t.id);
                              await deleteProject(t.id);
                              if (t.id === project.id) startBlank();
                              await loadTeam();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Could not delete.");
                            }
                          }}
                        >
                          <Trash2 size={14} />
                          {confirmDel === t.id ? <span className="confirm-text">Delete for everyone?</span> : null}
                        </button>
                      </li>
                    ))}
                </ul>
                {library.some((p) => !(team || []).some((t) => t.id === p.id)) ? (
                  <div className="local-migrate">
                    <p className="note">Some flyers are saved only on this computer.</p>
                    <button
                      type="button"
                      className="btn small"
                      onClick={async () => {
                        const known = new Set((team || []).map((t) => t.id));
                        const local = library.filter((p) => !known.has(p.id));
                        let n = 0;
                        for (const p of local) {
                          const r = await teamSave({ ...p, createdBy: p.createdBy || getUserName(), updatedBy: getUserName() }, null);
                          if (r.ok) n++;
                        }
                        flash(`${n} flyer${n === 1 ? "" : "s"} added to the team library`);
                        loadTeam();
                      }}
                    >
                      <Upload size={14} /> Add them to the team library
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="note">Saved in this browser only. To share a flyer, use Export and send the file, or ask your admin to turn on the team library.</p>
                <ul className="lib-list">
                  {library.length === 0 ? <li className="note">No saved flyers yet.</li> : null}
                  {library.map((p) => (
                    <li key={p.id} className={p.id === project.id ? "current" : ""}>
                      <button type="button" className="lib-open" onClick={() => { openProject(p); setLibrary(null); }}>
                        <span className="lib-swatch" style={{ background: p.design.palette.header }} />
                        <span>
                          <b>{p.name}</b>
                          <small>{new Date(p.updatedAt).toLocaleString()}</small>
                        </span>
                      </button>
                      <button type="button" className="icon-btn" title="Duplicate" aria-label="Duplicate" onClick={async () => { const d = { ...p, id: newId(), name: `${p.name} (copy)`, updatedAt: Date.now() }; await saveProject(d); setLibrary(await listProjects()); }}><Copy size={14} /></button>
                      <button
                        type="button"
                        className={`icon-btn ${confirmDel === p.id ? "danger" : ""}`}
                        title={confirmDel === p.id ? "Click again to delete" : "Delete"}
                        aria-label="Delete"
                        onClick={async () => {
                          if (confirmDel !== p.id) {
                            setConfirmDel(p.id);
                            return;
                          }
                          setConfirmDel("");
                          await deleteProject(p.id);
                          if (p.id === project.id) startBlank();
                          setLibrary(await listProjects());
                        }}
                      >
                        <Trash2 size={14} />
                        {confirmDel === p.id ? <span className="confirm-text">Delete?</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="lib-actions">
              <button type="button" className="btn small" onClick={() => exportJson(project, project.name)}><FileDown size={14} /> Export current flyer</button>
              <button type="button" className="btn small" onClick={() => importRef.current?.click()}><FileUp size={14} /> Import a flyer file</button>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const p = JSON.parse(await f.text()) as Project;
                    if (!p.content || !p.design) throw new Error();
                    openProject({ ...p, id: newId(), updatedAt: Date.now() });
                    setLibrary(null);
                    flash("Flyer imported");
                  } catch {
                    setError("That file is not a flyer file.");
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {askName ? (
        <div className="modal-backdrop">
          <form
            className="modal small"
            role="dialog"
            aria-label="Your name"
            onSubmit={(e) => {
              e.preventDefault();
              const n = nameDraft.trim();
              if (!n) return;
              setUserName(n);
              setUserNameState(n);
              setAskName(false);
            }}
          >
            <h3 className="h3">Welcome to BOSS Flyer Studio</h3>
            <p className="note">Flyers are shared with your team. What name should we show next to your changes?</p>
            <label className="field">
              <span className="field-label">Your name</span>
              <input className="input" autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="e.g. Priya" />
            </label>
            <button type="submit" className="btn primary" disabled={!nameDraft.trim()}>Continue</button>
          </form>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
