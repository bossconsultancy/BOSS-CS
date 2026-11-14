import { colourName } from "./colors";
import type { Palette } from "./types";

export const PHOTO_SIZE = "1440x1440";

/** Full image prompt: the course-specific scene plus the BOSS photo style rules. */
export function buildImagePrompt(scene: string, palette: Palette): string {
  const colours = Array.from(new Set([colourName(palette.header), colourName(palette.icons)])).join(" and ");
  const s = scene.trim().replace(/\.$/, "");
  return [
    `Realistic, natural editorial photograph: ${s || "a friendly student and an advisor talking in a bright modern college"}.`,
    "The people are South Indian with fair to light wheatish skin tones, warm, smiling and approachable, in a bright, clean, modern real-world setting with soft natural light.",
    `Clothing or small accents in ${colours} so the photo matches the flyer colours.`,
    "Square composition. Keep every face and the hands fully in view in the upper and middle part of the frame, away from the edges, with nothing important in the bottom 15 percent.",
    "Shallow depth of field, realistic skin texture, no studio backdrop.",
    "No text, no letters, no signs, no logos, no watermarks.",
  ].join(" ");
}
