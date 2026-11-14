"use client";

import { createStore, del, entries, get, set } from "idb-keyval";
import type { Brand, Project } from "./types";
import { DEFAULT_BRAND } from "./types";

// Saved flyers live in this browser (IndexedDB). Use "Export file" to share a flyer with a teammate.
const store = typeof window !== "undefined" ? createStore("boss-flyer-studio", "projects") : undefined;

export async function saveProject(p: Project): Promise<void> {
  if (!store) return;
  await set(p.id, p, store);
  try {
    localStorage.setItem("boss-last-project", p.id);
  } catch {}
}

export async function loadProject(id: string): Promise<Project | undefined> {
  if (!store) return undefined;
  return (await get(id, store)) as Project | undefined;
}

export async function deleteProject(id: string): Promise<void> {
  if (!store) return;
  await del(id, store);
}

export async function listProjects(): Promise<Project[]> {
  if (!store) return [];
  const all = (await entries(store)) as [string, Project][];
  return all.map(([, p]) => p).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function lastProjectId(): string | null {
  try {
    return localStorage.getItem("boss-last-project");
  } catch {
    return null;
  }
}

export function loadDefaultBrand(): Brand {
  try {
    const raw = localStorage.getItem("boss-default-brand");
    if (raw) return { ...DEFAULT_BRAND, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_BRAND };
}

export function saveDefaultBrand(b: Brand) {
  try {
    localStorage.setItem("boss-default-brand", JSON.stringify(b));
  } catch {}
}
