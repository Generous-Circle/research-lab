import { describe, expect, it } from "vitest";
import { buildRatingExports } from "./ratingExports";

describe("buildRatingExports", () => {
  it("creates a rating copy without AI scores and a matching blank rating sheet", () => {
    const result = buildRatingExports([
      {
        answer_ref: "T1-A0001",
        candidate_ref: "T1-C001",
        role_key: "product_intern",
        question_card_key: "t1_product_intern_q01",
        dimension_key: "communication",
        question_text: "Tell me how you would respond to a customer concern.",
        scoring_rubric: "0: No useful action. 5: Clear, complete response.",
        reference_answer: "Listen, clarify the issue, and agree on the next step.",
        transcript_text: "I would start by listening, then speak with the customer.",
        production_score: 4.5,
        ai_score: 4.5,
      },
    ]);

    expect(result.answers).toBe(
      'answer_ref,candidate_ref,role_key,question_card_key,dimension_key,question_text,scoring_rubric,reference_answer,transcript_text\nT1-A0001,T1-C001,product_intern,t1_product_intern_q01,communication,Tell me how you would respond to a customer concern.,"0: No useful action. 5: Clear, complete response.","Listen, clarify the issue, and agree on the next step.","I would start by listening, then speak with the customer."',
    );
    expect(result.ratings).toBe("answer_ref,rater_ref,score\nT1-A0001,,");
    expect(result.productionScores).toBe(
      "answer_ref,role_key,question_card_key,dimension_key,production_score\nT1-A0001,product_intern,t1_product_intern_q01,communication,4.5",
    );
    expect(result.answers).not.toMatch(/production_score|ai_score|4\.5/);
  });
});
