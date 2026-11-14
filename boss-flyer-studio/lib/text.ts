import type { FlyerContent } from "./types";

/** House rule: no long dashes anywhere (they read as AI-written). */
export function cleanText(s: string): string {
  if (!s) return "";
  return s
    .replace(/(\d[\d,.$%]*)\s*[–—]\s*(?=[$\d])/g, "$1 to ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function cleanContent(c: FlyerContent): FlyerContent {
  const list = (a: string[]) => (a || []).map(cleanText).filter(Boolean);
  return {
    ...c,
    programName: cleanText(c.programName),
    eyebrow: cleanText(c.eyebrow),
    titleLine: cleanText(c.titleLine),
    bigCode: cleanText(c.bigCode),
    pill: cleanText(c.pill),
    tagline: cleanText(c.tagline),
    intro: cleanText(c.intro),
    facts: (c.facts || []).map((f) => ({ ...f, label: cleanText(f.label), value: cleanText(f.value), note: cleanText(f.note) })),
    learn: list(c.learn),
    highlights: list(c.highlights),
    careers: list(c.careers),
    admission: list(c.admission),
    salary: (c.salary || []).map((r) => ({ label: cleanText(r.label), value: cleanText(r.value) })).filter((r) => r.value),
    financialNote: cleanText(c.financialNote),
    photoScene: cleanText(c.photoScene),
  };
}

export function hasLongDash(s: string): boolean {
  return /[–—]/.test(s);
}
