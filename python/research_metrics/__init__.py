"""Vetted research metrics — one versioned, dependency-free metrics package.

CMU Transcript Evaluation MVP (Fizzy #4651). The SAME pinned package backs both
the Vercel service endpoint and the notebook workflow; no metric formula is
duplicated anywhere else.

Public surface
--------------
- :func:`compute_metrics` — the single entry point that turns a sanitized payload
  into the descriptive metrics dict.
- :func:`build_report` — adds small-sample warnings and optional study-threshold
  flags (never a pass/fail verdict).
- the individual P0 metric functions.

Deliberately absent: any ASR / WER / audio / transcription metric.
"""

from __future__ import annotations

from typing import Dict, Optional

from .metrics import (
    DEFAULT_MAX_RATING,
    DEFAULT_MIN_RATING,
    human_ai_agreement,
    icc_2_1,
    krippendorff_alpha_ordinal,
    paired_difference,
    quadratic_weighted_kappa,
    repeat_stability,
    scorer_version_deltas,
)
from .report import DEFAULT_WARN_N, THRESHOLD_KEYS, build_report

__version__ = "0.1.0"

__all__ = [
    "__version__",
    "compute_metrics",
    "build_report",
    "DEFAULT_WARN_N",
    "THRESHOLD_KEYS",
    "DEFAULT_MIN_RATING",
    "DEFAULT_MAX_RATING",
    "human_ai_agreement",
    "icc_2_1",
    "krippendorff_alpha_ordinal",
    "paired_difference",
    "quadratic_weighted_kappa",
    "repeat_stability",
    "scorer_version_deltas",
]


def compute_metrics(payload: Dict[str, object]) -> Dict[str, object]:
    """Compute the P0 metrics from a sanitized payload.

    Expected shape (every section optional)::

        {
          "agreement": {"human": [...], "ai": [...]},
          "alpha": {"units": [[rater, rater, ...], ...]},
          "repeats": [[...], ...],
          "paired": {"a": [...], "b": [...], "groups": [...]},
          "versions": {"v1": [...], "v2": [...], "human": [...]}
        }

    Only P0 transcript metrics are produced; nothing is a pass/fail claim.
    """
    payload = payload or {}
    metrics: Dict[str, object] = {}

    agreement = payload.get("agreement")
    if isinstance(agreement, dict):
        metrics["human_ai"] = human_ai_agreement(
            agreement.get("human") or [], agreement.get("ai") or []
        )

    alpha = payload.get("alpha")
    if isinstance(alpha, dict) and isinstance(alpha.get("units"), list):
        metrics["krippendorff_alpha"] = {
            "n": sum(1 for unit in alpha["units"] if isinstance(unit, list) and len(unit) >= 2),
            "value": krippendorff_alpha_ordinal(alpha["units"]),
        }

    repeats = payload.get("repeats")
    if isinstance(repeats, list):
        metrics["repeat_stability"] = repeat_stability(repeats)

    paired = payload.get("paired")
    if isinstance(paired, dict):
        metrics["paired_difference"] = paired_difference(
            paired.get("a") or [], paired.get("b") or [], paired.get("groups")
        )

    versions = payload.get("versions")
    if isinstance(versions, dict):
        metrics["scorer_version_deltas"] = scorer_version_deltas(
            versions.get("v1") or [], versions.get("v2") or [], versions.get("human")
        )

    return metrics
