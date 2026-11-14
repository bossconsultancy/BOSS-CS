"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, RefreshCw, Trash2, Upload, Wand2, X } from "lucide-react";
import { ICONS } from "./Flyer";
import { Area, ColorInput, Field, ListArea, Range, Section, Text, Toggle } from "./ui";
import { PRESETS, paletteFromBase } from "@/lib/colors";
import { buildImagePrompt } from "@/lib/prompt";
import { readImageFile } from "@/lib/exporters";
import { hasLongDash } from "@/lib/text";
import { ICON_NAMES, type Brand, type Design, type Fact, type FlyerContent, type FontKey, type IconName, type SectionKey } from "@/lib/types";

/* ---------------- Content ---------------- */

export function ContentPanel({ content, set }: { content: FlyerContent; set: (c: FlyerContent) => void }) {
  const u = <K extends keyof FlyerContent>(key: K, v: FlyerContent[K]) => set({ ...content, [key]: v });
  const dashWarn = hasLongDash(JSON.stringify(content));

  const setFact = (i: number, f: Partial<Fact>) => u("facts", content.facts.map((x, j) => (j === i ? { ...x, ...f } : x)));
  const moveFact = (i: number, d: number) => {
    const a = [...content.facts];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    u("facts", a);
  };

  return (
    <>
      {dashWarn ? <p className="note warn">Long dashes (— or –) are replaced with commas or &quot;to&quot; on the flyer.</p> : null}
      <Section title="Header">
        <Field label="Program name (for file names)">
          <Text value={content.programName} onChange={(v) => u("programName", v)} />
        </Field>
        <Field label="Headline" hint="Press Enter for a new line.">
          <Area rows={2} value={content.titleLine} onChange={(v) => u("titleLine", v)} />
        </Field>
        <div className="grid2">
          <Field label="Big code" hint="e.g. G2, AZ. Optional.">
            <Text value={content.bigCode} onChange={(v) => u("bigCode", v)} />
          </Field>
          <Field label="Badge" hint="e.g. Level 1 and Level 2">
            <Text value={content.pill} onChange={(v) => u("pill", v)} />
          </Field>
        </div>
        <Field label="Small label above the title" hint="e.g. 100% Online Program. Optional.">
          <Text value={content.eyebrow} onChange={(v) => u("eyebrow", v)} />
        </Field>
        <Field label="Tagline">
          <Text value={content.tagline} onChange={(v) => u("tagline", v)} />
        </Field>
        <Field label="Short intro" hint="One or two sentences.">
          <Area rows={2} value={content.intro} onChange={(v) => u("intro", v)} />
        </Field>
      </Section>

      <Section title={`Key facts (${content.facts.length})`}>
        {content.facts.map((f, i) => (
          <div className="fact-row" key={i}>
            <div className="fact-top">
              <select className="input icon-select" value={f.icon} onChange={(e) => setFact(i, { icon: e.target.value as IconName })} aria-label="Icon">
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <IconPreview name={f.icon} />
              <div className="row-actions">
                <button type="button" className="icon-btn" onClick={() => moveFact(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                <button type="button" className="icon-btn" onClick={() => moveFact(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                <button type="button" className="icon-btn" onClick={() => u("facts", content.facts.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid3">
              <input className="input" placeholder="Label" value={f.label} onChange={(e) => setFact(i, { label: e.target.value })} />
              <input className="input" placeholder="Value" value={f.value} onChange={(e) => setFact(i, { value: e.target.value })} />
              <input className="input" placeholder="Note (optional)" value={f.note} onChange={(e) => setFact(i, { note: e.target.value })} />
            </div>
          </div>
        ))}
        {content.facts.length < 5 ? (
          <button type="button" className="btn ghost small" onClick={() => u("facts", [...content.facts, { icon: "calendar", label: "Label", value: "Value", note: "" }])}>
            <Plus size={14} /> Add fact
          </button>
        ) : null}
        <p className="note">Keep values short (about 14 characters) so they fit on one line.</p>
      </Section>

      <Section title={`${content.titles.learn} (${content.learn.length})`}>
        <Field label="Section title"><Text value={content.titles.learn} onChange={(v) => u("titles", { ...content.titles, learn: v })} /></Field>
        <Field label="One topic per line"><ListArea rows={8} items={content.learn} onChange={(v) => u("learn", v)} /></Field>
      </Section>
      <Section title={`${content.titles.highlights} (${content.highlights.length})`}>
        <Field label="Section title"><Text value={content.titles.highlights} onChange={(v) => u("titles", { ...content.titles, highlights: v })} /></Field>
        <Field label="One highlight per line"><ListArea rows={5} items={content.highlights} onChange={(v) => u("highlights", v)} /></Field>
      </Section>
      <Section title={`${content.titles.careers} (${content.careers.length})`}>
        <Field label="Section title"><Text value={content.titles.careers} onChange={(v) => u("titles", { ...content.titles, careers: v })} /></Field>
        <Field label="One career or workplace per line"><ListArea rows={6} items={content.careers} onChange={(v) => u("careers", v)} /></Field>
      </Section>
      <Section title={`${content.titles.admission} (${content.admission.length})`}>
        <Field label="Section title"><Text value={content.titles.admission} onChange={(v) => u("titles", { ...content.titles, admission: v })} /></Field>
        <Field label="One requirement per line"><ListArea rows={4} items={content.admission} onChange={(v) => u("admission", v)} /></Field>
      </Section>
      <Section title={`${content.titles.salary} (${content.salary.length})`} defaultOpen={content.salary.length > 0}>
        <Field label="Section title"><Text value={content.titles.salary} onChange={(v) => u("titles", { ...content.titles, salary: v })} /></Field>
        {content.salary.map((r, i) => (
          <div className="grid-salary" key={i}>
            <input className="input" placeholder="Label" value={r.label} onChange={(e) => u("salary", content.salary.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input className="input" placeholder="$19 to $22 per hour" value={r.value} onChange={(e) => u("salary", content.salary.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            <button type="button" className="icon-btn" onClick={() => u("salary", content.salary.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
          </div>
        ))}
        {content.salary.length < 3 ? (
          <button type="button" className="btn ghost small" onClick={() => u("salary", [...content.salary, { label: "Annual salary", value: "" }])}>
            <Plus size={14} /> Add salary row
          </button>
        ) : null}
      </Section>
      <Section title="Financial assistance note">
        <Area rows={2} value={content.financialNote} onChange={(v) => u("financialNote", v)} placeholder="Financial assistance available to those who qualify." />
      </Section>
    </>
  );
}

function IconPreview({ name }: { name: IconName }) {
  const I = ICONS[name];
  return (
    <span className="icon-preview">
      <I size={16} />
    </span>
  );
}

/* ---------------- Photo ---------------- */

export function PhotoPanel({
  content, design, setContent, setDesign, generating, onGenerate,
}: {
  content: FlyerContent; design: Design; setContent: (c: FlyerContent) => void; setDesign: (d: Design) => void; generating: boolean; onGenerate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const prompt = buildImagePrompt(content.photoScene, design.palette);
  const photo = design.photo;
  const setPhoto = (p: Partial<Design["photo"]>) => setDesign({ ...design, photo: { ...photo, ...p } });

  return (
    <>
      <Section title="Generate a photo with AI">
        <Field label="What should the photo show?" hint="Who, doing what, where. Skin tone, colours and the no-text rule are added for you.">
          <Area rows={4} value={content.photoScene} onChange={(v) => setContent({ ...content, photoScene: v })} placeholder="a personal support worker helping an elderly woman in a bright care home lounge" />
        </Field>
        <button type="button" className="btn primary" disabled={generating || content.photoScene.trim().length < 10} onClick={onGenerate}>
          {generating ? <RefreshCw size={15} className="spin" /> : <Wand2 size={15} />}
          {generating ? "Generating photo (up to a minute)…" : photo.src ? "Generate a new photo" : "Generate photo"}
        </button>
        <p className="note">Each photo is billed to your OpenAI account.</p>
        <details className="prompt-details">
          <summary>See the full prompt sent to OpenAI</summary>
          <p className="prompt-text">{prompt}</p>
          <button
            type="button"
            className="btn ghost small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            <Copy size={14} /> {copied ? "Copied" : "Copy prompt"}
          </button>
        </details>
      </Section>

      <Section title="Or upload your own photo">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setErr("");
            try {
              const src = await readImageFile(f);
              setPhoto({ src, x: 50, y: 35, zoom: 1 });
            } catch (er) {
              setErr(er instanceof Error ? er.message : "Upload failed.");
            }
            e.target.value = "";
          }}
        />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Upload photo
        </button>
        {err ? <p className="note warn">{err}</p> : null}
        <p className="note">Square photos work best, at least 1400 x 1400 px for sharp printing.</p>
      </Section>

      {photo.src ? (
        <Section title="Position the photo">
          <Range label="Left / right" value={photo.x} min={0} max={100} step={1} onChange={(v) => setPhoto({ x: v })} format={(v) => `${v}%`} />
          <Range label="Up / down" value={photo.y} min={0} max={100} step={1} onChange={(v) => setPhoto({ y: v })} format={(v) => `${v}%`} />
          <Range label="Zoom" value={photo.zoom} min={1} max={2} step={0.05} onChange={(v) => setPhoto({ zoom: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <button type="button" className="btn ghost small" onClick={() => setPhoto({ src: "" })}>
            <X size={14} /> Remove photo
          </button>
        </Section>
      ) : null}
    </>
  );
}

/* ---------------- Design ---------------- */

const SECTION_LABELS: [SectionKey, string][] = [
  ["tagline", "Tagline"], ["intro", "Intro"], ["learn", "What you will learn"], ["highlights", "Highlights"],
  ["careers", "Careers"], ["admission", "Admission"], ["salary", "Salary"], ["financial", "Financial note"],
];

export function DesignPanel({ design, set, fitK }: { design: Design; set: (d: Design) => void; fitK: number }) {
  const p = design.palette;
  const setP = (k: keyof typeof p, v: string) => set({ ...design, presetId: "custom", palette: { ...p, [k]: v } });
  const [base, setBase] = useState(p.header);

  return (
    <>
      <Section title="Colour themes">
        <div className="presets">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.id}
              className={`preset ${design.presetId === pr.id ? "active" : ""}`}
              onClick={() => set({ ...design, presetId: pr.id, palette: { ...pr.palette } })}
              title={pr.name}
            >
              <span className="swatch">
                <i style={{ background: pr.palette.header }} />
                <i style={{ background: pr.palette.headerAccent }} />
                <i style={{ background: pr.palette.icons }} />
              </span>
              <span className="preset-name">{pr.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Make a theme from one colour">
        <div className="base-row">
          <input type="color" aria-label="Base colour" value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} />
          <span className="mono">{base}</span>
          <button type="button" className="btn small" onClick={() => set({ ...design, presetId: "custom", palette: paletteFromBase(base) })}>
            <Wand2 size={14} /> Apply
          </button>
        </div>
      </Section>

      <Section title="Fine-tune colours">
        <ColorInput label="Header" value={p.header} onChange={(v) => setP("header", v)} />
        <ColorInput label="Header accent (tagline, label)" value={p.headerAccent} onChange={(v) => setP("headerAccent", v)} />
        <ColorInput label="Icons and check marks" value={p.icons} onChange={(v) => setP("icons", v)} />
        <ColorInput label="Light panels" value={p.panel} onChange={(v) => setP("panel", v)} />
        <ColorInput label="Footer bar" value={p.footer} onChange={(v) => setP("footer", v)} />
        <p className="note">Text colours adjust automatically so they stay readable.</p>
      </Section>

      <Section title="Layout">
        <Field label="Arrangement">
          <select className="input" value={design.layout} onChange={(e) => set({ ...design, layout: e.target.value as Design["layout"] })}>
            <option value="auto">Automatic</option>
            <option value="wide">Topics across the full width</option>
            <option value="split">Topics in the left column</option>
          </select>
        </Field>
        <Field label="Topic columns">
          <select className="input" value={design.learnCols} onChange={(e) => set({ ...design, learnCols: Number(e.target.value) as Design["learnCols"] })}>
            <option value={0}>Automatic</option>
            <option value={1}>1 column</option>
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
          </select>
        </Field>
        <Range label="Header height" value={design.headerHeight} min={300} max={420} step={5} onChange={(v) => set({ ...design, headerHeight: v })} format={(v) => `${v}px`} />
      </Section>

      <TextSizes design={design} set={set} fitK={fitK} />

      <Section title="Show or hide sections">
        <div className="toggles">
          {SECTION_LABELS.map(([key, label]) => (
            <Toggle key={key} label={label} checked={!design.hidden[key]} onChange={(v) => set({ ...design, hidden: { ...design.hidden, [key]: !v } })} />
          ))}
        </div>
      </Section>
    </>
  );
}

/* ---------------- Brand ---------------- */

export function BrandPanel({ brand, set, onSaveDefault }: { brand: Brand; set: (b: Brand) => void; onSaveDefault: () => void }) {
  const u = (k: keyof Brand, v: string) => set({ ...brand, [k]: v });
  return (
    <Section title="Company details on the flyer">
      <Field label="Tagline next to the logo" hint="Press Enter for a new line. Leave empty to hide.">
        <Area rows={2} value={brand.companyTagline} onChange={(v) => u("companyTagline", v)} />
      </Field>
      <Field label="Phone"><Text value={brand.phone} onChange={(v) => u("phone", v)} /></Field>
      <Field label="Address"><Text value={brand.address} onChange={(v) => u("address", v)} /></Field>
      <Field label="Website"><Text value={brand.website} onChange={(v) => u("website", v)} /></Field>
      <button type="button" className="btn small" onClick={onSaveDefault}>Use these for every new flyer</button>
    </Section>
  );
}


/* ---------------- Text sizes ---------------- */

const FONT_CONTROLS: { key: FontKey; label: string; min: number; max: number }[] = [
  { key: "title", label: "Headline", min: 0.7, max: 1.4 },
  { key: "code", label: "Big code (G2, G3)", min: 0.6, max: 1.3 },
  { key: "tagline", label: "Tagline, intro and badge", min: 0.8, max: 1.3 },
  { key: "facts", label: "Key facts boxes", min: 0.85, max: 1.2 },
  { key: "headings", label: "Section titles", min: 0.8, max: 1.3 },
  { key: "list", label: "Topics, highlights and requirements", min: 0.85, max: 1.3 },
  { key: "chips", label: "Career boxes", min: 0.85, max: 1.3 },
  { key: "callout", label: "Salary and financial note", min: 0.8, max: 1.3 },
  { key: "footer", label: "Footer contact details", min: 0.85, max: 1.2 },
];

function TextSizes({ design, set, fitK }: { design: Design; set: (d: Design) => void; fitK: number }) {
  const fs = design.fontScales || {};
  const val = (key: FontKey) => fs[key] ?? 1;
  const setScale = (key: FontKey, v: number) => set({ ...design, fontScales: { ...fs, [key]: Math.round(v * 100) / 100 } });
  const kk = design.textSize || fitK || 1;
  const smallest = Math.min(12.5 * kk * val("list"), 12.5 * kk * val("chips"), 12 * val("facts"), 12.5 * val("footer"), 12 * val("callout"));
  const changed = Object.values(fs).some((v) => v !== undefined && v !== 1) || design.textSize !== 0;

  return (
    <Section title="Text sizes">
      <Toggle label="Automatic body text size (fills the page)" checked={!design.textSize} onChange={(v) => set({ ...design, textSize: v ? 0 : Number(fitK.toFixed(2)) || 1 })} />
      {design.textSize ? (
        <Range label="Overall body text" value={design.textSize} min={0.9} max={1.25} step={0.01} onChange={(v) => set({ ...design, textSize: v })} format={(v) => `${Math.round(v * 100)}%`} />
      ) : (
        <p className="note">Body text is set automatically to fill the page (now {Math.round(fitK * 100)}%). The sliders below still work: bigger text in one part makes the rest adjust to fit.</p>
      )}
      {FONT_CONTROLS.map((f) => (
        <div key={f.key} className="size-row">
          <Range label={f.label} value={val(f.key)} min={f.min} max={f.max} step={0.01} onChange={(v) => setScale(f.key, v)} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="size-steps">
            <button type="button" className="icon-btn" aria-label={`Smaller ${f.label}`} onClick={() => setScale(f.key, Math.max(f.min, val(f.key) - 0.05))}>A−</button>
            <button type="button" className="icon-btn" aria-label={`Larger ${f.label}`} onClick={() => setScale(f.key, Math.min(f.max, val(f.key) + 0.05))}>A+</button>
          </div>
        </div>
      ))}
      {smallest < 11.9 ? <p className="note warn">Some text is now smaller than 12px ({smallest.toFixed(1)}px) and may be hard to read in print.</p> : null}
      {changed ? (
        <button type="button" className="btn ghost small" onClick={() => set({ ...design, fontScales: {}, textSize: 0 })}>
          Reset all text sizes
        </button>
      ) : null}
    </Section>
  );
}
