import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Fizzy #4815 — Research Lab gate + key screens.
//  1. a signed-in non-member sees the "not on the study team" screen with their Account ID
//  2. a member sees the guided tabs; Admin-only tab hidden for researchers
//  3. a completed run shows plain-language metrics and never the scorer internals

const callResearch = vi.fn();
vi.mock("@/lib/researchApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/researchApi")>();
  return { ...actual, callResearch: (...a: unknown[]) => callResearch(...a) };
});

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-2222-3333-4444-555555555555", email: "student@andrew.cmu.edu" }, signOut: vi.fn() }),
}));

const researcher = {
  kind: "member",
  role: "researcher",
  source: "session",
  member_id: "m1",
  user_id: "11111111-2222-3333-4444-555555555555",
  email: "student@andrew.cmu.edu",
  // Real fn_research_access shape: a boolean map, not a list.
  capabilities: { read: true, export: true, import: true, run: true, manage_datasets: true, review: false, manage_members: false, manage_settings: false },
};

function routeTable(handlers: Record<string, unknown>) {
  callResearch.mockImplementation(async (fn: string, action: string) => {
    const key = `${fn}:${action}`;
    const h = handlers[key];
    if (h instanceof Error) throw h;
    if (h === undefined) throw new Error(`unexpected call ${key}`);
    return h;
  });
}

const renderAt = async (path: string) => {
  const { default: ResearchLab } = await import("./ResearchLab");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/research-lab" element={<ResearchLab />} />
          <Route path="/research-lab/runs/:runId" element={<ResearchLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  callResearch.mockReset();
});
afterEach(cleanup);

describe("ResearchLab", () => {
  it("shows a non-member the request-access screen with their Account ID", async () => {
    const { ResearchApiError } = await import("@/lib/researchApi");
    routeTable({ "fn_research_access:whoami": new ResearchApiError("Forbidden", 403, "FORBIDDEN", null) });
    await renderAt("/research-lab");
    expect(await screen.findByText(/not on the study team yet/i)).toBeTruthy();
    expect(screen.getByText("11111111-2222-3333-4444-555555555555")).toBeTruthy();
    expect(screen.queryByText(/Start here/)).toBeNull();
  });

  it("shows a researcher the guided tabs but not the Admin tab", async () => {
    routeTable({ "fn_research_access:whoami": researcher });
    await renderAt("/research-lab");
    expect(await screen.findByText("1. Start here")).toBeTruthy();
    expect(screen.getByText("2. Data")).toBeTruthy();
    expect(screen.getByText(/Runs & results/)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Admin" })).toBeNull();
    expect(screen.getByText(/Prepare two CSV files/)).toBeTruthy();
  });

  it("shows CMU raters where to download blinded answers and a matching ratings sheet", async () => {
    routeTable({
      "fn_research_access:whoami": researcher,
      "fn_research_datasets:list_versions": {
        versions: [{
          id: "22222222-2222-4222-8222-222222222222",
          dataset_kind: "historical",
          version_number: 4,
          name: "CMU Team 1 v1 (13 roles)",
          content_hash: "hash",
          item_count: 1823,
          has_question_materials: true,
          rated_answer_count: 0,
          frozen_at: "2026-10-19T19:55:51Z",
          retention_delete_after: "2028-01-01T00:00:00Z",
        }],
      },
      "fn_research_datasets:list_imports": { imports: [] },
      "fn_research_datasets:list_question_cards": { cards: [] },
    });

    await renderAt("/research-lab?tab=data");

    expect(await screen.findByText("CMU Team 1 data is ready to rate")).toBeTruthy();
    expect(screen.getByText(/The Lab has 1,823 answers/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rating pack" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blank ratings sheet" })).toBeTruthy();
    expect(screen.getAllByText(/Upload your completed ratings file/)).toHaveLength(2);
  });

  it("renders a completed run's metrics in plain language without scorer internals", async () => {
    const runId = "263cb89b-1aa7-4a5e-a7f4-1e2509b74e52";
    routeTable({
      "fn_research_access:whoami": researcher,
      "fn_research_runs:run_status": {
        ok: true,
        run: { id: runId, status: "completed", repeat_count: 2, answer_count: 10, projected_calls: 20, created_at: "2026-10-14T05:27:03Z", started_at: null, completed_at: null },
        counts: { completed: 20 },
      },
      "fn_research_runs:run_results": {
        ok: true,
        results: [{ answer_ref: "C001-Q1", repeat_index: 1, status: "completed", score: 3.5, confidence: 0.8, explanation: "Clear structure." }],
        dimension_means: [{ candidate_ref: "C001", dimension_key: "communication", mean_score: 3.5, n: 2 }],
      },
      "fn_research_runs:list_runs": { ok: true, runs: [] },
      "fn_research_metrics:metrics": {
        ok: true,
        package_version: "0.1.0",
        report: {
          metrics: {
            human_ai: { n: 10, mae: 0.4, mae_ci95: [0.2, 0.6], bias: 0.1, bias_ci95: [-0.1, 0.3], spearman_rho: 0.8, quadratic_weighted_kappa: 0.7, exact_agreement: 0.5, within_one_agreement: 0.9 },
            repeat_stability: { n: 10, repeat_sd: 0.2, repeat_range: 0.3, identical_repeat_share: 0.6, icc_2_1: 0.85, balanced: true },
          },
          warn_threshold: 10,
          warnings: [],
          threshold_flags: [],
        },
      },
    });
    await renderAt(`/research-lab/runs/${runId}`);
    expect(await screen.findByText("Human vs AI agreement")).toBeTruthy();
    expect(screen.getByText("Scorer consistency")).toBeTruthy();
    expect(screen.getByText("Clear structure.")).toBeTruthy();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/prompt_slug|gemini|provider/i);
  });
});
