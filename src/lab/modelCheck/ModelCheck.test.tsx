import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

vi.mock("./source", async () => {
  const { MOCK_RUNS } = await import("./fixtures");
  const byId = (id: string) => MOCK_RUNS.find((m) => m.runId === id)!;
  return {
    getModelCheckSource: (id: string) =>
      id === "none"
        ? { state: "unavailable" }
        : { state: "ready", input: byId(id).input, scorerLabel: byId(id).scorerLabel, isSample: true },
  };
});

import { ModelCheck } from "./ModelCheck";

const show = (runId: string, metric?: string) =>
  render(
    <MemoryRouter>
      <ModelCheck runId={runId} metric={metric} />
    </MemoryRouter>,
  );

describe("ModelCheck", () => {
  it("shows a safe verdict for the passing model", () => {
    show("mock-a");
    expect(screen.getByText("Safe to deploy")).toBeTruthy();
    expect(screen.getByText(/Not covered: fairness/)).toBeTruthy();
  });
  it("shows do-not-deploy for the failing model", () => {
    show("mock-b");
    expect(screen.getByText("Do not deploy")).toBeTruthy();
  });
  it("shows no verdict when not connected", () => {
    show("none");
    expect(screen.getByText(/not connected to run data yet/)).toBeTruthy();
    expect(screen.queryByText("Safe to deploy")).toBeNull();
  });
  it("renders each metric page", () => {
    for (const m of ["consistency", "alignment", "validity", "robustness", "how-it-works"]) {
      const { unmount } = show("mock-c", m);
      expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
      unmount();
    }
  });
});
