# Benchmark dataset

A fixed set of human-rated answers, plus reworded variants of them, used to test any new scorer. It does not change between models: every scorer is run on the same files.

Two CSV files (templates in this folder):

## `benchmark_questions.csv` (one row per question)
| Column | Meaning |
|---|---|
| `question_key` | Unique label, e.g. `t1_backend_engineering_fellow_q01` |
| `dimension_key` | One of `cognitive_abilities`, `execution`, `communication`, `adaptability_learning`, `emotional_intelligence`, `judgment` |
| `role_key` | Role the question belongs to |
| `question_text` | The question as the candidate saw it |
| `scoring_rubric` | What each score from 0 to 5 looks like |
| `reference_answer` | An answer that would earn the top score |

## `benchmark_answers.csv` (one row per answer, originals and variants together)
| Column | Meaning |
|---|---|
| `answer_ref` | Unique label for this answer or variant |
| `candidate_ref` | Opaque label for the person (no names or emails) |
| `question_key` | Must match a row in the questions file |
| `variant_type` | `original`, `jargon_added`, `jargon_removed`, `filler_added`, `filler_removed` or `combined` |
| `parent_answer_ref` | Blank for originals; the original's `answer_ref` for a variant |
| `transcript_text` | The answer as text |
| `rater_1`, `rater_2`, `rater_3` | Human scores, 0 to 5. Fill on originals only; leave blank on variants |

## Human score (calculated, never typed)
- Original: the mean of the three ratings, rounded to the nearest whole number, with .5 rounding up. Calculated once when the dataset is loaded, then fixed.
- Variant: takes its original's human score, because the content is unchanged.

## Rules
- Not every original needs all five variants.
- Variants are written once and never regenerated.
- No names, emails or other identifying text in any file.
- Truncated transcripts are not part of this benchmark.
