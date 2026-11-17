# VettedAI Research Lab

Scoring-evaluation workspace for the CMU-Africa × VettedAI study. This repo is the
**open analysis surface**: the Lab dashboard, the agreement metrics, and the
notebooks. It is the code our research partners read, run and extend.

## What is here

| Path | What it is |
|---|---|
| `src/lab/` | The Lab UI — Start here, Data, Runs, Run detail, API access, Admin |
| `src/lib/researchApi.ts` | The whole client contract: 4 edge functions, one `callResearch()` |
| `python/research_metrics/` | Metrics and reporting (pure stdlib, no numpy) |
| `notebooks/` | Starter notebook and week-2 corrections |
| `docs/metrics-audit.md` | Per-metric known flaws and the correct alternative |

## What is not here

Deliberately: scorer prompts and prompt assembly, the eval/question bank and its
private mappings, production scoring functions, production data access, secrets.
Those live in the Vetted platform repo. The Lab calls them through a narrow,
role-gated API; it never reads a table.

## Run it

```bash
cp .env.example .env     # staging URL + publishable key
npm install
npm run dev              # http://localhost:5174
npm test
npm run build
```

Python side needs nothing installed — stdlib only:

```bash
python3 -c "from python.research_metrics import metrics, stats, report; print('ok')"
```

## Access

There are no accounts in this app. A study Admin issues a personal token
(`crt_…`) per person from **Admin → API access**; you paste it once and it is
kept in your browser's localStorage. Revoking it server-side ends access
immediately. The publishable key in `.env` is a public client key — it cannot
read the research data on its own.

## Deploy

Static build (`npm run build` → `dist/`) behind `lab.vettedai.app`. Any static
host works; the app needs no server and no build-time secrets beyond the two
public values in `.env.example`.

## Contributing

See `CONTRIBUTING.md`. Short version: branch, PR, a Vetted reviewer merges.
Metric changes need a second pair of eyes — a new number can flip a study
conclusion.
