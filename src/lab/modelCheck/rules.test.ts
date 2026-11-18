import { describe, it, expect } from "vitest";
import { analyse, checkSummaryLine, consistencyStatus, alignmentStatus, robustnessStatus, round } from "./rules";
import { plainReason, technicalReason } from "./reasons";
import { MOCK_RUNS } from "./fixtures";
import { DIMENSION_KEYS, VARIANT_KEYS, type ModelCheckInput } from "./types";

const [A, B, C] = MOCK_RUNS.map((r) => r.input);
const clone = (x: ModelCheckInput): ModelCheckInput => JSON.parse(JSON.stringify(x));

describe("verdicts on the mock models", () => {
  it("passes the good model", () => {
    const r = analyse(A);
    expect(r.verdict).toBe("pass");
    expect(checkSummaryLine(r)).toBe("All 4 checks passed.");
  });
  it("fails the bad model on every check", () => {
    const r = analyse(B);
    expect(r.verdict).toBe("fail");
    expect([r.consistency.status, r.alignment.status, r.validity.status, r.robustness.status]).toEqual(["fail", "fail", "fail", "fail"]);
    expect(checkSummaryLine(r)).toBe("4 of 4 checks failed.");
  });
  it("sends the borderline model to review, with validity passing", () => {
    const r = analyse(C);
    expect(r.verdict).toBe("review");
    expect([r.consistency.status, r.alignment.status, r.validity.status, r.robustness.status]).toEqual(["review", "review", "pass", "review"]);
    expect(checkSummaryLine(r)).toBe("3 of 4 checks need review.");
  });
});

describe("rules", () => {
  it("consistency needs both ICC and identical share", () => {
    expect(consistencyStatus(0.95, 0.95)).toBe("pass");
    expect(consistencyStatus(0.88, 0.95)).toBe("review"); // ICC below 0.90, identical fine
    expect(consistencyStatus(0.95, 0.85)).toBe("review");
    expect(consistencyStatus(0.7, 0.95)).toBe("fail");
    expect(consistencyStatus(0.95, 0.75)).toBe("fail");
  });
  it("does not fail an identical share that displays as 90.0%", () => {
    expect(consistencyStatus(0.95, 0.8996)).toBe("pass");
  });
  it("alignment: a gap of exactly 0.10 below the human benchmark is allowed", () => {
    expect(alignmentStatus(0.71, 0.81)).toBe("review"); // floats: 0.71-0.81 = -0.10000000000000009
    expect(alignmentStatus(0.85, 0.96)).toBe("fail"); // 0.11 below
    expect(alignmentStatus(0.8, 0.8)).toBe("pass");
  });
  it("robustness bands", () => {
    expect(robustnessStatus(0.5, 0.95)).toBe("pass");
    expect(robustnessStatus(0.54, 0.96)).toBe("review");
    expect(robustnessStatus(0.3, 0.92)).toBe("review");
    expect(robustnessStatus(0.8, 0.96)).toBe("fail");
    expect(robustnessStatus(0.3, 0.85)).toBe("fail");
  });
  it("rounds half values the way they are displayed", () => {
    expect(round(0.8997, 3)).toBe(0.9);
    expect(round(-0.10000000000000009, 2)).toBe(-0.1);
  });
});

describe("each check is judged on its weakest dimension", () => {
  it("one weak dimension is enough to drop a check to review", () => {
    const x = clone(A);
    x.dimensions.judgment.kappa = 0.78;
    const r = analyse(x);
    expect(r.alignment.perDimension.judgment.status).toBe("review");
    expect(r.alignment.status).toBe("review");
    expect(r.verdict).toBe("review");
  });
  it("covers every dimension and variant", () => {
    const r = analyse(A);
    expect(Object.keys(r.consistency.perDimension)).toEqual([...DIMENSION_KEYS]);
    expect(Object.keys(r.robustness.perVariant)).toEqual([...VARIANT_KEYS]);
  });
});

describe("reasons only name the rule that was missed", () => {
  it("consistency: ICC miss does not blame the identical share", () => {
    const x = clone(A);
    x.dimensions.judgment.icc = 0.88;
    x.dimensions.judgment.identicalShare = 0.92;
    const r = analyse(x);
    const t = technicalReason(r, "consistency")!;
    expect(t).toContain("Judgment (ICC 0.88, needs 0.90)");
    expect(t).not.toContain("identical");
    expect(plainReason(r, "consistency")).toBe("The same answer sometimes gets a different score, mostly on Judgment.");
  });
  it("robustness plain reason names the wording change that moves the score most", () => {
    const r = analyse(C);
    expect(plainReason(r, "robustness")).toBe("Rewording an answer changes its score slightly more than allowed, most when combining the changes.");
  });
  it("returns null for a pass", () => {
    const r = analyse(A);
    expect(plainReason(r, "consistency")).toBeNull();
    expect(technicalReason(r, "robustness")).toBeNull();
  });
  it("caps long lists", () => {
    const t = technicalReason(analyse(B), "consistency")!;
    expect(t).toContain("and 4 more");
  });
});
