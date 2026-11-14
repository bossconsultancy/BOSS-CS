export const ICON_NAMES = [
  "calendar",
  "clock",
  "schedule",
  "wallet",
  "monitor",
  "briefcase",
  "award",
  "shield",
  "cap",
  "users",
  "sunmoon",
  "book",
  "hourglass",
  "pin",
  "globe",
  "clipboard",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export interface Fact {
  icon: IconName;
  label: string;
  value: string;
  note: string;
}

export interface SalaryRow {
  label: string;
  value: string;
}

export interface SectionTitles {
  learn: string;
  highlights: string;
  careers: string;
  admission: string;
  salary: string;
}

export interface FlyerContent {
  programName: string;
  eyebrow: string;
  titleLine: string;
  bigCode: string;
  pill: string;
  tagline: string;
  intro: string;
  facts: Fact[];
  learn: string[];
  highlights: string[];
  careers: string[];
  admission: string[];
  salary: SalaryRow[];
  financialNote: string;
  photoScene: string;
  titles: SectionTitles;
}

/** The five colours a person edits. Everything else is derived from these. */
export interface Palette {
  header: string; // header band
  headerAccent: string; // eyebrow, tagline and pill on the header
  icons: string; // icon tiles, check marks, rules
  panel: string; // light panels and chips
  footer: string; // footer bar
}

export type LayoutMode = "auto" | "wide" | "split";
export type SectionKey = "intro" | "tagline" | "learn" | "highlights" | "careers" | "admission" | "salary" | "financial";

export interface PhotoSettings {
  src: string; // data URL ("" = placeholder)
  x: number; // 0-100 focus point
  y: number; // 0-100
  zoom: number; // 1-2
}

export interface Design {
  presetId: string;
  palette: Palette;
  layout: LayoutMode;
  learnCols: 0 | 1 | 2 | 3; // 0 = automatic
  textSize: number; // 0 = automatic, otherwise scale factor 0.9-1.25
  headerHeight: number; // px, 300-420
  photo: PhotoSettings;
  hidden: Partial<Record<SectionKey, boolean>>;
}

export interface Brand {
  companyTagline: string;
  phone: string;
  address: string;
  website: string;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  content: FlyerContent;
  design: Design;
  brand: Brand;
}

export const DEFAULT_TITLES: SectionTitles = {
  learn: "What You Will Learn",
  highlights: "Program Highlights",
  careers: "Your Future Looks Bright",
  admission: "Admission Requirements",
  salary: "Estimated Salary",
};

export const DEFAULT_BRAND: Brand = {
  companyTagline: "Education & Career\nSuccess Starts Here",
  phone: "416-605-0101",
  address: "151 Nashdene Rd, #51, Scarborough, ON M1V 4C3",
  website: "BOSSCS.COM",
};

export function emptyContent(): FlyerContent {
  return {
    programName: "New Program",
    eyebrow: "",
    titleLine: "Program Name",
    bigCode: "",
    pill: "",
    tagline: "",
    intro: "",
    facts: [
      { icon: "calendar", label: "Duration", value: "[Duration]", note: "" },
      { icon: "wallet", label: "Course fee", value: "[Fee]", note: "" },
    ],
    learn: [],
    highlights: [],
    careers: [],
    admission: [],
    salary: [],
    financialNote: "",
    photoScene: "",
    titles: { ...DEFAULT_TITLES },
  };
}
