#!/usr/bin/env python3
"""Check the benchmark files before pushing them. Standard library only.

    python3 benchmark/validate.py [questions.csv answers.csv] [--scores]

Exit code 0 = valid. --scores also prints the frozen human score of every answer.
Human score of an original = mean of its three ratings, rounded to the nearest
whole number, .5 rounding up. A variant takes its original's score.
"""
from __future__ import annotations

import csv
import math
import re
import sys
from pathlib import Path

DIMENSIONS = {"cognitive_abilities", "execution", "communication", "adaptability_learning", "emotional_intelligence", "judgment"}
VARIANTS = {"jargon_added", "jargon_removed", "filler_added", "filler_removed", "combined"}
Q_COLS = ["question_key", "dimension_key", "role_key", "question_text", "scoring_rubric", "reference_answer"]
A_COLS = ["answer_ref", "candidate_ref", "question_key", "variant_type", "parent_answer_ref", "transcript_text", "rater_1", "rater_2", "rater_3"]
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
REF = re.compile(r"^[A-Za-z0-9_.:\-]{1,64}$")


def round_half_up(x: float) -> int:
    return int(math.floor(x + 0.5))


def read(path: Path, cols: list[str], errors: list[str]) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        missing = [c for c in cols if c not in (r.fieldnames or [])]
        if missing:
            errors.append(f"{path.name}: missing columns {missing}")
            return []
        return list(r)


def validate(questions: Path, answers: Path) -> tuple[list[str], dict[str, int]]:
    errors: list[str] = []
    qs = read(questions, Q_COLS, errors)
    rows = read(answers, A_COLS, errors)
    if errors:
        return errors, {}

    qkeys: dict[str, str] = {}
    for i, q in enumerate(qs, 2):
        k = q["question_key"].strip()
        if not REF.match(k):
            errors.append(f"questions line {i}: bad question_key {k!r}")
        if k in qkeys:
            errors.append(f"questions line {i}: duplicate question_key {k!r}")
        qkeys[k] = q["dimension_key"].strip()
        if q["dimension_key"].strip() not in DIMENSIONS:
            errors.append(f"questions line {i}: unknown dimension_key {q['dimension_key']!r}")
        for c in ("question_text", "scoring_rubric", "reference_answer"):
            if not q[c].strip():
                errors.append(f"questions line {i}: {c} is empty")

    refs: dict[str, dict[str, str]] = {}
    for i, a in enumerate(rows, 2):
        ref = a["answer_ref"].strip()
        if not REF.match(ref):
            errors.append(f"answers line {i}: bad answer_ref {ref!r}")
        if ref in refs:
            errors.append(f"answers line {i}: duplicate answer_ref {ref!r}")
        refs[ref] = a
        if a["question_key"].strip() not in qkeys:
            errors.append(f"answers line {i}: question_key {a['question_key']!r} is not in the questions file")
        if not a["transcript_text"].strip():
            errors.append(f"answers line {i}: transcript_text is empty")
        if EMAIL.search(a["transcript_text"]):
            errors.append(f"answers line {i}: transcript looks like it contains an email address")
        if not REF.match(a["candidate_ref"].strip()):
            errors.append(f"answers line {i}: bad candidate_ref {a['candidate_ref']!r}")

    n_orig = n_var = 0
    for i, a in enumerate(rows, 2):
        vt = a["variant_type"].strip()
        ratings = [a[c].strip() for c in ("rater_1", "rater_2", "rater_3")]
        if vt == "original":
            n_orig += 1
            if a["parent_answer_ref"].strip():
                errors.append(f"answers line {i}: an original must not have parent_answer_ref")
            for c, v in zip(("rater_1", "rater_2", "rater_3"), ratings):
                try:
                    x = float(v)
                    if not 0 <= x <= 5:
                        raise ValueError
                except ValueError:
                    errors.append(f"answers line {i}: {c} must be a number from 0 to 5, got {v!r}")
        elif vt in VARIANTS:
            n_var += 1
            parent = refs.get(a["parent_answer_ref"].strip())
            if parent is None:
                errors.append(f"answers line {i}: parent_answer_ref {a['parent_answer_ref']!r} not found")
            else:
                if parent["variant_type"].strip() != "original":
                    errors.append(f"answers line {i}: parent must be an original")
                if parent["question_key"].strip() != a["question_key"].strip():
                    errors.append(f"answers line {i}: variant and parent must share a question_key")
            if any(ratings):
                errors.append(f"answers line {i}: variants must have no ratings (they inherit the original's score)")
        else:
            errors.append(f"answers line {i}: unknown variant_type {vt!r}")
    return errors, {"questions": len(qs), "originals": n_orig, "variants": n_var}


def human_scores(answers: Path) -> dict[str, int]:
    rows = list(csv.DictReader(open(answers, newline="", encoding="utf-8")))
    base = {r["answer_ref"]: round_half_up(sum(float(r[c]) for c in ("rater_1", "rater_2", "rater_3")) / 3)
            for r in rows if r["variant_type"] == "original"}
    return {r["answer_ref"]: base.get(r["answer_ref"], base.get(r["parent_answer_ref"])) for r in rows}


def main(argv: list[str]) -> int:
    here = Path(__file__).parent
    args = [a for a in argv if not a.startswith("--")]
    q = Path(args[0]) if len(args) > 0 else here / "benchmark_questions.csv"
    a = Path(args[1]) if len(args) > 1 else here / "benchmark_answers.csv"
    errors, counts = validate(q, a)
    if errors:
        print(f"{len(errors)} problem(s):")
        for e in errors[:50]:
            print(" -", e)
        return 1
    print(f"OK: {counts['questions']} questions, {counts['originals']} originals, {counts['variants']} variants.")
    if "--scores" in argv:
        for ref, s in human_scores(a).items():
            print(f"{ref},{s}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
