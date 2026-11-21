# Proposal: ship the benchmark with the code (backend change)

Status: proposal for the VettedAI team to review. The backend (Supabase tables and edge functions) is not in this repo, so this describes what it needs to do; it has not been implemented here.

## Goal
Every new scorer is tested on the same fixed benchmark. The benchmark is part of the code base, so it is there automatically: no upload, no approval, no question-card setup.

## What changes

1. **Load the benchmark from the repo.** On deploy, read `benchmark/benchmark_questions.csv` and `benchmark/benchmark_answers.csv`, check them (same rules as `benchmark/validate.py`), and store them as one locked, numbered dataset version. A new version is created only when the files' content hash changes. Older versions stay available so past results can be reproduced.
2. **Freeze the human score at load time.** For each original: mean of `rater_1..3`, rounded to the nearest whole number, .5 rounding up. A variant takes its parent's score. The raw ratings are stored too, for the separate rater-agreement study.
3. **Questions travel with the data.** Question text, rubric and reference answer come from `benchmark_questions.csv`. The separate "question cards" setup is not needed for the benchmark.
4. **Hide the upload path in benchmark mode.** Behind `VITE_BENCHMARK_FIXED=true` the front end hides "Start here" and "Data"; the Lab opens on "Runs & results" with the fixed benchmark as the only dataset version.
5. **Runs stay as they are:** pick the scorer, choose 1 to N repeats, run. Stored scores are per answer per repeat.
6. **Results for the Model check** (separate piece of work): per-skill repeat ICC and identical share; per-skill agreement of the repeat-averaged, rounded score with the frozen human score; per-variant absolute score change against the same model's score on the original.

## What does not change
Auth, tokens, roles, export, the existing metrics endpoint, and the Lab's descriptive metrics.

## Open points for review
- The Lab's "no overall pass/fail" principle versus the Model check verdict.
- Whether the key-idea-removal and cross-skill checks (construct validity) get their own data, or are dropped for now.
- Where human-to-human agreement (from the separate rater study) is stored as the reference value.
