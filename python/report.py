"""Result formatting: small-sample warnings, optional study thresholds, no verdict.

The formatter never emits an overall pass/fail. Thresholds are *optional study
thresholds* — when a study supplies none, ``threshold_flags`` is empty. Small
samples warn at ``n < warn_threshold`` (default 10, configurable).
"""

from __future__ import annotations

from typing import Dict, List, Optional

DEFAULT_WARN_N = 10

# Threshold keys a study may supply. Absent ⇒ that flag is never emitted.
THRESHOLD_KEYS = (
    "paired_sensitivity_min",
    "version_regression_max_delta_mae",
)


def collect_warnings(metrics: Dict[str, object], warn_threshold: int) -> List[Dict[str, object]]:
    """One warning per metric block whose ``n`` is below the threshold."""
    warnings: List[Dict[str, object]] = []
    for name, block in metrics.items():
        n = None
        if isinstance(block, dict):
            n = block.get("n")
            if n is None and isinstance(block.get("overall"), dict):
                n = block["overall"].get("n")
        if isinstance(n, int) and n < warn_threshold:
            warnings.append({"metric": name, "n": n, "threshold": warn_threshold,
                             "message": f"small sample: n={n} < {warn_threshold}"})
    return warnings


def apply_thresholds(metrics: Dict[str, object], thresholds: Optional[Dict[str, float]]) -> List[Dict[str, object]]:
    """Return study-threshold flags. No thresholds supplied ⇒ no flags."""
    flags: List[Dict[str, object]] = []
    if not thresholds:
        return flags

    paired_min = thresholds.get("paired_sensitivity_min")
    if paired_min is not None:
        for name, block in metrics.items():
            if isinstance(block, dict) and isinstance(block.get("overall"), dict):
                mean_diff = block["overall"].get("mean_diff")
                if isinstance(mean_diff, (int, float)) and mean_diff >= paired_min:
                    flags.append({"metric": name, "kind": "paired_sensitivity",
                                  "value": mean_diff, "threshold": paired_min,
                                  "message": f"paired mean difference {mean_diff} >= {paired_min}"})

    regression_max = thresholds.get("version_regression_max_delta_mae")
    if regression_max is not None:
        for name, block in metrics.items():
            if isinstance(block, dict):
                delta_mae = block.get("delta_mae")
                if isinstance(delta_mae, (int, float)) and delta_mae >= regression_max:
                    flags.append({"metric": name, "kind": "version_regression",
                                  "value": delta_mae, "threshold": regression_max,
                                  "message": f"delta MAE {delta_mae} >= {regression_max}"})
    return flags


def build_report(
    metrics: Dict[str, object],
    warn_threshold: int = DEFAULT_WARN_N,
    thresholds: Optional[Dict[str, float]] = None,
) -> Dict[str, object]:
    """Assemble the descriptive report: metrics + warnings + threshold flags.

    There is deliberately no ``pass``/``fail``/``verdict`` field.
    """
    report: Dict[str, object] = {
        "metrics": metrics,
        "warn_threshold": warn_threshold,
        "warnings": collect_warnings(metrics, warn_threshold),
        "threshold_flags": apply_thresholds(metrics, thresholds),
    }
    for forbidden in ("pass", "fail", "verdict", "passed", "failed"):
        report.pop(forbidden, None)
    return report
