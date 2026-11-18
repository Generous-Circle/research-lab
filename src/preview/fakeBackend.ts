// PREVIEW ONLY. Answers the Lab's backend calls with fixed example data so the real
// Lab UI can run on a static page. Not used by the real app.

const now = Date.now();
const ago = (m: number) => new Date(now - m * 60000).toISOString();

const versions = [
  { id: "ver-1", dataset_kind: "paired", version_number: 1, name: "Benchmark", content_hash: "9f2c41ab", item_count: 1020, rated_answer_count: 1020, has_question_materials: true, frozen_at: ago(3000), retention_delete_after: null },
];

const mk = (id: string, label: string, n: number, minsAgo: number, v: number) => ({
  id, status: "completed", repeat_count: n, answer_count: 1020, projected_calls: 1020 * n, created_at: ago(minsAgo), started_at: ago(minsAgo), completed_at: ago(minsAgo - 20),
  dataset_version_id: "ver-1", dataset_kind: "paired", dataset_version_number: 1, dataset_name: "Benchmark", scorer_label: label, scorer_version_number: v, completed_count: 1020 * n,
});
const runs = [
  mk("e41b7c90-mock-c", "Scorer v2.5-rc", 10, 40, 3),
  mk("7d20a6f1-mock-b", "Scorer v3.0-beta", 5, 80, 2),
  mk("a3f91c2e-mock-a", "Scorer v2.4 (candidate)", 5, 120, 1),
];

const report = {
  metrics: {
    human_ai: { n: 1020, mae: 0.42, mae_ci95: [0.39, 0.45], bias: 0.07, bias_ci95: [0.03, 0.11], spearman_rho: 0.78, quadratic_weighted_kappa: 0.8, exact_agreement: 0.46, within_one_agreement: 0.94 },
    krippendorff_alpha: { n: 1020, value: 0.74 },
    repeat_stability: { n: 1020, repeat_sd: 0.12, repeat_range: 0.3, identical_repeat_share: 0.9, icc_2_1: 0.92 },
  },
  warn_threshold: 10, warnings: [], threshold_flags: [],
};

export function installFakeBackend(supabaseUrl: string) {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(`${supabaseUrl}/functions/v1/`)) return real(input, init);
    const fn = url.split("/functions/v1/")[1];
    const body = JSON.parse(String(init?.body ?? "{}")) as { action?: string; run_id?: string };
    const a = body.action ?? "";
    let data: unknown = {};
    if (fn === "fn_research_access" && a === "whoami")
      data = { kind: "token", role: "researcher", source: "preview", member_id: null, user_id: null, email: "researcher@cmu.edu", capabilities: { read: true, run: true, export: true, upload: true } };
    else if (fn === "fn_research_access") data = { tokens: [], members: [] };
    else if (a === "list_versions") data = { versions };
    else if (a === "list_runs") data = { runs };
    else if (a === "list_scorer_versions") data = { scorer_versions: [{ id: "sv-1", version_number: 3, label: "Scorer v2.5-rc", active: true, approved_at: ago(9000) }] };
    else if (a === "run_settings") data = { settings: { provider_terms_approved: "true", price_per_call: "0.004", repeat_ceiling: "10", spend_ceiling: "500" } };
    else if (a === "run_status") {
      const r = runs.find((x) => x.id === body.run_id) ?? runs[0];
      data = { run: r, counts: { completed: r.projected_calls } };
    } else if (a === "run_results") data = { results: [], dimension_means: [] };
    else if (a === "metrics") data = { report, package_version: "preview" };
    else if (a === "list_imports") data = { imports: [] };
    else if (a === "list_cards") data = { cards: [] };
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}
