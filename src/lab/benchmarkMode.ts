// When true, the Lab uses one fixed benchmark dataset that ships with the code
// (see benchmark/ and docs/backend-proposal.md). The upload and approval steps are
// hidden: you pick a model, choose repeats and run. Requires the backend change in
// docs/backend-proposal.md; leave it off until that is merged.
export const BENCHMARK_FIXED = import.meta.env.VITE_BENCHMARK_FIXED === "true";
