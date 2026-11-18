import { TableCell, TableHead } from "@/components/ui/table";
import { analyse, VERDICT_TEXT } from "./rules";
import { getModelCheckSource, MOCK_ENABLED } from "./source";
import { StatusPill } from "./ui";

/** "Model check" column for the Runs list. Renders nothing when the check has no data source. */
export function ModelCheckHead() {
  return MOCK_ENABLED ? <TableHead data-model-check-new>Model check</TableHead> : null;
}

export function ModelCheckCell({ runId, completed }: { runId: string; completed: boolean }) {
  if (!MOCK_ENABLED) return null;
  const src = completed ? getModelCheckSource(runId) : null;
  if (!src || src.state !== "ready") return <TableCell data-model-check-new className="text-muted-foreground">—</TableCell>;
  const v = analyse(src.input).verdict;
  return (
    <TableCell data-model-check-new>
      <span className="inline-flex items-center gap-2">
        <StatusPill status={v} />
        <span className="text-xs text-muted-foreground">{VERDICT_TEXT[v]}</span>
      </span>
    </TableCell>
  );
}
