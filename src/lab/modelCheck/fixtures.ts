// Mock results for three imaginary models, used only when VITE_MODEL_CHECK_MOCK=true.
// Not real VettedAI results. Generated once from the design mock-up; edit freely.

import type { ModelCheckInput } from "./types";

export interface MockRun {
  runId: string;
  scorerLabel: string;
  input: ModelCheckInput;
}

const runA: MockRun = {
  runId: "mock-a",
  scorerLabel: "Scorer v2.4 (candidate)",
  input: {
    repeats: 5,
    dimensions: {
      cognitive_abilities: { icc: 0.95, identicalShare: 0.968, kappa: 0.86, humanKappa: 0.82, mae: 0.32, bias: 0.04, withinOne: 0.97, rho: 0.84 },
      execution: { icc: 0.94, identicalShare: 0.972, kappa: 0.84, humanKappa: 0.8, mae: 0.35, bias: -0.02, withinOne: 0.96, rho: 0.82 },
      communication: { icc: 0.93, identicalShare: 0.961, kappa: 0.83, humanKappa: 0.81, mae: 0.37, bias: 0.05, withinOne: 0.96, rho: 0.81 },
      emotional_intelligence: { icc: 0.92, identicalShare: 0.953, kappa: 0.82, humanKappa: 0.78, mae: 0.4, bias: -0.06, withinOne: 0.95, rho: 0.78 },
      adaptability_learning: { icc: 0.94, identicalShare: 0.964, kappa: 0.83, humanKappa: 0.79, mae: 0.38, bias: 0.03, withinOne: 0.95, rho: 0.79 },
      judgment: { icc: 0.91, identicalShare: 0.941, kappa: 0.81, humanKappa: 0.77, mae: 0.43, bias: 0.08, withinOne: 0.94, rho: 0.76 },
    },
    validity: { discriminantMax: 0.71, contentDropShare: 0.94 },
    robustness: {
      jargon_added: {
        cognitive_abilities: { meanChange: 0.19, withinOne: 0.982 },
        execution: { meanChange: 0.2, withinOne: 0.981 },
        communication: { meanChange: 0.21, withinOne: 0.98 },
        emotional_intelligence: { meanChange: 0.23, withinOne: 0.978 },
        adaptability_learning: { meanChange: 0.22, withinOne: 0.979 },
        judgment: { meanChange: 0.24, withinOne: 0.977 },
    },
    jargon_removed: {
      cognitive_abilities: { meanChange: 0.22, withinOne: 0.973 },
      execution: { meanChange: 0.23, withinOne: 0.972 },
      communication: { meanChange: 0.24, withinOne: 0.97 },
      emotional_intelligence: { meanChange: 0.26, withinOne: 0.967 },
      adaptability_learning: { meanChange: 0.25, withinOne: 0.968 },
      judgment: { meanChange: 0.28, withinOne: 0.966 },
    },
    filler_added: {
      cognitive_abilities: { meanChange: 0.16, withinOne: 0.991 },
      execution: { meanChange: 0.17, withinOne: 0.99 },
      communication: { meanChange: 0.18, withinOne: 0.99 },
      emotional_intelligence: { meanChange: 0.2, withinOne: 0.989 },
      adaptability_learning: { meanChange: 0.19, withinOne: 0.99 },
      judgment: { meanChange: 0.21, withinOne: 0.988 },
    },
    filler_removed: {
      cognitive_abilities: { meanChange: 0.14, withinOne: 0.991 },
      execution: { meanChange: 0.14, withinOne: 0.99 },
      communication: { meanChange: 0.15, withinOne: 0.99 },
      emotional_intelligence: { meanChange: 0.17, withinOne: 0.989 },
      adaptability_learning: { meanChange: 0.16, withinOne: 0.99 },
      judgment: { meanChange: 0.17, withinOne: 0.988 },
    },
    combined: {
      cognitive_abilities: { meanChange: 0.3, withinOne: 0.964 },
      execution: { meanChange: 0.31, withinOne: 0.962 },
      communication: { meanChange: 0.33, withinOne: 0.96 },
      emotional_intelligence: { meanChange: 0.36, withinOne: 0.956 },
      adaptability_learning: { meanChange: 0.35, withinOne: 0.958 },
      judgment: { meanChange: 0.38, withinOne: 0.954 },
    },
    },
  },
};

const runB: MockRun = {
  runId: "mock-b",
  scorerLabel: "Scorer v3.0-beta",
  input: {
    repeats: 5,
    dimensions: {
      cognitive_abilities: { icc: 0.88, identicalShare: 0.849, kappa: 0.79, humanKappa: 0.82, mae: 0.48, bias: 0.1, withinOne: 0.93, rho: 0.76 },
      execution: { icc: 0.86, identicalShare: 0.815, kappa: 0.77, humanKappa: 0.8, mae: 0.52, bias: 0.12, withinOne: 0.92, rho: 0.73 },
      communication: { icc: 0.79, identicalShare: 0.748, kappa: 0.71, humanKappa: 0.81, mae: 0.61, bias: 0.22, withinOne: 0.89, rho: 0.68 },
      emotional_intelligence: { icc: 0.77, identicalShare: 0.716, kappa: 0.68, humanKappa: 0.78, mae: 0.66, bias: 0.18, withinOne: 0.87, rho: 0.64 },
      adaptability_learning: { icc: 0.82, identicalShare: 0.781, kappa: 0.72, humanKappa: 0.79, mae: 0.58, bias: 0.15, withinOne: 0.9, rho: 0.69 },
      judgment: { icc: 0.74, identicalShare: 0.656, kappa: 0.62, humanKappa: 0.77, mae: 0.74, bias: 0.3, withinOne: 0.83, rho: 0.58 },
    },
    validity: { discriminantMax: 0.8, contentDropShare: 0.86 },
    robustness: {
      jargon_added: {
        cognitive_abilities: { meanChange: 0.56, withinOne: 0.919 },
        execution: { meanChange: 0.59, withinOne: 0.915 },
        communication: { meanChange: 0.62, withinOne: 0.91 },
        emotional_intelligence: { meanChange: 0.68, withinOne: 0.901 },
        adaptability_learning: { meanChange: 0.65, withinOne: 0.906 },
        judgment: { meanChange: 0.71, withinOne: 0.897 },
    },
    jargon_removed: {
      cognitive_abilities: { meanChange: 0.73, withinOne: 0.874 },
      execution: { meanChange: 0.77, withinOne: 0.867 },
      communication: { meanChange: 0.81, withinOne: 0.86 },
      emotional_intelligence: { meanChange: 0.89, withinOne: 0.846 },
      adaptability_learning: { meanChange: 0.85, withinOne: 0.853 },
      judgment: { meanChange: 0.93, withinOne: 0.839 },
    },
    filler_added: {
      cognitive_abilities: { meanChange: 0.4, withinOne: 0.955 },
      execution: { meanChange: 0.42, withinOne: 0.953 },
      communication: { meanChange: 0.44, withinOne: 0.95 },
      emotional_intelligence: { meanChange: 0.48, withinOne: 0.945 },
      adaptability_learning: { meanChange: 0.46, withinOne: 0.948 },
      judgment: { meanChange: 0.51, withinOne: 0.943 },
    },
    filler_removed: {
      cognitive_abilities: { meanChange: 0.34, withinOne: 0.964 },
      execution: { meanChange: 0.36, withinOne: 0.962 },
      communication: { meanChange: 0.38, withinOne: 0.96 },
      emotional_intelligence: { meanChange: 0.42, withinOne: 0.956 },
      adaptability_learning: { meanChange: 0.4, withinOne: 0.958 },
      judgment: { meanChange: 0.44, withinOne: 0.954 },
    },
    combined: {
      cognitive_abilities: { meanChange: 0.79, withinOne: 0.856 },
      execution: { meanChange: 0.84, withinOne: 0.848 },
      communication: { meanChange: 0.88, withinOne: 0.84 },
      emotional_intelligence: { meanChange: 0.97, withinOne: 0.824 },
      adaptability_learning: { meanChange: 0.92, withinOne: 0.832 },
      judgment: { meanChange: 1.01, withinOne: 0.816 },
    },
    },
  },
};

const runC: MockRun = {
  runId: "mock-c",
  scorerLabel: "Scorer v2.5-rc",
  input: {
    repeats: 10,
    dimensions: {
      cognitive_abilities: { icc: 0.93, identicalShare: 0.897, kappa: 0.84, humanKappa: 0.82, mae: 0.36, bias: 0.05, withinOne: 0.96, rho: 0.82 },
      execution: { icc: 0.92, identicalShare: 0.897, kappa: 0.83, humanKappa: 0.8, mae: 0.38, bias: -0.03, withinOne: 0.95, rho: 0.8 },
      communication: { icc: 0.91, identicalShare: 0.873, kappa: 0.8, humanKappa: 0.81, mae: 0.42, bias: 0.07, withinOne: 0.94, rho: 0.78 },
      emotional_intelligence: { icc: 0.9, identicalShare: 0.865, kappa: 0.78, humanKappa: 0.78, mae: 0.46, bias: -0.07, withinOne: 0.93, rho: 0.74 },
      adaptability_learning: { icc: 0.92, identicalShare: 0.881, kappa: 0.8, humanKappa: 0.79, mae: 0.43, bias: 0.04, withinOne: 0.94, rho: 0.76 },
      judgment: { icc: 0.88, identicalShare: 0.834, kappa: 0.74, humanKappa: 0.77, mae: 0.52, bias: 0.12, withinOne: 0.91, rho: 0.7 },
    },
    validity: { discriminantMax: 0.75, contentDropShare: 0.92 },
    robustness: {
      jargon_added: {
        cognitive_abilities: { meanChange: 0.25, withinOne: 0.973 },
        execution: { meanChange: 0.27, withinOne: 0.972 },
        communication: { meanChange: 0.28, withinOne: 0.97 },
        emotional_intelligence: { meanChange: 0.31, withinOne: 0.967 },
        adaptability_learning: { meanChange: 0.29, withinOne: 0.968 },
        judgment: { meanChange: 0.32, withinOne: 0.966 },
    },
    jargon_removed: {
      cognitive_abilities: { meanChange: 0.32, withinOne: 0.955 },
      execution: { meanChange: 0.34, withinOne: 0.953 },
      communication: { meanChange: 0.36, withinOne: 0.95 },
      emotional_intelligence: { meanChange: 0.4, withinOne: 0.945 },
      adaptability_learning: { meanChange: 0.38, withinOne: 0.948 },
      judgment: { meanChange: 0.41, withinOne: 0.943 },
    },
    filler_added: {
      cognitive_abilities: { meanChange: 0.23, withinOne: 0.982 },
      execution: { meanChange: 0.25, withinOne: 0.981 },
      communication: { meanChange: 0.26, withinOne: 0.98 },
      emotional_intelligence: { meanChange: 0.29, withinOne: 0.978 },
      adaptability_learning: { meanChange: 0.27, withinOne: 0.979 },
      judgment: { meanChange: 0.3, withinOne: 0.977 },
    },
    filler_removed: {
      cognitive_abilities: { meanChange: 0.2, withinOne: 0.982 },
      execution: { meanChange: 0.21, withinOne: 0.981 },
      communication: { meanChange: 0.22, withinOne: 0.98 },
      emotional_intelligence: { meanChange: 0.24, withinOne: 0.978 },
      adaptability_learning: { meanChange: 0.23, withinOne: 0.979 },
      judgment: { meanChange: 0.25, withinOne: 0.977 },
    },
    combined: {
      cognitive_abilities: { meanChange: 0.42, withinOne: 0.955 },
      execution: { meanChange: 0.45, withinOne: 0.953 },
      communication: { meanChange: 0.47, withinOne: 0.95 },
      emotional_intelligence: { meanChange: 0.52, withinOne: 0.945 },
      adaptability_learning: { meanChange: 0.49, withinOne: 0.948 },
      judgment: { meanChange: 0.54, withinOne: 0.943 },
    },
    },
  },
};

export const MOCK_RUNS: MockRun[] = [runA, runB, runC];
