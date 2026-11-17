# Contributing

## Who can change what

Everything in this repo is fair game: Lab UI, copy, new metrics, notebooks,
exports, docs. Vetted reviews and merges.

Not in scope (they live in the Vetted platform repo, not here): scorer prompts,
the eval/question bank and its private mappings, production scoring functions,
production tables, secrets.

## Flow

```bash
git clone https://github.com/Generous-Circle/research-lab
cd research-lab
git checkout -b feature/<slug>
# work
npm test && npm run build
git push -u origin feature/<slug>
gh pr create --base main
```

- One concern per PR. Keep PRs small enough to read in one sitting.
- `npm test` and `npm run build` must be green before review. CI runs both.
- Vetted reviews and merges. Don't merge your own PR.
- Don't commit `.env`, tokens, or anything from `dist/`.

## Metric changes

A metric PR needs more than passing tests:

1. State the flaw you are fixing and the alternative you chose — `docs/metrics-audit.md`
   lists the known ones.
2. Validate against synthetic raters with a **known** bias. "It improved on our
   sample" is not evidence; a constructed rater with severity +0.34 is.
3. Include the number before and after, and say whether a current conclusion
   changes. Overturning a conclusion is a success, not an insult.

## Data

Use synthetic or de-identified data in issues, PRs, notebooks and screenshots.
Never paste real candidate transcripts, raters' names, or emails into a public
thread. If a bug needs real data to reproduce, describe the shape of it instead.
