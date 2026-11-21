// Unicode Tamil <-> Bamini (Nandas Creations) legacy font encoding.
// The booklet is set in the Bamini fonts, where Latin letters stand for Tamil glyphs. To edit Tamil text
// you type normal Unicode Tamil and this converts it; Latin words are wrapped in a span set in the Latin
// font, because the Bamini fonts replace Latin letters with Tamil glyphs.

const CONS: Record<string, string> = {
  க: "f", ங: "q", ச: "r", ஞ: "Q", ட: "l", ண: "z", த: "j", ந: "e", ப: "g", ம: "k",
  ய: "a", ர: "u", ல: "y", வ: "t", ழ: "o", ள: "s", ற: "w", ன: "d",
  ஜ: "[", ஷ: "\\", ஸ: "]", ஹ: "`", "க்ஷ": "~",
};
const VOWELS: Record<string, string> = {
  அ: "m", ஆ: "M", இ: ",", ஈ: "<", உ: "c", ஊ: "C", எ: "v", ஏ: "V", ஐ: "I",
  ஒ: "x", ஓ: "X", ஔ: "xs", "ஃ": "/",
};
const U_LIG: Record<string, string> = {
  க: "F", ச: "R", ட: "L", ண: "Z", த: "J", ந: "E", ப: "G", ம: "K", ய: "A",
  ர: "U", ல: "Y", வ: "T", ழ: "O", ள: "S", ற: "W", ன: "D",
};
const UU_LIG: Record<string, string> = { க: "$", ச: "#", ட: "^", ம: "%", ர: "&", ள: "@", ழ: "*" };
const UU_TAIL: Record<string, string> = { ப: "+", ய: "+", வ: "+", ண: "}", த: "}", ந: "}", ல: "}", ற: "}", ன: "}" };
const SIGN_AFTER: Record<string, string> = { "ா": "h", "ி": "p", "ீ": "P", "்": ";" };
const SIGN_BEFORE: Record<string, string> = { "ெ": "n", "ே": "N", "ை": "i" };
const SIGN_SPLIT: Record<string, [string, string]> = { "ொ": ["n", "h"], "ோ": ["N", "h"], "ௌ": ["n", "s"] };
const SPECIAL: Record<string, string> = { "டி": "b", "டீ": "B" };

const CONS_RE = "க்ஷ|[கஙசஞடணதநபமயரலவழளறனஜஷஸஹ]";
const SYL = new RegExp(`ஸ்ரீ|(${CONS_RE})([ாிீுூெேைொோௌ்]?)|([அஆஇஈஉஊஎஏஐஒஓஔஃ])`, "g");

export const TAMIL = /[஀-௿]/;

/** One run of Unicode Tamil to Bamini characters. Anything it cannot map is kept as it is. */
export function tamilToBamini(run: string): string {
  let out = "";
  let pos = 0;
  SYL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SYL.exec(run))) {
    if (m.index > pos) out += run.slice(pos, m.index);
    pos = m.index + m[0].length;
    if (m[0] === "ஸ்ரீ") { out += "="; continue; }
    if (m[3]) { out += VOWELS[m[3]]; continue; }
    const c = m[1];
    const s = m[2] || "";
    const base = CONS[c];
    const special = SPECIAL[c + s];
    if (special) out += special;
    else if (s === "") out += base;
    else if (SIGN_AFTER[s]) out += base + SIGN_AFTER[s];
    else if (SIGN_BEFORE[s]) out += SIGN_BEFORE[s] + base;
    else if (SIGN_SPLIT[s]) out += SIGN_SPLIT[s][0] + base + SIGN_SPLIT[s][1];
    else if (s === "ு") out += U_LIG[c] || base + "{";
    else if (s === "ூ") out += UU_LIG[c] || (UU_TAIL[c] ? U_LIG[c] + UU_TAIL[c] : base + "{");
    else out += base;
  }
  out += run.slice(pos);
  return out;
}

// ---- the other way round, so the editor can show you what a line says in normal Tamil ----

const R_CONS: Record<string, string> = {};
for (const [k, v] of Object.entries(CONS)) R_CONS[v] = k;
const R_VOWELS: Record<string, string> = {};
for (const [k, v] of Object.entries(VOWELS)) R_VOWELS[v] = k;
const R_U: Record<string, string> = {};
for (const [k, v] of Object.entries(U_LIG)) R_U[v] = k;
const R_UU: Record<string, string> = {};
for (const [k, v] of Object.entries(UU_LIG)) R_UU[v] = k;
const R_AFTER: Record<string, string> = {};
for (const [k, v] of Object.entries(SIGN_AFTER)) R_AFTER[v] = k;

/** Bamini characters back to Unicode Tamil, for showing existing text in the edit box. */
export function baminiToTamil(src: string): string {
  let out = "";
  let i = 0;
  const cons = (ch: string) => R_CONS[ch];
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "=") { out += "ஸ்ரீ"; i += 1; continue; }
    if (ch === "b" || ch === "B") { out += ch === "b" ? "டி" : "டீ"; i += 1; continue; }
    if (ch === "x" && next === "s") { out += "ஔ"; i += 2; continue; }
    if (ch === "n" || ch === "N" || ch === "i") {           // vowel sign written before the consonant
      const c = cons(next);
      if (c) {
        const tail = src[i + 2];
        if (ch !== "i" && tail === "h") { out += c + (ch === "n" ? "ொ" : "ோ"); i += 3; continue; }
        if (ch === "n" && tail === "s") { out += c + "ௌ"; i += 3; continue; }
        out += c + (ch === "n" ? "ெ" : ch === "N" ? "ே" : "ை");
        i += 2;
        continue;
      }
    }
    if (R_U[ch]) {                                           // consonant + u, or + uu with a tail glyph
      const c = R_U[ch];
      if (next && (UU_TAIL[c] === next)) { out += c + "ூ"; i += 2; continue; }
      out += c + "ு";
      i += 1;
      continue;
    }
    if (R_UU[ch]) { out += R_UU[ch] + "ூ"; i += 1; continue; }
    const c = cons(ch);
    if (c) {
      if (next && R_AFTER[next]) { out += c + R_AFTER[next]; i += 2; continue; }
      out += c;
      i += 1;
      continue;
    }
    if (R_VOWELS[ch]) { out += R_VOWELS[ch]; i += 1; continue; }
    out += ch;
    i += 1;
  }
  return out;
}

const LAT = 'font-family: var(--lat); font-size: var(--ls); font-weight: var(--lw)';

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Typed text (Unicode Tamil mixed with English) to the HTML the booklet uses: Tamil in Bamini
 * characters, every Latin run in a span set in the Latin font.
 */
export function typedToBookletHtml(text: string): string {
  const runs = text.split(/([஀-௿]+(?:\s+[஀-௿]+)*)/);
  let out = "";
  for (const part of runs) {
    if (!part) continue;
    if (TAMIL.test(part)) out += escapeHtml(tamilToBamini(part));
    else if (!part.trim()) out += part;
    else out += `<span style="${LAT}">${escapeHtml(part)}</span>`;
  }
  return out.replace(/\n/g, "<br>");
}

/** Read a booklet element back as plain typed text (Bamini runs decoded, Latin spans kept). */
export function elementToTyped(el: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      // Only text actually shown in a Bamini font is converted; English text is kept as it is.
      const latin = !parent || (parent.getAttribute("style") || "").includes("var(--lat)") || !/Bamini/i.test(getComputedStyle(parent).fontFamily || "");
      out += latin ? node.nodeValue || "" : baminiToTamil(node.nodeValue || "");
      return;
    }
    if (node.nodeName === "BR") { out += "\n"; return; }
    node.childNodes.forEach(walk);
  };
  el.childNodes.forEach(walk);
  return out;
}

/** True when this element's text is set in one of the Bamini fonts. */
export function isBamini(el: HTMLElement): boolean {
  const f = getComputedStyle(el).fontFamily || "";
  return /Bamini/i.test(f);
}
