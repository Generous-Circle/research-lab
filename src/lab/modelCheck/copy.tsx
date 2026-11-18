// Plain-language statements and glossary for the Model check.

import type { ReactNode } from "react";
import { plainReason } from "./reasons";
import { DIMENSION_KEYS, type MetricKey, type ModelCheckInput, type ModelCheckResult } from "./types";

export const GLOSSARY = {
  icc: "Intraclass correlation (ICC). Measures how closely repeated scores of the same answer agree, from 0 to 1. Above 0.90 is excellent, 0.75 to 0.90 good (Koo and Li, 2016).",
  identical: "The share of answers that got exactly the same score in every run.",
  kappa:
    "Weighted kappa. Agreement between two scorers, corrected for chance, where bigger misses count more. 0.81 to 1.00 is almost perfect, 0.61 to 0.80 substantial (Landis and Koch, 1977).",
  mae: "Mean absolute error. On average, how many points the AI score is away from the human average score, on the 0 to 5 scale.",
  bias: "Average AI score minus average human score. Positive means the AI is more generous than people. Near zero is best.",
  withinOne: "Share of answers where the AI score is within 1 point of the human average.",
  rho: "Spearman correlation. How well the AI ranks answers in the same order as human experts. 0.70 or more is a strong match.",
  discriminant:
    "Highest correlation between two different dimensions. If dimensions move together too closely, the model may not tell skills apart. Flag at 0.85 or more.",
  content: "When key reference ideas are deleted from an answer, the score should drop. This is the share of tests where it did.",
  change: "Largest average change, in points, when only the wording is changed. Limit 0.5.",
} as const;

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f2 = (x: number) => x.toFixed(2);
const pct0 = (x: number) => `${Math.round(x * 100)}%`;
const B = ({ children }: { children: ReactNode }) => <b className="tabular-nums">{children}</b>;

/** One or two lines for a metric. Not a pass: the reason. Pass: what held, with the key figure. */
export function statement(result: ModelCheckResult, input: ModelCheckInput, metric: MetricKey): ReactNode {
  const status = result[metric].status;
  if (status !== "pass") {
    return (
      <>
        <b>{status === "review" ? "Needs review. " : "Failed. "}</b>
        {plainReason(result, metric)}
      </>
    );
  }
  if (metric === "consistency") {
    const id = avg(DIMENSION_KEYS.map((d) => input.dimensions[d].identicalShare));
    return (
      <>
        Re-scoring the same answer gives the same score (<B>{pct0(id)}</B> identical across {input.repeats} runs).
      </>
    );
  }
  if (metric === "alignment") {
    return (
      <>
        Scores agree with human experts as closely as experts agree with each other (agreement{" "}
        <B>{f2(avg(DIMENSION_KEYS.map((d) => input.dimensions[d].kappa)))}</B>).
      </>
    );
  }
  if (metric === "validity") {
    return (
      <>
        Scores follow the content of the answer, not how it is written (rank match with experts{" "}
        <B>{f2(avg(DIMENSION_KEYS.map((d) => input.dimensions[d].rho)))}</B>; score drops in <B>{pct0(input.validity.contentDropShare)}</B> of tests
        when key ideas are removed).
      </>
    );
  }
  return (
    <>
      Score stays put when the wording changes (<B>5 of 5</B> wording changes within limit).
    </>
  );
}
