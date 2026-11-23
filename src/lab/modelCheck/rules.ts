// Model check — pass rules and verdict logic. Pure functions, no React.
//
// Thresholds are one object so a study can change them in one place. Sources:
//  - ICC bands: Koo & Li (2016), "excellent" >= 0.90, "good" 0.75–0.90.
//  - Kappa bands: Landis & Koch (1977), "almost perfect" >= 0.81, "substantial" 0.61–0.80.
//  - Gap to the human benchmark, validity and robustness lines: Statement of Work /
//    team-set. There is no external standard for the robustness lines.
// Verify the literature values before relying on them.
//
// Each check is judged on its weakest dimension. The verdict is the worst check.

import {
  DIMENSION_KEYS,
  VARIANT_KEYS,
  type DimensionKey,
  type DimensionResult,
  type MetricKey,
  type ModelCheckInput,
  type ModelCheckResult,
  type Status,
  type VariantKey,
  type VariantResult,
  type VariantStats,
} from "./types";

export const THRESHOLDS = {
  consistency: { iccPass: 0.9, iccReview: 0.75, identicalPass: 0.9, identicalReview: 0.8 },
  alignment: { kappaPass: 0.8, kappaReview: 0.61, maxGapBelowHumans: 0.1 },
  validity: { rhoPass: 0.7, rhoReview: 0.6, discriminantMax: 0.85, contentPass: 0.9, contentReview: 0.8 },
  robustness: { meanChangePass: 0.5, withinOnePass: 0.95, meanChangeReview: 0.7, withinOneReview: 0.9 },
} as const;

const RANK: Record<Status, number> = { pass: 0, review: 1, fail: 2 };
export const worstStatus = (list: Status[]): Status =>
  list.reduce<Status>((w, s) => (RANK[s] > RANK[w] ? s : w), "pass");

// Compare on the number as it is displayed, so 0.8997 shown as "90.0%" is not
// failed against 90%, and a gap of exactly 0.10 is not lost to float error.
export const round = (x: number, places: number) => {
  const f = 10 ** places;
  return Math.round(x * f) / f;
};

export function iccBand(icc: number): string {
  return icc >= 0.9 ? "excellent" : icc >= 0.75 ? "good" : icc >= 0.5 ? "moderate" : "poor";
}
export function kappaBand(k: number): string {
  return k >= 0.81 ? "almost perfect" : k >= 0.61 ? "substantial" : k >= 0.41 ? "moderate" : "fair or lower";
}

export function consistencyStatus(icc: number, identicalShare: number): Status {
  const t = THRESHOLDS.consistency;
  const id = round(identicalShare, 3);
  if (icc >= t.iccPass && id >= t.identicalPass) return "pass";
  if (icc >= t.iccReview && id >= t.identicalReview) return "review";
  return "fail";
}

export function alignmentStatus(kappa: number, humanKappa: number): Status {
  const t = THRESHOLDS.alignment;
  const gap = round(kappa - humanKappa, 2);
  if (gap < -t.maxGapBelowHumans) return "fail";
  if (kappa >= t.kappaPass) return "pass";
  if (kappa >= t.kappaReview) return "review";
  return "fail";
}

export function rhoStatus(rho: number): Status {
  const t = THRESHOLDS.validity;
  return rho >= t.rhoPass ? "pass" : rho >= t.rhoReview ? "review" : "fail";
}
export function contentDropStatus(share: number): Status {
  const t = THRESHOLDS.validity;
  const s = round(share, 3);
  return s >= t.contentPass ? "pass" : s >= t.contentReview ? "review" : "fail";
}
export function discriminantStatus(max: number): Status {
  return max < THRESHOLDS.validity.discriminantMax ? "pass" : "review";
}

export function robustnessStatus(meanChange: number, withinOne: number): Status {
  const t = THRESHOLDS.robustness;
  const c = round(meanChange, 2);
  const w = round(withinOne, 3);
  if (c <= t.meanChangePass && w >= t.withinOnePass) return "pass";
  if (c <= t.meanChangeReview && w >= t.withinOneReview) return "review";
  return "fail";
}

function mapDims<T>(f: (d: DimensionKey) => T): Record<DimensionKey, T> {
  return Object.fromEntries(DIMENSION_KEYS.map((d) => [d, f(d)])) as Record<DimensionKey, T>;
}

function worstOf(values: Record<DimensionKey, number>, pickMax: boolean): { value: number; dimension: DimensionKey } {
  let best: DimensionKey = DIMENSION_KEYS[0];
  for (const d of DIMENSION_KEYS) {
    if (pickMax ? values[d] > values[best] : values[d] < values[best]) best = d;
  }
  return { value: values[best], dimension: best };
}

export function analyse(input: ModelCheckInput): ModelCheckResult {
  const consistency = mapDims((d) => {
    const s = input.dimensions[d];
    return { status: consistencyStatus(s.icc, s.identicalShare), values: { icc: s.icc, identicalShare: s.identicalShare } };
  });
  const alignment = mapDims((d) => {
    const s = input.dimensions[d];
    return {
      status: alignmentStatus(s.kappa, s.humanKappa),
      values: { kappa: s.kappa, humanKappa: s.humanKappa, gap: round(s.kappa - s.humanKappa, 2) },
    };
  });
  const rho = mapDims((d) => ({ status: rhoStatus(input.dimensions[d].rho), values: { rho: input.dimensions[d].rho } }));
  const contentDrop: DimensionResult<{ share: number }> = {
    status: contentDropStatus(input.validity.contentDropShare),
    values: { share: input.validity.contentDropShare },
  };
  const discriminant: DimensionResult<{ max: number }> = {
    status: discriminantStatus(input.validity.discriminantMax),
    values: { max: input.validity.discriminantMax },
  };
  const perVariant = Object.fromEntries(
    VARIANT_KEYS.map((v) => {
      const perDimension = mapDims<DimensionResult<VariantStats>>((d) => {
        const s = input.robustness[v][d];
        return { status: robustnessStatus(s.meanChange, s.withinOne), values: s };
      });
      const changes = mapDims((d) => perDimension[d].values.meanChange);
      const within = mapDims((d) => perDimension[d].values.withinOne);
      const result: VariantResult = {
        status: worstStatus(DIMENSION_KEYS.map((d) => perDimension[d].status)),
        worstChange: worstOf(changes, true),
        worstWithinOne: worstOf(within, false),
        perDimension,
      };
      return [v, result];
    }),
  ) as Record<VariantKey, VariantResult>;

  const out: ModelCheckResult = {
    repeats: input.repeats,
    consistency: { status: worstStatus(DIMENSION_KEYS.map((d) => consistency[d].status)), perDimension: consistency },
    alignment: { status: worstStatus(DIMENSION_KEYS.map((d) => alignment[d].status)), perDimension: alignment },
    validity: {
      status: worstStatus([...DIMENSION_KEYS.map((d) => rho[d].status), contentDrop.status, discriminant.status]),
      perDimension: rho,
      contentDrop,
      discriminant,
    },
    robustness: { status: worstStatus(VARIANT_KEYS.map((v) => perVariant[v].status)), perVariant },
    verdict: "pass",
  };
  out.verdict = worstStatus([out.consistency.status, out.alignment.status, out.validity.status, out.robustness.status]);
  return out;
}

export const METRIC_STATUS = (r: ModelCheckResult, k: MetricKey): Status => r[k].status;

/** "3 of 4 checks need review." One line for the verdict banner. */
export function checkSummaryLine(r: ModelCheckResult): string {
  const statuses = (["consistency", "alignment", "validity", "robustness"] as MetricKey[]).map((k) => r[k].status);
  const failed = statuses.filter((s) => s === "fail").length;
  const review = statuses.filter((s) => s === "review").length;
  if (failed === 0 && review === 0) return "All 4 checks passed.";
  if (failed > 0) return `${failed} of 4 checks failed${review ? `, ${review} need review` : ""}.`;
  return `${review} of 4 checks need review.`;
}

export const VERDICT_TEXT: Record<Status, string> = {
  pass: "Safe to deploy",
  review: "Needs review before deploying",
  fail: "Do not deploy",
};
