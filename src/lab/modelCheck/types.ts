// Model check — input and result types.
//
// The input is what a completed run must provide, per dimension. Shares are
// fractions in 0..1 (0.96 = 96%). Everything the checks need is here, so the
// rules in rules.ts stay pure and testable.

// Same keys and order as DIMENSIONS in src/lib/researchApi.ts. Kept here so the
// rules can be unit-tested without loading the Supabase client.
export const DIMENSION_KEYS = [
  "cognitive_abilities",
  "execution",
  "communication",
  "adaptability_learning",
  "emotional_intelligence",
  "judgment",
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  cognitive_abilities: "Cognitive abilities",
  execution: "Execution",
  communication: "Communication",
  adaptability_learning: "Adaptability & learning",
  emotional_intelligence: "Emotional intelligence",
  judgment: "Judgment",
};

export const VARIANT_KEYS = ["jargon_added", "jargon_removed", "filler_added", "filler_removed", "combined"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];

export const VARIANT_LABELS: Record<VariantKey, string> = {
  jargon_added: "Jargon added",
  jargon_removed: "Jargon removed",
  filler_added: "Filler words added",
  filler_removed: "Filler words removed",
  combined: "All combined",
};

export const VARIANT_DESCRIPTIONS: Record<VariantKey, string> = {
  jargon_added: "Technical terms inserted",
  jargon_removed: "Technical terms replaced with plain words",
  filler_added: "“um”, “you know”, repeats added",
  filler_removed: "Fillers taken out of a transcript that had them",
  combined: "Jargon and filler changed together",
};

// Plain phrase used inside a sentence: "most when <phrase>".
export const VARIANT_PHRASES: Record<VariantKey, string> = {
  jargon_added: "adding jargon",
  jargon_removed: "removing jargon",
  filler_added: "adding filler words",
  filler_removed: "removing filler words",
  combined: "combining the changes",
};

export interface DimensionStats {
  /** ICC(2,1) of repeat scores. */
  icc: number;
  /** Share of answers that got the identical score in every repeat (0..1). */
  identicalShare: number;
  /** Quadratic-weighted kappa, AI vs human average. */
  kappa: number;
  /** Human–human kappa on the same answers (the ceiling). */
  humanKappa: number;
  /** Mean absolute error vs human average, in score points (0–5 scale). */
  mae: number;
  /** Mean (AI − human), in score points. */
  bias: number;
  /** Share of answers within 1 point of the human average (0..1). */
  withinOne: number;
  /** Spearman correlation with the human average. */
  rho: number;
}

export interface VariantStats {
  /** Mean absolute change: |AI score on variant − AI score on original|, each averaged over repeats. */
  meanChange: number;
  /** Share of pairs whose change is at most 1 point (0..1). */
  withinOne: number;
}

export interface ModelCheckInput {
  /** Repeats per answer used in this run. */
  repeats: number;
  dimensions: Record<DimensionKey, DimensionStats>;
  validity: {
    /** Highest correlation between two different dimensions. */
    discriminantMax: number;
    /** Share of key-idea-removal tests where the score dropped (0..1). */
    contentDropShare: number;
  };
  robustness: Record<VariantKey, Record<DimensionKey, VariantStats>>;
}

export type Status = "pass" | "review" | "fail";
export type MetricKey = "consistency" | "alignment" | "validity" | "robustness";
export const METRIC_KEYS: MetricKey[] = ["consistency", "alignment", "validity", "robustness"];
export const METRIC_LABELS: Record<MetricKey, string> = {
  consistency: "Consistency test",
  alignment: "Human-AI alignment",
  validity: "Construct validity",
  robustness: "Robustness",
};

export interface DimensionResult<T> {
  status: Status;
  values: T;
}

export interface VariantResult {
  status: Status;
  /** Largest mean change across dimensions, and where it is. */
  worstChange: { value: number; dimension: DimensionKey };
  /** Lowest within-one share across dimensions, and where it is. */
  worstWithinOne: { value: number; dimension: DimensionKey };
  perDimension: Record<DimensionKey, DimensionResult<VariantStats>>;
}

export interface ModelCheckResult {
  repeats: number;
  consistency: {
    status: Status;
    perDimension: Record<DimensionKey, DimensionResult<{ icc: number; identicalShare: number }>>;
  };
  alignment: {
    status: Status;
    perDimension: Record<DimensionKey, DimensionResult<{ kappa: number; humanKappa: number; gap: number }>>;
  };
  validity: {
    status: Status;
    perDimension: Record<DimensionKey, DimensionResult<{ rho: number }>>;
    contentDrop: DimensionResult<{ share: number }>;
    discriminant: DimensionResult<{ max: number }>;
  };
  robustness: {
    status: Status;
    perVariant: Record<VariantKey, VariantResult>;
  };
  verdict: Status;
}
