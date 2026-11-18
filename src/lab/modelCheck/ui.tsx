import type { ReactNode } from "react";
import { Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "./types";

const STATUS_COPY: Record<Status, { label: string; pill: string; box: string; dot: string }> = {
  pass: { label: "Pass", pill: "bg-emerald-100 text-emerald-800", box: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-700" },
  review: { label: "Review", pill: "bg-amber-100 text-amber-900", box: "bg-amber-50 border-amber-200", dot: "bg-amber-700" },
  fail: { label: "Fail", pill: "bg-red-100 text-red-800", box: "bg-red-50 border-red-200", dot: "bg-red-700" },
};

export function StatusIcon({ status, className }: { status: Status; className?: string }) {
  const Icon = status === "pass" ? Check : status === "review" ? AlertTriangle : X;
  return <Icon className={className} aria-hidden="true" />;
}

/** Colour is never the only signal: icon and word travel with it. */
export function StatusPill({ status }: { status: Status }) {
  const c = STATUS_COPY[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", c.pill)}>
      <StatusIcon status={status} className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export const statusBox = (s: Status) => STATUS_COPY[s].box;
export const statusDot = (s: Status) => STATUS_COPY[s].dot;

/** Hover or keyboard-focus explanation of a technical term. No extra dependency. */
export function Term({ children, tip }: { children: ReactNode; tip: string }) {
  return (
    <span tabIndex={0} className="group relative cursor-help border-b border-dotted border-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden w-64 max-w-[70vw] rounded-md bg-foreground px-3 py-2 text-xs font-normal normal-case leading-snug text-background group-hover:block group-focus:block"
      >
        {tip}
      </span>
    </span>
  );
}

export interface BarRow {
  label: string;
  value: number;
  text: string;
  status: Status;
}

/** Horizontal bars to one scale, with a vertical line at the pass level. */
export function BarList({ rows, max, passAt, caption }: { rows: BarRow[]; max: number; passAt: number; caption: string }) {
  const fill = (s: Status) => (s === "pass" ? "bg-emerald-600" : s === "review" ? "bg-amber-500" : "bg-red-600");
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(90px,170px)_1fr_56px] items-center gap-3 text-sm">
          <span>{r.label}</span>
          <div className="relative h-2.5 rounded-full border bg-muted">
            <div className={cn("absolute inset-y-0 left-0 rounded-full", fill(r.status))} style={{ width: `${Math.min(100, (r.value / max) * 100)}%` }} />
            <div className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ left: `${(passAt / max) * 100}%` }} title="Pass line" />
          </div>
          <span className="text-right tabular-nums">{r.text}</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
