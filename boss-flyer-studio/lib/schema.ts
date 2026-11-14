import { ICON_NAMES } from "./types";

const str = { type: "string" } as const;
const strList = { type: "array", items: { type: "string" } } as const;

/** JSON schema for OpenAI Structured Outputs (strict mode: every key required, no extras). */
export const FLYER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "programName", "eyebrow", "titleLine", "bigCode", "pill", "tagline", "intro", "facts",
    "learn", "highlights", "careers", "admission", "salary", "financialNote", "photoScene", "missing",
  ],
  properties: {
    programName: str,
    eyebrow: str,
    titleLine: str,
    bigCode: str,
    pill: str,
    tagline: str,
    intro: str,
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["icon", "label", "value", "note"],
        properties: { icon: { type: "string", enum: [...ICON_NAMES] }, label: str, value: str, note: str },
      },
    },
    learn: strList,
    highlights: strList,
    careers: strList,
    admission: strList,
    salary: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["label", "value"], properties: { label: str, value: str } },
    },
    financialNote: str,
    photoScene: str,
    missing: strList,
  },
} as const;

export const SYSTEM_PROMPT = `You turn raw course information for BOSS Consultancy Services Ltd. (a Canadian education consultancy) into the fields of a one-page program flyer for students and families.

STRICT RULES
- Use ONLY facts that appear in the user's text. Never invent tuition, dates, durations, hours, approvals, requirements, salaries or outcomes. If something is not in the text, leave that field empty ("" or []) and add a short note to "missing" (for example "Tuition fee", "Admission requirements").
- Keep the user's wording. You may fix spelling, split items that were accidentally joined, use Title Case for list items, and shorten very long items slightly without changing meaning.
- Never use em dashes or en dashes. Use commas, colons, "and", or "to" for ranges (for example "$19 to $22 per hour").
- Plain, warm, client-facing English.

FIELDS
- programName: the full program name, for file names.
- titleLine: the program name as the headline. If the program has a short code such as G2, G3 or AZ, put the name without the code here (for example "Gas Technician") and the code in bigCode. For long names, insert "\\n" where the headline should break into two balanced lines (at most 3 lines, about 20 characters per line).
- bigCode: a short code shown very large (2 to 4 characters), or "".
- eyebrow: a very short label above the title only if supported by the text (for example "100% Online Program", "TSSA-Approved Program"), else "".
- pill: a short credential or level label if stated (for example "Level 1 and Level 2", "PSW Program", "Diploma"), else "".
- tagline: a slogan only if the text contains one, else "".
- intro: one or two sentences from the text describing the program, max 120 characters, else "".
- facts: the 3 or 4 most important key facts (duration, hours, schedule, fee, format, placement, intake, location). label: 1 to 2 words. value: VERY short, max 14 characters (for example "5 Months", "$6,000", "100% Online", "2 Batches"). note: optional detail, max 32 characters. Pick an icon: calendar (duration, dates), clock (hours), schedule (batch, intake), wallet (fees), monitor (online), briefcase (placement, work), award (certification), shield (approval), cap (credential), users (class size), sunmoon (morning/evening), book (study), hourglass (length), pin (location), globe (international), clipboard (requirements).
- learn: topics or modules students learn.
- highlights: program benefits and features.
- careers: job titles or workplaces after the program, short (max 34 characters each).
- admission: entry or eligibility requirements.
- salary: salary or wage rows if stated, for example {label:"Annual salary", value:"$37,000 to $45,000"}.
- financialNote: a sentence about financial assistance, funding or payment help if mentioned, else "".
- photoScene: one sentence describing a realistic, positive photo for this program: who is in it (age, role), what they are doing, where (a specific bright, modern setting). Do not describe ethnicity, colours, camera or text; those are added later.
- missing: short names of important facts that were not in the text.`;
