import { useState } from "react";
import { ModelCheckCard } from "../modelCheck/ModelCheck";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { callResearch, downloadText, friendlyError, toCsv, type WhoAmI, can } from "@/lib/researchApi";
import { RunStatusBadge } from "./RunStatusBadge";
import { ACTIVE_RUN_STATUSES as ACTIVE, useRuns } from "../useResearchLab";

interface RunStatus {
  run: {
    id: string;
    status: string;
    repeat_count: number;
    answer_count: number;
    projected_calls: number;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
  };
  counts: Record<string, number>;
}

interface RunResults {
  results: {
    answer_ref: string;
    repeat_index: number;
    status: string;
    score: number | null;
    confidence: number | null;
    explanation: string | null;
    production_score?: number | null;
  }[];
  dimension_means: { candidate_ref: string; dimension_key: string; mean_score: number; n: number }[];
}

type Num = number | null | undefined;
type Metrics = Record<string, Record<string, unknown> | undefined>;
interface Report {
  metrics: Metrics;
  warn_threshold: number;
  warnings: { metric: string; n: number; message: string }[];
  threshold_flags: { metric: string; field?: string; value?: number; threshold?: number; message?: string }[];
}

const f = (v: Num, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? "—" : Number(v).toFixed(d));
const pct = (v: Num) => (v === null || v === undefined ? "—" : `${Math.round(Number(v) * 100)}%`);
const ci = (v: unknown) => (Array.isArray(v) && v.length === 2 ? `95% range ${f(v[0])} to ${f(v[1])}` : "");

export function RunDetail({ runId, who }: { runId: string; who: WhoAmI }) {
  const { toast } = useToast();
  const [compareId, setCompareId] = useState<string>("none");

  const status = useQuery({
    queryKey: ["research", "run_status", runId],
    queryFn: () => callResearch<RunStatus>("fn_research_runs", "run_status", { run_id: runId }),
    refetchInterval: (q) => (q.state.data && ACTIVE.has(q.state.data.run.status) ? 4000 : false),
  });
  const done = status.data?.run.status === "completed";
  const results = useQuery({
    queryKey: ["research", "run_results", runId, status.data?.run.status],
    queryFn: () => callResearch<RunResults>("fn_research_runs", "run_results", { run_id: runId }),
    enabled: !!status.data,
  });
  const runs = useRuns();
  const thisRun = runs.data?.runs.find((r) => r.id === runId);
  const comparable = (runs.data?.runs ?? []).filter(
    (r) => r.id !== runId && r.status === "completed" && thisRun && r.dataset_version_id === thisRun.dataset_version_id,
  );
  const metrics = useQuery({
    queryKey: ["research", "metrics", runId, compareId],
    queryFn: () =>
      callResearch<{ report: Report; package_version: string }>("fn_research_metrics", "metrics", {
        run_id: runId,
        ...(compareId !== "none" ? { compare_run_id: compareId } : {}),
      }),
    enabled: done,
    retry: false,
  });

  const exportRun = useMutation({
    mutationFn: () =>
      callResearch<Record<string, unknown> & { items: Record<string, unknown>[] }>("fn_research_metrics", "export", {
        run_id: runId,
        ...(compareId !== "none" ? { compare_run_id: compareId } : {}),
      }),
    onSuccess: (d) => {
      downloadText(`run-${runId.slice(0, 8)}-items.csv`, toCsv(d.items));
      downloadText(`run-${runId.slice(0, 8)}-full.json`, JSON.stringify(d, null, 2), "application/json");
    },
    onError: (e) => toast({ title: "Export failed", description: friendlyError(e), variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: () => callResearch("fn_research_runs", "cancel_run", { run_id: runId }),
    onSuccess: () => status.refetch(),
    onError: (e) => toast({ title: "Couldn't cancel", description: friendlyError(e), variant: "destructive" }),
  });

  if (status.isLoading) return <p className="text-sm text-muted-foreground">Loading run…</p>;
  if (status.error) return <p className="text-sm text-destructive">{friendlyError(status.error)}</p>;
  const run = status.data!.run;
  const completed = status.data!.counts.completed ?? 0;
  const failed = status.data!.counts.failed ?? 0;
  const hasProduction = (results.data?.results ?? []).some((r) => r.production_score != null);
  const progress = run.projected_calls ? Math.round(((completed + failed) / run.projected_calls) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/research-lab?tab=runs" className="text-sm text-muted-foreground hover:underline">
            ← All runs
          </Link>
          <h1 className="text-2xl font-semibold mt-1 flex items-center gap-3">
            Run {runId.slice(0, 8)} <RunStatusBadge status={run.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {thisRun ? `Dataset v${thisRun.dataset_version_number}${thisRun.dataset_name ? ` · ${thisRun.dataset_name}` : ""} · ${thisRun.scorer_label ?? `Scorer v${thisRun.scorer_version_number}`} · ` : ""}
            {run.answer_count} answers × {run.repeat_count} repeats · started {new Date(run.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {ACTIVE.has(run.status) && can(who, "run") && (
            <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              Cancel run
            </Button>
          )}
          {can(who, "export") && (
            <Button disabled={!done || exportRun.isPending} onClick={() => exportRun.mutate()}>
              {exportRun.isPending ? "Preparing…" : "Export CSV + JSON"}
            </Button>
          )}
        </div>
      </div>

      {ACTIVE.has(run.status) && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              {completed} of {run.projected_calls} scored{failed ? `, ${failed} failed` : ""}. This page updates by itself.
            </p>
          </CardContent>
        </Card>
      )}

      {done && <ModelCheckCard runId={runId} />}

      {done && (
        <Card>
          <CardHeader>
            <CardTitle>What the numbers say</CardTitle>
            <CardDescription>
              Each number comes with how many items it is based on (n) and, where possible, a 95% range. Small samples
              (n below {metrics.data?.report.warn_threshold ?? 10}) are flagged; read them with care.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparable.length > 0 && (
              <div className="space-y-1.5 max-w-sm">
                <Label>Compare with another run on the same dataset (optional)</Label>
                <Select value={compareId} onValueChange={setCompareId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No comparison</SelectItem>
                    {comparable.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.id.slice(0, 8)} · {r.scorer_label ?? `Scorer v${r.scorer_version_number}`} · {new Date(r.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {metrics.isLoading && <p className="text-sm text-muted-foreground">Computing metrics…</p>}
            {metrics.error && (
              <Alert>
                <AlertTitle>Metrics unavailable</AlertTitle>
                <AlertDescription>{friendlyError(metrics.error)}</AlertDescription>
              </Alert>
            )}
            {metrics.data && <MetricsView report={metrics.data.report} />}
          </CardContent>
        </Card>
      )}

      {results.data && results.data.dimension_means.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average AI score per candidate and dimension</CardTitle>
            <CardDescription>Plain mean of the AI's answer scores (0–5). There is no weighted overall score.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Dimension</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">n</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.data.dimension_means.map((m) => (
                  <TableRow key={`${m.candidate_ref}-${m.dimension_key}`}>
                    <TableCell><code>{m.candidate_ref}</code></TableCell>
                    <TableCell>{m.dimension_key.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{f(m.mean_score)}</TableCell>
                    <TableCell className="text-right">{m.n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {results.data && (
        <Card>
          <CardHeader>
            <CardTitle>Every score</CardTitle>
            <CardDescription>
              One row per answer per repeat, with the scorer's short explanation.
              {hasProduction && " \"Production\" is the score VettedAI's live scorer originally gave, where the dataset includes it."}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Answer</TableHead>
                  <TableHead className="text-right">Repeat</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  {hasProduction && <TableHead className="text-right">Production</TableHead>}
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.data.results.map((r) => (
                  <TableRow key={`${r.answer_ref}-${r.repeat_index}`}>
                    <TableCell><code>{r.answer_ref}</code></TableCell>
                    <TableCell className="text-right">{r.repeat_index}</TableCell>
                    <TableCell className="text-right">{r.status === "completed" ? f(r.score, 1) : r.status}</TableCell>
                    {hasProduction && <TableCell className="text-right">{f(r.production_score, 1)}</TableCell>}
                    <TableCell className="text-right">{pct(r.confidence)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xl">{r.explanation ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricBlock({ title, what, trust, n, children }: { title: string; what: string; trust?: string; n: unknown; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">n = {String(n ?? 0)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{what}</p>
      {trust && <p className="text-sm text-amber-700 dark:text-amber-400">When to distrust it: {trust}</p>}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <dt>{label}</dt>
      <dd className="text-right font-mono">
        {value}
        {hint ? <span className="block text-xs text-muted-foreground font-sans">{hint}</span> : null}
      </dd>
    </div>
  );
}

function MetricsView({ report }: { report: Report }) {
  const m = report.metrics ?? {};
  const ha = m.human_ai as Record<string, Num & unknown> | undefined;
  const ka = m.krippendorff_alpha as { n?: number; value?: Num } | undefined;
  const rs = m.repeat_stability as Record<string, Num & unknown> | undefined;
  const pd = m.paired_difference as { n?: number; overall?: Record<string, unknown> | null; by_group?: Record<string, Record<string, unknown>> } | undefined;
  const sv = m.scorer_version_deltas as Record<string, Num & unknown> | undefined;
  const nothing = !ha?.n && !ka?.n && !rs?.n && !pd?.n && !sv?.n;

  return (
    <div className="space-y-4">
      {report.warnings?.length > 0 && (
        <Alert>
          <AlertTitle>Small samples</AlertTitle>
          <AlertDescription>
            {report.warnings.map((w) => `${w.metric.replace(/_/g, " ")}: n=${w.n}`).join(" · ")}
          </AlertDescription>
        </Alert>
      )}
      {nothing && (
        <p className="text-sm text-muted-foreground">
          Not enough data for metrics yet. Agreement needs human ratings for the scored answers; consistency needs 2+
          repeats; paired differences need a paired dataset. Tip: run 2–3 repeats on a small subset first to check the
          plumbing before a full 10x run.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {!!ha?.n && (
          <MetricBlock
            title="Human vs AI agreement"
            what="How close the AI's score is to the human raters' median for the same answer."
            trust="a lenient or severe rater group moves these numbers without the AI being wrong. If raters disagree with each other (alpha below), no AI can look good here — the ceiling is human agreement, not 100%."
            n={ha.n}
          >
            <Row label="Average gap (MAE)" value={f(ha.mae as Num)} hint={`${ci(ha.mae_ci95)}${ci(ha.mae_ci95) ? " · " : ""}below ~0.5 is strong; near 1 means typical misses of a full point`} />
            <Row label="Bias (AI − human)" value={f(ha.bias as Num)} hint={`${ci(ha.bias_ci95)}${ci(ha.bias_ci95) ? " · " : ""}above 0 = AI scores higher. A steady offset can be calibration, not failure — check rank agreement too`} />
            <Row label="Rank agreement (Spearman ρ)" value={f(ha.spearman_rho as Num)} hint="1 = same order. Ignores uniform shifts: an AI scoring everything 1 point higher still gets ~1. Always read with Bias" />
            <Row label="Weighted kappa (QWK)" value={f(ha.quadratic_weighted_kappa as Num)} hint="1 = perfect, 0 = chance. Assumes the gap 1→2 equals 4→5, which rubrics don't guarantee" />
            <Row label="Exact match" value={pct(ha.exact_agreement as Num)} hint="Harsh by design: one lenient rater tanks it even when ordering is perfect" />
            <Row label="Within one point" value={pct(ha.within_one_agreement as Num)} hint="Flattering by design: chance alone is ~50%+ on a 0–5 scale. Below ~70% is weak, not close" />
          </MetricBlock>
        )}
        {!!ka?.n && (
          <MetricBlock
            title="Human raters' agreement with each other"
            what="Krippendorff's alpha (ordinal) across your raters. It sets the ceiling: the AI can't be judged more precisely than humans agree."
            trust="it assumes raters are interchangeable. One consistently lenient rater lowers alpha even when everyone orders answers the same. At 0.4–0.6, trust medians and bias over exact agreement"
            n={ka.n}
          >
            <Row label="Alpha" value={f(ka.value)} hint="1 = perfect, 0 = chance. 0.4–0.6 is typical for expert rubric rating, not failure" />
          </MetricBlock>
        )}
        {!!rs?.n && (
          <MetricBlock
            title="Scorer consistency"
            what="Same answer, scored again. Lower spread and higher ICC mean a more repeatable scorer."
            trust="narrow score ranges deflate ICC even when repeats are near-identical — read spread and range alongside it. Needs 2+ repeats; 1-repeat runs can't show this"
            n={rs.n}
          >
            <Row label="Average spread (SD)" value={f(rs.repeat_sd as Num)} hint="typical wobble per answer, in points" />
            <Row label="Average range" value={f(rs.repeat_range as Num)} hint="worst-case wobble per answer" />
            <Row label="Identical every time" value={pct(rs.identical_repeat_share as Num)} />
            <Row label="ICC(2,1)" value={f(rs.icc_2_1 as Num)} hint="1 = fully repeatable. Above ~0.7 is solid for a 0–5 rubric" />
          </MetricBlock>
        )}
        {!!pd?.n && pd.overall && (
          <MetricBlock
            title="Paired differences (B − A)"
            what="For A/B pairs where one thing was changed: how much the AI score moved, and whether that's likely real."
            trust="the test drops zero-differences and assumes symmetric shifts — floor and ceiling effects break it. Small n is suggestive only, and inputs already bake rater bias in via the human median"
            n={pd.n}
          >
            <Row label="Mean change" value={f(pd.overall.mean_diff as Num)} hint={ci(pd.overall.mean_diff_ci95)} />
            <Row label="Wilcoxon p-value" value={f(pd.overall.wilcoxon_p as Num, 3)} hint="small = unlikely to be chance" />
            {Object.entries(pd.by_group ?? {}).map(([g, v]) => (
              <Row key={g} label={`Changed: ${g.replace(/_/g, " ")}`} value={f(v.mean_diff as Num)} hint={`n=${String(v.n ?? "")} ${ci(v.mean_diff_ci95)}`} />
            ))}
          </MetricBlock>
        )}
        {!!sv?.n && (
          <MetricBlock
            title="Compared run (scorer change)"
            what="How scores moved between the two runs on the same answers."
            trust="a mean shift with high rank agreement usually means recalibration, not a better or worse scorer"
            n={sv.n}
          >
            <Row label="Mean change" value={f(sv.mean_delta as Num)} hint={ci(sv.mean_delta_ci95)} />
            <Row label="Rank agreement (Kendall τ)" value={f(sv.kendall_tau as Num)} />
          </MetricBlock>
        )}
      </div>
      {report.threshold_flags?.length > 0 && (
        <Alert>
          <AlertTitle>Study thresholds crossed</AlertTitle>
          <AlertDescription>
            {report.threshold_flags.map((t, i) => (
              <span key={i} className="block">{t.message ?? `${t.metric} ${t.field ?? ""}`}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
