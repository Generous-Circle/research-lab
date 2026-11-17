import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { callResearch, friendlyError, type WhoAmI } from "@/lib/researchApi";

interface TokenRow {
  id: string;
  token_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL ?? "https://<project>.supabase.co"}/functions/v1`;

function Code({ children }: { children: string }) {
  const { toast } = useToast();
  return (
    <div className="relative">
      <pre className="bg-muted rounded-md p-3 text-xs overflow-auto whitespace-pre">{children}</pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-1 right-1 h-7"
        onClick={() => {
          navigator.clipboard.writeText(children);
          toast({ title: "Copied" });
        }}
      >
        Copy
      </Button>
    </div>
  );
}

export function ApiAccessTab({ who }: { who: WhoAmI }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const canMint = who.member_id !== null;

  const tokens = useQuery({
    queryKey: ["research", "tokens"],
    queryFn: () => callResearch<{ tokens: TokenRow[] }>("fn_research_access", "list_tokens"),
    enabled: canMint,
  });
  const issue = useMutation({
    mutationFn: () => callResearch<{ token: string }>("fn_research_access", "issue_token", { label: label.trim() || undefined }),
    onSuccess: (d) => {
      setFresh(d.token);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["research", "tokens"] });
    },
    onError: (e) => toast({ title: "Couldn't create a token", description: friendlyError(e), variant: "destructive" }),
  });
  const revoke = useMutation({
    mutationFn: (token_id: string) => callResearch("fn_research_access", "revoke_token", { token_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research", "tokens"] }),
    onError: (e) => toast({ title: "Couldn't revoke", description: friendlyError(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Your API tokens</CardTitle>
          <CardDescription>
            A personal token lets your scripts and notebooks act as you, with your role. Treat it like a password: don't
            commit it to git or paste it in shared docs. Revoke it if it leaks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canMint ? (
            <p className="text-sm text-muted-foreground">
              You're signed in as Vetted staff, not as a study member, so you can't create a personal token here.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="token-label">Label</Label>
                  <Input id="token-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. my laptop notebook" className="w-64" />
                </div>
                <Button disabled={issue.isPending} onClick={() => issue.mutate()}>
                  Create token
                </Button>
              </div>
              {fresh && (
                <Alert>
                  <AlertTitle>Copy this now — it won't be shown again</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <Code>{fresh}</Code>
                    <Button size="sm" variant="outline" onClick={() => setFresh(null)}>
                      I've saved it
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {(tokens.data?.tokens ?? []).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.data!.tokens.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell><code>{t.token_prefix}…</code></TableCell>
                        <TableCell>{t.label ?? "—"}</TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "never"}</TableCell>
                        <TableCell className="text-right">
                          {t.revoked_at ? (
                            <span className="text-xs text-muted-foreground">revoked</span>
                          ) : (
                            <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(t.id)}>
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Using the API from Python</CardTitle>
          <CardDescription>
            Everything in this Lab is one HTTP call: <code>POST</code> a JSON body <code>{"{"}"action": …{"}"}</code> to a
            function, with your token as a Bearer header. Same permissions as the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="font-medium">1. Set your token as an environment variable (never in the notebook itself)</p>
          <Code>{`export RESEARCH_TOKEN="crt_..."   # paste your token
export RESEARCH_API="${FUNCTIONS_URL}"`}</Code>

          <p className="font-medium">2. A tiny client</p>
          <Code>{`import os, requests

API = os.environ["RESEARCH_API"]
HEADERS = {"Authorization": f"Bearer {os.environ['RESEARCH_TOKEN']}"}

def call(fn, action, **fields):
    r = requests.post(f"{API}/{fn}", json={"action": action, **fields}, headers=HEADERS, timeout=60)
    body = r.json()
    if not r.ok:
        raise RuntimeError(f"{r.status_code}: {body.get('error')} {body.get('details') or ''}")
    return body

call("fn_research_access", "whoami")   # your role and capabilities`}</Code>

          <p className="font-medium">3. Upload, check and submit a CSV</p>
          <Code>{`csv = open("answers.csv").read()
check = call("fn_research_datasets", "dry_run", kind="answers", csv=csv)
print(check["row_count"], check["errors"][:5], check["flags"][:5])
if not check["errors"]:
    call("fn_research_datasets", "submit", kind="answers", dataset_kind="historical", csv=csv)
# then the same for ratings.csv with kind="ratings"`}</Code>

          <p className="font-medium">4. Start a run on a locked version and wait for it</p>
          <Code>{`import time
version = call("fn_research_datasets", "list_versions")["versions"][0]
scorer  = [s for s in call("fn_research_runs", "list_scorer_versions")["scorer_versions"] if s["active"]][0]
run = call("fn_research_runs", "create_run",
           dataset_version_id=version["id"], scorer_version_id=scorer["id"], repeat_count=3)
print("projected calls:", run["projected_calls"], "cost:", run["projected_cost"])

while call("fn_research_runs", "run_status", run_id=run["run_id"])["run"]["status"] in ("pending", "queued", "running"):
    time.sleep(10)`}</Code>

          <p className="font-medium">5. Get metrics, or the full item-level export into pandas</p>
          <Code>{`import pandas as pd
report = call("fn_research_metrics", "metrics", run_id=run["run_id"])["report"]
report["metrics"]["human_ai"]          # MAE, bias, Spearman, QWK, exact / within-one, each with n and CI

export = call("fn_research_metrics", "export", run_id=run["run_id"])
df = pd.DataFrame(export["items"])     # one row per answer x repeat: transcript, human ratings + median, AI score
# compare two runs on the same dataset: add compare_run_id="<other run id>"`}</Code>

          <p className="font-medium">6. Reproduce the metrics yourself</p>
          <p className="text-muted-foreground">
            The metrics come from a small, dependency-free Python package (<code>research_metrics</code>, pinned version
            in every report as <code>package_version</code>). Vetted can share the package and a starter notebook that
            recomputes every number from the export, so you can check our maths or add your own metrics.
          </p>

          <p className="font-medium">Actions reference</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><code>fn_research_access</code></TableCell>
                <TableCell><code>whoami</code>, <code>issue_token</code>, <code>list_tokens</code>, <code>revoke_token</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><code>fn_research_datasets</code></TableCell>
                <TableCell><code>list_question_cards</code>, <code>dry_run</code>, <code>submit</code>, <code>list_imports</code>, <code>list_versions</code>, <code>export</code> (version_id)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><code>fn_research_runs</code></TableCell>
                <TableCell><code>run_settings</code>, <code>list_scorer_versions</code>, <code>create_run</code>, <code>list_runs</code>, <code>run_status</code>, <code>run_results</code>, <code>cancel_run</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><code>fn_research_metrics</code></TableCell>
                <TableCell><code>metrics</code>, <code>export</code> (run_id, optional compare_run_id)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-muted-foreground">
            Roles: Viewer can read and export. Researcher can also upload and run. Admin can also approve uploads, lock
            versions and manage the team. Errors come back as <code>{"{"}"error", "code", "details"{"}"}</code> with an HTTP
            status (400 = fix your input, 401 = bad or revoked token, 403 = your role can't do that).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
