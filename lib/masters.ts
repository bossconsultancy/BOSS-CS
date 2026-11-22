"use client";

import { TEMPLATES, masterId, projectFromTemplate, type Template } from "./samples";
import { listProjects, loadDefaultBrand, loadProject } from "./storage";
import { teamList, teamLoad } from "./teamApi";
import type { Project } from "./types";

/**
 * The current master flyer for a program.
 * 1. the saved master (everyone's latest edits), else
 * 2. the newest flyer someone already made for this program before masters existed (it becomes the master), else
 * 3. the ready-made design.
 * `etag` is set only when the master already exists in the team library.
 */
export async function loadMaster(t: Template, cloud: boolean): Promise<{ project: Project; etag?: string }> {
  const id = masterId(t);
  const sameName = (n: string) => n.trim().toLowerCase() === t.name.trim().toLowerCase();
  if (cloud) {
    const r = await teamLoad(id).catch(() => null);
    if (r) return { project: r.project, etag: r.etag };
    const old = (await teamList().catch(() => [])).filter((s) => sameName(s.name)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (old) {
      const o = await teamLoad(old.id).catch(() => null);
      if (o) return { project: { ...o.project, id, name: t.name, createdBy: undefined } };
    }
  } else {
    const mine = await loadProject(id).catch(() => undefined);
    if (mine) return { project: mine };
    const old = (await listProjects()).filter((p) => sameName(p.name)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (old) return { project: { ...old, id, name: t.name } };
  }
  const p = projectFromTemplate(t);
  p.brand = loadDefaultBrand();
  return { project: p };
}

export { TEMPLATES, masterId };
