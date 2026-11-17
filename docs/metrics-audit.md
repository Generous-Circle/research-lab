# Research Lab metrics audit (CMU PR backlog)

Date: 2026-11-17. Context: 0–5 ordinal rubric scores, raters with different
severity (e.g. Rater 2 at +0.34 leniency). Every metric below assumes raters are
interchangeable interval machines — they aren't. The dashboard now says this out
loud per metric box (`RunDetail.tsx`); this doc is the fix backlog.

Computation lives in `python/research_metrics/metrics.py` (+ `stats.py`),
surfaced via `supabase/functions/_shared/research-metrics.ts`.

| Metric | Flaw on our data | Correct alternative |
|---|---|---|
| MAE (`metrics.py:135`) | Assumes equal-interval steps; uniform leniency inflates it though order is intact | Severity-adjusted MAE (cumulative-link / Many-Facet Rasch) |
| Bias (`metrics.py:137`) | Interval-scale mean; 0–5 ceiling makes it asymmetric | Rater random-intercept (severity facet) in an ordinal mixed model |
| Spearman ρ (`metrics.py:147`, `stats.py:94-98`) | Rank-only: a +0.34 shift scores ≈1 and hides severity; heavy ties on 6 points distort | Always pair with severity estimate; disattenuated correlation |
| QWK (`metrics.py:31-65`) | Quadratic weights punish 2-pt gaps 4× (`metrics.py:57`); `floor(x+0.5)` coarsens medians (`:45-46`); kappa marginal paradoxes | Linear-weighted kappa or latent ordinal agreement |
| Exact (`metrics.py:139`) | Zero tolerance conflates rater style with discrimination | Severity-adjusted exact agreement (subtract rater facet first) |
| Within-one (`metrics.py:140`) | Chance on 0–5 is already ~50%+, so it flatters; leniency hides inside the band | Chance-corrected within-one or calibration plot |
| Krippendorff ordinal α (`metrics.py:68-122`) | Assumes interchangeable raters; leniency deflates α with identical ordering; humans-only (`research-metrics.ts:116-118`) | Hierarchical ordinal model separating severity from consensus |
| Repeat ICC(2,1) (`metrics.py:156-183`) | ANOVA assumes interval/normal residuals + balanced design (`:197` → `None` if unbalanced); restricted range deflates ICC | Ordinal G-theory / latent-trait repeat agreement |
| Paired Wilcoxon (`metrics.py:210-219`) | Drops zeros (`stats.py:142`); assumes symmetric diffs (floor/ceiling break it); tiny per-group n; inputs already bake bias via `human_median` (`research-metrics.ts:120-124`) | Ordinal mixed-effects with severity covariate, or permutation on adjusted scores |

Rules for a metric PR: validate against synthetic raters with KNOWN bias before
claiming improvement; a PR that overturns a current conclusion is a success, not
an insult. See `CONTRIBUTING.md` → Research Lab collaboration.
