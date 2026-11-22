import { PRESETS } from "./colors";
import { DEFAULT_BRAND, DEFAULT_TITLES, type Design, type FlyerContent, type Project } from "./types";

export function defaultDesign(presetId = "sky-navy"): Design {
  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  return {
    presetId: preset.id,
    palette: { ...preset.palette },
    layout: "auto",
    learnCols: 0,
    textSize: 0,
    headerHeight: 350,
    photo: { src: "", x: 50, y: 35, zoom: 1 },
    hidden: {},
  };
}

const ELIG = ["Work Permit holders", "Permanent Residents", "Canadian Citizens", "Refugees"];
const FIN = "Financial assistance available to those who qualify.";
const GAS_TAG = "Build Your Skills. Power Your Career.";
const GAS_INTRO = "Get hands-on training in gas systems with a strong focus on technical and safety skills.";

const G2: FlyerContent = {
  programName: "Gas Technician G2",
  eyebrow: "",
  titleLine: "Gas Technician",
  bigCode: "G2",
  pill: "",
  tagline: GAS_TAG,
  intro: GAS_INTRO,
  facts: [
    { icon: "calendar", label: "Duration", value: "5 Months", note: "" },
    { icon: "clock", label: "Total hours", value: "500 Hours", note: "400 theory + 100 practical" },
    { icon: "schedule", label: "Schedule", value: "Weekday", note: "Weekday batch" },
    { icon: "wallet", label: "Tuition fee", value: "$6,000", note: "" },
  ],
  learn: [
    "Piping and Tubing Systems for Industrial and Commercial Applications",
    "Pressure Regulators, Overpressure Protection, Meters and Fuel Containers",
    "Methods of Installing Air, Vapor and Moisture Barriers",
    "Water Heaters and Combination Systems",
    "Space Heaters and Decorative Appliances",
    "Mechanical Controls Systems",
    "Ventilation and Filtration",
    "Domestic Appliances",
    "Domestic Gas-Fired Refrigerators",
    "Conversion Burners",
    "Forced Warm-Air Heating Systems",
    "Hydronic Heating Systems",
    "Venting Practices",
    "Forced-Air Add-on Devices",
    "Air Handling",
  ],
  highlights: ["TSSA-Approved Program", "Training-Focused Teaching", "In-person Tests after Modules", "Flexible Payment Options as Advertised"],
  careers: [
    "G2 Gas Technician", "Water Heater Technician", "HVAC Technician", "HVAC Service Technician", "Furnace Technician",
    "Gas Installation Technician", "Gas Appliance Technician", "Residential HVAC Technician", "Boiler Technician", "Commercial HVAC Technician",
  ],
  admission: ELIG,
  salary: [],
  financialNote: FIN,
  photoScene: "a gas technician in his late 20s servicing a residential natural gas furnace in a clean utility room, wearing a work shirt, safety glasses and gloves, checking a gas pressure gauge",
  titles: { ...DEFAULT_TITLES },
};

const G3: FlyerContent = {
  programName: "Gas Technician G3",
  eyebrow: "",
  titleLine: "Gas Technician",
  bigCode: "G3",
  pill: "",
  tagline: GAS_TAG,
  intro: GAS_INTRO,
  facts: [
    { icon: "calendar", label: "Weekday batch", value: "3 Months", note: "" },
    { icon: "schedule", label: "Weekend batch", value: "4 Months", note: "Approximately" },
    { icon: "wallet", label: "Tuition fee", value: "$3,000", note: "" },
    { icon: "shield", label: "Approval", value: "TSSA", note: "Approved program" },
  ],
  learn: [
    "Tools and Safety Equipment", "Fasteners, Tools and Testing Instruments", "Identify Electrical and Power Test Instruments",
    "Properties, Characteristics and Safe Handling of Fuel Gases", "Utilization Codes, Acts and Regulations", "Introduction to Electricity",
    "Technical Manuals, Specifications, Schematics, Drawings and Graphs", "Customer Relations", "Safety Concerns",
    "Introduction to Piping and Tubing Systems", "Introduction to Gas Appliances", "Purpose of Venting and Ventilation",
  ],
  highlights: ["TSSA-Approved Program", "In-person Tests after Modules", "Flexible Payment Options as Advertised", "Training-Focused Teaching"],
  careers: [
    "G3 Gas Technician Assistant", "Water Heater Service Assistant", "HVAC Technician Helper",
    "Gas Appliance Service Assistant", "Furnace Maintenance Assistant", "Heating System Installation Assistant",
  ],
  admission: [],
  salary: [],
  financialNote: "Financial assistance may be available to those who qualify.",
  photoScene: "a young trainee gas technician in his early 20s fitting a valve on copper and steel gas piping in a bright training workshop, wearing coveralls, safety glasses and gloves, using a pipe wrench",
  titles: { ...DEFAULT_TITLES },
};

const ECEA: FlyerContent = {
  programName: "Early Childhood Educator Assistant",
  eyebrow: "100% Online Program",
  titleLine: "Early Childhood\nEducator Assistant",
  bigCode: "",
  pill: "Level 1 and Level 2",
  tagline: "",
  intro: "",
  facts: [
    { icon: "calendar", label: "Duration", value: "3 Months", note: "" },
    { icon: "briefcase", label: "Placement", value: "4 Weeks", note: "Practicum" },
    { icon: "monitor", label: "Class format", value: "100% Online", note: "2 days per week" },
    { icon: "wallet", label: "Course fee", value: "$3,500", note: "" },
  ],
  learn: [
    "Foundations of Early Childhood Education", "Child Growth, Development, and Observation", "Play, Learning, and Responsive Practice",
    "Health, Safety, Nutrition, and Inclusion", "Families, Teams, and Professional Practice", "Workplace Readiness and Practicum Preparation",
  ],
  highlights: ["Quality Teaching and Expert Instruction", "Guaranteed Practicum Placement", "Career Support and Job Search Support", "Flexible Monthly Installment Plans"],
  careers: [
    "Childcare Centres", "Preschools", "Early Learning Programs", "Before and After School Programs", "Montessori Schools",
    "Home-Based or Private Childcare", "Community Childcare Programs", "Recreation Centres",
  ],
  admission: ELIG,
  salary: [
    { label: "Annual salary", value: "$37,000 to $45,000" },
    { label: "Hourly wage", value: "$19 to $22 per hour" },
  ],
  financialNote: FIN,
  photoScene: "a warm early childhood educator in her late 20s sitting at a low table playing with colourful building blocks with three happy toddlers in a bright childcare classroom",
  titles: { ...DEFAULT_TITLES },
};

const PSW: FlyerContent = {
  programName: "Personal Support Worker (PSW)",
  eyebrow: "",
  titleLine: "Personal Support\nWorker",
  bigCode: "",
  pill: "PSW Program",
  tagline: "Care Today. A Better Tomorrow.",
  intro: "",
  facts: [
    { icon: "calendar", label: "Duration", value: "6 Months", note: "" },
    { icon: "clock", label: "Total hours", value: "700 Hours", note: "Incl. 300 hrs clinical placement" },
    { icon: "sunmoon", label: "Schedule", value: "2 Batches", note: "Morning and evening" },
    { icon: "wallet", label: "Course fee", value: "$5,500", note: "" },
  ],
  learn: [
    "PSW Foundations", "Body Systems", "Safety and Mobility",
    "Care Planning, Restorative Care and Documentation", "Household Management, Nutrition and Hydration", "Assisting the Family, Growth and Development",
    "Cognitive and Mental Health Issues and Brain Injuries", "Gentle Persuasive Approaches in Dementia Care", "Assisting with Personal Hygiene",
    "Abuse and Neglect", "Health Conditions", "Assisting with Medications",
    "Assisting the Dying Person", "Oral Hygiene", "Clinical Placement",
  ],
  highlights: [
    "NACC Approved", "Eligibility for the NACC certification exam on completion", "Quality Teaching and Expert Instruction",
    "Guaranteed Clinical Placement", "Modern PSW Lab and Hands-On Lab Training", "Career Support and Job Search Support",
    "Government Incentives up to $30,000", "Flexible Monthly Installment Plans",
  ],
  careers: [
    "Retirement Homes", "Home Care Agencies", "Long-Term Care and Nursing Homes", "Community Health Centres",
    "Adult Day Programs", "Palliative and Hospice Care", "Hospitals and Rehabilitation", "Mental Health Facilities",
  ],
  admission: [
    "Work Permit holders, Permanent Residents, Canadian Citizens and Refugees",
    "Clear Criminal Record Check, including Vulnerable Sector Check",
    "English Language Proficiency",
  ],
  salary: [],
  financialNote: FIN,
  photoScene: "a kind personal support worker in her late 20s in scrubs gently helping a happy elderly woman seated in a bright care home lounge, hand on her shoulder, both smiling at each other",
  titles: { ...DEFAULT_TITLES },
};

export interface Template {
  id: string;
  name: string;
  content: FlyerContent;
  presetId: string;
  headerHeight: number;
}

export const TEMPLATES: Template[] = [
  { id: "g2", name: "Gas Technician G2", content: G2, presetId: "mustard", headerHeight: 350 },
  { id: "g3", name: "Gas Technician G3", content: G3, presetId: "copper", headerHeight: 350 },
  { id: "ecea", name: "Early Childhood Educator Assistant", content: ECEA, presetId: "berry", headerHeight: 320 },
  { id: "psw", name: "Personal Support Worker", content: PSW, presetId: "sky-navy", headerHeight: 298 },
];

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Each program has ONE master flyer that everyone edits; its id is fixed so nobody makes a second copy. */
export const masterId = (t: Template) => `master${t.id.replace(/[^a-z0-9]/gi, "")}`.padEnd(6, "0");
export const isMasterId = (id: string) => TEMPLATES.some((t) => masterId(t) === id);
export const templateByName = (name: string) => TEMPLATES.find((t) => t.name.trim().toLowerCase() === (name || "").trim().toLowerCase());

export function projectFromTemplate(t: Template): Project {
  const design = defaultDesign(t.presetId);
  design.headerHeight = t.headerHeight;
  return {
    id: masterId(t),
    name: t.name,
    updatedAt: Date.now(),
    content: JSON.parse(JSON.stringify(t.content)),
    design,
    brand: { ...DEFAULT_BRAND },
  };
}
