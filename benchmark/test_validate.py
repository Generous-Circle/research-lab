import csv
import tempfile
import unittest
from pathlib import Path

from validate import A_COLS, Q_COLS, human_scores, round_half_up, validate

HERE = Path(__file__).parent


def write(path, cols, rows):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)


class Validate(unittest.TestCase):
    def test_shipped_templates_are_valid(self):
        errors, counts = validate(HERE / "benchmark_questions.csv", HERE / "benchmark_answers.csv")
        self.assertEqual(errors, [])
        self.assertEqual(counts["originals"], 2)

    def test_rounding_matches_the_sheet(self):
        self.assertEqual([round_half_up(x) for x in (2.43, 2.67, 2.5, 3.33, 1.67)], [2, 3, 3, 3, 2])

    def test_human_scores_and_inheritance(self):
        s = human_scores(HERE / "benchmark_answers.csv")
        self.assertEqual(s["T1-A0183"], 3)       # 3,3,2 -> 2.67 -> 3
        self.assertEqual(s["T1-A0183-JA"], 3)    # variant inherits
        self.assertEqual(s["T1-A0284"], 3)       # 4,3,3 -> 3.33 -> 3

    def test_catches_problems(self):
        with tempfile.TemporaryDirectory() as d:
            q, a = Path(d) / "q.csv", Path(d) / "a.csv"
            write(q, Q_COLS, [["q1", "execution", "r", "t", "rub", "ref"]])
            write(a, A_COLS, [
                ["A1", "C1", "q1", "original", "", "mail me at x@y.com", "3", "3", "9"],
                ["A1", "C1", "q1", "jargon_added", "NOPE", "text", "3", "", ""],
                ["A3", "C1", "q9", "weird", "", "text", "", "", ""],
            ])
            errors, _ = validate(q, a)
        text = "\n".join(errors)
        for needle in ("email", "0 to 5", "duplicate answer_ref", "not found", "no ratings", "not in the questions file", "unknown variant_type"):
            self.assertIn(needle, text)


if __name__ == "__main__":
    unittest.main()
