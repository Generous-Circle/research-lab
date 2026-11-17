import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ResearchLab from "@/lab/ResearchLab";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/toaster";

function SignIn() {
  const { signIn } = useAuth();
  const [value, setValue] = useState("");
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Research Lab</CardTitle>
          <CardDescription>
            Paste the access token your study Admin gave you. It starts with <code>crt_</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Access token</Label>
            <Input
              id="token"
              type="password"
              autoComplete="off"
              placeholder="crt_…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim()) signIn(value);
              }}
            />
          </div>
          <Button className="w-full" disabled={!value.trim()} onClick={() => signIn(value)}>
            Enter the Lab
          </Button>
          <p className="text-xs text-muted-foreground">
            Don't have one? Ask the study Admin to add you under Admin → API access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const { token } = useAuth();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/research-lab" replace />} />
        <Route
          path="/research-lab"
          element={token ? <ResearchLab /> : <SignIn />}
        />
        <Route
          path="/research-lab/runs/:runId"
          element={token ? <ResearchLab /> : <SignIn />}
        />
        <Route path="*" element={<Navigate to="/research-lab" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
