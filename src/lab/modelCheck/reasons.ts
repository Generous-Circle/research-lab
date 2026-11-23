// Model check — wording for results that are not a pass.
//
// plainReason: one sentence a non-technical reader can follow. Used on the summary.
// technicalReason: the exact rule(s) missed, with values. Used on the metric pages.
// Only the rules actually missed are named, never the ones that passed.

import { THRESHOLDS, round } from "./rules";
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  VARIANT_KEYS,
  VARIANT_LABELS,
  VARIANT_PHRASES,
  type DimensionKey,
  type MetricKey,
  type ModelCheckResult,
  type Status,
  type VariantKey,
} from "./types";

const f2 = (x: number) => x.toFixed(2);
const pct1 = (share: number) => `${(Math.round(share * 1000) / 10).toFixed(1)}%`;
const pct0 = (share: number) => `${Math.round(share * 100)}%`;

function cap(parts: string[], n: number): string[] {
  return parts.length > n ? [...parts.slice(0, n), `and ${parts.length - n} more`] : parts;
}

/** The non-passing dimension with the lowest (or highest) value, or null. */
function weakest<T>(
  per: Record<DimensionKey, { status: Status; values: T }>,
  pick: (v: T) => number,
  lowest: boolean,
): DimensionKey | null {
  let best: DimensionKey | null = null;
  for (const d of DIMENSION_KEYS) {
    if (per[d].status === "pass") continue;
    if (best === null || (lowest ? pick(per[d].values) < pick(per[best].values) : pick(per[d].values) > pick(per[best].values))) {
      best = d;
    }
  }
  return best;
}

export function plainReason(r: ModelCheckResult, metric: MetricKey): string | null {
  const status = r[metric].status;
  if (status === "pass") return null;
  const failed = status === "fail";
  if (metric === "consistency") {
    const d = weakest(r.consistency.perDimension, (v) => v.icc, true);
    return `The same answer ${failed ? "often" : "sometimes"} gets a different score, mostly on ${DIMENSION_LABELS[d!]}.`;
  }
  if (metric === "alignment") {
    const d = weakest(r.alignment.perDimension, (v) => v.kappa, true);
    return `Scores ${failed ? "often" : "sometimes"} differ from human experts’ scores, mostly on ${DIMENSION_LABELS[d!]}.`;
  }
  if (metric === "validity") {
    const d = weakest(r.validity.perDimension, (v) => v.rho, true);
    if (d) return `Scores don’t follow answer quality closely enough, mostly on ${DIMENSION_LABELS[d]}.`;
    if (r.validity.contentDrop.status !== "pass") return "Removing key ideas from an answer doesn’t always lower its score.";
    return "Skills are not scored distinctly enough from one another.";
  }
  let worst: VariantKey | null = null;
  for (const v of VARIANT_KEYS) {
    if (r.robustness.perVariant[v].status === "pass") continue;
    if (worst === null || r.robustness.perVariant[v].worstChange.value > r.robustness.perVariant[worst].worstChange.value) worst = v;
  }
  return `Rewording an answer changes its score ${failed ? "too much" : "slightly more than allowed"}, most when ${VARIANT_PHRASES[worst!]}.`;
}

export function technicalReason(r: ModelCheckResult, metric: MetricKey): string | null {
  if (r[metric].status === "pass") return null;
  const parts: string[] = [];
  if (metric === "consistency") {
    const t = THRESHOLDS.consistency;
    for (const d of DIMENSION_KEYS) {
      const x = r.consistency.perDimension[d];
      if (x.status === "pass") continue;
      const q: string[] = [];
      if (x.values.icc < t.iccPass) q.push(`ICC ${f2(x.values.icc)}, needs ${f2(t.iccPass)}`);
      if (round(x.values.identicalShare, 3) < t.identicalPass) {
        q.push(`${pct1(x.values.identicalShare)} identical across ${r.repeats} runs, needs ${pct0(t.identicalPass)}`);
      }
      parts.push(`${DIMENSION_LABELS[d]} (${q.join("; ")})`);
    }
    return `${cap(parts, 2).join("; ")}.`;
  }
  if (metric === "alignment") {
    const t = THRESHOLDS.alignment;
    for (const d of DIMENSION_KEYS) {
      const x = r.alignment.perDimension[d];
      if (x.status === "pass") continue;
      const q: string[] = [];
      if (x.values.kappa < t.kappaPass) q.push(`agreement ${f2(x.values.kappa)}, needs ${f2(t.kappaPass)}`);
      if (x.values.gap < -t.maxGapBelowHumans) q.push(`${f2(-x.values.gap)} below human–human agreement, limit ${f2(t.maxGapBelowHumans)}`);
      parts.push(`${DIMENSION_LABELS[d]} (${q.join("; ")})`);
    }
    return `${cap(parts, 2).join("; ")}.`;
  }
  if (metric === "validity") {
    const t = THRESHOLDS.validity;
    for (const d of DIMENSION_KEYS) {
      const x = r.validity.perDimension[d];
      if (x.status !== "pass") parts.push(`${DIMENSION_LABELS[d]} (rank match ${f2(x.values.rho)}, needs ${f2(t.rhoPass)})`);
    }
    if (r.validity.contentDrop.status !== "pass") {
      parts.push(`score fell in only ${pct0(r.validity.contentDrop.values.share)} of key-idea removal tests, needs ${pct0(t.contentPass)}`);
    }
    if (r.validity.discriminant.status !== "pass") {
      parts.push(`two dimensions overlap too much (${f2(r.validity.discriminant.values.max)}, limit ${f2(t.discriminantMax)})`);
    }
    return `${cap(parts, 3).join("; ")}.`;
  }
  const t = THRESHOLDS.robustness;
  for (const v of VARIANT_KEYS) {
    const x = r.robustness.perVariant[v];
    if (x.status === "pass") continue;
    const q: string[] = [];
    if (round(x.worstChange.value, 2) > t.meanChangePass) {
      q.push(`score moved up to ${f2(x.worstChange.value)} points on ${DIMENSION_LABELS[x.worstChange.dimension]}, limit ${f2(t.meanChangePass)}`);
    }
    if (round(x.worstWithinOne.value, 3) < t.withinOnePass) {
      q.push(`only ${pct0(x.worstWithinOne.value)} within 1 point on ${DIMENSION_LABELS[x.worstWithinOne.dimension]}, needs ${pct0(t.withinOnePass)}`);
    }
    parts.push(`${VARIANT_LABELS[v]} (${q.join("; ")})`);
  }
  return `${cap(parts, 2).join("; ")}.`;
}

export const FIXES: Record<MetricKey, string> = {
  consistency: "Lower the sampling temperature or pin the model version; check rubric wording that leaves the score open to interpretation.",
  alignment: "Review the largest score gaps in the listed dimensions and add human-rated examples to the training or prompt set.",
  validity: "Check that the model scores ideas, not style: add answers that differ in content but not in polish.",
  robustness: "Add paired examples for the listed rewordings to the training set so the model learns the answer’s meaning is unchanged.",
};
