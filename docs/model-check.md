# Model check

Pre-deployment check shown as the last step of a completed run: **Consistency test**, **Human-AI alignment**, **Construct validity**, **Robustness**. One verdict (Safe to deploy / Needs review before deploying / Do not deploy), plain-language reasons, and a detail page per check. Demographic fairness is not covered.

- Code: `src/lab/modelCheck/` (`rules.ts` pass lines and verdict, `reasons.ts` wording, `ModelCheck.tsx` pages, `source.ts` data).
- Routes: `/research-lab/runs/:runId/check` and `/check/:metric` (consistency, alignment, validity, robustness, how-it-works).
- Data: **not connected to real runs yet.** With `VITE_MODEL_CHECK_MOCK=true` it shows labelled sample data; otherwise the run page shows no card and the check page says it is not connected.
- To connect: provide per-skill stats (`ModelCheckInput` in `types.ts`) from `python/research_metrics` or from run exports, then return them from `getModelCheckSource`. Validate on synthetic data with known bias first.
- Pass lines are set by the project team from the SoW; ICC and kappa bands (Koo and Li 2016, Landis and Koch 1977) should be verified against the sources.
- Open: the Lab's "no overall pass/fail" principle must be agreed with VettedAI; paired datasets must be confirmed to need no human ratings for the variant side.

## Static preview

`npm run build -- -c vite.preview.config.ts` is not wired as a script. Run `npx vite build -c vite.preview.config.ts` with `VITE_MODEL_CHECK_MOCK=true` to build `preview.html`: the real Lab UI with a fake backend (`src/preview/`), for demos only. It does not affect the real build.
