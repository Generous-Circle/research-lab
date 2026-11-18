"""Low-level, dependency-free statistics primitives for the metrics package.

Everything here is pure Python (stdlib only). The package deliberately has NO
third-party runtime dependencies so the Vercel Python function stays tiny and
free of wheel/ABI surprises; ``uv.lock`` still pins the dev/test toolchain.

All functions are deterministic. Bootstrap helpers take an explicit seed.
"""

from __future__ import annotations

import math
import random
from typing import Callable, List, Optional, Sequence, Tuple

Number = float


# ── central tendency / spread ────────────────────────────────────────────────

def mean(xs: Sequence[Number]) -> Optional[Number]:
    if not xs:
        return None
    return math.fsum(xs) / len(xs)


def sample_std(xs: Sequence[Number]) -> Optional[Number]:
    """Sample standard deviation (ddof=1). None for fewer than two values."""
    n = len(xs)
    if n < 2:
        return None
    m = mean(xs)
    return math.sqrt(math.fsum((x - m) ** 2 for x in xs) / (n - 1))


def population_std(xs: Sequence[Number]) -> Optional[Number]:
    n = len(xs)
    if n < 1:
        return None
    m = mean(xs)
    return math.sqrt(math.fsum((x - m) ** 2 for x in xs) / n)


def percentile(xs: Sequence[Number], q: float) -> Optional[Number]:
    """Linear-interpolation percentile (matches numpy's default ``linear``)."""
    if not xs:
        return None
    ordered = sorted(xs)
    if len(ordered) == 1:
        return float(ordered[0])
    k = (len(ordered) - 1) * (q / 100.0)
    lo = math.floor(k)
    hi = math.ceil(k)
    if lo == hi:
        return float(ordered[int(k)])
    return float(ordered[lo] * (hi - k) + ordered[hi] * (k - lo))


def normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


# ── ranking / correlation ────────────────────────────────────────────────────

def ranks_average_ties(xs: Sequence[Number]) -> List[float]:
    """Ranks with ties averaged (1-based), the ranking Spearman rho needs."""
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        average = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = average
        i = j + 1
    return ranks


def pearson(x: Sequence[Number], y: Sequence[Number]) -> Optional[Number]:
    n = len(x)
    if n < 2 or n != len(y):
        return None
    mx, my = mean(x), mean(y)
    sxx = math.fsum((a - mx) ** 2 for a in x)
    syy = math.fsum((b - my) ** 2 for b in y)
    if sxx == 0.0 or syy == 0.0:
        return None
    sxy = math.fsum((a - mx) * (b - my) for a, b in zip(x, y))
    return sxy / math.sqrt(sxx * syy)


def spearman(x: Sequence[Number], y: Sequence[Number]) -> Optional[Number]:
    """Spearman rho = Pearson correlation of average-tie ranks."""
    if len(x) < 2 or len(x) != len(y):
        return None
    return pearson(ranks_average_ties(x), ranks_average_ties(y))


def kendall_tau_b(x: Sequence[Number], y: Sequence[Number]) -> Optional[Number]:
    """Kendall's tau-b (tie-corrected). None when a denominator is zero."""
    n = len(x)
    if n < 2 or n != len(y):
        return None
    concordant = discordant = 0
    for i in range(n):
        for j in range(i + 1, n):
            dx = x[i] - x[j]
            dy = y[i] - y[j]
            if dx != 0 and dy != 0:
                if (dx > 0) == (dy > 0):
                    concordant += 1
                else:
                    discordant += 1
    n0 = n * (n - 1) / 2.0

    def tie_pairs(values: Sequence[Number]) -> float:
        counts = {}
        for v in values:
            counts[v] = counts.get(v, 0) + 1
        return math.fsum(t * (t - 1) / 2.0 for t in counts.values())

    n1 = tie_pairs(x)
    n2 = tie_pairs(y)
    denom = math.sqrt((n0 - n1) * (n0 - n2))
    if denom == 0.0:
        return None
    return (concordant - discordant) / denom


# ── paired test ──────────────────────────────────────────────────────────────

def wilcoxon_signed_rank(diffs: Sequence[Number]) -> Tuple[float, float]:
    """Two-sided Wilcoxon signed-rank test, normal approximation.

    Zero differences are dropped (Wilcoxon's standard handling). Uses the
    continuity correction and the tie correction for the variance, which is the
    behaviour of the common reference implementations for n >= ~10. Returns
    ``(W, p_value)``; ``(0.0, 1.0)`` when no non-zero differences remain.
    """
    nonzero = [d for d in diffs if d != 0]
    n = len(nonzero)
    if n == 0:
        return 0.0, 1.0
    abs_ranks = ranks_average_ties([abs(d) for d in nonzero])
    w_plus = math.fsum(r for d, r in zip(nonzero, abs_ranks) if d > 0)
    mean_w = n * (n + 1) / 4.0

    # Tie correction for the variance of W.
    counts = {}
    for d in nonzero:
        counts[abs(d)] = counts.get(abs(d), 0) + 1
    tie_term = math.fsum(t ** 3 - t for t in counts.values())
    var_w = n * (n + 1) * (2 * n + 1) / 24.0 - tie_term / 48.0
    if var_w <= 0.0:
        return w_plus, 1.0

    diff = w_plus - mean_w
    correction = 0.5 if diff > 0 else (-0.5 if diff < 0 else 0.0)
    z = (diff - correction) / math.sqrt(var_w)
    p = 2.0 * (1.0 - normal_cdf(abs(z)))
    return w_plus, min(1.0, max(0.0, p))


# ── bootstrap ────────────────────────────────────────────────────────────────

def bootstrap_ci(
    values: Sequence[Number],
    stat_fn: Callable[[Sequence[Number]], Optional[Number]] = mean,
    confidence: float = 0.95,
    n_resamples: int = 2000,
    seed: int = 20261013,
) -> Tuple[Optional[Number], Optional[Number]]:
    """Percentile bootstrap CI for ``stat_fn`` over ``values`` (deterministic)."""
    n = len(values)
    if n == 0:
        return None, None
    rng = random.Random(seed)
    stats: List[Number] = []
    for _ in range(n_resamples):
        sample = [values[rng.randrange(n)] for _ in range(n)]
        value = stat_fn(sample)
        if value is not None:
            stats.append(value)
    if not stats:
        return None, None
    alpha = (1.0 - confidence) / 2.0
    return percentile(stats, 100.0 * alpha), percentile(stats, 100.0 * (1.0 - alpha))
