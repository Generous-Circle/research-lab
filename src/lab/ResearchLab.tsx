import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/useAuth";
import { friendlyError, ResearchApiError, can } from "@/lib/researchApi";
import { useWhoAmI } from "./useResearchLab";
import { StartHereTab } from "./components/StartHereTab";
import { DataTab } from "./components/DataTab";
import { RunsTab } from "./components/RunsTab";
import { RunDetail } from "./components/RunDetail";
import { ModelCheck } from "./modelCheck/ModelCheck";
import { ApiAccessTab } from "./components/ApiAccessTab";
import { AdminTab } from "./components/AdminTab";

// Identity is a personal research token (not a Vetted account); access is the
// study allowlist, checked server-side by fn_research_access/whoami.

const ROLE_COPY: Record<string, string> = {
  admin: "Admin: you can approve data, run scoring and manage the team.",
  researcher: "Researcher: you can upload data, run scoring and export results.",
  viewer: "Viewer: you can read and export results.",
};

export default function ResearchLab() {
  const { user, signOut } = useAuth();
  const { runId, metric } = useParams<{ runId?: string; metric?: string }>();
  const inCheck = useLocation().pathname.includes("/check");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "start";
  const who = useWhoAmI();

  const setTab = (t: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/research-lab" className="flex items-center gap-3 min-w-0" aria-label="Research Lab home">
            <span className="font-semibold text-base whitespace-nowrap text-primary">VettedAI</span>
            <span className="h-6 w-px bg-border shrink-0" aria-hidden="true" />
            <span className="font-semibold text-base whitespace-nowrap">Research Lab</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground min-w-0">
            <span className="hidden md:inline truncate max-w-[220px]">{user?.email}</span>
            {who.data && (
              <Badge variant="secondary" className="capitalize">
                {who.data.kind === "vetted_staff" ? "Vetted staff" : who.data.role}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {who.isLoading && <Skeleton className="h-40 w-full" />}

        {who.error && <NoAccess error={who.error} email={user?.email ?? null} userId={user?.id ?? null} />}

        {who.data && runId && !inCheck && <RunDetail runId={runId} who={who.data} />}

        {who.data && runId && inCheck && <ModelCheck runId={runId} metric={metric} />}

        {who.data && !runId && (
          <>
            <div>
              <h1 className="text-2xl font-semibold">Scoring evaluation workspace</h1>
              <p className="text-muted-foreground mt-1">{ROLE_COPY[who.data.role]}</p>
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="start">1. Start here</TabsTrigger>
                <TabsTrigger value="data">2. Data</TabsTrigger>
                <TabsTrigger value="runs">3. Runs &amp; results</TabsTrigger>
                <TabsTrigger value="api">API &amp; notebook</TabsTrigger>
                {can(who.data, "manage_members") && (
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="start">
                <StartHereTab who={who.data} goTo={setTab} />
              </TabsContent>
              <TabsContent value="data">
                <DataTab who={who.data} />
              </TabsContent>
              <TabsContent value="runs">
                <RunsTab who={who.data} />
              </TabsContent>
              <TabsContent value="api">
                <ApiAccessTab who={who.data} />
              </TabsContent>
              {can(who.data, "manage_members") && (
                <TabsContent value="admin">
                  <AdminTab />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function NoAccess({ error, email, userId }: { error: unknown; email: string | null; userId: string | null }) {
  const denied = error instanceof ResearchApiError && (error.status === 403 || error.status === 401);
  return (
    <Alert>
      <AlertTitle>{denied ? "You're signed in, but not on the study team yet" : "Something went wrong"}</AlertTitle>
      <AlertDescription className="space-y-2">
        {denied ? (
          <>
            <p>
              The Research Lab is only open to people the study Admin has added. Send the Admin the email you
              signed in with{email ? <> (<strong>{email}</strong>)</> : null} and your Account ID below, and ask them
              to add you. Then reload this page.
            </p>
            {userId && (
              <p>
                Account ID: <code className="select-all bg-muted px-1.5 py-0.5 rounded">{userId}</code>
              </p>
            )}
          </>
        ) : (
          <p>{friendlyError(error)}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
