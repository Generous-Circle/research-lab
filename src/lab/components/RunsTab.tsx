import { useState } from "react";
import { ModelCheckCell, ModelCheckHead } from "../modelCheck/RunsColumn";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { callResearch, friendlyError, type WhoAmI, can } from "@/lib/researchApi";
import { useRuns, useVersions } from "../useResearchLab";
import { RunStatusBadge } from "./RunStatusBadge";

interface RunSettings {
  provider_terms_approved: string | null;
  price_per_call: string | null;
  repeat_ceiling: string | null;
  spend_ceiling: string | null;
}

export function RunsTab({ who }: { who: WhoAmI }) {
  const canRun = can(who, "run");
  const runs = useRuns();
  const rows = runs.data?.runs ?? [];

  return (
    <div className="space-y-6 pt-4">
      {canRun && <NewRunCard />}
      <Card>
        <CardHeader>
          <CardTitle>Runs</CardTitle>
          <CardDescription>Open a finished run to see the metrics and export the data.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : runs.error ? (
            <p className="text-sm text-destructive">{friendlyError(runs.error)}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Scorer</TableHead>
                  <TableHead className="text-right">Answers × repeats</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <ModelCheckHead />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      v{r.dataset_version_number} {r.dataset_name ? `· ${r.dataset_name}` : ""}{" "}
                      <span className="text-muted-foreground">({r.dataset_kind})</span>
                    </TableCell>
                    <TableCell>{r.scorer_label ?? `Scorer v${r.scorer_version_number}`}</TableCell>
                    <TableCell className="text-right">
                      {r.answer_count} × {r.repeat_count}
                    </TableCell>
                    <TableCell>
                      {r.completed_count}/{r.projected_calls}
                    </TableCell>
                    <TableCell><RunStatusBadge status={r.status} /></TableCell>
                    <ModelCheckCell runId={r.id} completed={r.status === "completed"} />
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/research-lab/runs/${r.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewRunCard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const versions = useVersions();
  const scorers = useQuery({
    queryKey: ["research", "scorers"],
    queryFn: () =>
      callResearch<{ scorer_versions: { id: string; version_number: number; label: string | null; active: boolean; approved_at: string | null }[] }>(
        "fn_research_runs",
        "list_scorer_versions",
      ),
  });
  const settings = useQuery({
    queryKey: ["research", "run_settings"],
    queryFn: () => callResearch<{ settings: RunSettings }>("fn_research_runs", "run_settings"),
  });
  const [pickedVersionId, setVersionId] = useState<string>("");
  const [pickedScorerId, setScorerId] = useState<string>("");
  const [repeats, setRepeats] = useState<string>("1");
  const [err, setErr] = useState<string | null>(null);

  const usableScorers = (scorers.data?.scorer_versions ?? []).filter((s) => s.active && s.approved_at);
  const versionRows = versions.data?.versions ?? [];
  // Default to the newest version and, when there is only one, the only scorer.
  const versionId = pickedVersionId || versionRows[0]?.id || "";
  const scorerId = pickedScorerId || (usableScorers.length === 1 ? usableScorers[0].id : "");
  const ceiling = Math.max(1, Number(settings.data?.settings.repeat_ceiling ?? 3) || 3);
  const price = Number(settings.data?.settings.price_per_call ?? NaN);
  const termsOn = settings.data?.settings.provider_terms_approved === "true";
  const chosen = versionRows.find((v) => v.id === versionId);
  const calls = chosen ? chosen.item_count * Number(repeats) : 0;

  // Default to the newest version / only scorer once loaded.

  const create = useMutation({
    mutationFn: () =>
      callResearch<{ run_id: string }>("fn_research_runs", "create_run", {
        dataset_version_id: versionId,
        scorer_version_id: scorerId,
        repeat_count: Number(repeats),
      }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["research", "runs"] });
      navigate(`/research-lab/runs/${d.run_id}`);
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4 — Start a scoring run</CardTitle>
        <CardDescription>
          The VettedAI scorer scores every answer in the version you pick. Use 2–3 repeats to measure consistency
          (same answer, scored again).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.data && !termsOn && (
          <Alert>
            <AlertTitle>Scoring isn't switched on yet</AlertTitle>
            <AlertDescription>Vetted has to approve the scorer for this study before runs can start.</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Dataset version</Label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger><SelectValue placeholder={versionRows.length ? "Choose" : "No locked versions yet"} /></SelectTrigger>
              <SelectContent>
                {versionRows.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version_number} {v.name ? `· ${v.name}` : ""} ({v.dataset_kind}, {v.item_count} answers)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Scorer</Label>
            <Select value={scorerId} onValueChange={setScorerId}>
              <SelectTrigger><SelectValue placeholder={usableScorers.length ? "Choose" : "None approved yet"} /></SelectTrigger>
              <SelectContent>
                {usableScorers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label ?? `Scorer v${s.version_number}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Repeats per answer</Label>
            <Select value={repeats} onValueChange={setRepeats}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: ceiling }, (_, i) => String(i + 1)).map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {chosen && (
          <p className="text-sm text-muted-foreground">
            {calls} scoring calls
            {Number.isFinite(price) ? ` · estimated cost $${(calls * price).toFixed(2)} (counts against the study budget)` : ""}.
          </p>
        )}
        {err && (
          <Alert variant="destructive">
            <AlertTitle>Run not started</AlertTitle>
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}
        <Button disabled={!versionId || !scorerId || create.isPending} onClick={() => { setErr(null); create.mutate(); }}>
          {create.isPending ? "Starting…" : "Start run"}
        </Button>
      </CardContent>
    </Card>
  );
}
