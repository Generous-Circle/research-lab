// Where the Model check gets its numbers.
//
// Real data: NOT CONNECTED YET. A completed run needs per-dimension statistics
// (see ModelCheckInput in types.ts): repeat ICC and identical share, kappa vs the
// human average, rank correlation, content-removal and cross-dimension checks, and
// per-variant score changes for a paired dataset. The Lab's current metrics call
// returns pooled numbers, not per-dimension ones, so this needs either new metrics in
// python/research_metrics (via a normal metric PR) or client-side computation from the
// run's `export` items. Until then the check only runs on sample data, and only when
// VITE_MODEL_CHECK_MOCK=true. With the flag off it renders nothing and shows no verdict.

import { MOCK_RUNS } from "./fixtures";
import type { ModelCheckInput } from "./types";

export const MOCK_ENABLED = import.meta.env.VITE_MODEL_CHECK_MOCK === "true";

export type ModelCheckSource =
  | { state: "ready"; input: ModelCheckInput; scorerLabel: string | null; isSample: boolean }
  | { state: "unavailable" };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Sample data picks a mock model by run id, so any run opens a result. */
export function getModelCheckSource(runId: string): ModelCheckSource {
  if (!MOCK_ENABLED) return { state: "unavailable" };
  const exact = MOCK_RUNS.find((m) => m.runId === runId);
  const run = exact ?? MOCK_RUNS[hash(runId) % MOCK_RUNS.length];
  return { state: "ready", input: run.input, scorerLabel: run.scorerLabel, isSample: true };
}
