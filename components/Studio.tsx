"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Copy, Download, FileDown, FileUp, FolderOpen, ImageDown, Plus, Printer, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import Flyer, { FLYER_H, FLYER_W, type FitInfo, type FlyerHandle } from "./Flyer";
import { BrandPanel, ContentPanel, DesignPanel, PhotoPanel } from "./Panels";
import { Toggle } from "./ui";
import { buildImagePrompt } from "@/lib/prompt";
import { TEMPLATES, defaultDesign, newId, projectFromTemplate } from "@/lib/samples";
import { deleteProject, lastProjectId, listProjects, loadDefaultBrand, loadProject, saveDefaultBrand, saveProject } from "@/lib/storage";
import { exportJson, exportPdf, exportPng, exportSocialJpg } from "@/lib/exporters";
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
  const flyerRef = useRef<FlyerHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // load the last flyer, or start from the PSW template
  useEffect(() => {
    (async () => {
      const id = lastProjectId();
      const p = id ? await loadProject(id) : undefined;
      if (p) {
        setProject(p);
        setTab("content");
      } else {
        const t = projectFromTemplate(TEMPLATES[3]);
        t.brand = loadDefaultBrand();
        setProject(t);
      }
    })();
  }, []);

  // autosave
  useEffect(() => {
    if (!project) return;
    const h = setTimeout(() => {
      saveProject(project).catch(() => setError("Could not save in this browser. Use Export file to keep a copy."));
    }, 600);
    return () => clearTimeout(h);
  }, [project]);

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

  const update = useCallback((patch: Partial<Project>) => {
    setProject((p) => (p ? { ...p, ...patch, updatedAt: Date.now() } : p));
  }, []);

  const generatePhoto = useCallback(async (p: Project) => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: buildImagePrompt(p.content.photoScene, p.design.palette) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photo generation failed.");
      setProject((cur) => (cur && cur.id === p.id ? { ...cur, design: { ...cur.design, photo: { src: data.image, x: 50, y: 35, zoom: 1 } }, updatedAt: Date.now() } : cur));
      flash("Photo added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo generation failed.");
    } finally {
      setGenerating(false);
    }
  }, []);

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

  const openLibrary = async () => setLibrary(await listProjects());

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
        <div className="top-actions">
          <button type="button" className="btn" onClick={() => { const p = blankProject(); setProject(p); setPasted(""); setMissing([]); setTab("start"); }}>
            <Plus size={15} /> New
          </button>
          <button type="button" className="btn" onClick={openLibrary}>
            <FolderOpen size={15} /> My flyers
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
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="My flyers">
            <div className="modal-head">
              <h3 className="h3">My flyers</h3>
              <button type="button" className="icon-btn" onClick={() => setLibrary(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className="note">Saved automatically in this browser. To share a flyer with a teammate, use Export file and send them the file.</p>
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
                    const imported = { ...p, id: newId(), updatedAt: Date.now() };
                    setProject(imported);
                    setLibrary(null);
                    setTab("content");
                    flash("Flyer imported");
                  } catch {
                    setError("That file is not a flyer file.");
                  }
                  e.target.value = "";
                }}
              />
            </div>
            <ul className="lib-list">
              {library.length === 0 ? <li className="note">No saved flyers yet.</li> : null}
              {library.map((p) => (
                <li key={p.id} className={p.id === project.id ? "current" : ""}>
                  <button type="button" className="lib-open" onClick={() => { setProject(p); setLibrary(null); setMissing([]); setTab("content"); }}>
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
                      if (p.id === project.id) setProject(blankProject());
                      setLibrary(await listProjects());
                    }}
                  >
                    <Trash2 size={14} />
                    {confirmDel === p.id ? <span className="confirm-text">Delete?</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
