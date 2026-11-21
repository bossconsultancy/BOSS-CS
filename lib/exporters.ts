"use client";

import { getFontEmbedCSS, toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const W = 840;
const H = 1080;
const PRINT_RATIO = 300 / 96; // 300 dpi at 8.75 x 11.25 in

function fileSafe(name: string) {
  return (name || "flyer").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "flyer";
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function opts(node: HTMLElement) {
  const fontEmbedCSS = await getFontEmbedCSS(node);
  return { width: W, height: H, pixelRatio: PRINT_RATIO, cacheBust: true, fontEmbedCSS, style: { transform: "none", margin: "0" } };
}

export async function exportPng(node: HTMLElement, name: string, node2?: HTMLElement | null) {
  const dataUrl = await toPng(node, await opts(node));
  download(dataUrl, `${fileSafe(name)}-print${node2 ? "-page-1" : ""}.png`);
  if (node2) download(await toPng(node2, await opts(node2)), `${fileSafe(name)}-print-page-2.png`);
}

export async function exportPdf(node: HTMLElement, name: string, node2?: HTMLElement | null) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: [8.75, 11.25], compress: true });
  const pages = [node, ...(node2 ? [node2] : [])];
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await toJpeg(pages[i], { ...(await opts(pages[i])), quality: 0.95, backgroundColor: "#ffffff" });
    if (i) pdf.addPage([8.75, 11.25], "portrait");
    pdf.addImage(dataUrl, "JPEG", 0, 0, 8.75, 11.25, undefined, "FAST");
  }
  pdf.save(`${fileSafe(name)}-print.pdf`);
}

export async function exportSocialJpg(node: HTMLElement, name: string, node2?: HTMLElement | null) {
  const dataUrl = await toJpeg(node, { ...(await opts(node)), pixelRatio: 1.5, quality: 0.9, backgroundColor: "#ffffff" });
  download(dataUrl, `${fileSafe(name)}-web${node2 ? "-page-1" : ""}.jpg`);
  if (node2) download(await toJpeg(node2, { ...(await opts(node2)), pixelRatio: 1.5, quality: 0.9, backgroundColor: "#ffffff" }), `${fileSafe(name)}-web-page-2.jpg`);
}

export function exportJson(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download(url, `${fileSafe(name)}.flyer.json`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Shrink an uploaded photo so saved flyers stay small, keeping print quality. */
export function readImageFile(file: File, max = 1800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not an image we can read."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
