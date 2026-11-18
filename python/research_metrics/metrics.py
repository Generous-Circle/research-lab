"""P0 transcript-evaluation metrics (CMU Eval A4, Fizzy #4651).

Only the transcript-MVP metrics live here. Audio / ASR / WER / transcription
metrics are deliberately absent (see ``tests/test_public_api.py``). Every
function returns a plain JSON-serialisable dict carrying ``n`` and, where
defined, a bootstrap 95% confidence interval. Nothing here emits a pass/fail
verdict.
"""

from __future__ import annotations

import math
from typing import Dict, Optional, Sequence

from . import stats

Number = float
DEFAULT_MIN_RATING = 0
DEFAULT_MAX_RATING = 5


def _clean_pairs(a: Sequence[Optional[Number]], b: Sequence[Optional[Number]]):
    pairs = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    xs = [float(x) for x, _ in pairs]
    ys = [float(y) for _, y in pairs]
    return xs, ys


# ── agreement ────────────────────────────────────────────────────────────────

def quadratic_weighted_kappa(
    a: Sequence[Optional[Number]],
    b: Sequence[Optional[Number]],
    min_rating: int = DEFAULT_MIN_RATING,
    max_rating: int = DEFAULT_MAX_RATING,
) -> Optional[Number]:
    """Cohen's kappa with quadratic weights over a bounded ordinal scale."""
    xs, ys = _clean_pairs(a, b)
    n = len(xs)
    if n == 0:
        return None
    size = max_rating - min_rating + 1
    observed = [[0] * size for _ in range(size)]
    for x, y in zip(xs, ys):
        xi = math.floor(x + 0.5) - min_rating
        yi = math.floor(y + 0.5) - min_rating
        if not (0 <= xi < size and 0 <= yi < size):
            raise ValueError("rating outside [min_rating, max_rating]")
        observed[xi][yi] += 1
    row = [sum(observed[i]) for i in range(size)]
    col = [sum(observed[i][j] for i in range(size)) for j in range(size)]
    denom_scale = (size - 1) ** 2 or 1
    num = 0.0
    den = 0.0
    for i in range(size):
        for j in range(size):
            weight = ((i - j) ** 2) / denom_scale
            expected = row[i] * col[j] / n
            num += weight * observed[i][j]
            den += weight * expected
    if den == 0.0:
        # No expected disagreement on a weighted cell ⇒ the raters are constant
        # on the same value; treat as perfect agreement.
        return 1.0
    return 1.0 - num / den


def krippendorff_alpha_ordinal(units: Sequence[Sequence[Optional[Number]]]) -> Optional[Number]:
    """Ordinal Krippendorff's alpha over units of (possibly missing) ratings.

    ``units`` is a sequence of per-unit rating lists; ``None`` marks a missing
    rating. Uses the standard ordinal difference function built from the
    coincidence-matrix marginals.
    """
    coincidence: Dict[Number, Dict[Number, float]] = {}

    def add(c: Number, k: Number, amount: float) -> None:
        coincidence.setdefault(c, {})
        coincidence[c][k] = coincidence[c].get(k, 0.0) + amount

    total = 0.0
    for unit in units:
        values = [float(v) for v in unit if v is not None]
        m = len(values)
        if m < 2:
            continue
        weight = 1.0 / (m - 1)
        for i in range(m):
            for j in range(m):
                if i == j:
                    continue
                add(values[i], values[j], weight)
                total += weight
    if total == 0.0:
        return None

    marginal: Dict[Number, float] = {}
    for c, row in coincidence.items():
        marginal[c] = math.fsum(row.values())

    ordered = sorted(marginal)

    def delta_sq(c: Number, k: Number) -> float:
        lo, hi = (c, k) if c <= k else (k, c)
        span = math.fsum(marginal[g] for g in ordered if lo <= g <= hi)
        return (span - (marginal[c] + marginal[k]) / 2.0) ** 2

    observed = math.fsum(
        amount * delta_sq(c, k)
        for c, row in coincidence.items()
        for k, amount in row.items()
    ) / total

    expected = math.fsum(
        marginal[c] * marginal[k] * delta_sq(c, k)
        for c in marginal
        for k in marginal
    ) / (total * (total - 1.0))
    if expected == 0.0:
        return 1.0
    return 1.0 - observed / expected


def human_ai_agreement(
    human: Sequence[Optional[Number]],
    ai: Sequence[Optional[Number]],
) -> Dict[str, object]:
    """Human-vs-AI agreement: MAE, signed bias, Spearman, QWK, exact/within-one."""
    xs, ys = _clean_pairs(human, ai)
    n = len(xs)
    if n == 0:
        return {"n": 0}
    diffs = [y - x for x, y in zip(xs, ys)]  # AI minus human
    abs_diffs = [abs(d) for d in diffs]
    mae = stats.mean(abs_diffs)
    mae_lo, mae_hi = stats.bootstrap_ci(abs_diffs)
    bias = stats.mean(diffs)
    bias_lo, bias_hi = stats.bootstrap_ci(diffs)
    exact = sum(1 for d in diffs if d == 0) / n
    within_one = sum(1 for d in abs_diffs if d <= 1) / n
    return {
        "n": n,
        "mae": mae,
        "mae_ci95": [mae_lo, mae_hi],
        "bias": bias,
        "bias_ci95": [bias_lo, bias_hi],
        "spearman_rho": stats.spearman(xs, ys),
        "quadratic_weighted_kappa": quadratic_weighted_kappa(xs, ys),
        "exact_agreement": exact,
        "within_one_agreement": within_one,
    }


# ── repeat stability ─────────────────────────────────────────────────────────

def icc_2_1(matrix: Sequence[Sequence[Number]]) -> Optional[Number]:
    """ICC(2,1): two-way random effects, absolute agreement, single measure.

    ``matrix`` is ``n`` subjects × ``k`` raters (repeats). Requires a balanced
    design (every subject has the same number of repeats) and n>=2, k>=2.
    """
    n = len(matrix)
    if n < 2:
        return None
    k = len(matrix[0])
    if k < 2 or any(len(row) != k for row in matrix):
        return None
    grand = stats.mean([v for row in matrix for v in row])
    row_means = [stats.mean(row) for row in matrix]
    col_means = [stats.mean([matrix[i][j] for i in range(n)]) for j in range(k)]

    ss_total = math.fsum((matrix[i][j] - grand) ** 2 for i in range(n) for j in range(k))
    ss_rows = k * math.fsum((row_means[i] - grand) ** 2 for i in range(n))
    ss_cols = n * math.fsum((col_means[j] - grand) ** 2 for j in range(k))
    ss_error = ss_total - ss_rows - ss_cols

    msr = ss_rows / (n - 1)
    msc = ss_cols / (k - 1)
    mse = ss_error / ((n - 1) * (k - 1))
    denom = msr + (k - 1) * mse + k * (msc - mse) / n
    if denom == 0.0:
        return None
    return (msr - mse) / denom


def repeat_stability(repeats: Sequence[Sequence[Optional[Number]]]) -> Dict[str, object]:
    """Within-item repeat SD/range, identical-repeat share, and ICC(2,1)."""
    cleaned = [[float(v) for v in item if v is not None] for item in repeats]
    items = [item for item in cleaned if len(item) >= 2]
    n = len(items)
    if n == 0:
        return {"n": 0, "icc_2_1": None}
    sds = [stats.sample_std(item) for item in items]
    ranges = [max(item) - min(item) for item in items]
    identical = sum(1 for item in items if all(v == item[0] for v in item)) / n
    widths = {len(item) for item in items}
    icc = icc_2_1(items) if len(widths) == 1 else None
    return {
        "n": n,
        "repeat_sd": stats.mean(sds),
        "repeat_range": stats.mean(ranges),
        "identical_repeat_share": identical,
        "icc_2_1": icc,
        "balanced": len(widths) == 1,
    }


# ── paired comparisons ───────────────────────────────────────────────────────

def _paired_block(a: Sequence[Number], b: Sequence[Number]) -> Dict[str, object]:
    diffs = [y - x for x, y in zip(a, b)]
    lo, hi = stats.bootstrap_ci(diffs)
    _, p_value = stats.wilcoxon_signed_rank(diffs)
    return {
        "n": len(diffs),
        "mean_diff": stats.mean(diffs),
        "mean_diff_ci95": [lo, hi],
        "wilcoxon_p": p_value,
    }


def paired_difference(
    a: Sequence[Optional[Number]],
    b: Sequence[Optional[Number]],
    groups: Optional[Sequence[Optional[str]]] = None,
) -> Dict[str, object]:
    """Paired B−A mean with 95% CI and Wilcoxon test, grouped by varied dimension."""
    if groups is None:
        groups = [None] * len(a)
    triples = [
        (x, y, g)
        for x, y, g in zip(a, b, groups)
        if x is not None and y is not None
    ]
    if not triples:
        return {"n": 0, "overall": None, "by_group": {}}
    overall = _paired_block(
        [float(x) for x, _, _ in triples],
        [float(y) for _, y, _ in triples],
    )
    by_group: Dict[str, object] = {}
    labels = sorted({str(g) for _, _, g in triples if g is not None})
    for label in labels:
        subset = [(x, y) for x, y, g in triples if g is not None and str(g) == label]
        by_group[label] = _paired_block(
            [float(x) for x, _ in subset],
            [float(y) for _, y in subset],
        )
    return {"n": len(triples), "overall": overall, "by_group": by_group}


# ── scorer-version comparison ────────────────────────────────────────────────

def scorer_version_deltas(
    v1: Sequence[Optional[Number]],
    v2: Sequence[Optional[Number]],
    human: Optional[Sequence[Optional[Number]]] = None,
) -> Dict[str, object]:
    """Per-item v2−v1 deltas, Kendall tau, and change in human-AI metrics."""
    xs, ys = _clean_pairs(v1, v2)
    n = len(xs)
    if n == 0:
        return {"n": 0}
    deltas = [y - x for x, y in zip(xs, ys)]
    result: Dict[str, object] = {
        "n": n,
        "mean_delta": stats.mean(deltas),
        "mean_delta_ci95": list(stats.bootstrap_ci(deltas)),
        "kendall_tau": stats.kendall_tau_b(xs, ys),
    }
    if human is not None:
        cleaned_human = [
            (h, x, y)
            for h, x, y in zip(human, v1, v2)
            if h is not None and x is not None and y is not None
        ]
        if cleaned_human:
            hs = [float(h) for h, _, _ in cleaned_human]
            a1 = human_ai_agreement(hs, [float(x) for _, x, _ in cleaned_human])
            a2 = human_ai_agreement(hs, [float(y) for _, _, y in cleaned_human])
            result["human_ai_v1"] = a1
            result["human_ai_v2"] = a2
            result["delta_mae"] = _delta(a2.get("mae"), a1.get("mae"))
            result["delta_bias"] = _delta(a2.get("bias"), a1.get("bias"))
            result["delta_qwk"] = _delta(
                a2.get("quadratic_weighted_kappa"), a1.get("quadratic_weighted_kappa")
            )
    return result


def _delta(after: Optional[Number], before: Optional[Number]) -> Optional[Number]:
    if after is None or before is None:
        return None
    return after - before
