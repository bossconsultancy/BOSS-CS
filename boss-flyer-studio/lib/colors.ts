import type { Palette } from "./types";

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function rgbToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Darken until white text/glyphs read on it at the given ratio. */
export function ensureContrastWithWhite(hex: string, ratio = 3): string {
  let c = hex;
  for (let i = 0; i < 20 && contrast(c, "#FFFFFF") < ratio; i++) c = mix(c, "#000000", 0.08);
  return c;
}

export function readableOn(bg: string, preferred: string, fallback: string, ratio = 3): string {
  return contrast(bg, preferred) >= ratio ? preferred : fallback;
}

const NAVY = "#26394A";

export interface Theme {
  band: string;
  bandText: string;
  bandMuted: string;
  eyebrow: string;
  tagline: string;
  big: string;
  pillBg: string;
  pillText: string;
  tile: string;
  light: string;
  rule: string;
  ink: string;
  body: string;
  muted: string;
  footer: string;
  footerText: string;
  footerIcon: string;
  footerDivider: string;
  logo: "white" | "navy";
  ph: string;
  phText: string;
}

export function buildTheme(p: Palette): Theme {
  const band = isHex(p.header) ? p.header : "#1B3A5C";
  const bandLight = luminance(band) > 0.3;
  const bandText = bandLight ? NAVY : "#FFFFFF";
  const bandMuted = bandLight ? "#2F3A44" : mix(band, "#FFFFFF", 0.85);
  const accent = isHex(p.headerAccent) ? p.headerAccent : bandText;
  const eyebrow = readableOn(band, accent, bandText, 3);
  const tile = ensureContrastWithWhite(isHex(p.icons) ? p.icons : band, 3);
  const [h, s] = rgbToHsl(tile);
  const light = isHex(p.panel) ? p.panel : mix(tile, "#FFFFFF", 0.9);
  const rule = mix(tile, "#FFFFFF", 0.72);
  const ink = hslToHex(h, Math.min(s, 0.45), 0.17);
  const body = hslToHex(h, Math.min(s, 0.16), 0.29);
  const muted = hslToHex(h, Math.min(s, 0.12), 0.38);
  const footer = isHex(p.footer) ? p.footer : band;
  const footerLight = luminance(footer) > 0.3;
  const footerText = footerLight ? NAVY : "#FFFFFF";
  const footerIcon = readableOn(footer, accent, footerText, 3);
  const pillBg = bandLight ? NAVY : readableOn(band, accent, "#FFFFFF", 2.5);
  const pillText = bandLight ? "#FFFFFF" : contrast(pillBg, band) >= 4.5 ? band : contrast(pillBg, "#FFFFFF") > 4.5 ? "#FFFFFF" : NAVY;
  const ph = mix(band, "#FFFFFF", bandLight ? 0.35 : 0.72);
  return {
    band,
    bandText,
    bandMuted,
    eyebrow,
    tagline: eyebrow,
    big: bandText,
    pillBg,
    pillText,
    tile,
    light,
    rule,
    ink,
    body,
    muted,
    footer,
    footerText,
    footerIcon,
    footerDivider: footerLight ? "rgba(38,57,74,0.3)" : "rgba(255,255,255,0.35)",
    logo: bandLight ? "navy" : "white",
    ph,
    phText: luminance(ph) > 0.4 ? mix(band, "#000000", bandLight ? 0.6 : 0.2) : "#FFFFFF",
  };
}

/** Build a whole palette from one colour. */
export function paletteFromBase(base: string): Palette {
  const [h, s, l] = rgbToHsl(base);
  const light = luminance(base) > 0.3;
  return {
    header: base,
    headerAccent: light ? NAVY : hslToHex(h, Math.min(0.85, s + 0.1), 0.84),
    icons: light ? hslToHex(h, Math.min(0.9, s + 0.1), 0.36) : hslToHex(h, s, Math.min(0.4, l + 0.05)),
    panel: hslToHex(h, Math.min(0.7, s), 0.95),
    footer: light ? NAVY : hslToHex(h, s, Math.max(0.12, l - 0.08)),
  };
}

export interface Preset {
  id: string;
  name: string;
  palette: Palette;
}

export const PRESETS: Preset[] = [
  { id: "sky-navy", name: "Navy + sky blue (PSW)", palette: { header: "#1B3A5C", headerAccent: "#8FD3F4", icons: "#1B3A5C", panel: "#E5F4FC", footer: "#1B3A5C" } },
  { id: "mustard", name: "Mustard gold (G2)", palette: { header: "#E0A82E", headerAccent: "#26394A", icons: "#C2510E", panel: "#FBF1D6", footer: "#26394A" } },
  { id: "copper", name: "Dark copper (G3)", palette: { header: "#8E3B12", headerAccent: "#F6C6A4", icons: "#A9481A", panel: "#FBEDE3", footer: "#6E2C0C" } },
  { id: "berry", name: "Deep berry (ECEA)", palette: { header: "#7A1F4F", headerAccent: "#F7C1D9", icons: "#8E2A5E", panel: "#FCEEF4", footer: "#5E1639" } },
  { id: "boss", name: "BOSS classic", palette: { header: "#304656", headerAccent: "#C3D7DD", icons: "#304656", panel: "#E6EFF2", footer: "#304656" } },
  { id: "teal", name: "Deep teal", palette: { header: "#0F5E5C", headerAccent: "#9FE0D6", icons: "#127572", panel: "#E3F4F2", footer: "#0B4846" } },
  { id: "emerald", name: "Emerald", palette: { header: "#1E5B3A", headerAccent: "#B8E3C6", icons: "#23704A", panel: "#E6F4EB", footer: "#174A2F" } },
  { id: "indigo", name: "Indigo", palette: { header: "#33307A", headerAccent: "#C7C3F5", icons: "#4540A0", panel: "#ECEBFA", footer: "#28265F" } },
  { id: "crimson", name: "Crimson", palette: { header: "#8A1C2B", headerAccent: "#F5BFC6", icons: "#A32235", panel: "#FBE9EB", footer: "#6B1520" } },
];

/** Plain-English colour name, used in the photo prompt so clothing matches the flyer. */
export function colourName(hex: string): string {
  const [h, s, l] = rgbToHsl(hex);
  if (s < 0.12) return l > 0.85 ? "white" : l < 0.2 ? "charcoal" : "grey";
  const dark = l < 0.3;
  const pale = l > 0.78;
  let name: string;
  if (h < 12 || h >= 345) name = "red";
  else if (h < 28) name = dark ? "rust" : "copper orange";
  else if (h < 45) name = dark ? "brown" : "orange";
  else if (h < 62) name = "mustard yellow";
  else if (h < 90) name = "olive green";
  else if (h < 160) name = "green";
  else if (h < 190) name = "teal";
  else if (h < 215) name = pale ? "sky blue" : "blue";
  else if (h < 250) name = dark ? "navy blue" : "blue";
  else if (h < 290) name = "purple";
  else if (h < 330) name = dark ? "berry" : "pink";
  else name = "rose";
  if (pale && !name.startsWith("sky")) return `soft ${name}`;
  if (dark && !["navy blue", "rust", "brown", "berry"].includes(name)) return `deep ${name}`;
  return name;
}
