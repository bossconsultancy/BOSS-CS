"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function Area({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea className="input" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/** One item per line. Keeps the raw text while typing so blank lines do not jump around. */
export function ListArea({ items, onChange, rows = 6, placeholder }: { items: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const [raw, setRaw] = useState(items.join("\n"));
  useEffect(() => {
    const parsed = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (parsed.join("\n") !== items.join("\n")) setRaw(items.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  return (
    <textarea
      className="input"
      rows={rows}
      value={raw}
      placeholder={placeholder}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

export function Section({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`card ${open ? "open" : ""}`}>
      <div className="card-head">
        <button type="button" className="card-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="chev">{open ? "▾" : "▸"}</span>
          {title}
        </button>
        {right}
      </div>
      {open ? <div className="card-body">{children}</div> : null}
    </div>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="color-row">
      <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} />
      <span className="color-label">{label}</span>
      <input
        className="input hex"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (/^#[0-9a-f]{6}$/i.test(e.target.value.trim())) onChange(e.target.value.trim().toUpperCase());
        }}
      />
    </div>
  );
}

export function Range({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="range">
      <span className="field-label">
        {label} <b>{format ? format(value) : value}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
