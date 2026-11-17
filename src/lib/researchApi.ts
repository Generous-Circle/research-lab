import { supabaseAnonKey, supabaseUrl } from "./supabase";

// Thin client for the Research Lab edge functions.
// Every research function takes POST {action, ...fields}. The caller is
// resolved server-side from a personal research token (`crt_…`) sent as a
// bearer credential — see the `token` source in the functions' research-auth.

export type ResearchFn =
  | "fn_research_access"
  | "fn_research_datasets"
  | "fn_research_runs"
  | "fn_research_metrics";

export type ResearchRole = "admin" | "researcher" | "viewer";

export type ResearchCapability =
  | "read"
  | "export"
  | "import"
  | "run"
  | "manage_datasets"
  | "review"
  | "manage_members"
  | "manage_settings";

export interface WhoAmI {
  kind: "member" | "token" | "vetted_staff" | string;
  role: ResearchRole;
  source: string;
  member_id: string | null;
  user_id: string | null;
  email: string | null;
  // fn_research_access returns a boolean map, e.g. {read: true, run: false}.
  capabilities: Partial<Record<ResearchCapability, boolean>>;
}

export function can(who: Pick<WhoAmI, "capabilities"> | null | undefined, cap: ResearchCapability): boolean {
  return who?.capabilities?.[cap] === true;
}

export class ResearchApiError extends Error {
  status: number;
  code: string | null;
  details: unknown;
  constructor(message: string, status: number, code: string | null, details: unknown) {
    super(message);
    this.name = "ResearchApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function callResearch<T = Record<string, unknown>>(
  fn: ResearchFn,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const token = getResearchToken();
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });

  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    throw new ResearchApiError(
      String(body.error ?? body.message ?? `Request failed (${res.status})`),
      res.status,
      (body.code as string) ?? null,
      body.details ?? null,
    );
  }
  return body as T;
}

const TOKEN_KEY = "research_lab_token";

export function getResearchToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setResearchToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Human-readable explanations for the error codes researchers are most
// likely to hit. Falls back to the server message.
const FRIENDLY: Record<string, string> = {
  no_approved_imports: "There are no approved uploads for this dataset type yet. An Admin has to approve an upload first.",
  no_items: "The approved uploads contain no transcript rows.",
  orphan_ratings: "Some ratings point at an answer_ref that is not in any approved answers upload.",
  redaction_required: "This upload has possible personal data flagged. Approve with redaction switched on.",
  provider_terms_not_approved: "Scoring is not switched on yet. Ask Vetted to approve the scorer for this study.",
  spend_ceiling_exceeded: "This run would go over the study's spend limit. Use fewer repeats or a smaller dataset, or ask Vetted to raise the limit.",
  repeat_ceiling_exceeded: "That many repeats is above the study's limit.",
  spend_ceiling_not_configured: "Scoring is not switched on yet: the study has no spend limit set. Ask Vetted.",
  question_mapping_missing: "One of the question cards in this dataset is not connected to the scorer yet. Ask Vetted.",
  unknown_question_card: "A question_card_key in this dataset is not on the list of question cards.",
  scorer_version_not_approved: "That scorer version is not approved for the study.",
  dataset_empty: "That dataset version has no transcripts.",
  dataset_not_usable: "That dataset version can't be used (it may have passed its retention date).",
  retention_expired: "This data has passed the study's retention date and has been deleted.",
  metrics_service_not_configured: "The metrics service is not switched on yet. Scores are still available below.",
  ratings_incomplete: "Rate every answer, then ask the study Admin to approve the ratings and lock a new version.",
  production_scores_incomplete: "This version does not have a production score for every answer. Ask the study Admin.",
};

export function friendlyError(err: unknown): string {
  if (err instanceof ResearchApiError) {
    if (err.status === 401) return "Your session has expired. Sign in again.";
    if (err.status === 403) return "Your role does not allow this. Ask the study Admin if you need it.";
    return FRIENDLY[err.message] ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export const DIMENSIONS: { key: string; label: string }[] = [
  { key: "cognitive_abilities", label: "Cognitive abilities" },
  { key: "execution", label: "Execution" },
  { key: "communication", label: "Communication" },
  { key: "adaptability_learning", label: "Adaptability & learning" },
  { key: "emotional_intelligence", label: "Emotional intelligence" },
  { key: "judgment", label: "Judgment" },
];

export const ANSWERS_TEMPLATE = [
  "candidate_ref,answer_ref,question_card_key,dimension_key,transcript_text,data_origin,role_key,pair_id,pair_side,varied_dimension,expected_score_direction,production_score",
  'C001,C001-Q1,<question_card_key>,communication,"I would start by listening to the customer and restating the problem...",synthetic,cs_manager,,,,,',
  'C002,C002-Q1,<question_card_key>,communication,"Honestly I would just escalate it.",synthetic,cs_manager,,,,,',
].join("\n");

export const RATINGS_TEMPLATE = [
  "answer_ref,rater_ref,score",
  "C001-Q1,R1,4",
  "C001-Q1,R2,4.5",
  "C002-Q1,R1,1.5",
].join("\n");

export function downloadText(filename: string, text: string, type = "text/csv") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
