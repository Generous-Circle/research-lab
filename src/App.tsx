import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ResearchLab from "@/lab/ResearchLab";
import { useAuth } from "@/auth/useAuth";
import { requestToken } from "@/lib/researchApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";

type Mode = "password" | "token" | "claim" | "sent";

function SignIn() {
  const { signIn, signInWithToken } = useAuth();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPassword = async () => {
    if (!email.trim() || !password) return;
    // The most predictable mistake: paste the emailed token into the password
    // box. Tokens start with crt_; route them to the token path instead.
    if (password.trim().startsWith("crt_")) {
      signInWithToken(password);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not sign in.";
      setError(
        /invalid login credentials/i.test(message)
          ? "That email and password did not match. If you were emailed an access token, use \"Use a token\" below."
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const submitClaim = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestToken(email);
      setMode("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the token.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Research Lab</CardTitle>
          <CardDescription>
            {mode === "password" && "Sign in with your study account."}
            {mode === "token" && "Paste a research access token. It starts with crt_."}
            {mode === "claim" && "We will email you an access token for this address."}
            {mode === "sent" && "Check your inbox."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "password" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitPassword();
                  }}
                />
              </div>
              <Button className="w-full" disabled={busy || !email.trim() || !password} onClick={() => void submitPassword()}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-between text-sm text-muted-foreground">
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => setMode("claim")}>
                  Forgot password?
                </button>
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => setMode("token")}>
                  Use a token
                </button>
              </div>
            </>
          )}

          {mode === "token" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="token">Access token</Label>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  placeholder="crt_…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && token.trim()) signInWithToken(token);
                  }}
                />
              </div>
              <Button className="w-full" disabled={!token.trim()} onClick={() => signInWithToken(token)}>
                Enter the Lab
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode("password")}
              >
                Back to sign in
              </button>
            </>
          )}

          {mode === "claim" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="claim-email">Email</Label>
                <Input
                  id="claim-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitClaim();
                  }}
                />
              </div>
              <Button className="w-full" disabled={busy || !email.trim()} onClick={() => void submitClaim()}>
                {busy ? "Sending…" : "Email me an access token"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode("password")}
              >
                Back to sign in
              </button>
            </>
          )}

          {mode === "sent" && (
            <>
              <p className="text-sm text-muted-foreground">
                If <strong>{email}</strong> is on a study team, the email is on its way. It stays valid until the study Admin revokes it.
              </p>
              <Button className="w-full" variant="outline" onClick={() => setMode("token")}>
                I have the token
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setMode("password")}
              >
                Back to sign in
              </button>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Signing in needs an account on the study project. No account? Ask the study Admin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const { signedIn, ready } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/research-lab" replace />} />
        <Route
          path="/research-lab"
          element={!ready ? null : signedIn ? <ResearchLab /> : <SignIn />}
        />
        <Route
          path="/research-lab/runs/:runId"
          element={!ready ? null : signedIn ? <ResearchLab /> : <SignIn />}
        />
        <Route
          path="/research-lab/runs/:runId/check"
          element={!ready ? null : signedIn ? <ResearchLab /> : <SignIn />}
        />
        <Route
          path="/research-lab/runs/:runId/check/:metric"
          element={!ready ? null : signedIn ? <ResearchLab /> : <SignIn />}
        />
        <Route path="*" element={<Navigate to="/research-lab" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
