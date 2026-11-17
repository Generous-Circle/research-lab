import { useQuery } from "@tanstack/react-query";
import { callResearch, type WhoAmI } from "@/lib/researchApi";

// Fizzy #4815 — shared Research Lab queries and types.

export type DatasetKind = "historical" | "paired";

export interface VersionRow {
  id: string;
  dataset_kind: DatasetKind;
  version_number: number;
  name: string | null;
  content_hash: string;
  item_count: number;
  rated_answer_count?: number;
  has_question_materials?: boolean;
  frozen_at: string;
  retention_delete_after: string | null;
}

export interface RunRow {
  id: string;
  status: string;
  repeat_count: number;
  answer_count: number;
  projected_calls: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  dataset_version_id: string;
  dataset_kind: string;
  dataset_version_number: number;
  dataset_name: string | null;
  scorer_label: string | null;
  scorer_version_number: number;
  completed_count: number;
}

export const ACTIVE_RUN_STATUSES = new Set(["pending", "queued", "running"]);

export function useWhoAmI() {
  return useQuery({
    queryKey: ["research", "whoami"],
    queryFn: () => callResearch<WhoAmI>("fn_research_access", "whoami"),
    retry: false,
  });
}

export function useVersions() {
  return useQuery({
    queryKey: ["research", "versions"],
    queryFn: () => callResearch<{ versions: VersionRow[] }>("fn_research_datasets", "list_versions"),
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["research", "runs"],
    queryFn: () => callResearch<{ runs: RunRow[] }>("fn_research_runs", "list_runs"),
    refetchInterval: (q) => ((q.state.data?.runs ?? []).some((r) => ACTIVE_RUN_STATUSES.has(r.status)) ? 5000 : false),
  });
}
