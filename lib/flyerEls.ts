import type { ElOverride } from "./types";

/** Stable key for a piece of the flyer: blocks have data-el, text has data-field (+ data-i / data-part). */
export function elKey(el: HTMLElement): string {
  if (el.dataset.el) return `el:${el.dataset.el}`;
  return `f:${el.dataset.field || ""}|${el.dataset.i ?? ""}|${el.dataset.part ?? ""}`;
}

export function selectorOf(key: string): string {
  if (key.startsWith("el:")) return `[data-el="${css(key.slice(3))}"]`;
  const [field, i, part] = key.slice(2).split("|");
  return `[data-field="${css(field)}"]${i ? `[data-i="${css(i)}"]` : ""}${part ? `[data-part="${css(part)}"]` : ""}`;
}

const css = (s: string) => s.replace(/["\\]/g, "");

/** CSS for the manual changes. `layout` rules change the flow (size, width, hide); `visual` rules only move/paint. */
export function overrideCss(scope: string, ov: Record<string, ElOverride> | undefined) {
  let layout = "";
  let visual = "";
  for (const [key, o] of Object.entries(ov || {})) {
    const sel = `[data-fid="${scope}"] ${selectorOf(key)}`;
    const l: string[] = [];
    const v: string[] = [];
    if (o.hide) l.push("display:none");
    if (o.w) l.push(`width:${o.w}px`, "max-width:none", "flex:none", "display:block");
    if (o.fpx) l.push(`font-size:${o.fpx}px`);
    if (o.b !== undefined) l.push(`font-weight:${o.b ? 700 : 400}`);
    if (o.it !== undefined) v.push(`font-style:${o.it ? "italic" : "normal"}`);
    if (o.al) l.push(`text-align:${o.al}`);
    if (o.color) v.push(`color:${o.color}`);
    if (o.bg) v.push(`background:${o.bg}`);
    if (o.x || o.y || (o.s && o.s !== 1)) {
      v.push(`transform:translate(${o.x || 0}px,${o.y || 0}px) scale(${o.s || 1})`, "position:relative", "z-index:3");
    }
    if (l.length) layout += `${sel}{${l.map((x) => x + " !important").join(";")}}\n`;
    if (v.length) visual += `${sel}{${v.map((x) => x + " !important").join(";")}}\n`;
  }
  return { layout, visual };
}
