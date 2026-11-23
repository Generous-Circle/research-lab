import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyse, checkSummaryLine, VERDICT_TEXT, THRESHOLDS, iccBand, kappaBand } from "./rules";
import { FIXES, technicalReason } from "./reasons";
import { getModelCheckSource } from "./source";
import { GLOSSARY, statement } from "./copy";
import { BarList, StatusIcon, StatusPill, Term, statusBox } from "./ui";
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  METRIC_KEYS,
  METRIC_LABELS,
  VARIANT_DESCRIPTIONS,
  VARIANT_KEYS,
  VARIANT_LABELS,
  type MetricKey,
  type ModelCheckInput,
  type ModelCheckResult,
} from "./types";

const f2 = (x: number) => x.toFixed(2);
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const base = (runId: string) => `/research-lab/runs/${runId}/check`;

export function isMetricKey(x: string | undefined): x is MetricKey {
  return !!x && (METRIC_KEYS as string[]).includes(x);
}

/** Page for /research-lab/runs/:runId/check[/:metric]. `metric` may be a MetricKey or "how-it-works". */
export function ModelCheck({ runId, metric }: { runId: string; metric?: string }) {
  const source = useMemo(() => getModelCheckSource(runId), [runId]);
  const result = useMemo(() => (source.state === "ready" ? analyse(source.input) : null), [source]);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
        <Link className="hover:underline" to={`/research-lab/runs/${runId}`}>Run {runId.slice(0, 8)}</Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        {metric ? <Link className="hover:underline" to={base(runId)}>Model check</Link> : <span>Model check</span>}
        {metric && (
          <>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="text-foreground">{isMetricKey(metric) ? METRIC_LABELS[metric] : "How the checks work"}</span>
          </>
        )}
      </nav>

      {source.state === "unavailable" || !result ? (
        <NotConnected />
      ) : (
        <>
          {source.isSample && (
            <Alert>
              <AlertTitle>Sample data</AlertTitle>
              <AlertDescription>
                These results come from built-in example models, not from this run. They show how the check will look once real run data is connected.
              </AlertDescription>
            </Alert>
          )}
          {metric === "how-it-works" ? (
            <HowItWorks />
          ) : isMetricKey(metric) ? (
            <MetricPage runId={runId} metric={metric} result={result} input={source.input} />
          ) : (
            <Summary runId={runId} result={result} input={source.input} scorer={source.scorerLabel} />
          )}
        </>
      )}
    </div>
  );
}

function NotConnected() {
  return (
    <Alert>
      <AlertTitle>Model check is not connected to run data yet</AlertTitle>
      <AlertDescription>
        No verdict is shown, because showing one without real per-skill statistics would be misleading.
      </AlertDescription>
    </Alert>
  );
}

/** Compact card used on the run page. Renders nothing when the check has no data. */
export function ModelCheckCard({ runId }: { runId: string }) {
  const source = useMemo(() => getModelCheckSource(runId), [runId]);
  const result = useMemo(() => (source.state === "ready" ? analyse(source.input) : null), [source]);
  if (!result) return null;
  return (
    <Card data-model-check-new className={`border ${statusBox(result.verdict)}`}>
      <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusPill status={result.verdict} />
            <span className="font-semibold">Model check (sample data): {VERDICT_TEXT[result.verdict]}</span>
          </div>
          <p className="text-sm text-muted-foreground">{checkSummaryLine(result)}</p>
        </div>
        <Link className="text-sm font-medium underline underline-offset-2" to={base(runId)}>
          Open model check
        </Link>
      </CardContent>
    </Card>
  );
}

function Summary({ runId, result, input, scorer }: { runId: string; result: ModelCheckResult; input: ModelCheckInput; scorer: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Model check</h1>
        {scorer && <p className="text-sm text-muted-foreground">{scorer}</p>}
      </div>

      <section className={`rounded-lg border p-5 ${statusBox(result.verdict)}`} aria-label="Verdict">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-background border">
            <StatusIcon status={result.verdict} className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold">{VERDICT_TEXT[result.verdict]}</p>
            <p className="text-sm">{checkSummaryLine(result)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {METRIC_KEYS.map((m) => (
          <Link key={m} to={`${base(runId)}/${m}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full hover:bg-muted/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{METRIC_LABELS[m]}</CardTitle>
                  <StatusPill status={result[m].status} />
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>{statement(result, input, m)}</p>
                <p className="text-foreground text-xs font-medium">See details</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Not covered: fairness across demographic groups. This check does not test for it.{" "}
        <Link className="underline underline-offset-2" to={`${base(runId)}/how-it-works`}>How the checks work</Link>
      </p>
    </div>
  );
}

function MetricPage({ runId, metric, result, input }: { runId: string; metric: MetricKey; result: ModelCheckResult; input: ModelCheckInput }) {
  const status = result[metric].status;
  const tech = technicalReason(result, metric);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">{METRIC_LABELS[metric]}</h1>
        <StatusPill status={status} />
      </div>
      <p className="text-sm">{statement(result, input, metric)}</p>

      {status !== "pass" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Technical detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {tech && <p>{tech}</p>}
            <p>
              <b>What to try:</b> {FIXES[metric]}
            </p>
          </CardContent>
        </Card>
      )}

      {metric === "consistency" && <ConsistencyBody result={result} />}
      {metric === "alignment" && <AlignmentBody result={result} />}
      {metric === "validity" && <ValidityBody result={result} />}
      {metric === "robustness" && <RobustnessBody result={result} />}

      <Link className="text-sm underline underline-offset-2" to={base(runId)}>
        Back to the summary
      </Link>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ConsistencyBody({ result }: { result: ModelCheckResult }) {
  const rows = DIMENSION_KEYS.map((d) => ({ d, ...result.consistency.perDimension[d] }));
  return (
    <>
      <Section title="Agreement between repeated runs" desc={`Same answers scored ${result.repeats} times. Pass line: ${THRESHOLDS.consistency.iccPass}.`}>
        <BarList
          max={1}
          passAt={THRESHOLDS.consistency.iccPass}
          caption="Bars show ICC (0 to 1). The line is the pass level."
          rows={rows.map((r) => ({ label: DIMENSION_LABELS[r.d], value: r.values.icc, text: f2(r.values.icc), status: r.status }))}
        />
      </Section>
      <Section title="By skill">
        <Table
          head={[<Term key="i" tip={GLOSSARY.icc}>ICC</Term>, "Band", <Term key="s" tip={GLOSSARY.identical}>Identical</Term>, "Result"]}
          rows={rows.map((r) => [DIMENSION_LABELS[r.d], f2(r.values.icc), iccBand(r.values.icc), pct(r.values.identicalShare, 1), <StatusPill key="p" status={r.status} />])}
        />
      </Section>
    </>
  );
}

function AlignmentBody({ result }: { result: ModelCheckResult }) {
  const rows = DIMENSION_KEYS.map((d) => ({ d, ...result.alignment.perDimension[d] }));
  return (
    <Section title="AI vs human experts" desc="AI agreement with the human average, compared with how well the experts agree with each other.">
      <Table
        head={[<Term key="k" tip={GLOSSARY.kappa}>Kappa (AI)</Term>, "Kappa (experts)", "Gap", "Band", "Result"]}
        rows={rows.map((r) => [
          DIMENSION_LABELS[r.d],
          f2(r.values.kappa),
          f2(r.values.humanKappa),
          (r.values.gap >= 0 ? "+" : "") + f2(r.values.gap),
          kappaBand(r.values.kappa),
          <StatusPill key="p" status={r.status} />,
        ])}
      />
    </Section>
  );
}

function ValidityBody({ result }: { result: ModelCheckResult }) {
  const v = result.validity;
  return (
    <>
      <Section title="Rank match with experts" desc="Does the AI put answers in the same order as experts?">
        <Table
          head={[<Term key="r" tip={GLOSSARY.rho}>Spearman rho</Term>, "Result"]}
          rows={DIMENSION_KEYS.map((d) => [DIMENSION_LABELS[d], f2(v.perDimension[d].values.rho), <StatusPill key="p" status={v.perDimension[d].status} />])}
        />
      </Section>
      <Section title="Other checks">
        <Table
          first="Check"
          head={["Value", "Result"]}
          rows={[
            [<Term key="c" tip={GLOSSARY.content}>Score drops when key ideas are removed</Term>, pct(v.contentDrop.values.share), <StatusPill key="a" status={v.contentDrop.status} />],
            [<Term key="d" tip={GLOSSARY.discriminant}>Skills scored distinctly (highest cross-skill correlation)</Term>, f2(v.discriminant.values.max), <StatusPill key="b" status={v.discriminant.status} />],
          ]}
        />
      </Section>
    </>
  );
}

function RobustnessBody({ result }: { result: ModelCheckResult }) {
  return (
    <>
      <Section title="Average score change by wording change" desc={`How far the score moves when only the wording changes. Limit: ${THRESHOLDS.robustness.meanChangePass} points.`}>
        <BarList
          max={1}
          passAt={THRESHOLDS.robustness.meanChangePass}
          caption="Worst skill for each wording change."
          rows={VARIANT_KEYS.map((k) => {
            const r = result.robustness.perVariant[k];
            return { label: VARIANT_LABELS[k], value: r.worstChange.value, text: f2(r.worstChange.value), status: r.status };
          })}
        />
      </Section>
      <Section title="By wording change and skill" desc="Average absolute score change, in points.">
        <Table
          first="Wording change"
          head={[...DIMENSION_KEYS.map((d) => DIMENSION_LABELS[d]), "Result"]}
          rows={VARIANT_KEYS.map((k) => {
            const r = result.robustness.perVariant[k];
            return [
              <Term key="t" tip={VARIANT_DESCRIPTIONS[k]}>{VARIANT_LABELS[k]}</Term>,
              ...DIMENSION_KEYS.map((d) => f2(r.perDimension[d].values.meanChange)),
              <StatusPill key="p" status={r.status} />,
            ];
          })}
        />
        <p className="text-xs text-muted-foreground mt-2">{GLOSSARY.change}</p>
      </Section>
    </>
  );
}

function Table({ head, rows, first = "Skill" }: { head: React.ReactNode[]; rows: React.ReactNode[][]; first?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1.5 pr-3 font-medium">{first}</th>
            {head.map((h, i) => (
              <th key={i} className="py-1.5 px-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "py-2 pr-3" : "py-2 px-2 tabular-nums"}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">How the checks work</h1>
      <p className="text-sm text-muted-foreground">
        Each check is judged on its weakest skill. The overall verdict is the worst of the four checks. Pass lines were set by the project team from the statement of work; there is no external standard for them.
      </p>
      <Section title="The four checks">
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li><b>Consistency test.</b> Same answer scored several times. Pass: ICC at least {THRESHOLDS.consistency.iccPass}.</li>
          <li><b>Human-AI alignment.</b> AI agreement with the human average compared with experts’ agreement with each other. Fail if the AI is more than 0.10 below.</li>
          <li><b>Construct validity.</b> Scores follow content: rank match with experts, a drop when key ideas are removed, and distinct skills.</li>
          <li><b>Robustness.</b> Scores stay put when jargon or filler is added or removed. Limit: {THRESHOLDS.robustness.meanChangePass} points average change.</li>
        </ul>
      </Section>
      <Section title="Not covered">
        <p className="text-sm">Fairness across demographic groups is not tested here.</p>
      </Section>
    </div>
  );
}
