import { Badge } from "@/components/ui/badge";

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  queued: "secondary",
  pending: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

export function RunStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "outline"}>{status}</Badge>;
}
