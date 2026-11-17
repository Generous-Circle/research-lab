import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhoAmI } from "@/lib/researchApi";

const STEPS: { title: string; body: string; tab: string; cta: string }[] = [
  {
    title: "Prepare two CSV files",
    body:
      "An answers file (one row per transcript answer) and a ratings file (one row per human rating, 0–5). Download the templates on the Data tab. Use opaque labels like C001 or R2 — never names, emails or IDs.",
    tab: "data",
    cta: "Get the templates",
  },
  {
    title: "Upload and check",
    body:
      "Upload each file. We check every row first and flag anything that looks like personal data. Nothing is stored until you press Submit.",
    tab: "data",
    cta: "Upload data",
  },
  {
    title: "Admin approves and locks a dataset version",
    body:
      "The study Admin reviews flagged rows, approves the upload, then locks a numbered dataset version. A locked version never changes, so every result can be reproduced.",
    tab: "data",
    cta: "See dataset versions",
  },
  {
    title: "Run the VettedAI scorer",
    body:
      "Pick a locked dataset version and how many times to score each answer (repeats). Repeats measure how consistent the scorer is. Runs take a few minutes.",
    tab: "runs",
    cta: "Start a run",
  },
  {
    title: "Read the results and export",
    body:
      "Open a finished run to see human–AI agreement, scorer consistency and paired differences, each with its sample size and a 95% confidence range. Export everything as CSV or JSON for your own analysis.",
    tab: "runs",
    cta: "See runs",
  },
];

export function StartHereTab({ who, goTo }: { who: WhoAmI; goTo: (tab: string) => void }) {
  return (
    <div className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>What this is</CardTitle>
          <CardDescription>
            A private workspace for testing how well VettedAI's answer scoring agrees with human raters, and how
            consistent it is. You bring rated transcripts; the Lab scores them with the real VettedAI scorer and
            computes the comparison for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            What you will <strong>not</strong> see: the scorer's prompts, model settings or question bank. Those stay
            with VettedAI. You will see every score, a short explanation, and all the numbers behind the metrics.
          </p>
          <p>There is no overall pass/fail. The Lab describes; your framework decides.</p>
        </CardContent>
      </Card>

      <ol className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{s.body}</p>
                <Button variant="outline" size="sm" onClick={() => goTo(s.tab)}>
                  {s.cta}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prefer code?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Everything here is also available from Python or a Jupyter notebook with a personal API token, including
            a metrics package you can run locally.
          </p>
          <Button variant="outline" size="sm" onClick={() => goTo("api")}>
            API &amp; notebook guide
          </Button>
        </CardContent>
      </Card>

      {who.role === "viewer" && (
        <p className="text-sm text-muted-foreground">
          You have Viewer access, so you can read and export results but not upload or run. Ask the Admin if you need
          more.
        </p>
      )}
    </div>
  );
}
