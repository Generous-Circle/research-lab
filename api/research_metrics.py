"""Vercel Python function — signed research-metrics service (Fizzy #4651).

Route: ``/api/research_metrics`` (Vercel serves this file, which takes precedence
over the React Router SPA fallback exactly like ``api/cron/*`` already does).

- ``GET``  → a JSON health payload (never the React app shell).
- ``POST`` → verifies an HMAC-SHA256 signature from the Supabase Edge Function,
  computes the P0 metrics with the pinned ``research_metrics`` package, and
  returns the descriptive report.

Security boundary: this function holds **no Supabase credentials and no database
access**. It receives only a sanitized payload over a signed server-to-server
request. The shared secret lives in ``RESEARCH_METRICS_SIGNING_SECRET``.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import pathlib
import sys
import time
from http.server import BaseHTTPRequestHandler
from typing import Dict, Optional, Tuple

SIGNATURE_HEADER = "x-research-signature"
TIMESTAMP_HEADER = "x-research-timestamp"
MAX_SKEW_SECONDS = 300


def _ensure_package_on_path() -> None:
    """Locate the pinned ``research_metrics`` package in every plausible layout.

    Locally the package sits at ``<repo>/python/research_metrics``. On Vercel the
    ``includeFiles`` glob bundles it relative to the function; the env override
    covers any other layout.
    """
    here = pathlib.Path(__file__).resolve().parent
    override = os.environ.get("RESEARCH_METRICS_PYTHONPATH")
    candidates = []
    if override:
        candidates.append(pathlib.Path(override))
    candidates += [
        here.parent / "python",          # repo layout: <repo>/python
        here / "python",                 # bundled alongside the function
        here.parent,                     # package at repo root
        here.parent.parent / "python",
    ]
    for candidate in candidates:
        if (candidate / "research_metrics" / "__init__.py").exists():
            if str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))
            return


_ensure_package_on_path()

import research_metrics  # noqa: E402  (import after sys.path is prepared)


def health_payload() -> Dict[str, object]:
    return {
        "ok": True,
        "service": "research-metrics",
        "package": "vetted-research-metrics",
        "version": research_metrics.__version__,
    }


def verify_signature(
    secret: Optional[str],
    timestamp: Optional[str],
    body: bytes,
    signature: Optional[str],
    now: Optional[float] = None,
) -> bool:
    """HMAC-SHA256 over ``"{timestamp}.{raw_body}"`` with a freshness window."""
    if not secret or not timestamp or not signature:
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    current = time.time() if now is None else now
    if abs(current - ts) > MAX_SKEW_SECONDS:
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        f"{timestamp}.".encode("utf-8") + body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def metrics_response(
    body: bytes,
    headers: Dict[str, str],
    secret: Optional[str] = None,
    now: Optional[float] = None,
) -> Tuple[int, Dict[str, object]]:
    """Pure core of the POST route — directly unit-testable, no HTTP needed."""
    secret = secret if secret is not None else os.environ.get("RESEARCH_METRICS_SIGNING_SECRET")
    signature = headers.get(SIGNATURE_HEADER)
    timestamp = headers.get(TIMESTAMP_HEADER)
    if not verify_signature(secret, timestamp, body, signature, now=now):
        return 401, {"ok": False, "error": "unauthorized", "code": "UNAUTHORIZED"}
    try:
        data = json.loads(body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return 400, {"ok": False, "error": "invalid_json", "code": "BAD_REQUEST"}
    if not isinstance(data, dict):
        return 400, {"ok": False, "error": "invalid_body", "code": "BAD_REQUEST"}

    payload = data.get("payload") or {}
    try:
        warn_threshold = int(data.get("warn_threshold", research_metrics.DEFAULT_WARN_N))
        thresholds = data.get("thresholds") or None
        if not isinstance(payload, dict) or not isinstance(thresholds, (dict, type(None))):
            raise ValueError("payload/thresholds must be objects")
        report = research_metrics.build_report(
            research_metrics.compute_metrics(payload),
            warn_threshold=warn_threshold,
            thresholds=thresholds,
        )
    except (TypeError, ValueError, KeyError):
        # A malformed-but-signed payload must return a clean error, never abort
        # the handler with a non-JSON body.
        return 400, {"ok": False, "error": "invalid_payload", "code": "BAD_REQUEST"}
    return 200, {
        "ok": True,
        "package": "vetted-research-metrics",
        "package_version": research_metrics.__version__,
        "report": report,
    }


class handler(BaseHTTPRequestHandler):
    """Vercel's Python entrypoint (BaseHTTPRequestHandler)."""

    def _send(self, status: int, payload: Dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 (BaseHTTPRequestHandler API)
        self._send(200, health_payload())

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        headers = {key.lower(): value for key, value in self.headers.items()}
        status, payload = metrics_response(body, headers)
        self._send(status, payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args) -> None:  # keep the default stderr log quiet
        return
