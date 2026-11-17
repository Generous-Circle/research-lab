import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ANSWERS_TEMPLATE,
  callResearch,
  DIMENSIONS,
  downloadText,
  friendlyError,
  RATINGS_TEMPLATE,
  type WhoAmI, can } from "@/lib/researchApi";
import { useVersions, type DatasetKind, type VersionRow } from "../useResearchLab";
import { buildRatingExports, type RatingPackItem } from "./ratingExports";

type ImportKind = "answers" | "ratings";

interface DryRun {
  ok: boolean;
  kind: ImportKind;
  row_count: number;
  errors: { line: number; error: string }[];
  flags: { answer_ref: string; row_index: number; field: string; rule: string; detail?: string }[];
}

interface ImportRow {
  id: string;
  kind: ImportKind;
  dataset_kind: DatasetKind;
  status: string;
  flagged: boolean;
  row_count: number;
  flag_count: number;
  created_at: string;
  reviewed_at: string | null;
}


const DATASET_KIND_COPY: Record<DatasetKind, string> = {
  historical: "Standard — transcripts scored as they are",
  paired: "Paired — A/B versions of the same answer with one thing changed",
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

export function DataTab({ who }: { who: WhoAmI }) {
  const canImport = can(who, "import");
  const canReview = can(who, "review");
  const canExport = can(who, "export");
  const versions = useVersions();
  const cmuVersion = versions.data?.versions.find((version) => version.has_question_materials);
  return (
    <div className="space-y-6 pt-4">
      {cmuVersion && (
        <CmuRatingGuide
          itemCount={cmuVersion.item_count}
          ratedAnswerCount={cmuVersion.rated_answer_count ?? 0}
        />
      )}
      <VersionsCard canReview={canReview} canExport={canExport} cmuOnly={Boolean(cmuVersion)} />
      {canImport ? <UploadCard ratingsOnly={Boolean(cmuVersion)} /> : null}
      <UploadsCard canReview={canReview} />
      {!cmuVersion && <TemplatesCard />}
    </div>
  );
}

function CmuRatingGuide({ itemCount, ratedAnswerCount }: { itemCount: number; ratedAnswerCount: number }) {
  return (
    <Alert>
      <AlertTitle>CMU Team 1 data is ready to rate</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          The Lab has {itemCount.toLocaleString()} answers. Download the rating file below. Each answer includes its
          interview question, scoring rubric, and reference answer.
        </p>
        <p>
          The rating file does not show VettedAI's score. Rate each answer from 0 to 5, then upload the ratings file.
          The AI score file unlocks after an Admin approves ratings for all {itemCount.toLocaleString()} answers and
          locks a new version. This version has ratings for {ratedAnswerCount.toLocaleString()} answers.
        </p>
        <p>
          Do not open <strong>Runs &amp; results</strong> until your team has finished rating. That page shows VettedAI's
          scores.
        </p>
        <p>Upload your completed ratings file only. Do not upload another answers file.</p>
      </AlertDescription>
    </Alert>
  );
}

function TemplatesCard() {
  const cards = useQuery({
    queryKey: ["research", "question_cards"],
    queryFn: () =>
      callResearch<{ cards: { key: string; dimension_key: string; label: string | null; active: boolean }[] }>(
        "fn_research_datasets",
        "list_question_cards",
      ),
  });
  const active = (cards.data?.cards ?? []).filter((c) => c.active);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 — Prepare your files</CardTitle>
        <CardDescription>
          Two CSV files. Start from a template, keep the header row, and use opaque labels (letters, digits, <code>_ . : -</code>,
          up to 64 characters). Names, emails, long numbers and UUIDs are rejected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadText("answers-template.csv", ANSWERS_TEMPLATE)}>
            Download answers template
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadText("ratings-template.csv", RATINGS_TEMPLATE)}>
            Download ratings template
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-medium">Answers file — required columns</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              <li><code>candidate_ref</code> — your label for the person, e.g. C001</li>
              <li><code>answer_ref</code> — unique label for this answer, e.g. C001-Q1</li>
              <li><code>question_card_key</code> — one of the question cards below</li>
              <li><code>dimension_key</code> — the skill being scored (list below)</li>
              <li><code>transcript_text</code> — the answer, as text</li>
              <li><code>data_origin</code> — where it came from, e.g. synthetic</li>
            </ul>
            <p className="text-muted-foreground mt-1">
              Optional: <code>role_key</code>; for paired sets <code>pair_id</code>, <code>pair_side</code> (A/B),{" "}
              <code>varied_dimension</code>, <code>expected_score_direction</code>; <code>production_score</code> — the
              score VettedAI's live scorer originally gave this answer (0 to 5), shown next to Lab scores and in exports.
            </p>
          </div>
          <div>
            <p className="font-medium">Ratings file — required columns</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
              <li><code>answer_ref</code> — must match a row in an answers file</li>
              <li><code>rater_ref</code> — your label for the rater, e.g. R1</li>
              <li><code>score</code> — a number from 0 to 5</li>
            </ul>
            <p className="text-muted-foreground mt-1">One row per rater per answer. Several raters per answer is good.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-medium">Dimension keys</p>
            <p className="text-muted-foreground">
              {DIMENSIONS.map((d) => (
                <span key={d.key} className="inline-block mr-3">
                  <code>{d.key}</code>
                </span>
              ))}
            </p>
          </div>
          <div>
            <p className="font-medium">Question cards</p>
            {cards.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : active.length === 0 ? (
              <p className="text-muted-foreground">None set up yet — ask the study Admin.</p>
            ) : (
              <details className="text-muted-foreground">
                <summary className="cursor-pointer">Show {active.length} question cards</summary>
                <ul className="mt-2">
                  {active.map((c) => (
                    <li key={c.key}>
                      <code>{c.key}</code> — {c.label ?? c.dimension_key}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadCard({ ratingsOnly = false }: { ratingsOnly?: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [kind, setKind] = useState<ImportKind>(ratingsOnly ? "ratings" : "answers");
  const [datasetKind, setDatasetKind] = useState<DatasetKind>("historical");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string>("");
  const [check, setCheck] = useState<DryRun | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setCheck(null);
    setErr(null);
  };

  const dryRun = useMutation({
    mutationFn: () => callResearch<DryRun>("fn_research_datasets", "dry_run", { kind, csv }),
    onSuccess: (d) => {
      setCheck(d);
      setErr(null);
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  const submit = useMutation({
    mutationFn: () =>
      callResearch<{ import_id: string; row_count: number; flag_count: number }>("fn_research_datasets", "submit", {
        kind,
        dataset_kind: datasetKind,
        csv,
      }),
    onSuccess: (d) => {
      toast({
        title: "Upload submitted",
        description: `${d.row_count} rows sent for Admin review${d.flag_count ? `, ${d.flag_count} flagged` : ""}.`,
      });
      setCsv("");
      setFileName(null);
      reset();
      qc.invalidateQueries({ queryKey: ["research", "imports"] });
    },
    onError: (e) => setErr(friendlyError(e)),
  });

  const onFile = async (f: File | undefined) => {
    reset();
    if (!f) return;
    setFileName(f.name);
    setCsv(await f.text());
  };

  const canSubmit = check && check.errors.length === 0 && check.row_count > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 — Upload and check</CardTitle>
        <CardDescription>
          {ratingsOnly ? (
            <>Upload your completed ratings file. The CMU answers are already in the Lab. Press <strong>Check file</strong> first, then <strong>Submit for review</strong>.</>
          ) : (
            <>Upload answers first, then ratings. Press <strong>Check file</strong> to validate every row — nothing is saved. Then <strong>Submit for review</strong>.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>File type</Label>
            <Select value={kind} onValueChange={(v) => { setKind(v as ImportKind); reset(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {!ratingsOnly && <SelectItem value="answers">Answers (transcripts)</SelectItem>}
                <SelectItem value="ratings">Ratings (human scores)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Dataset type</Label>
            <Select value={datasetKind} onValueChange={(v) => { setDatasetKind(v as DatasetKind); reset(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="historical">{DATASET_KIND_COPY.historical}</SelectItem>
                <SelectItem value="paired">{DATASET_KIND_COPY.paired}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="research-csv">CSV file</Label>
            <Input id="research-csv" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!csv || dryRun.isPending} onClick={() => dryRun.mutate()}>
            {dryRun.isPending ? "Checking…" : "Check file"}
          </Button>
          <Button disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>

        {err && (
          <Alert variant="destructive">
            <AlertTitle>That didn't work</AlertTitle>
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        {check && (
          <div className="space-y-3">
            {check.errors.length === 0 ? (
              <Alert>
                <AlertTitle>{check.row_count} rows look good</AlertTitle>
                <AlertDescription>
                  {check.flags.length === 0
                    ? "No personal data detected. You can submit."
                    : `${check.flags.length} possible personal-data matches are flagged below. You can still submit; the Admin will redact them before approval.`}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>{check.errors.length} problems to fix before you can submit</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-1 max-h-48 overflow-auto">
                    {check.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>Line {e.line}: {e.error}</li>
                    ))}
                  </ul>
                  {check.errors.length > 50 && <p>…and {check.errors.length - 50} more.</p>}
                </AlertDescription>
              </Alert>
            )}
            {check.flags.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Answer</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Looks like</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {check.flags.slice(0, 50).map((f, i) => (
                    <TableRow key={i}>
                      <TableCell><code>{f.answer_ref}</code></TableCell>
                      <TableCell>{f.field}</TableCell>
                      <TableCell>{f.rule.replace(/_/g, " ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function statusBadge(status: string) {
  const v: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    approved: "default",
    awaiting_review: "secondary",
    rejected: "destructive",
  };
  return <Badge variant={v[status] ?? "outline"}>{status.replace(/_/g, " ")}</Badge>;
}

function UploadsCard({ canReview }: { canReview: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [redact, setRedact] = useState<Record<string, boolean>>({});
  const imports = useQuery({
    queryKey: ["research", "imports"],
    queryFn: () => callResearch<{ imports: ImportRow[] }>("fn_research_datasets", "list_imports"),
  });
  const review = useMutation({
    mutationFn: (v: { import_id: string; decision: "approve" | "reject"; redact?: boolean }) =>
      callResearch("fn_research_datasets", "review", v),
    onSuccess: (_d, v) => {
      toast({ title: v.decision === "approve" ? "Upload approved" : "Upload rejected" });
      qc.invalidateQueries({ queryKey: ["research", "imports"] });
    },
    onError: (e) => toast({ title: "Review failed", description: friendlyError(e), variant: "destructive" }),
  });

  const rows = imports.data?.imports ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploads</CardTitle>
        <CardDescription>
          {canReview
            ? "Approve or reject each upload. Uploads with flagged rows must be approved with redaction on: flagged text is replaced with [REDACTED]."
            : "Each upload waits here until the study Admin approves it."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {imports.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : imports.error ? (
          <p className="text-sm text-destructive">{friendlyError(imports.error)}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uploaded</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Flags</TableHead>
                <TableHead>Status</TableHead>
                {canReview && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmt(r.created_at)}</TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>{r.dataset_kind}</TableCell>
                  <TableCell className="text-right">{r.row_count}</TableCell>
                  <TableCell className="text-right">{r.flag_count}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  {canReview && (
                    <TableCell>
                      {r.status === "awaiting_review" && (
                        <div className="flex items-center gap-2 justify-end">
                          {r.flag_count > 0 && (
                            <label className="flex items-center gap-1 text-xs">
                              <Checkbox
                                checked={redact[r.id] ?? true}
                                onCheckedChange={(c) => setRedact({ ...redact, [r.id]: c === true })}
                              />
                              Redact
                            </label>
                          )}
                          <Button
                            size="sm"
                            disabled={review.isPending}
                            onClick={() =>
                              review.mutate({
                                import_id: r.id,
                                decision: "approve",
                                redact: r.flag_count > 0 ? (redact[r.id] ?? true) : undefined,
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={review.isPending}
                            onClick={() => review.mutate({ import_id: r.id, decision: "reject" })}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function VersionsCard({ canReview, canExport, cmuOnly }: { canReview: boolean; canExport: boolean; cmuOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const versions = useVersions();
  const [name, setName] = useState("");
  const [dk, setDk] = useState<DatasetKind>("historical");
  const freeze = useMutation({
    mutationFn: () =>
      callResearch<{ existing: boolean; version: VersionRow }>("fn_research_datasets", "freeze", {
        dataset_kind: dk,
        name: name.trim() || undefined,
      }),
    onSuccess: (d) => {
      toast({
        title: d.existing ? "Nothing new to lock" : `Locked version ${d.version.version_number}`,
        description: d.existing
          ? `Version ${d.version.version_number} already has all approved uploads.`
          : `${d.version.item_count} answers.`,
      });
      setName("");
      qc.invalidateQueries({ queryKey: ["research", "versions"] });
    },
    onError: (e) => toast({ title: "Couldn't lock a version", description: friendlyError(e), variant: "destructive" }),
  });

  const downloadRatingFile = useMutation({
    mutationFn: ({ version }: { version: VersionRow; kind: "answers" | "ratings" }) =>
      callResearch<{ ok: boolean; items: RatingPackItem[] }>("fn_research_datasets", "export", {
        version_id: version.id,
      }),
    onSuccess: (result, { version, kind }) => {
      if (!result.ok || !Array.isArray(result.items)) {
        toast({ title: "Couldn't download this dataset", description: "The locked version could not be read. Contact the study Admin.", variant: "destructive" });
        return;
      }
      const files = buildRatingExports(result.items);
      const stem = (version.name ?? `dataset-v${version.version_number}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const suffix = kind === "answers" ? "rating-pack" : "blank-ratings";
      downloadText(`${stem}-${suffix}.csv`, files[kind]);
      toast({ title: kind === "answers" ? "Rating pack downloaded" : "Ratings sheet downloaded" });
    },
    onError: (e) => toast({ title: "Couldn't download this dataset", description: friendlyError(e), variant: "destructive" }),
  });

  const downloadProductionScores = useMutation({
    mutationFn: (version: VersionRow) =>
      callResearch<{ ok: boolean; items: RatingPackItem[] }>("fn_research_datasets", "export_production_scores", {
        version_id: version.id,
      }),
    onSuccess: (result, version) => {
      if (!result.ok || !Array.isArray(result.items)) {
        toast({
          title: "AI scores are not ready",
          description: `Rate all ${version.item_count.toLocaleString()} answers first.`,
          variant: "destructive",
        });
        return;
      }
      const stem = (version.name ?? `dataset-v${version.version_number}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      downloadText(`${stem}-production-ai-scores.csv`, buildRatingExports(result.items).productionScores);
      toast({ title: "AI scores downloaded", description: "Match scores to answers with answer_ref." });
    },
    onError: (e) => toast({ title: "AI scores are not ready", description: friendlyError(e), variant: "destructive" }),
  });

  const allRows = versions.data?.versions ?? [];
  const rows = cmuOnly ? allRows.filter((version) => version.has_question_materials) : allRows;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Locked dataset versions</CardTitle>
        <CardDescription>
          {cmuOnly
            ? "Download the rating pack and matching ratings sheet. Unlock AI scores after human ratings are approved and saved."
            : "Choose a version to download its answers or a matching ratings sheet. Locked versions cannot be changed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canReview && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Dataset type</Label>
              <Select value={dk} onValueChange={(v) => setDk(v as DatasetKind)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">Standard</SelectItem>
                  <SelectItem value="paired">Paired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version-name">Name (optional)</Label>
              <Input id="version-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pilot batch 1" className="w-56" />
            </div>
            <Button disabled={freeze.isPending} onClick={() => freeze.mutate()}>
              {freeze.isPending ? "Locking…" : "Lock new version"}
            </Button>
          </div>
        )}
        {versions.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No locked versions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Answers</TableHead>
                <TableHead>Locked</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>v{v.version_number}</TableCell>
                  <TableCell>{v.name ?? "—"}</TableCell>
                  <TableCell>{v.dataset_kind}</TableCell>
                  <TableCell className="text-right">{v.item_count}</TableCell>
                  <TableCell>{fmt(v.frozen_at)}</TableCell>
                  <TableCell>
                    {canExport ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadRatingFile.isPending}
                          onClick={() => downloadRatingFile.mutate({ version: v, kind: "answers" })}
                        >
                          {downloadRatingFile.isPending ? "Preparing…" : "Rating pack"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadRatingFile.isPending}
                          onClick={() => downloadRatingFile.mutate({ version: v, kind: "ratings" })}
                        >
                          {downloadRatingFile.isPending ? "Preparing…" : "Blank ratings sheet"}
                        </Button>
                        {v.has_question_materials && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadProductionScores.isPending || (v.rated_answer_count ?? 0) < v.item_count}
                            onClick={() => downloadProductionScores.mutate(v)}
                          >
                            {downloadProductionScores.isPending
                              ? "Preparing…"
                              : `AI scores (${(v.rated_answer_count ?? 0).toLocaleString()}/${v.item_count} rated)`}
                          </Button>
                        )}
                      </div>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
