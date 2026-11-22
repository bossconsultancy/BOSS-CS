"use client";

import type { Project } from "./types";

export interface TeamSummary {
  id: string;
  name: string;
  updatedAt: number;
  updatedBy: string;
  createdBy: string;
  header: string;
  hasPhoto: boolean;
}

export type SaveResult =
  | { ok: true; project: Project; etag: string }
  | { ok: false; conflict: true; current: { project: Project; etag: string } | null }
  | { ok: false; conflict: false; error: string };

async function json(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function getStatus(): Promise<{ cloud: boolean; ai: boolean }> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (!res.ok) return { cloud: false, ai: false };
    return await res.json();
  } catch {
    return { cloud: false, ai: false };
  }
}

export async function teamList(): Promise<TeamSummary[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  const data = await json(res);
  if (!res.ok) throw new Error(data.error || "Could not load the team library.");
  return data.projects as TeamSummary[];
}

export async function teamLoad(id: string): Promise<{ project: Project; etag: string } | null> {
  const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const data = await json(res);
  if (!res.ok) throw new Error(data.error || "Could not open the flyer.");
  return data;
}

export async function teamSave(project: Project, etag: string | null, latest = false): Promise<SaveResult> {
  try {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, etag, latest }),
    });
    const data = await json(res);
    if (res.status === 409) return { ok: false, conflict: true, current: data.current || null };
    if (!res.ok) return { ok: false, conflict: false, error: data.error || `Save failed (${res.status}).` };
    return { ok: true, project: data.project, etag: data.etag };
  } catch {
    return { ok: false, conflict: false, error: "No connection. Your changes are kept on this computer and will save when you are back online." };
  }
}

export async function teamDelete(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await json(res);
    throw new Error(data.error || "Could not delete the flyer.");
  }
}

export function getUserName(): string {
  try {
    return localStorage.getItem("boss-user-name") || "";
  } catch {
    return "";
  }
}

export function setUserName(n: string) {
  try {
    localStorage.setItem("boss-user-name", n);
  } catch {}
}
