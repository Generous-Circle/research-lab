const ANSWER_COLUMNS = [
  "answer_ref",
  "candidate_ref",
  "role_key",
  "question_card_key",
  "dimension_key",
  "question_text",
  "scoring_rubric",
  "reference_answer",
  "transcript_text",
] as const;

const PRODUCTION_SCORE_COLUMNS = [
  "answer_ref",
  "role_key",
  "question_card_key",
  "dimension_key",
  "production_score",
] as const;

export interface RatingPackItem {
  answer_ref: string;
  candidate_ref?: string | null;
  role_key?: string | null;
  question_card_key?: string | null;
  dimension_key?: string | null;
  question_text?: string | null;
  scoring_rubric?: string | null;
  reference_answer?: string | null;
  transcript_text?: string | null;
  production_score?: number | null;
  [key: string]: unknown;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildRatingExports(items: RatingPackItem[]) {
  const answers = csv([
    [...ANSWER_COLUMNS],
    ...items.map((item) => ANSWER_COLUMNS.map((column) => item[column] ?? "")),
  ]);
  const ratings = csv([
    ["answer_ref", "rater_ref", "score"],
    ...items.map((item) => [item.answer_ref, "", ""]),
  ]);

  const productionScores = csv([
    [...PRODUCTION_SCORE_COLUMNS],
    ...items.map((item) => PRODUCTION_SCORE_COLUMNS.map((column) => item[column] ?? "")),
  ]);

  return { answers, ratings, productionScores };
}
