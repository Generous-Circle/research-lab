import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { callResearch, friendlyError, type ResearchRole } from "@/lib/researchApi";

interface Member {
  id: string;
  user_id: string | null;
  email: string | null;
  role: ResearchRole;
  status: string;
  created_at: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ResearchRole>("researcher");

  const members = useQuery({
    queryKey: ["research", "members"],
    queryFn: () => callResearch<{ members: Member[] }>("fn_research_access", "list_members"),
  });
  const upsert = useMutation({
    mutationFn: (v: Record<string, unknown>) => callResearch("fn_research_access", "upsert_member", v),
    onSuccess: () => {
      toast({ title: "Team updated" });
      setEmail("");
      setUserId("");
      qc.invalidateQueries({ queryKey: ["research", "members"] });
    },
    onError: (e) => toast({ title: "Couldn't save", description: friendlyError(e), variant: "destructive" }),
  });

  const validId = UUID_RE.test(userId.trim());

  return (
    <div className="space-y-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Add someone to the study</CardTitle>
          <CardDescription>
            Access is tied to a Vetted account, not just an email. Ask the person to open the Research Lab link and
            sign up or sign in. They'll see an <strong>Account ID</strong> on the "not on the study team yet" screen.
            Paste it here with their email. Only add an ID they sent you directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="m-email">Email</Label>
            <Input id="m-email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-64" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-uid">Account ID</Label>
            <Input id="m-uid" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-80 font-mono text-xs" placeholder="xxxxxxxx-xxxx-…" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ResearchRole)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="researcher">Researcher</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!validId || !email.trim() || upsert.isPending}
            onClick={() => upsert.mutate({ user_id: userId.trim(), email: email.trim(), role, status: "active" })}
          >
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study team</CardTitle>
          <CardDescription>Remove access by deactivating someone. Their tokens stop working at once.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : members.error ? (
            <p className="text-sm text-destructive">{friendlyError(members.error)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked account</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members.data?.members ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) => upsert.mutate({ member_id: m.id, role: v, status: m.status })}
                      >
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="researcher">Researcher</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge>
                    </TableCell>
                    <TableCell>{m.user_id ? "yes" : <span className="text-muted-foreground">not yet</span>}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={upsert.isPending}
                        onClick={() =>
                          upsert.mutate({ member_id: m.id, role: m.role, status: m.status === "active" ? "disabled" : "active" })
                        }
                      >
                        {m.status === "active" ? "Deactivate" : "Reactivate"}
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
