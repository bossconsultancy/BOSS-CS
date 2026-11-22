"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Award, BookOpen, Briefcase, CalendarCheck, CalendarDays, Check, ClipboardCheck, Clock, Globe, GraduationCap, HandCoins,
  Hourglass, Image as ImageIcon, MapPin, Monitor, Phone, ShieldCheck, SunMoon, TrendingUp, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { buildTheme, type Theme } from "@/lib/colors";
import { cleanText } from "@/lib/text";
import type { Brand, Design, Fact, FlyerContent, IconName } from "@/lib/types";

export const FLYER_W = 840;
export const FLYER_H = 1080;
const MX = 72;
export const PAGE_GAP = 28;
const PO = "'Poppins', sans-serif";
const DM = "'DM Sans', sans-serif";

export const ICONS: Record<IconName, LucideIcon> = {
  calendar: CalendarDays, clock: Clock, schedule: CalendarCheck, wallet: Wallet, monitor: Monitor, briefcase: Briefcase,
  award: Award, shield: ShieldCheck, cap: GraduationCap, users: Users, sunmoon: SunMoon, book: BookOpen,
  hourglass: Hourglass, pin: MapPin, globe: Globe, clipboard: ClipboardCheck,
};

/** body sizes scale with --k (auto-fit); header sizes with --h */
const k = (n: number) => `calc(var(--k, 1) * ${n}px)`;
const hs = (n: number) => `calc(var(--h, 1) * ${n}px)`;
/** body text that also follows a per-group size setting */
const kv = (group: string, n: number) => `calc(var(--k, 1) * var(--s-${group}, 1) * ${n}px)`;
/** header text: auto-shrink (--h) times the group setting */
const hv = (group: string, n: number) => `calc(var(--h, 1) * var(--s-${group}, 1) * ${n}px)`;
/** fixed-size text that follows a group setting */
const fv = (group: string, n: number) => `calc(var(--s-${group}, 1) * ${n}px)`;

function Tile({ Icon, t, size = 28, glyph = 15, radius = 7 }: { Icon: LucideIcon; t: Theme; size?: number; glyph?: number; radius?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: t.tile, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={glyph} color="#FFFFFF" strokeWidth={2} aria-hidden />
    </div>
  );
}

function Head({ Icon, title, t, field }: { Icon: LucideIcon; title: string; t: Theme; field?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Tile Icon={Icon} t={t} />
        <h2 data-field={field} data-group="headings" style={{ margin: 0, fontFamily: PO, fontWeight: 600, fontSize: kv("headings", 17), lineHeight: 1.2, color: t.ink }}>{title}</h2>
      </div>
      <div style={{ height: 2, background: t.tile, borderRadius: 1 }} />
    </div>
  );
}

function PanelHead({ Icon, title, t, field }: { Icon: LucideIcon; title: string; t: Theme; field?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Tile Icon={Icon} t={t} />
      <h2 data-field={field} data-group="headings" style={{ margin: 0, fontFamily: PO, fontWeight: 600, fontSize: kv("headings", 17), lineHeight: 1.2, color: t.ink }}>{title}</h2>
    </div>
  );
}

function Checklist({ items, t, cols = 1, fs = 13, field }: { items: string[]; t: Theme; cols?: number; fs?: number; field?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: 16, rowGap: k(6) }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: t.tile, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: k(1.5) }}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} aria-hidden />
          </div>
          <span data-field={field} data-i={i} data-group="list" style={{ fontFamily: DM, fontSize: kv("list", fs), lineHeight: 1.42, color: t.body }}>{it}</span>
        </div>
      ))}
    </div>
  );
}

function Chips({ items, t, cols = 2, field }: { items: string[]; t: Theme; cols?: number; field?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: k(6) }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: t.light, border: `1px solid ${t.rule}`, borderRadius: 7, padding: `${k(6)} 9px` }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: t.tile, flexShrink: 0 }} />
          <span data-field={field} data-i={i} data-group="chips" style={{ fontFamily: DM, fontWeight: 500, fontSize: kv("chips", 12.5), lineHeight: 1.3, color: t.ink }}>{it}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ children, gap = 11 }: { children: ReactNode; gap?: number }) {
  return <section style={{ display: "flex", flexDirection: "column", gap: k(gap) }}>{children}</section>;
}

function Panel({ children, t }: { children: ReactNode; t: Theme }) {
  return <div style={{ background: t.light, borderRadius: 12, padding: `${k(14)} 16px`, display: "flex", flexDirection: "column", gap: k(10) }}>{children}</div>;
}

function Callout({ text, t }: { text: string; t: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: t.light, border: `1px solid ${t.rule}`, borderRadius: 12, padding: `${k(12)} 16px` }}>
      <Tile Icon={HandCoins} t={t} size={36} glyph={19} radius={10} />
      <p data-field="financialNote" data-group="callout" style={{ margin: 0, fontFamily: PO, fontWeight: 600, fontSize: kv("callout", 14.5), lineHeight: 1.35, color: t.ink }}>{text}</p>
    </div>
  );
}

function FactCell({ f, t, first, i }: { f: Fact; t: Theme; first: boolean; i: number }) {
  const Icon = ICONS[f.icon] || CalendarDays;
  return (
    <div style={{ borderLeft: first ? "none" : `1px solid ${t.rule}`, padding: "12px 12px", display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
      <Tile Icon={Icon} t={t} size={30} glyph={16} radius={8} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span data-field="facts" data-i={i} data-part="label" data-group="facts" style={{ fontFamily: DM, fontWeight: 600, fontSize: fv("facts", 12), letterSpacing: "0.05em", textTransform: "uppercase", color: t.muted }}>{f.label}</span>
        <span data-field="facts" data-i={i} data-part="value" data-group="facts" style={{ fontFamily: PO, fontWeight: 600, fontSize: fv("facts", 16.5), lineHeight: 1.2, color: t.ink }}>{f.value}</span>
        {f.note ? <span data-field="facts" data-i={i} data-part="note" data-group="facts" style={{ fontFamily: DM, fontSize: fv("facts", 12), lineHeight: 1.3, color: t.muted }}>{f.note}</span> : null}
      </div>
    </div>
  );
}

/** Column size for a fact cell: the value and label never wrap (min width); long notes may wrap. */
function factColumn(f: Fact, scale = 1): string {
  const base = Math.max(f.value.length * 11, f.label.length * 8.8, 60) * scale + 66;
  const full = Math.max(base, Math.min(240, f.note.length * 6.4) * scale + 66);
  return `minmax(${Math.round(base)}px, ${Math.round(full)}fr)`;
}

function avgLen(a: string[]) {
  return a.length ? a.reduce((s, x) => s + x.length, 0) / a.length : 0;
}

export interface FitInfo {
  k: number;
  overflow: number;
  heroOverflow: boolean;
  /** 2 when the content did not fit and continues on a second page */
  pages?: number;
}

export interface FlyerHandle {
  node: HTMLDivElement | null;
  /** the second page, when there is one */
  node2: HTMLDivElement | null;
}

interface Props {
  content: FlyerContent;
  design: Design;
  brand: Brand;
  onFit?: (info: FitInfo) => void;
}

const Flyer = forwardRef<FlyerHandle, Props>(function Flyer({ content: raw, design, brand, onFit }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const root2Ref = useRef<HTMLDivElement>(null);
  const main2Ref = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [fontsReady, setFontsReady] = useState(0);
  useImperativeHandle(ref, () => ({
    get node() { return rootRef.current; },
    get node2() { return root2Ref.current; },
  }), []);

  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => setFontsReady((n) => n + 1));
    }
  }, []);

  const t = buildTheme(design.palette);
  const c = raw;
  const hide = design.hidden || {};
  const L = (a: string[]) => (a || []).map((x) => cleanText(x)).filter(Boolean);
  const learn = hide.learn ? [] : L(c.learn);
  const highlights = hide.highlights ? [] : L(c.highlights);
  const careers = hide.careers ? [] : L(c.careers);
  const admission = hide.admission ? [] : L(c.admission);
  const salary = hide.salary ? [] : (c.salary || []).filter((r) => r.value.trim());
  const financial = hide.financial ? "" : cleanText(c.financialNote);
  const facts = (c.facts || []).filter((f) => f.value.trim()).slice(0, 5);
  const titles = c.titles;

  const wide = design.layout === "wide" || (design.layout === "auto" && learn.length > 8);
  const learnCols = design.learnCols || (wide ? (avgLen(learn) > 46 ? 2 : 3) : learn.length > 9 ? 2 : 1);

  const learnBlock = (cols: number) => (
    <Section key="learn">
      <Head Icon={BookOpen} title={titles.learn} t={t} field="titles.learn" />
      <Checklist items={learn} t={t} cols={cols} fs={wide && cols >= 3 ? 12.5 : 13} field="learn" />
    </Section>
  );
  const careersBlock = (cols: number) => (
    <Section key="careers">
      <Head Icon={Briefcase} title={titles.careers} t={t} field="titles.careers" />
      <Chips items={careers} t={t} cols={cols} field="careers" />
    </Section>
  );
  const admissionBlock = (cols: number) => (
    <Section key="admission">
      <Head Icon={ClipboardCheck} title={titles.admission} t={t} field="titles.admission" />
      <Checklist items={admission} t={t} cols={cols} fs={12.5} field="admission" />
    </Section>
  );
  const highlightsBlock = (cols: number) => (
    <Panel key="highlights" t={t}>
      <PanelHead Icon={Award} title={titles.highlights} t={t} field="titles.highlights" />
      <Checklist items={highlights} t={t} cols={cols} fs={12.5} field="highlights" />
    </Panel>
  );
  const salaryBlock = (
    <Panel key="salary" t={t}>
      <PanelHead Icon={TrendingUp} title={titles.salary} t={t} field="titles.salary" />
      {salary.map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, borderTop: i ? `1px solid ${t.rule}` : "none", paddingTop: i ? k(8) : 0 }}>
          <span data-field="salary" data-i={i} data-part="label" data-group="callout" style={{ fontFamily: DM, fontWeight: 600, fontSize: fv("callout", 12), letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted }}>{r.label}</span>
          <span data-field="salary" data-i={i} data-part="value" data-group="callout" style={{ fontFamily: PO, fontWeight: 600, fontSize: kv("callout", 19), lineHeight: 1.2, color: t.ink }}>{r.value}</span>
        </div>
      ))}
    </Panel>
  );
  const calloutBlock = <Callout key="callout" text={financial} t={t} />;

  const shortAdmission = admission.every((a) => a.length <= 26);
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  if (!wide && learn.length) left.push(learnBlock(learnCols));
  if (careers.length) left.push(careersBlock(2));
  if (admission.length) left.push(admissionBlock(shortAdmission ? 2 : 1));
  if (highlights.length) right.push(highlightsBlock(1));
  if (salary.length) right.push(salaryBlock);
  let bottomCallout = false;
  if (financial) {
    if (left.length && right.length >= left.length) bottomCallout = true;
    else right.push(calloutBlock);
  }

  const rows: ReactNode[] = [];
  if (wide && learn.length) rows.push(learnBlock(learnCols));
  if (left.length && right.length) {
    const stack = (items: ReactNode[]) => (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: k(18) }}>{items}</div>
    );
    rows.push(
      <div key="split" style={{ display: "grid", gridTemplateColumns: "404px 272px", columnGap: 20, alignItems: "stretch" }}>
        {stack(left)}
        {stack(right)}
      </div>,
    );
  } else if (left.length) {
    // no right column: give everything the full width
    if (!wide && learn.length) rows.push(learnBlock(design.learnCols || (learn.length > 6 ? 2 : 1)));
    if (careers.length) rows.push(careersBlock(3));
    if (admission.length) rows.push(admissionBlock(shortAdmission ? 4 : 2));
  } else if (right.length) {
    if (highlights.length) rows.push(highlightsBlock(2));
    if (salary.length) rows.push(salaryBlock);
    if (financial) rows.push(calloutBlock);
  } else if (financial) {
    rows.push(calloutBlock);
  }
  if (bottomCallout) rows.push(calloutBlock);

  // Too much for one page: the same blocks one under another, split across two pages.
  const flowBlocks: ReactNode[] = [];
  if (learn.length) flowBlocks.push(learnBlock(design.learnCols || (avgLen(learn) > 46 ? 2 : 3)));
  if (careers.length) flowBlocks.push(careersBlock(3));
  if (admission.length) flowBlocks.push(admissionBlock(shortAdmission ? 3 : 2));
  if (highlights.length) flowBlocks.push(highlightsBlock(2));
  if (salary.length) flowBlocks.push(salaryBlock);
  if (financial) flowBlocks.push(calloutBlock);

  // header title
  const titleLines = (c.titleLine || "").split("\n").map((s) => cleanText(s)).filter(Boolean);
  const longest = Math.max(1, ...titleLines.map((s) => s.length));
  const titleSize = c.bigCode ? 30 : Math.max(26, Math.min(40, Math.floor(370 / (longest * 0.6))));
  const companyTag = (brand.companyTagline || "").split("\n");

  const hero = design.headerHeight || 350;
  const fitKey = JSON.stringify([c, design.hidden, design.layout, design.learnCols, design.textSize, hero, brand, design.fontScales]);
  const [mode, setMode] = useState<{ key: string; flow: boolean; split: number | null }>({ key: "", flow: false, split: null });
  const flow = mode.key === fitKey && mode.flow;
  const split = mode.key === fitKey ? mode.split : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const main = mainRef.current;
    const band = bandRef.current;
    if (!root || !main || !band) return;
    // header: shrink the title if it does not fit the band
    let h = 1;
    band.style.setProperty("--h", "1");
    for (let i = 0; i < 14 && band.scrollHeight > band.clientHeight + 1 && h > 0.68; i++) {
      h -= 0.025;
      band.style.setProperty("--h", h.toFixed(3));
    }
    const fits = () => main.scrollHeight <= main.clientHeight + 1;
    const heroOverflow = band.scrollHeight > band.clientHeight + 1;
    if (flow) {
      // two pages: comfortable text size, fill page 1 with whole blocks, the rest goes to page 2
      const kk = design.textSize || 1.04;
      root.style.setProperty("--k", kk.toFixed(4));
      root2Ref.current?.style.setProperty("--k", kk.toFixed(4));
      if (split === null) {
        const limit = main.clientHeight;
        let n = 0;
        for (const ch of Array.from(main.children) as HTMLElement[]) {
          if (ch.offsetTop + ch.offsetHeight - main.offsetTop > limit + 1) break;
          n++;
        }
        setMode({ key: fitKey, flow: true, split: Math.max(1, Math.min(n, flowBlocks.length - 1)) });
        return;
      }
      const m2 = main2Ref.current;
      const over2 = m2 ? Math.max(0, m2.scrollHeight - m2.clientHeight - 1) : 0;
      onFit?.({ k: kk, overflow: over2, heroOverflow, pages: 2 });
      return;
    }
    let kk: number;
    if (design.textSize) {
      kk = design.textSize;
      root.style.setProperty("--k", String(kk));
    } else {
      let lo = 0.96; // keeps the smallest body text at 12px or more
      let hi = 1.22;
      root.style.setProperty("--k", String(hi));
      if (fits()) kk = hi;
      else {
        root.style.setProperty("--k", String(lo));
        if (!fits()) kk = lo;
        else {
          for (let i = 0; i < 9; i++) {
            const mid = (lo + hi) / 2;
            root.style.setProperty("--k", mid.toFixed(4));
            if (fits()) lo = mid;
            else hi = mid;
          }
          kk = lo;
        }
      }
      root.style.setProperty("--k", kk.toFixed(4));
    }
    onFit?.({ k: kk, overflow: Math.max(0, main.scrollHeight - main.clientHeight - 1), heroOverflow, pages: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, fontsReady, flow, split]);

  const photo = design.photo;
  const footerItems: { Icon: LucideIcon; node: ReactNode }[] = [];
  if (brand.phone) footerItems.push({ Icon: Phone, node: <span data-field="brand.phone" data-group="footer" style={{ fontFamily: PO, fontWeight: 600, fontSize: fv("footer", 16), color: t.footerText, letterSpacing: "0.01em" }}>{brand.phone}</span> });
  if (brand.address) footerItems.push({ Icon: MapPin, node: <span data-field="brand.address" data-group="footer" style={{ fontFamily: DM, fontWeight: 500, fontSize: fv("footer", 12.5), lineHeight: 1.3, color: t.footerText }}>{brand.address}</span> });
  if (brand.website) footerItems.push({ Icon: Globe, node: <span data-field="brand.website" data-group="footer" style={{ fontFamily: PO, fontWeight: 600, fontSize: fv("footer", 14), color: t.footerText, letterSpacing: "0.03em" }}>{brand.website}</span> });

  const scaleVars: Record<string, number> = {};
  for (const [key, val] of Object.entries(design.fontScales || {})) if (typeof val === "number" && val > 0) scaleVars[`--s-${key}`] = val;
  const rootStyle: CSSProperties = {
    ...(scaleVars as CSSProperties),
    width: FLYER_W, height: FLYER_H, position: "relative", overflow: "hidden", background: "#FFFFFF",
    display: "flex", flexDirection: "column", fontFamily: DM, color: t.body,
  };

  return (
    <div className="flyer-pages" style={{ display: "flex", flexDirection: "column", gap: PAGE_GAP }}>
    <div ref={rootRef} className="flyer-root" style={rootStyle}>
      <header style={{ height: hero, display: "flex", flexShrink: 0 }}>
        <div ref={bandRef} style={{ width: 470, background: t.band, boxSizing: "border-box", padding: `52px 28px 54px ${MX}px`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.logo === "white" ? "/logo-white.svg" : "/logo-navy.svg"} alt="BOSS Consultancy Services Ltd." style={{ height: 46, width: "auto", display: "block", marginLeft: -6 }} />
            {companyTag.some(Boolean) ? (
              <>
                <div style={{ width: 1, height: 36, background: t.bandText, opacity: 0.45 }} />
                <p data-field="brand.companyTagline" data-group="tagline" style={{ margin: 0, fontFamily: PO, fontWeight: 500, fontStyle: "italic", fontSize: fv("tagline", 12.5), lineHeight: 1.35, color: t.bandText, whiteSpace: "pre-line" }}>{companyTag.join("\n")}</p>
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: hs(8) }}>
            {c.eyebrow ? (
              <span data-field="eyebrow" data-group="tagline" style={{ fontFamily: PO, fontWeight: 600, fontSize: hv("tagline", 12), letterSpacing: "0.16em", textTransform: "uppercase", color: t.eyebrow }}>{cleanText(c.eyebrow)}</span>
            ) : null}
            <h1 style={{ margin: 0, display: "flex", flexDirection: "column", color: t.bandText }}>
              {titleLines.map((line, i) => (
                <span key={i} data-field="titleLine" data-i={i} data-group="title" style={{ fontFamily: PO, fontWeight: c.bigCode ? 600 : 700, fontSize: hv("title", titleSize), lineHeight: 1.1 }}>{line}</span>
              ))}
              {c.bigCode ? (
                <span data-field="bigCode" data-group="code" style={{ fontFamily: PO, fontWeight: 700, fontSize: hv("code", 80), lineHeight: 0.9, letterSpacing: "-0.02em", color: t.big }}>{cleanText(c.bigCode)}</span>
              ) : null}
            </h1>
            {c.pill ? (
              <span data-field="pill" data-group="tagline" style={{ alignSelf: "flex-start", background: t.pillBg, color: t.pillText, fontFamily: PO, fontWeight: 600, fontSize: hv("tagline", 14), lineHeight: 1, padding: "8px 14px", borderRadius: 999 }}>{cleanText(c.pill)}</span>
            ) : null}
            {c.tagline && !hide.tagline ? (
              <p data-field="tagline" data-group="tagline" style={{ margin: "4px 0 0", fontFamily: PO, fontWeight: 600, fontStyle: "italic", fontSize: hv("tagline", 16.5), lineHeight: 1.3, color: t.tagline }}>{cleanText(c.tagline)}</p>
            ) : null}
            {c.intro && !hide.intro ? (
              <p data-field="intro" data-group="tagline" style={{ margin: 0, fontFamily: DM, fontSize: hv("tagline", 13.5), lineHeight: 1.5, color: t.bandMuted }}>{cleanText(c.intro)}</p>
            ) : null}
          </div>
        </div>
        <div data-field="photo" style={{ flex: 1, minWidth: 0, overflow: "hidden", position: "relative" }}>
          {photo.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.src}
              alt={c.photoScene || "Program photo"}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${photo.x}% ${photo.y}%`, transform: `scale(${photo.zoom})`, transformOrigin: `${photo.x}% ${photo.y}%`, display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: t.ph, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 36px 40px 24px", boxSizing: "border-box", textAlign: "center" }}>
              <ImageIcon size={34} color={t.phText} strokeWidth={1.6} aria-hidden />
              <span style={{ fontFamily: PO, fontWeight: 600, fontSize: 14, color: t.phText }}>Photo goes here</span>
              <span style={{ fontFamily: DM, fontSize: 12, lineHeight: 1.4, color: t.phText }}>Generate or upload one in the Photo tab</span>
            </div>
          )}
        </div>
      </header>

      {facts.length ? (
        <div style={{ margin: `-34px ${MX}px 0`, background: "#FFFFFF", border: `1px solid ${t.rule}`, borderRadius: 12, boxShadow: "0 6px 18px rgba(20, 30, 40, 0.08)", display: "grid", gridTemplateColumns: facts.map((f) => factColumn(f, design.fontScales?.facts ?? 1)).join(" "), position: "relative" }}>
          {facts.map((f, i) => (
            <FactCell key={i} i={i} f={{ ...f, label: cleanText(f.label), value: cleanText(f.value), note: cleanText(f.note) }} t={t} first={i === 0} />
          ))}
        </div>
      ) : null}

      <main ref={mainRef} style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: `18px ${MX}px 20px`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: k(16), overflow: "hidden" }}>
        {flow ? (split === null ? flowBlocks : flowBlocks.slice(0, split)) : rows}
      </main>

      <footer style={{ height: 60, flexShrink: 0, background: t.footer, boxSizing: "border-box", padding: `0 ${MX}px 12px`, display: "flex", alignItems: "center", justifyContent: footerItems.length > 1 ? "space-between" : "center" }}>
        {footerItems.flatMap(({ Icon, node }, i) => [
          i > 0 ? <div key={`d${i}`} style={{ width: 1, height: 24, background: t.footerDivider }} /> : null,
          <div key={`f${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon size={17} color={t.footerIcon} strokeWidth={2} aria-hidden />
            {node}
          </div>,
        ])}
      </footer>
    </div>
    {flow && split !== null ? (
      <div ref={root2Ref} className="flyer-root flyer-page2" style={rootStyle}>
        <header style={{ height: 150, flexShrink: 0, background: t.band, boxSizing: "border-box", padding: `0 ${MX}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.logo === "white" ? "/logo-white.svg" : "/logo-navy.svg"} alt="BOSS Consultancy Services Ltd." style={{ height: 42, width: "auto", display: "block", marginLeft: -6 }} />
          <div style={{ textAlign: "right", color: t.bandText }}>
            <div style={{ fontFamily: PO, fontWeight: 700, fontSize: 24, lineHeight: 1.15 }}>{[...titleLines, cleanText(c.bigCode || "")].filter(Boolean).join(" ")}</div>
            <div style={{ fontFamily: PO, fontWeight: 600, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: t.eyebrow, marginTop: 6 }}>Continued · page 2</div>
          </div>
        </header>
        <main ref={main2Ref} style={{ flex: 1, minHeight: 0, boxSizing: "border-box", padding: `28px ${MX}px 24px`, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: k(22), overflow: "hidden" }}>
          {flowBlocks.slice(split)}
        </main>
      <footer style={{ height: 60, flexShrink: 0, background: t.footer, boxSizing: "border-box", padding: `0 ${MX}px 12px`, display: "flex", alignItems: "center", justifyContent: footerItems.length > 1 ? "space-between" : "center" }}>
        {footerItems.flatMap(({ Icon, node }, i) => [
          i > 0 ? <div key={`d${i}`} style={{ width: 1, height: 24, background: t.footerDivider }} /> : null,
          <div key={`f${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon size={17} color={t.footerIcon} strokeWidth={2} aria-hidden />
            {node}
          </div>,
        ])}
      </footer>
      </div>
    ) : null}
    </div>
  );
});

export default Flyer;
